// match.js — match engine: squads, ball physics, scripted highlights director,
// clock and phases. Emits events to the UI via onEvent().

import * as THREE from 'three';
import { PITCH, CLOCK, REFEREE_COLOR } from './config.js';

const HALF_L = PITCH.length / 2;

export const PHASE = {
  KICKOFF: 'KICK OFF',
  FIRST: 'FIRST HALF',
  HALFTIME: 'HALF TIME',
  SECOND: 'SECOND HALF',
  FULLTIME: 'FULL TIME',
};

// Squad sheets. Home attacks +X (scores in the right goal), away attacks -X.
const HOME_SQUAD = {
  gk: { n: 1, name: 'R. SANCHEZ' },
  def: [
    { n: 24, name: 'R. JAMES' }, { n: 6, name: 'T. SILVA' },
    { n: 2, name: 'A. DISASI' }, { n: 21, name: 'B. CHILWELL' },
  ],
  mid: [
    { n: 8, name: 'E. FERNANDEZ' }, { n: 25, name: 'M. CAICEDO' },
    { n: 10, name: 'M. MUDRYK' },
  ],
  fwd: [
    { n: 17, name: 'R. STERLING' }, { n: 9, name: 'N. JACKSON' },
    { n: 20, name: 'COLE PALMER' },
  ],
};
const AWAY_SQUAD = {
  gk: { n: 1, name: 'D. RAYA' },
  def: [
    { n: 4, name: 'B. WHITE' }, { n: 6, name: 'G. MAGALHAES' },
    { n: 2, name: 'W. SALIBA' }, { n: 35, name: 'O. ZINCHENKO' },
  ],
  mid: [
    { n: 8, name: 'M. ODEGAARD' }, { n: 41, name: 'D. RICE' },
    { n: 29, name: 'K. HAVERTZ' },
  ],
  fwd: [
    { n: 7, name: 'B. SAKA' }, { n: 9, name: 'G. JESUS' },
    { n: 19, name: 'L. TROSSARD' },
  ],
};

export class Match {
  constructor(world, teams, onEvent) {
    this.world = world;
    this.teams = teams;
    this.onEvent = onEvent || (() => {});

    this.paused = false;
    this.speed = 1;
    this.matchSeconds = 0;
    this.phase = PHASE.KICKOFF;
    this.score = { home: 0, away: 0 };
    this.events = []; // {minute, type, team, label}
    this.ratings = {}; // number -> rating bump
    this._timers = [];
    this._ballTween = null;
    this._scripted = false;
    this._idleTimer = 1.5;
    this._halfTimer = 0;
    this._inHalfBreak = false;
    this._cueIdx = 0;
    this._celebrating = false;
    this._finished = false;

    this._buildSquads();
    this._buildCues();
    this._kickoff(true);
  }

  // --- Setup -------------------------------------------------------------

  _buildSquads() {
    const t = this.teams;
    const make = (squad, kit, side) => {
      // side = -1 home (left, attacks +X), +1 away (right, attacks -X).
      const list = [];
      const mk = (info, role, x, z) => {
        const isGK = role === 'GK';
        const p = this.world.makePlayer({
          shirt: new THREE.Color(isGK ? kit.gk : kit.kit),
          shorts: new THREE.Color(isGK ? kit.gk : kit.kitShort),
          socks: new THREE.Color(isGK ? kit.gk : kit.socks),
          number: info.n, role,
        });
        p.name = info.name;
        p.team = side < 0 ? 'home' : 'away';
        p.home.set(x, 0, z);
        p.pos.set(x, 0, z);
        p.target.copy(p.pos);
        list.push(p);
        return p;
      };
      const dir = side < 0 ? 1 : -1; // attack direction along X
      const gx = side < 0 ? -HALF_L + 3 : HALF_L - 3;
      mk(squad.gk, 'GK', gx, 0);
      const defX = -dir * 34;
      const defZ = [-22, -9, 9, 22];
      squad.def.forEach((d, i) => mk(d, 'DEF', defX, defZ[i]));
      const midX = -dir * 14;
      const midZ = [-17, 0, 17];
      squad.mid.forEach((m, i) => mk(m, 'MID', midX, midZ[i]));
      const fwdX = dir * 7;
      const fwdZ = [-18, 0, 18];
      squad.fwd.forEach((f, i) => mk(f, 'FWD', fwdX, fwdZ[i]));
      return list;
    };

    this.homePlayers = make(HOME_SQUAD, t.home, -1);
    this.awayPlayers = make(AWAY_SQUAD, t.away, 1);
    this.players = [...this.homePlayers, ...this.awayPlayers];

    // Referee in black, central.
    this.referee = this.world.makePlayer({
      shirt: new THREE.Color(REFEREE_COLOR),
      shorts: new THREE.Color(REFEREE_COLOR),
      socks: new THREE.Color(REFEREE_COLOR),
      number: 0, role: 'REF',
    });
    this.referee.home.set(4, 0, 8);
    this.referee.pos.copy(this.referee.home);
    this.referee.target.copy(this.referee.home);

    this.find = (team, n) =>
      (team === 'home' ? this.homePlayers : this.awayPlayers).find((p) => p.number === n);
  }

