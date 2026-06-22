// Pitchside — scripted highlights engine.
// Drives ball physics + player movement and fires UI events on cue.
import { FIELD } from './config.js';

const AWAY_GOAL_X = FIELD.halfL;   // +52.5  (Arsenal goal — Chelsea attacks here)
const HOME_GOAL_X = -FIELD.halfL;  // -52.5  (Chelsea goal — Arsenal attacks here)
const lerp = (a, b, t) => a + (b - a) * t;

// Phase time-base (real seconds at 1×) → displayed clock minutes.
const FH_END = 66, HT_END = 73, SH_END = 151;

class Ball {
  constructor() { this.reset(); }
  reset() { this.x = 0; this.y = 0.22; this.z = 0; this.vx = 0; this.vz = 0; this.mode = 'idle'; this.onArrive = null; }
  kickTo(tx, tz, time, arc = 0, onArrive = null) {
    this.mode = 'kick';
    this.sx = this.x; this.sz = this.z; this.tx = tx; this.tz = tz;
    this.kt = 0; this.kdur = time; this.arc = arc; this.onArrive = onArrive;
  }
  roll(vx, vz) { this.mode = 'roll'; this.vx = vx; this.vz = vz; }
  stop() { this.mode = 'idle'; this.vx = 0; this.vz = 0; }
  update(dt) {
    if (this.mode === 'kick') {
      this.kt += dt;
      const u = Math.min(this.kt / this.kdur, 1);
      const e = u; // linear travel keeps passes predictable for receivers
      this.x = lerp(this.sx, this.tx, e);
      this.z = lerp(this.sz, this.tz, e);
      this.y = 0.22 + this.arc * 4 * u * (1 - u);
      if (u >= 1) {
        this.y = 0.22; this.mode = 'idle';
        const cb = this.onArrive; this.onArrive = null;
        if (cb) cb();
      }
    } else if (this.mode === 'roll') {
      this.x += this.vx * dt; this.z += this.vz * dt;
      const f = Math.pow(0.1, dt);
      this.vx *= f; this.vz *= f; this.y = 0.22;
      if (Math.hypot(this.vx, this.vz) < 0.25) this.stop();
    }
  }
}

export class Match {
  constructor(stadium, ui) {
    this.s = stadium;
    this.ui = ui;
    this.ball = new Ball();
    this.reset();
  }

  reset() {
    this.T = 0;
    this.score = { home: 0, away: 0 };
    this.phase = 'FIRST HALF';
    this.live = true;
    this.paused = false;
    this.frozen = false;       // half-time freeze
    this.finished = false;
    this.camMode = 'broadcast';
    this.camTarget = { x: 0, z: 0 };
    this.timers = [];
    this.keyMoments = [];
    this.cards = { home: 0, away: 0 };
    this.cueIndex = 0;
    this.ball.reset();
    this._kickoffShape();
    this._buildCues();
    this.ui.onScore(0, 0);
    this.ui.onPhase(this.phase);
    this.ui.onCommentary('Kick-off approaches at the Bridge — a glittering night for football.');
  }

  // ---- helpers ----------------------------------------------------------
  P(side, n) { return this.s.players[side].find((p) => p.number === n); }
  go(p, x, z, speed = 7) { p.tx = x; p.tz = z; p.speed = speed; }
  after(delay, fn) { this.timers.push({ at: this.T + delay, fn }); }

  _kickoffShape() {
    for (const side of ['home', 'away']) {
      this.s.players[side].forEach((p) => { p.tx = p.baseX; p.tz = p.baseZ; p.celebrate = 0; });
    }
    this.go(this.s.referee, 5, -7, 5);
    this.ball.x = 0; this.ball.z = 0; this.ball.y = 0.22; this.ball.stop();
  }

  // Move everyone home, drop the ball to centre, brief pause, then continue.
  restartKickoff(possession = 'home') {
    this._kickoffShape();
    this.camMode = 'broadcast';
    // Centre two forwards over the ball.
    const fw = this.P(possession, possession === 'home' ? 20 : 9);
    this.go(fw, 1.2, 0, 6);
  }

  pass(tx, tz, time, arc, onArrive) { this.ball.kickTo(tx, tz, time, arc, onArrive); }

  shoot(p, tx, tz, time, arc, onArrive) {
    this.s.triggerKick(p, Math.atan2(tx - p.x, tz - p.z));
    this.after(0.12, () => this.ball.kickTo(tx, tz, time, arc, onArrive));
  }

