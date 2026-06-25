import { MATCH_DURATION_REAL, HALF_TIME_PAUSE, PITCH } from './config.js';
import * as THREE from 'three';

export class MatchEngine {
  constructor({ ball, players, ui, onStateChange }) {
    this.ball = ball;
    this.players = players;
    this.ui = ui;
    this.onStateChange = onStateChange;

    this.homeName = 'Chelsea';
    this.awayName = 'Arsenal';
    this.homeColor = '#034694';
    this.awayColor = '#EF0107';
    this.script = null;

    this.matchMinute = 0;
    this.score = [0, 0];
    this.phase = 'first';
    this.speed = 1;
    this.paused = false;
    this.running = false;
    this.inScene = false;
    this.finished = false;

    this.eventIndex = 0;
    this.keyMoments = [];
    this.activePlayer = null;
    this.sceneResolve = null;
    this.realElapsed = 0;
    this.halftimeTimer = 0;
  }

  configure(homeName, awayName, homeColor, awayColor, script) {
    this.homeName = homeName;
    this.awayName = awayName;
    this.homeColor = homeColor;
    this.awayColor = awayColor;
    this.script = script;
    this.reset();
  }

  reset() {
    this.matchMinute = 0;
    this.score = [0, 0];
    this.phase = 'first';
    this.paused = false;
    this.running = false;
    this.inScene = false;
    this.finished = false;
    this.eventIndex = 0;
    this.keyMoments = [];
    this.activePlayer = null;
    this.realElapsed = 0;
    this.halftimeTimer = 0;
    this.ball.reset(0, 0);
    this.players.resetPositions();
    this.ui.hideOverlays();
    this.ui.updateScore(this.score, this.homeName, this.awayName);
    this.ui.updateClock(0, 'First Half');
    this.ui.setPhase('first');
    this.ui.buildTimeline(this.script.events);
    this.ui.updateTimelineCursor(0);
  }

  start() {
    this.running = true;
    this.paused = false;
    this.finished = false;
    this._emit();
  }

  pause() {
    this.paused = true;
    this._emit();
  }

  resume() {
    if (!this.finished) {
      this.paused = false;
      this._emit();
    }
  }

  setSpeed(s) {
    this.speed = s;
    this._emit();
  }

  restart() {
    this.reset();
    this.start();
  }

  _emit() {
    if (this.onStateChange) this.onStateChange(this.getState());
  }

  getState() {
    return {
      running: this.running,
      paused: this.paused,
      speed: this.speed,
      matchMinute: this.matchMinute,
      score: [...this.score],
      phase: this.phase,
      finished: this.finished,
    };
  }

  update(dt) {
    if (!this.running || this.paused || this.finished) return;

    const scaled = dt * this.speed;

    if (this.halftimeTimer > 0) {
      this.halftimeTimer -= scaled;
      return;
    }

    if (this.inScene) {
      this._updateScene(scaled);
      return;
    }

    const minuteRate = 92 / MATCH_DURATION_REAL;
    this.matchMinute += minuteRate * scaled;
    this.realElapsed += scaled;

    this._updatePhase();
    this.ui.updateClock(this.matchMinute, this._phaseLabel());
    this.ui.updateTimelineCursor(this.matchMinute);

    while (
      this.eventIndex < this.script.events.length &&
      this.matchMinute >= this.script.events[this.eventIndex].minute
    ) {
      const ev = this.script.events[this.eventIndex];
      this.eventIndex++;
      this._triggerEvent(ev);
      if (this.inScene || this.halftimeTimer > 0) break;
    }
  }

  _updatePhase() {
    if (this.matchMinute < 45) {
      this.phase = 'first';
    } else if (this.matchMinute < 46) {
      this.phase = 'ht';
    } else if (this.matchMinute < 90) {
      this.phase = 'second';
    } else {
      this.phase = 'ft';
    }
    this.ui.setPhase(this.phase);
  }

  _phaseLabel() {
    if (this.phase === 'first') return 'First Half';
    if (this.phase === 'ht') return 'Half Time';
    if (this.phase === 'second') return 'Second Half';
    return 'Full Time';
  }

  async _triggerEvent(ev) {
    this.inScene = true;
    this.matchMinute = ev.minute;
    this.ui.setCommentary(ev.commentary);

    switch (ev.type) {
      case 'kickoff': await this._sceneKickoff(); break;
      case 'goal': await this._sceneGoal(ev); break;
      case 'yellow': await this._sceneCard(ev, 'yellow'); break;
      case 'red': await this._sceneCard(ev, 'red'); break;
      case 'halftime': await this._sceneHalftime(); break;
      case 'corner': await this._sceneCorner(ev); break;
      case 'save': await this._sceneSave(ev); break;
      case 'penalty': await this._scenePenalty(ev); break;
      case 'fulltime': await this._sceneFulltime(); break;
    }

    this.inScene = false;
    this.activePlayer = null;
  }