  _kickoff(initial) {
    this.world.setBall(0, 0);
    this._ballTween = null;
    this.ballPos = new THREE.Vector3(0, 0.34, 0);
    this.ballVel = new THREE.Vector3();
    // Send everyone back to formation.
    for (const p of this.players) p.target.copy(p.home);
    this.referee.target.copy(this.referee.home);
    if (initial) this.phase = PHASE.KICKOFF;
  }

  // --- Scheduling helpers ------------------------------------------------

  after(sec, fn) {
    this._timers.push({ left: sec, fn });
  }

  // Tween the ball along an arc to a destination over `dur` seconds.
  passBall(to, dur, arc = 2.5, onDone) {
    const from = this.world.ball.position.clone();
    this._ballTween = { from, to: new THREE.Vector3(to.x, to.y ?? 0.34, to.z), dur, t: 0, arc, onDone };
  }

  // Move a player toward a spot; optional speed override.
  run(player, x, z, speed) {
    player.target.set(x, 0, z);
    if (speed) player.tmpSpeed = speed;
  }

  rate(team, n, amount) {
    const key = team + n;
    this.ratings[key] = (this.ratings[key] || 0) + amount;
  }

  // --- Controls ----------------------------------------------------------

  setPaused(v) { this.paused = v; }
  setSpeed(v) { this.speed = v; }

  restart() {
    // Reset to the very start.
    this.matchSeconds = 0;
    this.phase = PHASE.KICKOFF;
    this.score = { home: 0, away: 0 };
    this.events = [];
    this.ratings = {};
    this._timers = [];
    this._cueIdx = 0;
    this._scripted = false;
    this._celebrating = false;
    this._finished = false;
    this._inHalfBreak = false;
    this._idleTimer = 1.5;
    for (const p of this.players) { p.sentOff = false; p.mesh.visible = true; }
    this._kickoff(true);
    this.onEvent({ type: 'reset' });
    this.onEvent({ type: 'commentary', text: 'We are back under way — kick off!' });
    this.after(0.6, () => { this.phase = PHASE.FIRST; });
  }

  // --- The match story ---------------------------------------------------

  _buildCues() {
    const C = this.teams;
    this.cues = [
      { m: 0.4, fn: () => {
        this.phase = PHASE.FIRST;
        this.onEvent({ type: 'commentary', text: `Kick off! ${C.home.name} get us under way.` });
      }},
      { m: 5, fn: () => this._knockabout('home') },
      { m: 13, fn: () => this._goalSequence('home', 9, 10) },     // Jackson, asst Mudryk
      { m: 22, fn: () => this._knockabout('away') },
      { m: 26, fn: () => this._foulCard('away', 41, 'yellow') },   // Rice booked
      { m: 31, fn: () => this._saveSequence('home', 17) },         // Sterling shot saved
      { m: 35, fn: () => this._cornerSequence('home', 8) },        // Fernandez corner
      { m: 40, fn: () => this._goalSequence('away', 7, 8) },       // Saka, asst Odegaard
      // 45' half time handled by the clock.
      { m: 50, fn: () => this._knockabout('home') },
      { m: 56, fn: () => this._penaltySequence('away', 9) },       // Jesus penalty, saved
      { m: 64, fn: () => this._goalSequence('home', 20, 17) },     // Palmer, asst Sterling
      { m: 72, fn: () => this._foulCard('home', 25, 'yellow') },   // Caicedo booked
      { m: 78, fn: () => this._saveSequence('away', 19) },         // Trossard shot saved
      { m: 83, fn: () => this._foulCard('away', 41, 'yellow') },   // Rice 2nd yellow -> red
      { m: 88, fn: () => this._knockabout('home') },
    ];
  }