  goalSequence(team, data) {
    this.score[team]++;
    this.ui.onScore(this.score.home, this.score.away);
    this.ui.onGoal(team, data);
    this.ui.onCommentary(`GOAL! ${data.scorer} makes it ${this.score.home}-${this.score.away}! ${data.blurb || ''}`);
    this.keyMoments.push({ minute: data.minute, type: 'goal', team, text: `${data.scorer} ${data.minute}'` });
    this.ui.onTimeline(this.keyMoments);
    // Celebration: scorer + nearby team-mates run to the corner flag.
    const scorer = this.P(team, data.number);
    scorer.celebrate = 3.2;
    const cornerX = team === 'home' ? AWAY_GOAL_X - 8 : HOME_GOAL_X + 8;
    const cornerZ = 26;
    this.go(scorer, cornerX, cornerZ, 9);
    this.camMode = 'celebrate';
    this.camTarget = { x: cornerX, z: cornerZ };
    let mate = 0;
    for (const p of this.s.players[team]) {
      if (p === scorer || p.isGK) continue;
      if (mate++ > 3) break;
      this.go(p, cornerX - 3 + mate, cornerZ - 4 - mate, 8.5);
      p.celebrate = 2.6;
    }
    this.after(4.2, () => { this.restartKickoff(team === 'home' ? 'away' : 'home'); });
  }

  card(team, colour, data) {
    this.cards[team]++;
    this.ui.onCard(team, colour, data);
    this.ui.onCommentary(
      colour === 'red'
        ? `RED CARD! ${data.player} is sent off — second bookable offence!`
        : `Yellow card shown to ${data.player}.`);
    this.keyMoments.push({ minute: data.minute, type: colour, team, text: `${data.player} ${data.minute}'` });
    this.ui.onTimeline(this.keyMoments);
    // Referee jogs in and brandishes.
    const ref = this.s.referee;
    this.go(ref, data.x ?? 0, (data.z ?? 0) - 2, 7);
    ref.celebrate = 0; ref.rArm.rotation.x = -2.4;
    this.after(2.2, () => { ref.rArm.rotation.x = 0; });
  }