  _updateScene(dt) {
    this.ball.update(dt, this.players.players);
    this.players.update(dt, this.activePlayer);

    if (this._sceneStep) this._sceneStep(dt);
  }

  _wait(seconds) {
    return new Promise(resolve => {
      let elapsed = 0;
      this._sceneStep = (dt) => {
        elapsed += dt;
        if (elapsed >= seconds) {
          this._sceneStep = null;
          resolve();
        }
      };
    });
  }

  _pass(from, to, power = 12) {
    return new Promise(resolve => {
      this.ball.setOwner(from);
      this.activePlayer = from;
      const targetX = to.position.x;
      const targetZ = to.position.z;
      this.players.setTarget(to, targetX, targetZ);

      from.userData.kicking = true;
      from.userData.kickPhase = 0;

      let kicked = false;
      let elapsed = 0;
      this._sceneStep = (dt) => {
        elapsed += dt;
        if (!kicked && elapsed >= 0.35) {
          kicked = true;
          const dir = new THREE.Vector3(targetX - from.position.x, 0, targetZ - from.position.z);
          this.ball.kick(dir, power, 0);
          this.activePlayer = to;
        }
        if (kicked) {
          const dx = to.position.x - this.ball.position.x;
          const dz = to.position.z - this.ball.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 1.0 || this.ball.owner === to) {
            this.ball.setOwner(to);
            this._sceneStep = null;
            resolve();
          }
        }
      };
    });
  }

  _shot(shooter, targetX, targetZ, power = 18, loft = 0) {
    return new Promise(resolve => {
      this.ball.setOwner(shooter);
      this.activePlayer = shooter;
      shooter.userData.kicking = true;
      shooter.userData.kickPhase = 0;

      let kicked = false;
      let elapsed = 0;
      this._sceneStep = (dt) => {
        elapsed += dt;
        if (!kicked && elapsed >= 0.35) {
          kicked = true;
          const dir = new THREE.Vector3(targetX - shooter.position.x, 0, targetZ - shooter.position.z);
          this.ball.kick(dir, power, loft);
          this.activePlayer = null;
        }
        if (kicked && (this.ball.inNet || (!this.ball.isMoving() && !this.ball.owner))) {
          this._sceneStep = null;
          resolve();
        }
      };
    });
  }

  async _sceneKickoff() {
    this.ball.reset(0, 0);
    const homeMid = this.players.getByTeam('home').find(p => p.userData.role === 'mid');
    if (homeMid) {
      this.ball.setOwner(homeMid);
      this.activePlayer = homeMid;
      await this._wait(1);
      const fwd = this.players.getByTeam('home').find(p => p.userData.role === 'fwd');
      if (fwd) await this._pass(homeMid, fwd, 10);
    }
    await this._wait(0.5);
  }

  async _sceneGoal(ev) {
    const team = ev.team;
    const attackers = this.players.getByTeam(team);
    const gk = this.players.getGoalkeeper(team === 'home' ? 'away' : 'home');
    const goalX = team === 'home' ? PITCH.length / 2 - 1 : -PITCH.length / 2 + 1;

    const shooter = attackers.find(p => p.userData.role === 'fwd') || attackers[attackers.length - 1];
    const assister = attackers.find(p => p.userData.role === 'mid' && p !== shooter);

    shooter.position.set(goalX - (team === 'home' ? 12 : -12), 0, ev.minute % 2 === 0 ? 5 : -5);
    if (assister) assister.position.set(goalX - (team === 'home' ? 22 : -22), 0, 0);

    if (assister) {
      this.ball.setOwner(assister);
      await this._wait(0.5);
      await this._pass(assister, shooter, 14);
      await this._wait(0.3);
    } else {
      this.ball.setOwner(shooter);
    }

    await this._shot(shooter, goalX, (Math.random() - 0.5) * 3, 16, 0.5);

    if (ev.scoreAfter) {
      this.score = [...ev.scoreAfter];
      this.ui.updateScore(this.score, this.homeName, this.awayName);
    }

    const label = ev.scorer.name;
    const scoreStr = `${this.score[0]}-${this.score[1]}`;
    this.keyMoments.push({ minute: ev.minute, icon: '⚽', text: `${label} (${scoreStr})` });
    this.ui.addTimelineMarker(ev.minute, 'goal');

    await this._wait(0.3);
    this.ui.showGoal(ev, team === 'home' ? this.homeColor : this.awayColor);
    shooter.userData.celebrating = true;
    await this._wait(3);
    this.ui.hideGoal();
    shooter.userData.celebrating = false;

    this.players.resetPositions();
    this.ball.reset(0, 0);
    await this._wait(0.5);
  }

  async _sceneCard(ev, color) {
    const team = ev.team;
    const player = this.players.getByTeam(team).find(p => p.userData.role === 'def') || this.players.getByTeam(team)[3];
    player.position.set(10 * (team === 'home' ? -1 : 1), 0, 0);
    this.ball.reset(player.position.x + 2, player.position.z);
    this.activePlayer = null;

    const icon = color === 'yellow' ? '🟨' : '🟥';
    this.keyMoments.push({ minute: ev.minute, icon, text: ev.player.name });
    this.ui.addTimelineMarker(ev.minute, color);

    this.ui.showCard(ev.player, color);
    await this._wait(2.5);
    this.ui.hideCard();

    if (color === 'red') {
      this.players.sendOff(player);
    }

    await this._wait(0.5);
  }

  async _sceneHalftime() {
    this.phase = 'ht';
    this.ui.setPhase('ht');
    this.ui.showHalftime();
    await this._wait(HALF_TIME_PAUSE);
    this.ui.hideHalftime();
    this.phase = 'second';
    this.players.resetPositions();
    this.ball.reset(0, 0);
    const awayMid = this.players.getByTeam('away').find(p => p.userData.role === 'mid');
    if (awayMid) {
      this.ball.setOwner(awayMid);
      this.activePlayer = awayMid;
    }
    await this._wait(0.5);
  }

  async _sceneCorner(ev) {
    const team = ev.team;
    const cornerX = team === 'home' ? PITCH.length / 2 - 0.5 : -PITCH.length / 2 + 0.5;
    const cornerZ = PITCH.width / 2 - 0.5;
    const taker = this.players.getByTeam(team).find(p => p.userData.role === 'fwd');
    if (taker) {
      taker.position.set(cornerX, 0, cornerZ);
      this.ball.reset(cornerX, cornerZ);
      this.ball.setOwner(taker);
      await this._wait(0.5);
      taker.userData.kicking = true;
      const dir = new THREE.Vector3(team === 'home' ? -8 : 8, 0, -5);
      this.ball.kick(dir, 14, 3);
      await this._wait(2);
    }
    this.keyMoments.push({ minute: ev.minute, icon: '🚩', text: 'Corner' });
    this.ui.addTimelineMarker(ev.minute, 'corner');
    await this._wait(0.5);
  }

  async _sceneSave(ev) {
    const gk = this.players.getGoalkeeper('away');
    const shooter = this.players.getByTeam('home').find(p => p.userData.role === 'fwd');
    if (shooter && gk) {
      shooter.position.set(30, 0, 3);
      gk.position.set(48, 0, 0);
      this.ball.setOwner(shooter);
      await this._wait(0.4);
      await this._shot(shooter, 50, 1, 20, 0.3);
      gk.userData.targetPos = { x: 49, z: 1 };
      await this._wait(1.2);
      this.ball.velocity.set(-8, 0, 0);
      this.ball.owner = null;
    }
    this.keyMoments.push({ minute: ev.minute, icon: '🧤', text: ev.player.name });
    this.ui.addTimelineMarker(ev.minute, 'save');
    await this._wait(1);
  }

  async _scenePenalty(ev) {
    const team = ev.team;
    const shooter = this.players.getByTeam(team).find(p => p.userData.role === 'fwd');
    const gk = this.players.getGoalkeeper(team === 'home' ? 'away' : 'home');
    const goalX = team === 'home' ? PITCH.length / 2 - 11 : -PITCH.length / 2 + 11;

    if (shooter && gk) {
      shooter.position.set(goalX, 0, 0);
      gk.position.set(team === 'home' ? 50 : -50, 0, 0);
      this.ball.reset(goalX, 0);
      this.ball.setOwner(shooter);
      await this._wait(1.5);
      await this._shot(shooter, team === 'home' ? 52 : -52, 2, 15, 0.2);
    }

    if (ev.scoreAfter) {
      this.score = [...ev.scoreAfter];
      this.ui.updateScore(this.score, this.homeName, this.awayName);
    }

    const scoreStr = `${this.score[0]}-${this.score[1]}`;
    this.keyMoments.push({ minute: ev.minute + (ev.extraMinute || 0), icon: '⚽', text: `${ev.scorer.name} (PEN) (${scoreStr})` });
    this.ui.addTimelineMarker(ev.minute + (ev.extraMinute || 0), 'penalty');

    await this._wait(0.3);
    this.ui.showGoal(ev, team === 'home' ? this.homeColor : this.awayColor);
    if (shooter) shooter.userData.celebrating = true;
    await this._wait(3);
    this.ui.hideGoal();
    if (shooter) shooter.userData.celebrating = false;
    await this._wait(0.5);
  }

  async _sceneFulltime() {
    this.finished = true;
    this.running = false;
    this.phase = 'ft';
    this.ui.setPhase('ft');
    this.ui.showFulltime({
      homeName: this.homeName,
      awayName: this.awayName,
      score: this.score,
      potm: this.script.potm,
      keyMoments: this.keyMoments,
    });
    this._emit();
  }
}