  minute() {
    return Math.min(90, Math.floor(this.matchSeconds / 60));
  }

  _attackDir(team) { return team === 'home' ? 1 : -1; }
  _goalX(team) { return team === 'home' ? HALF_L + 1.1 : -HALF_L - 1.1; }

  _knockabout(team) {
    if (this._scripted || this._celebrating) return;
    const list = team === 'home' ? this.homePlayers : this.awayPlayers;
    const mids = list.filter((p) => p.role === 'MID' || p.role === 'DEF');
    const a = mids[Math.floor(this._idleSeed() * mids.length)] || mids[0];
    const b = mids[(mids.indexOf(a) + 2) % mids.length] || mids[1];
    if (!a || !b) return;
    const tx = b.pos.x + (this._idleSeed() - 0.5) * 8;
    const tz = b.pos.z + (this._idleSeed() - 0.5) * 8;
    a.kickTimer = 0.3;
    this.passBall({ x: tx, z: tz }, 0.9 / Math.max(1, this.speed) + 0.4, 1.6, () => {
      this.run(b, tx, tz);
    });
    this.run(b, tx, tz - 1);
  }

  _idleSeed() {
    // Deterministic-ish pseudo random based on clock (avoids Math.random ban).
    this._seed = (this._seed || 7) * 1.0001 + this.matchSeconds * 0.137 + 0.31;
    return this._seed % 1;
  }

  _goalSequence(team, scorerN, assistN) {
    if (this._finished) return;
    this._scripted = true;
    const dir = this._attackDir(team);
    const assister = this.find(team, assistN);
    const scorer = this.find(team, scorerN);
    const gkTeam = team === 'home' ? 'away' : 'home';
    const gk = (gkTeam === 'home' ? this.homePlayers : this.awayPlayers).find((p) => p.role === 'GK');
    const goalX = this._goalX(team);

    this.onEvent({ type: 'commentary', text: `${this.teams[team].name} build through midfield…` });

    // Bring ball to the assister out wide.
    const ax = dir * 24, az = dir * 14;
    this.run(assister, ax, az, 11);
    this.run(scorer, dir * 30, -dir * 6, 11);
    this.passBall({ x: ax, z: az }, 0.7, 1.8, () => {
      assister.kickTimer = 0.35;
      // Cutback / through ball to the scorer arriving in the box.
      const sx = dir * 36, sz = -dir * 4;
      this.run(scorer, sx, sz, 12);
      this.passBall({ x: sx, z: sz }, 0.6, 1.4, () => {
        this.onEvent({ type: 'commentary', text: `${this.teams[team].name} — shooting chance!` });
        scorer.kickTimer = 0.4;
        // Shot into the net, just inside a post, under the bar.
        const zside = (this._idleSeed() - 0.5) * 4;
        // GK dives the wrong way.
        this.run(gk, gk.home.x, zside > 0 ? -2.5 : 2.5, 9);
        this.passBall({ x: goalX, y: 0.7 + this._idleSeed() * 0.6, z: zside }, 0.45, 0.8, () => {
          this._scoreGoal(team, scorer, assister);
        });
      });
    });
  }