  // ---- scripted timeline ------------------------------------------------
  _buildCues() {
    const cues = [];
    const C = (t, run, msg) => cues.push({ t, run, msg, fired: false });

    // === FIRST HALF ====================================================
    C(0.5, () => {
      this.ui.onCommentary('Kick-off! Chelsea get us under way in front of a packed house.');
      const palmer = this.P('home', 20);
      this.go(palmer, 8, 4, 7.5);
      this.go(this.P('home', 10), 18, -8, 7.5);
      this.pass(7, 3, 1.0);
    });
    C(2.0, () => {
      this.ui.onCommentary('Chelsea knock it about — Caicedo to Sterling.');
      this.go(this.P('home', 10), 22, -9, 8);
      this.pass(20, -9, 1.1);
    });
    C(3.6, () => {
      this.go(this.P('home', 10), 30, -4, 8);
      this.go(this.P('home', 20), 36, 8, 8.5);
      this.pass(30, -4, 1.0);
    });
    C(5.2, () => {
      this.ui.onCommentary('Sterling drives forward, looks for Palmer...');
      this.go(this.P('home', 20), 41, 9, 9);
      this.pass(40, 9, 0.9);
    });
    // Saved shot.
    C(6.6, () => {
      const palmer = this.P('home', 20);
      this.ui.onCommentary('Palmer lets fly from the angle —');
      const raya = this.P('away', 22);
      this.go(raya, AWAY_GOAL_X - 1.2, 3.5, 11);
      this.shoot(palmer, AWAY_GOAL_X - 1.5, 4.5, 0.55, 0.5, () => {
        this.ui.onSave('RAYA');
        this.ui.onCommentary('— SAVED! Raya throws up a strong hand to deny Chelsea!');
        this.ball.roll(-2, 16); // parried out for a corner
      });
    });

    // Goal 1 — Chelsea, Palmer (assist Sterling), ~23'.
    C(11.0, () => {
      this.ui.onCommentary('Chelsea work it wide to Sterling on the overlap.');
      this.restartKickoff('home');
      this.go(this.P('home', 10), 34, 18, 8.5);
      this.go(this.P('home', 20), 40, 2, 8);
      this.after(1.0, () => this.pass(33, 18, 1.1));
    });
    C(13.2, () => {
      this.ui.onCommentary('Sterling to the byline — cuts it back!');
      this.go(this.P('home', 20), 44, 1, 9.5);
      this.pass(43, 1, 0.9);
    });
    C(14.4, () => {
      const palmer = this.P('home', 20);
      const raya = this.P('away', 22);
      this.go(raya, AWAY_GOAL_X - 1.2, -3, 9);
      this.shoot(palmer, AWAY_GOAL_X + 1.1, 1.4, 0.5, 0.35, () => {
        this.ball.stop();
        this.goalSequence('home', {
          scorer: 'COLE PALMER', number: 20, minute: 23, name: 'COLE PALMER',
          assist: 'R. STERLING', blurb: 'Ice-cold from the cut-back.',
        });
      });
    });

    // Foul + yellow card (~31').
    C(21.0, () => {
      this.ui.onCommentary('Arsenal break — Saka surges past Cucurella...');
      this.go(this.P('away', 7), -20, -16, 9);
      this.go(this.P('home', 21), -22, -14, 9);
      this.ball.x = -18; this.ball.z = -16; this.ball.stop();
    });
    C(23.0, () => {
      this.ui.onCommentary('— and he is hauled down! The referee reaches for his pocket.');
      this.card('away', 'yellow', { player: 'B. SALIBA', number: 2, minute: 31, x: -20, z: -15 });
      this.go(this.P('away', 7), -19, -16, 4);
    });

    // Goal 2 — Arsenal equalise from a corner (~40').
    C(28.0, () => {
      this.ui.onCommentary('Corner for Arsenal on the left — Ødegaard to deliver.');
      this.restartKickoff('away');
      // Swing several Arsenal bodies into the Chelsea box.
      this.ball.x = HOME_GOAL_X + 1; this.ball.z = -32; this.ball.stop();
      this.go(this.P('away', 8), HOME_GOAL_X + 2, -31, 8);
      this.go(this.P('away', 6), HOME_GOAL_X + 9, -3, 8.5);
      this.go(this.P('away', 2), HOME_GOAL_X + 11, 4, 8);
      this.go(this.P('home', 1), HOME_GOAL_X + 1.2, 0, 6);
    });
    C(30.5, () => {
      this.ui.onCommentary('In it comes...');
      this.pass(HOME_GOAL_X + 8, -1, 1.0, 3.2);
      this.go(this.P('away', 6), HOME_GOAL_X + 7, -1, 9.5);
    });
    C(31.6, () => {
      const gab = this.P('away', 6);
      this.s.triggerKick(gab, Math.atan2(-1, 0));
      this.ui.onCommentary('Gabriel rises highest —');
      this.go(this.P('home', 1), HOME_GOAL_X + 1, 3, 9);
      this.pass(HOME_GOAL_X - 1.1, -0.5, 0.45, 0.6, () => {
        this.ball.stop();
        this.goalSequence('away', {
          scorer: 'GABRIEL', number: 6, minute: 40, name: 'GABRIEL MAGALHÃES',
          assist: 'M. ØDEGAARD', blurb: 'A bullet header from the corner!',
        });
      });
    });

    // HALF TIME.
    C(FH_END - 0.5, () => {
      this.phase = 'HALF TIME';
      this.live = false;
      this.frozen = true;
      this.ui.onPhase('HALF TIME');
      this.ui.onHalfTime(this.score);
      this.ui.onCommentary('Half time at the Bridge. Chelsea 1, Arsenal 1 — all to play for.');
    });
    C(HT_END, () => {
      this.phase = 'SECOND HALF';
      this.live = true;
      this.frozen = false;
      this.ui.onPhase('SECOND HALF');
      this.ui.onHideHalfTime();
      this.restartKickoff('home');
      this.ui.onCommentary('We are back under way for the second half.');
    });

    // === SECOND HALF ===================================================
    // Build-up to a foul in the box → second yellow = RED + penalty.
    C(HT_END + 22, () => {
      this.ui.onCommentary('Palmer threads it through for Jackson into the box!');
      this.go(this.P('home', 15), AWAY_GOAL_X - 8, 3, 9.5);
      this.go(this.P('away', 2), AWAY_GOAL_X - 9, 4, 9);
      this.pass(AWAY_GOAL_X - 9, 3, 1.0);
    });
    C(HT_END + 24, () => {
      this.ui.onCommentary('Saliba brings him down — PENALTY! And it is a second yellow...');
      this.ball.stop();
      this.card('away', 'red', { player: 'B. SALIBA', number: 2, minute: 62, x: AWAY_GOAL_X - 9, z: 3 });
      // Sent-off player trudges off; rest reorganise.
      const off = this.P('away', 2);
      this.after(2.0, () => this.go(off, AWAY_GOAL_X - 2, -38, 6));
      // Set up the spot kick.
      this.after(2.5, () => {
        this.ui.onCommentary('Palmer places it on the spot. Raya to face his old foe...');
        this.ball.x = AWAY_GOAL_X - 11; this.ball.z = 0; this.ball.stop();
        this.go(this.P('home', 20), AWAY_GOAL_X - 13, 0, 5);
        this.go(this.P('away', 22), AWAY_GOAL_X - 1, 0, 5);
      });
    });
    // Penalty goal — Chelsea 2-1, Palmer 64'.
    C(HT_END + 31, () => {
      const palmer = this.P('home', 20);
      const raya = this.P('away', 22);
      this.go(raya, AWAY_GOAL_X - 1.2, -3.2, 12); // dives the wrong way
      this.shoot(palmer, AWAY_GOAL_X + 1.1, 2.0, 0.45, 0.25, () => {
        this.ball.stop();
        this.goalSequence('home', {
          scorer: 'COLE PALMER', number: 20, minute: 64, name: 'COLE PALMER',
          assist: 'WON & SCORED', blurb: 'Sends Raya the wrong way from twelve yards!',
        });
      });
    });

    // Late Arsenal pressure — a fine save.
    C(HT_END + 50, () => {
      this.ui.onCommentary('Arsenal throw bodies forward — Saka cuts inside...');
      this.restartKickoff('away');
      this.go(this.P('away', 7), HOME_GOAL_X + 16, -6, 9.5);
      this.after(1.2, () => this.pass(HOME_GOAL_X + 16, -6, 1.1));
    });
    C(HT_END + 52, () => {
      const saka = this.P('away', 7);
      const sanchez = this.P('home', 1);
      this.go(sanchez, HOME_GOAL_X + 1.2, -3, 11);
      this.shoot(saka, HOME_GOAL_X - 1.4, -3.5, 0.5, 0.45, () => {
        this.ui.onSave('SÁNCHEZ');
        this.ui.onCommentary('— and Sánchez is equal to it! Huge save to protect the lead.');
        this.ball.roll(3, -14);
      });
    });

    // FULL TIME.
    C(SH_END - 0.5, () => {
      this.phase = 'FULL TIME';
      this.live = false;
      this.finished = true;
      this.ui.onPhase('FULL TIME');
      this.ui.onCommentary('Full time! Chelsea hold on to win a London derby thriller, 2-1.');
      this.ui.onFullTime({
        score: { ...this.score },
        potm: { name: 'COLE PALMER', number: 20, team: 'home', rating: '9.2' },
        moments: this.keyMoments,
      });
    });

    this.cues = cues.sort((a, b) => a.t - b.t);
  }

