// Animation engine: drives scenes, ball, players, camera, and fires events.
import * as THREE from 'three';
import { PITCH, MATCH, STATE } from './config.js';
import { rollToward, passToward, updateBall, makeBallState } from './ball.js';
import { animatePlayer, setFacing, kickAnimation } from './players.js';

export class Engine {
  constructor({ renderer, scene, camera, ballMesh, players, script, ui, kits }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.ballMesh = ballMesh;
    this.players = players;
    this.script = script;
    this.ui = ui;
    this.kits = kits;

    this.ball = makeBallState(0, 0);
    this.sceneIdx = -1;
    this.sceneTime = 0;
    this.last = performance.now();
    this.kickFired = false;
    this.goalAnimT = 0;
    this.running = false;
    this._raf = null;
    this._tmp = new THREE.Vector3();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.advanceScene();
    this.loop();
  }

  setSpeed(s) { STATE.speed = s; }
  togglePause() {
    STATE.paused = !STATE.paused;
    if (this.ui) this.ui.setPlayState(!STATE.paused);
  }

  reset() {
    this.sceneIdx = -1;
    this.sceneTime = 0;
    STATE.score = { home: 0, away: 0 };
    STATE.log = [];
    STATE.potm = null;
    this.ball = makeBallState(0, 0);
    this.kickFired = false;
    if (this.ui) this.ui.resetAll();
    this.resetPlayersToFormation();
    this.start();
  }

  resetPlayersToFormation() {
    for (const p of this.players.all) {
      if (p.userData.role === 'REF') continue;
      p.position.set(p.userData.home, 0, p.userData.baseZ);
    }
  }

  // ============ Scene control ============
  advanceScene() {
    this.sceneIdx++;
    if (this.sceneIdx >= this.script.length) {
      this.finishMatch();
      return;
    }
    this.current = this.script[this.sceneIdx];
    this.sceneTime = 0;
    this.kickFired = false;
    STATE.phase = this.current.phase;

    // Move ball to scene's `from` (so restarts/kickoff work)
    const [fx, fz] = this.current.ball.from;
    this.ball.x = fx; this.ball.z = fz; this.ball.y = 0.35;
    this.ball.vx = 0; this.ball.vz = 0; this.ball.vy = 0; this.ball.onGround = true;

    if (this.ui) {
      this.ui.setPhase(this.current.phase);
      if (this.current.commentary?.length) {
        this.ui.setCommentary(this.current.commentary);
      }
    }
  }

  // ============ Main loop ============
  loop = () => {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    if (!STATE.paused) {
      const scaled = dt * STATE.speed;
      this.update(scaled);
    }
    this.renderer.render(this.scene, this.camera);
  };

  update(dt) {
    this.sceneTime += dt;

    // Ball progress along scene
    const dur = Math.max(0.5, this.current.dur);
    const t = Math.min(1, this.sceneTime / dur);

    // Kick trigger
    if (!this.kickFired && this.current.striker && this.current.strikerKickAt != null && t >= this.current.strikerKickAt) {
      this.kickFired = true;
      const striker = this.getActor(this.current.striker);
      if (striker) kickAnimation(striker);
      // Launch ball toward `to`
      const [tx, tz] = this.current.ball.to;
      if (this.current.ball.air) {
        passToward(this.ball, tx, tz, this.current.ball.peak || 3, dur * (1 - this.current.strikerKickAt));
      } else {
        rollToward(this.ball, tx, tz, Math.hypot(tx - this.ball.x, tz - this.ball.z) / (dur * (1 - this.current.strikerKickAt)));
      }
    } else if (!this.kickFired && !this.current.striker) {
      // No striker — just place ball at `to` (e.g. HT/FT)
      const [tx, tz] = this.current.ball.to;
      this.ball.x = tx; this.ball.z = tz;
    }

    updateBall(this.ball, this.ballMesh, dt);

    // Animate striker to follow ball before kick / chase after
    this.moveActors(dt, t);

    // Idle others back toward formation
    this.idleOthers(dt);

    // Camera tracks ball
    this.updateCamera(dt);

    // HUD clock — tick forward across the scene
    if (this.ui) {
      this.ui.setClock(this.current.minute + t, this.current.phase);
      this.ui.setTimelineProgress(this.computeTimelineFraction());
    }

    if (this.sceneTime >= dur) {
      this.fireSceneEvent();
      this.advanceScene();
    }
  }

  // Drive actor(s): striker approaches ball until kick, then jogs toward `to`.
  moveActors(dt, t) {
    const s = this.current;
    if (!s.striker) return;
    const striker = this.getActor(s.striker);
    if (!striker) return;

    let target;
    if (!this.kickFired) {
      // Approach the ball's current position
      target = [this.ball.x, this.ball.z];
    } else {
      // Move toward where the ball is going (lead slightly)
      target = [this.ball.x, this.ball.z];
    }
    this.steer(striker, target, dt, 7.5);
  }