  _scoreGoal(team, scorer, assister) {
    this.score[team]++;
    const min = this.minute();
    const ev = {
      minute: min, type: 'goal', team,
      scorer: scorer.number, scorerName: scorer.name,
      assist: assister ? assister.name : null,
      label: `${scorer.number} ${scorer.name}`,
    };
    this.events.push(ev);
    this.rate(team, scorer.number, 1.7);
    if (assister) this.rate(team, assister.number, 0.7);
    this._celebrating = true;
    this.onEvent({ type: 'goal', ...ev, score: { ...this.score }, teamName: this.teams[team].name });
    this.onEvent({
      type: 'commentary',
      text: `GOAL! ${scorer.name} scores for ${this.teams[team].name}! ${this.score.home}-${this.score.away}.`,
    });

    // Celebration: scorer runs off arms-up, team-mates converge.
    const dir = this._attackDir(team);
    scorer.celebrate = 2.6;
    this.run(scorer, dir * 30, 22, 12);
    const mates = (team === 'home' ? this.homePlayers : this.awayPlayers)
      .filter((p) => p !== scorer && p.role !== 'GK').slice(0, 4);
    mates.forEach((mt, i) => this.run(mt, dir * 28 + i, 18 - i * 2, 11));

    this.after(3.4, () => {
      scorer.celebrate = 0;
      this._celebrating = false;
      this._scripted = false;
      this.onEvent({ type: 'commentary', text: 'Players back for the restart.' });
      this._kickoff(false);
    });
  }

  _foulCard(team, n, color) {
    this._scripted = true;
    const player = this.find(team, n);
    if (!player || player.sentOff) { this._scripted = false; return; }
    const min = this.minute();

    // Foul: referee runs over, player goes down briefly.
    this.run(this.referee, player.pos.x - 3, player.pos.z + 3, 11);
    player.foul = 1.2;
    this.onEvent({ type: 'commentary', text: `Crunching challenge by ${player.name}… referee reaches for a card.` });

    this.after(1.1, () => {
      // Track whether this is a second yellow.
      const prevYellow = this.events.some(
        (e) => e.type === 'card' && e.color === 'yellow' && e.team === team && e.number === n
      );
      const isRed = color === 'yellow' && prevYellow;
      const shown = isRed ? 'red' : color;
      const ev = {
        minute: min, type: 'card', color: shown, team, number: n,
        playerName: player.name, secondYellow: isRed,
        label: `${n} ${player.name}`,
      };
      this.events.push(ev);
      this.rate(team, n, -0.6);
      this.onEvent({ type: 'card', ...ev, teamName: this.teams[team].name });
      if (isRed) {
        player.sentOff = true;
        this.onEvent({ type: 'commentary', text: `RED CARD! ${player.name} is sent off — second bookable offence!` });
        // Walk off the pitch, then disappear.
        this.run(player, player.pos.x, 40, 8);
        this.after(2.4, () => { player.mesh.visible = false; });
      } else {
        this.onEvent({ type: 'commentary', text: `${player.name} goes into the book.` });
      }
      this.after(1.2, () => {
        player.foul = 0;
        this.run(this.referee, this.referee.home.x, this.referee.home.z);
        this._scripted = false;
        this._kickoff(false);
      });
    });
  }

  _saveSequence(team, n) {
    this._scripted = true;
    const dir = this._attackDir(team);
    const shooter = this.find(team, n);
    const gkTeam = team === 'home' ? 'away' : 'home';
    const gk = (gkTeam === 'home' ? this.homePlayers : this.awayPlayers).find((p) => p.role === 'GK');
    const goalX = this._goalX(team);
    this.run(shooter, dir * 30, 0, 11);
    this.passBall({ x: dir * 30, z: 2 }, 0.6, 1.4, () => {
      shooter.kickTimer = 0.4;
      this.onEvent({ type: 'commentary', text: `${shooter.name} lets fly!` });
      const zTo = (this._idleSeed() - 0.5) * 3;
      // GK dives the right way and parries wide.
      this.run(gk, gk.home.x - dir * 1, zTo, 14);
      gk.dive = 0.8;
      this.passBall({ x: gk.home.x, y: 1.0, z: zTo }, 0.4, 0.6, () => {
        this.onEvent({ type: 'commentary', text: `Brilliant save by ${gk.name}!` });
        this.events.push({ minute: this.minute(), type: 'save', team: gkTeam, label: `${gk.name} save` });
        this.rate(gkTeam, gk.number, 0.4);
        // Parry out wide.
        this.passBall({ x: gk.home.x + dir * 5, z: zTo > 0 ? 14 : -14 }, 0.5, 2.2, () => {
          this.after(0.8, () => {
            gk.dive = 0;
            this._scripted = false;
            this._kickoff(false);
          });
        });
      });
    });
  }