  // ---- clock ------------------------------------------------------------
  clockText() {
    let minutes;
    if (this.phase === 'FIRST HALF') minutes = Math.min(45, (this.T / FH_END) * 45);
    else if (this.phase === 'HALF TIME') minutes = 45;
    else if (this.phase === 'SECOND HALF') minutes = Math.min(90, 45 + ((this.T - HT_END) / (SH_END - HT_END)) * 45);
    else minutes = 90;
    const mm = Math.floor(minutes);
    const ss = Math.floor((minutes - mm) * 60);
    return { text: `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, frac: minutes / 90 };
  }

  // ---- main step --------------------------------------------------------
  update(rawDt) {
    if (this.paused || this.finished && this.T >= SH_END) {
      // still render camera drift / freeze
    }
    const dt = this.paused ? 0 : rawDt;

    // The clock keeps advancing while only the user pause stops it — the
    // half-time freeze (this.frozen) holds play but must let time reach the
    // cue that restarts the second half.
    if (!this.paused) this.T += dt;

    // Fire scheduled callbacks.
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.T >= this.timers[i].at) {
        const fn = this.timers[i].fn;
        this.timers.splice(i, 1);
        fn();
      }
    }
    // Fire cues.
    while (this.cueIndex < this.cues.length && this.T >= this.cues[this.cueIndex].t) {
      const cue = this.cues[this.cueIndex++];
      cue.run();
    }

    // Physics + characters (held during a user pause or the half-time freeze).
    if (!this.paused && !this.frozen) {
      const prevX = this.ball.x, prevZ = this.ball.z;
      this.ball.update(dt);
      this.s.update(dt);
      this.s.setBall(this.ball.x, this.ball.y, this.ball.z);
      this.s.spinBall(this.ball.x - prevX, this.ball.z - prevZ, dt || 0.0001);
    }

    // Camera follow.
    if (this.camMode === 'broadcast') this.camTarget = { x: this.ball.x, z: this.ball.z };
    this.s.updateCamera(this.camTarget, rawDt, this.camMode);

    // Drop celebration camera back to broadcast a moment after a goal.
    if (this.camMode === 'celebrate' && !this._camReset) {
      this._camReset = true;
      this.after(3.6, () => { this.camMode = 'broadcast'; this._camReset = false; });
    }

    // Clock to UI.
    const c = this.clockText();
    this.ui.onClock(c.text, c.frac, this.live);
  }

  setPaused(v) { this.paused = v; }
  restart() { this.ui.onHideOverlays(); this.reset(); }
}