  // Move a player toward [x,z] at `speed` (m/s).
  steer(p, target, dt, speed) {
    const dx = target[0] - p.position.x;
    const dz = target[1] - p.position.z;
    const d = Math.hypot(dx, dz);
    const moving = d > 0.15;
    if (moving) {
      const step = Math.min(d, speed * dt);
      p.position.x += (dx / d) * step;
      p.position.z += (dz / d) * step;
      setFacing(p, dx, dz);
    }
    animatePlayer(p, moving, dt, 1.0);
  }

  idleOthers(dt) {
    // All non-striker, non-GK, non-REF players drift back to formation home with slight drift
    const strikerId = this.current.striker ? idOf(this.current.striker) : null;
    for (const p of this.players.all) {
      const u = p.userData;
      if (u.role === 'REF') {
        // referee hovers near the ball but stays a few metres off
        const tx = this.ball.x - 8;
        const tz = this.ball.z - 6;
        this.steer(p, [tx, tz], dt, 5);
        continue;
      }
      if (u.isGK) {
        // GK stays on goal line, shifts along Z to track ball
        const gkX = u.team === 'home' ? -PITCH.length/2 + 2 : PITCH.length/2 - 2;
        const target = [gkX, Math.max(-PITCH.goalWidth, Math.min(PITCH.goalWidth, this.ball.z * 0.5))];
        this.steer(p, target, dt, 4);
        continue;
      }
      if (idOf({ team: u.team, slot: u.slot }) === strikerId) continue;
      // Drift toward formation home (with small jitter)
      const tx = u.home + Math.sin(performance.now()*0.0006 + u.slot) * 1.2;
      const tz = u.baseZ + Math.cos(performance.now()*0.0007 + u.slot) * 1.2;
      // Slow drift back
      const dx = tx - p.position.x;
      const dz = tz - p.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.3) {
        const step = Math.min(d, 3.5 * dt);
        p.position.x += (dx / d) * step;
        p.position.z += (dz / d) * step;
        setFacing(p, dx, dz);
        animatePlayer(p, true, dt, 0.6);
      } else {
        animatePlayer(p, false, dt);
      }
    }
  }

  // Camera: side-on broadcast angle, follows ball.
  updateCamera(dt) {
    const bz = PITCH.width / 2;
    const targetX = this.ball.x * 0.55;
    const targetY = 30;
    const targetZ = bz + 42;
    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, dt * 2);
    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, dt * 2);
    this.camera.position.z += (targetZ - this.camera.position.z) * Math.min(1, dt * 2);
    this._tmp.set(this.ball.x * 0.4, 1.5, 0);
    this.camera.lookAt(this._tmp);
  }

  // ============ Helpers ============
  getActor({ team, slot }) {
    return this.players[team][slot];
  }

  computeTimelineFraction() {
    // Approximate progress: sceneIdx / total + within-scene
    const total = this.script.length;
    const within = Math.min(1, this.sceneTime / Math.max(0.5, this.current.dur));
    return (this.sceneIdx + within) / total;
  }

  fireSceneEvent() {
    const e = this.current.event;
    if (!e) return;
    STATE.log.push({ minute: e.minute, ...e });
    if (this.ui) this.ui.addTimelineMarker(e);

    switch (e.type) {
      case 'goal':
        STATE.score[e.team]++;
        if (this.ui) {
          this.ui.setScore(STATE.score);
          this.ui.showGoal(e, this.kits);
          this.ui.setCommentary([e.text]);
        }
        break;
      case 'card':
        if (this.ui) this.ui.showCard(e);
        break;
      case 'save':
      case 'corner':
      case 'foul':
      case 'miss':
        if (this.ui) this.ui.setCommentary(this.current.commentary);
        break;
      case 'halftime':
        if (this.ui) this.ui.setPhase('half');
        break;
      case 'fulltime':
        this.finishMatch();
        break;
    }
  }

  finishMatch() {
    STATE.phase = 'fulltime';
    this.running = false;
    cancelAnimationFrame(this._raf);
    // Choose POTM = top-scoring team's scorer with most goals (fallback: Palmer/Saka)
    const potm = this.computePOTM();
    STATE.potm = potm;
    if (this.ui) this.ui.showFullTime(STATE.score, potm, STATE.log);
  }

  computePOTM() {
    // Count goals per player
    const tally = {};
    for (const ev of STATE.log) {
      if (ev.type === 'goal') {
        const k = `${ev.scorer.team}:${ev.scorer.slot}`;
        tally[k] = (tally[k] || 0) + 1;
        if (!tally[k + '_name']) tally[k + '_name'] = ev.name;
      }
    }
    let best = null, bestN = 0;
    for (const k of Object.keys(tally)) {
      if (k.endsWith('_name')) continue;
      if (tally[k] > bestN) { bestN = tally[k]; best = { key: k, name: tally[k + '_name'], team: k.split(':')[0] }; }
    }
    if (!best) return { name: 'PALMER', team: 'home' };
    return best;
  }
}

function idOf({ team, slot }) { return `${team}:${slot}`; }