  _cornerSequence(team, n) {
    this._scripted = true;
    const dir = this._attackDir(team);
    const taker = this.find(team, n);
    const cornerX = dir * (HALF_L - 0.5);
    const cornerZ = 33 * (this._idleSeed() > 0.5 ? 1 : -1);
    this.onEvent({ type: 'commentary', text: `Corner kick to ${this.teams[team].name}.` });
    this.events.push({ minute: this.minute(), type: 'corner', team, label: 'Corner' });
    this.run(taker, cornerX, cornerZ, 12);
    // Crowd the box.
    const atk = (team === 'home' ? this.homePlayers : this.awayPlayers).filter((p) => p.role !== 'GK');
    atk.slice(0, 5).forEach((p, i) => this.run(p, dir * 38, -8 + i * 4, 10));
    this.passBall({ x: cornerX, z: cornerZ }, 0.7, 1.5, () => {
      taker.kickTimer = 0.4;
      // Whipped into the six-yard box.
      this.passBall({ x: dir * 39, y: 2.4, z: 0 }, 0.8, 5, () => {
        this.onEvent({ type: 'commentary', text: 'Headed clear at the near post!' });
        // Cleared away.
        this.passBall({ x: 0, z: -6 }, 0.9, 3, () => {
          this.after(0.5, () => { this._scripted = false; this._kickoff(false); });
        });
      });
    });
  }

  _penaltySequence(team, n) {
    this._scripted = true;
    const dir = this._attackDir(team);
    const taker = this.find(team, n);
    const gkTeam = team === 'home' ? 'away' : 'home';
    const gk = (gkTeam === 'home' ? this.homePlayers : this.awayPlayers).find((p) => p.role === 'GK');
    const spotX = dir * (HALF_L - 11);
    const goalX = this._goalX(team);
    this.onEvent({ type: 'commentary', text: `PENALTY to ${this.teams[team].name}! ${taker.name} steps up.` });
    this.events.push({ minute: this.minute(), type: 'penalty', team, label: 'Penalty' });

    // Place ball on the spot, line everyone up at the edge of the box.
    this.passBall({ x: spotX, z: 0 }, 0.6, 1.0, () => {
      this.run(taker, spotX - dir * 3, 0, 7);
      this.run(gk, gk.home.x, 0, 8);
      this.after(1.3, () => {
        taker.kickTimer = 0.5;
        const side = this._idleSeed() > 0.5 ? 1 : -1;
        // GK guesses correctly and saves.
        this.run(gk, gk.home.x, side * 2.6, 16);
        gk.dive = 0.9;
        this.onEvent({ type: 'commentary', text: `${taker.name} strikes it…` });
        this.passBall({ x: gk.home.x + 0.2, y: 0.9, z: side * 2.4 }, 0.45, 0.6, () => {
          this.onEvent({ type: 'commentary', text: `SAVED! ${gk.name} guesses right and keeps it out!` });
          this.events.push({ minute: this.minute(), type: 'save', team: gkTeam, label: `${gk.name} pen save` });
          this.rate(gkTeam, gk.number, 0.85);
          this.rate(team, taker.number, -0.4);
          this.passBall({ x: gk.home.x + dir * 6, z: side * 16 }, 0.5, 2.4, () => {
            this.after(0.8, () => { gk.dive = 0; this._scripted = false; this._kickoff(false); });
          });
        });
      });
    });
  }

  // --- Per-frame update --------------------------------------------------

