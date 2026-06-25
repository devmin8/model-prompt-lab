import * as THREE from 'three';
import { createScene, createRenderer, createLights, createPitch, resizeRenderer } from './scene.js';
import { createCamera, BroadcastCamera } from './camera.js';
import { PlayerManager } from './players.js';
import { Ball } from './ball.js';
import { buildScript, MatchController } from './match.js';
import { UIController } from './ui.js';
import { PITCH, MATCH } from './config.js';

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.scene = createScene();
    this.camera = createCamera();
    this.renderer = createRenderer(this.canvas);
    this.bc = new BroadcastCamera(this.camera);
    createLights(this.scene);
    createPitch(this.scene);

    this.teams = null;
    this.players = null;
    this.ball = null;
    this.match = null;
    this.ui = new UIController(null);
    this.paused = false;
    this.eventState = {};
    this.shotFired = false;
    this.celebrating = false;
    this.lastTime = 0;
    this.running = false;

    this._bindUI();
    window.addEventListener('resize', () => resizeRenderer(this.renderer, this.camera, this.canvas));

    this._looping = true;
    this.lastTime = performance.now();
    this._loop();
  }

  _bindUI() {
    this.ui.onStart = (teams) => this.startMatch(teams);
    this.ui.onPause = () => { this.paused = true; if (this.match) this.match.setPaused(true); };
    this.ui.onResume = () => { this.paused = false; if (this.match) this.match.setPaused(false); };
    this.ui.onRestart = () => { if (this.teams) this.startMatch(this.teams); };
    this.ui.onNewMatch = () => { this.running = false; this.ui.showSetup(); };
    this.ui.onSpeed = (s) => { if (this.match) this.match.setSpeed(s); };
  }

  startMatch(teams) {
    if (this.players) {
      for (const p of [...this.players.players]) {
        this.scene.remove(p);
      }
    }
    if (this.ball) {
      this.scene.remove(this.ball.mesh);
    }

    this.teams = teams;
    this.players = new PlayerManager(this.scene, teams);
    this.ball = new Ball(this.scene);
    this.paused = false;
    this.eventState = {};
    this.shotFired = false;
    this.celebrating = false;

    const script = buildScript(teams.home.name, teams.away.name);
    this.match = new MatchController(script, {
      onCommentary: (t) => this.ui.setCommentary(t),
      onKickoff: (side) => this._doKickoff(side),
      onPhaseChange: (p) => this.ui.setPhase(p),
      onCard: (type, ev) => this._doCard(type, ev),
      onEventStart: (ev) => this._onEventStart(ev),
      onEventEnd: (ev) => this._onEventEnd(ev),
      onGoalUpdate: (ev, t, dt) => this._onGoalUpdate(ev, t),
      onGoalScored: (ev, score) => this._onGoalScored(ev, score),
      onSaveUpdate: (ev, t, dt) => this._onSaveUpdate(ev, t),
      onPenaltyUpdate: (ev, t, dt) => this._onPenaltyUpdate(ev, t),
      onGeneralPlay: (ev, t, dt) => this._onGeneralPlay(ev, t, dt),
      onFullTime: () => this._onFullTime(),
    });

    this.match.reset();
    this.ui.showMatch(teams);
    this.ui.updateScore(0, 0);
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();

    requestAnimationFrame(() => {
      resizeRenderer(this.renderer, this.camera, this.canvas);
    });
  }

  _doKickoff(side) {
    this.players.kickoffPositions(side);
    this.ball.reset(0, 0);
    this.bc.setMode('wide');
    this.celebrating = false;
    this.players.stopCelebration();
  }

  _doCard(type, ev) {
    const player = this.players.findPlayer(ev.side, ev.player);
    if (type === 'yellow') {
      const key = `${ev.side}-${ev.player}`;
      if (this.match.yellowCards[key]) {
        this.players.sendOff(player);
      } else {
        this.match.yellowCards[key] = true;
      }
    } else if (type === 'red') {
      this.players.sendOff(player);
    }
    this.bc.setMode('close');
  }

  _onEventStart(ev) {
    this.shotFired = false;
    this.eventState = { phase: 'setup' };

    if (ev.setup) {
      const s = ev.setup;
      if (s.ball) this.ball.reset(s.ball.x, s.ball.z);
      if (s.shooter) {
        const shooter = this.players.findPlayer(ev.side, s.shooter);
        if (shooter) {
          this.players.setTarget(shooter, s.ball?.x || shooter.position.x, s.ball?.z || shooter.position.z, 6);
          if (s.passer) {
            const passer = this.players.findPlayer(ev.side, s.passer);
            this.players.setTarget(passer, (s.ball?.x || 0) - 5, s.ball?.z || 0, 7);
          }
        }
      }
    }

    if (ev.type === 'goal' || ev.type === 'penalty') this.bc.setMode('close');
    if (ev.type === 'save') this.bc.setMode('goal');
    if (ev.type === 'corner') this.bc.setMode('close');
  }

  _onEventEnd(ev) {
    if (ev.type === 'goal' || ev.type === 'penalty') {
      this.celebrating = false;
      this.players.stopCelebration();
      this.bc.setMode('wide');
    }
    if (ev.type === 'halftime') {
      this.bc.setMode('wide');
    }
  }

  _onGoalUpdate(ev, t) {
    const shooter = this.players.findPlayer(ev.side, ev.scorer);
    const s = ev.setup;

    if (t < 3 && s?.passer) {
      const passer = this.players.findPlayer(ev.side, s.passer);
      if (passer && t > 1 && !this.shotFired) {
        this.ball.passTo(s.ball.x, s.ball.z, 16);
        this.players.setKick(passer);
        this.players.setTarget(ev.side === 'home' ? this.players.findPlayer(ev.side, ev.scorer) : shooter,
          s.ball.x + 3, s.ball.z, 8);
      }
    }

    if (t > 4 && t < 6 && shooter && !this.shotFired) {
      this.ball.setOwner(shooter);
      this.players.setTarget(shooter, s.ball.x, s.ball.z, 0);
    }

    if (t > 6 && !this.shotFired) {
      this.shotFired = true;
      this.players.setKick(shooter);
      const shot = ev.shot;
      const dx = shot.targetX - this.ball.pos.x;
      const dz = shot.targetZ - this.ball.pos.z;
      this.ball.kick({ x: dx, z: dz }, shot.power, shot.loft || 0);
      this.bc.setMode('goal');
      this.bc.shake(0.4);
    }

    if (this.shotFired && this.ball.isInGoal()) {
      const goal = this.ball.isInGoal();
      if ((ev.side === 'home' && goal === 'away') || (ev.side === 'away' && goal === 'home')) {
        return 'scored';
      }
    }

    if (this.shotFired && !this.ball.isMoving() && t > 9) {
      if (ev.side === 'home' && this.ball.pos.x > PITCH.length / 2 - 2) return 'scored';
      if (ev.side === 'away' && this.ball.pos.x < -PITCH.length / 2 + 2) return 'scored';
    }

    return null;
  }

  _onGoalScored(ev, score) {
    this.ui.updateScore(score.home, score.away);
    const color = ev.side === 'home' ? this.teams.home.color : this.teams.away.color;
    this.ui.showGoal(ev, score, color);
    this.celebrating = true;
    this.players.startCelebration(ev.side);
    this.bc.setMode('close');
  }

  _onSaveUpdate(ev, t) {
    const shooterSide = ev.side === 'home' ? 'away' : 'home';
    const shooter = this.players.findPlayer(shooterSide, ev.setup?.shooter);
    const gk = this.players.findPlayer(ev.side === 'home' ? 'home' : 'away', ev.gk);

    if (t < 2 && ev.setup) {
      this.ball.reset(ev.setup.ball.x, ev.setup.ball.z);
      if (shooter) this.players.setTarget(shooter, ev.setup.ball.x, ev.setup.ball.z, 5);
    }

    if (t > 3 && t < 5 && shooter && !this.shotFired) {
      this.ball.setOwner(shooter);
    }

    if (t > 5 && !this.shotFired) {
      this.shotFired = true;
      this.players.setKick(shooter);
      const shot = ev.shot;
      this.ball.kick(
        { x: shot.targetX - this.ball.pos.x, z: shot.targetZ - this.ball.pos.z },
        shot.power, 0.2
      );
      if (gk) this.players.setTarget(gk, ev.shot.targetX > 0 ? 50 : -50, ev.shot.targetZ, 8);
    }
  }

  _onPenaltyUpdate(ev, t) {
    const taker = this.players.findPlayer(ev.side, ev.taker);
    const gkSide = ev.side === 'home' ? 'home' : 'away';
    const gk = this.players.findPlayer(ev.side, ev.gk) ||
      this.players.findPlayer(ev.side === 'home' ? 'away' : 'home', ev.gk);
    const awayGk = this.players.findPlayer('away', 22);

    this.bc.setMode('penalty');

    if (t < 2) {
      this.ball.reset(ev.setup.ball.x, ev.setup.ball.z);
      if (taker) {
        taker.position.set(ev.setup.ball.x - 2, 0, 0);
        this.players.setTarget(taker, ev.setup.ball.x - 1, 0, 2);
      }
      if (awayGk) this.players.setTarget(awayGk, 50, 0, 3);
    }

    if (t > 4 && t < 6 && taker && !this.shotFired) {
      this.ball.setOwner(taker);
    }

    if (t > 6 && !this.shotFired) {
      this.shotFired = true;
      this.players.setKick(taker);
      if (ev.scored !== false) {
        this.ball.kick({ x: 1, z: 0.3 }, ev.shot.power, 0.05);
      } else {
        this.ball.kick({ x: 1, z: 0.5 }, ev.shot.power * 0.9, 0.1);
        if (awayGk) {
          this.players.setTarget(awayGk, 51, 3, 10);
        }
      }
      this.bc.shake(0.3);
    }

    if (this.shotFired && t > 8) {
      if (ev.scored !== false && this.ball.isInGoal()) return 'scored';
      if (ev.scored === false && t > 8.5) return 'saved';
    }
    return null;
  }

  _onGeneralPlay(ev, t, dt) {
    const bx = this.ball.pos.x;
    const bz = this.ball.pos.z;
    const wander = Math.sin(t * 0.5) * 15;

    if (t < 1) {
      this.ball.passTo(wander, Math.sin(t) * 10, 12);
    }

    this.players.homePlayers?.forEach((p, i) => {
      if (!p.userData.celebrating && !p.userData.sentOff) {
        const base = p.userData.basePos;
        this.players.setTarget(p, base.x + wander * 0.1, base.z + Math.sin(t + i) * 3, 3);
      }
    });
    this.players.awayPlayers?.forEach((p, i) => {
      if (!p.userData.celebrating && !p.userData.sentOff) {
        const base = p.userData.basePos;
        this.players.setTarget(p, base.x - wander * 0.1, base.z + Math.cos(t + i) * 3, 3);
      }
    });

    this.bc.setMode('wide');
  }

  _onFullTime() {
    const score = this.match.score;
    this.ui.showFullTime(this.teams, score, this.match.potm, this.match.keyMoments);
  }

  _loop() {
    requestAnimationFrame(() => this._loop());

    const now = performance.now();
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.running && !this.paused && this.match) {
      const result = this.match.update(rawDt);
      if (result) {
        this.ui.updateClock(this.match.matchMinute);
        this.ui.updateScore(this.match.score.home, this.match.score.away);
      }

      if (this.ball && this.players) {
        this.ball.update(rawDt, this.players);
        this.players.update(rawDt);
        this.bc.update(this.ball.pos, rawDt);
      }
    }

    resizeRenderer(this.renderer, this.camera, this.canvas);
    this.renderer.render(this.scene, this.camera);
  }
}

new GameEngine();