  update(dt) {
    if (this.paused) return;
    const edt = dt * this.speed;

    // Timers.
    if (this._timers.length) {
      const due = [];
      this._timers = this._timers.filter((t) => {
        t.left -= edt;
        if (t.left <= 0) { due.push(t.fn); return false; }
        return true;
      });
      due.forEach((fn) => fn());
    }

    // Clock + phases.
    this._advanceClock(edt);

    // Cue director.
    if (!this._inHalfBreak && this.phase !== PHASE.FULLTIME) {
      while (this._cueIdx < this.cues.length && this.minute() >= this.cues[this._cueIdx].m) {
        const cue = this.cues[this._cueIdx++];
        cue.fn();
      }
      // Ambient knockabout between scripted moments.
      if (!this._scripted && !this._celebrating) {
        this._idleTimer -= edt;
        if (this._idleTimer <= 0) {
          this._idleTimer = 1.6 + this._idleSeed() * 1.2;
          this._knockabout(this.minute() % 2 === 0 ? 'home' : 'away');
        }
      }
    }

    this._updateBall(edt);
    this._updatePlayers(edt, dt);
    this.world.updateCamera(dt, this.world.ball.position, this._celebrating ? 0.6 : 0);
  }

  _advanceClock(edt) {
    if (this._finished) return;
    const rate = CLOCK.matchSecondsPerHalf / CLOCK.realSecondsPerHalf;

    if (this._inHalfBreak) {
      this._halfTimer -= edt;
      if (this._halfTimer <= 0) {
        this._inHalfBreak = false;
        this.phase = PHASE.SECOND;
        this.onEvent({ type: 'phase', phase: this.phase });
        this.onEvent({ type: 'commentary', text: 'Second half under way!' });
      }
      return;
    }

    if (this.phase === PHASE.KICKOFF || this.phase === PHASE.FIRST ||
        this.phase === PHASE.SECOND) {
      this.matchSeconds += edt * rate;
    }

    // Half time.
    if (this.phase !== PHASE.HALFTIME && this.phase !== PHASE.SECOND &&
        this.phase !== PHASE.FULLTIME && this.matchSeconds >= 45 * 60) {
      this.matchSeconds = 45 * 60;
      this.phase = PHASE.HALFTIME;
      this._inHalfBreak = true;
      this._halfTimer = CLOCK.halfTimeRealSeconds;
      this._scripted = false;
      this._celebrating = false;
      this._kickoff(false);
      this.onEvent({ type: 'phase', phase: this.phase });
      this.onEvent({ type: 'commentary', text: `Half time. ${this.teams.home.name} ${this.score.home}-${this.score.away} ${this.teams.away.name}.` });
    }

    // Full time.
    if (this.matchSeconds >= 90 * 60 && this.phase !== PHASE.FULLTIME) {
      this.matchSeconds = 90 * 60;
      this.phase = PHASE.FULLTIME;
      this._finished = true;
      this._fullTime();
    }
  }

  _fullTime() {
    // Player of the match = best rating, weighted to the winning side.
    let best = null, bestScore = -1e9;
    const winner = this.score.home > this.score.away ? 'home' :
                   this.score.away > this.score.home ? 'away' : null;
    // Reward the scorer of the decisive (last) goal for the winning side.
    if (winner) {
      const goals = this.events.filter((e) => e.type === 'goal' && e.team === winner);
      const decisive = goals[goals.length - 1];
      if (decisive) this.rate(winner, decisive.scorer, 0.5);
    }
    for (const p of this.players) {
      let r = 6.5 + (this.ratings[p.team + p.number] || 0);
      if (winner && p.team === winner) r += 0.3;
      p.rating = Math.max(5.5, Math.min(9.9, r));
      if (r > bestScore) { bestScore = r; best = p; }
    }
    const motm = {
      number: best.number, name: best.name, team: best.team,
      rating: best.rating.toFixed(1),
    };
    this.onEvent({
      type: 'fulltime',
      score: { ...this.score },
      motm,
      events: this.events.slice(),
      ratings: this.players.map((p) => ({
        team: p.team, number: p.number, name: p.name,
        rating: (p.rating || 6.5).toFixed(1),
      })),
    });
    this.onEvent({ type: 'commentary', text: `Full time! Final score ${this.teams.home.name} ${this.score.home}-${this.score.away} ${this.teams.away.name}.` });
  }

  _updateBall(edt) {
    const ball = this.world.ball;
    if (this._ballTween) {
      const tw = this._ballTween;
      tw.t += edt;
      const p = Math.min(1, tw.t / tw.dur);
      const ease = p; // linear keeps pass pace readable
      const x = THREE.MathUtils.lerp(tw.from.x, tw.to.x, ease);
      const z = THREE.MathUtils.lerp(tw.from.z, tw.to.z, ease);
      const baseY = THREE.MathUtils.lerp(tw.from.y, tw.to.y, ease);
      const y = baseY + tw.arc * 4 * p * (1 - p);
      ball.position.set(x, Math.max(0.34, y), z);
      // Spin.
      ball.rotation.x -= edt * 6;
      ball.rotation.y -= edt * 3;
      if (p >= 1) {
        ball.position.copy(tw.to);
        if (ball.position.y < 0.34) ball.position.y = 0.34;
        const done = tw.onDone;
        this._ballTween = null;
        if (done) done();
      }
    } else {
      // Resting ball — settle to the ground.
      if (ball.position.y > 0.34) {
        ball.position.y = Math.max(0.34, ball.position.y - edt * 6);
      }
    }
  }

  _updatePlayers(edt, dt) {
    const ball = this.world.ball.position;
    const all = [...this.players, this.referee];
    for (const p of all) {
      if (!p.mesh.visible) continue;
      const dx = p.target.x - p.pos.x;
      const dz = p.target.z - p.pos.z;
      const dist = Math.hypot(dx, dz);
      const sp = (p.tmpSpeed || p.speed);
      if (dist > 0.25) {
        const step = Math.min(dist, sp * edt);
        p.pos.x += (dx / dist) * step;
        p.pos.z += (dz / dist) * step;
        p.moving = true;
        p.facing = Math.atan2(dx, dz);
        p.runPhase += edt * 12;
      } else {
        p.moving = false;
        p.tmpSpeed = 0;
        // Idle players face the ball, with a gentle sway.
        const fb = Math.atan2(ball.x - p.pos.x, ball.z - p.pos.z);
        p.facing += (fb - p.facing) * Math.min(1, edt * 2);
      }

      p.mesh.position.set(p.pos.x, 0, p.pos.z);
      p.mesh.rotation.y = p.facing;

      // Leg animation.
      let swing = 0;
      if (p.kickTimer > 0) {
        p.kickTimer -= dt;
        swing = -1.1; // kicking leg forward
        p.legR.rotation.x = swing;
        p.legL.rotation.x = 0.4;
      } else if (p.moving) {
        const s = Math.sin(p.runPhase) * 0.7;
        p.legR.rotation.x = s;
        p.legL.rotation.x = -s;
      } else {
        p.legR.rotation.x *= 0.85;
        p.legL.rotation.x *= 0.85;
      }

      // Celebration: arms up + little hops.
      if (p.celebrate > 0) {
        p.celebrate -= dt;
        p.mesh.position.y = Math.abs(Math.sin(p.runPhase * 0.6)) * 0.4;
      } else if (p.dive > 0) {
        p.dive -= dt;
        p.mesh.rotation.z = 0.9; // lying out for the dive
      } else {
        if (p.mesh.rotation.z !== 0) p.mesh.rotation.z *= 0.8;
        p.mesh.position.y = 0;
      }

      if (p.foul > 0) {
        p.foul -= dt;
        p.mesh.rotation.z = 1.3; // on the ground after the foul
      }
    }
  }

  // State snapshot for the UI HUD each frame.
  hud() {
    const mm = Math.floor(this.matchSeconds / 60);
    const ss = Math.floor(this.matchSeconds % 60);
    return {
      clock: `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`,
      phase: this.phase,
      score: this.score,
      minute: this.minute(),
    };
  }
}
