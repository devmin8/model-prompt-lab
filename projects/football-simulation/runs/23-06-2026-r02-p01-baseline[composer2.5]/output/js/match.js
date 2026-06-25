import { MATCH } from './config.js';

export function buildScript(homeName, awayName) {
  return [
  {
    minute: 0, type: 'kickoff', side: 'home',
    commentary: `Welcome to Pitchside! ${homeName} kick off against ${awayName}.`,
    duration: 3,
  },
  {
    minute: 0.5, type: 'general', duration: 8,
    commentary: 'Early possession for the home side as they probe the away defence.',
  },
  {
    minute: 3, type: 'general', duration: 6,
    commentary: 'Nice build-up play down the left flank.',
  },
  {
    minute: 8, type: 'corner', side: 'home', duration: 8,
    commentary: `${homeName} win a corner kick.`,
  },
  {
    minute: 12, type: 'goal', side: 'home',
    scorer: 15, assist: null, scorerName: 'N. JACKSON',
    commentary: "12' GOAL! N. Jackson opens the scoring with a powerful header!",
    duration: 12,
    setup: { ball: { x: -40, z: 5 }, shooter: 15, gk: 22 },
    shot: { targetX: 52.5, targetZ: 2, power: 20, loft: 0.3 },
  },
  {
    minute: 18, type: 'general', duration: 6,
    commentary: `${awayName} looking to respond with some quick passing.`,
  },
  {
    minute: 24, type: 'foul', side: 'away', player: 41, duration: 5,
    commentary: 'Free kick awarded after a late challenge in midfield.',
  },
  {
    minute: 28, type: 'yellow', side: 'away', player: 41, playerName: 'D. RICE',
    commentary: "28' Yellow card for D. Rice — a cynical foul to stop the counter.",
    duration: 4,
  },
  {
    minute: 32, type: 'general', duration: 6,
    commentary: 'End-to-end action as both teams push for a goal before the break.',
  },
  {
    minute: 36, type: 'goal', side: 'away',
    scorer: 8, assist: 7, scorerName: 'M. ØDEGAARD', assistName: 'B. SAKA',
    commentary: "36' GOAL! Ødegaard levels it up with a sublime finish!",
    duration: 12,
    setup: { ball: { x: 25, z: -8 }, shooter: 8, passer: 7 },
    shot: { targetX: -52.5, targetZ: -1, power: 18, loft: 0.1 },
  },
  {
    minute: 38, type: 'save', side: 'home', gk: 1, gkName: 'R. SÁNCHEZ',
    commentary: 'Brilliant save! Sánchez denies a curling effort from distance.',
    duration: 6,
    setup: { ball: { x: 30, z: -5 }, shooter: 8 },
    shot: { targetX: -50, targetZ: 1, power: 22 },
  },
  {
    minute: 42, type: 'general', duration: 4,
    commentary: 'The first half is drawing to a close.',
  },
  {
    minute: 45, type: 'halftime', duration: 4,
    commentary: 'Half time. The referee blows for the interval.',
  },
  {
    minute: 46, type: 'kickoff', side: 'away',
    commentary: `Second half underway. ${awayName} get us restarted.`,
    duration: 3,
  },
  {
    minute: 48, type: 'general', duration: 5,
    commentary: `${awayName} start the second half with intent.`,
  },
  {
    minute: 52, type: 'general', duration: 5,
    commentary: 'Tactical battle in the centre of the park.',
  },
  {
    minute: 54, type: 'yellow', side: 'away', player: 2, playerName: 'W. SALIBA',
    commentary: "54' Yellow card for W. Saliba — a clumsy challenge.",
    duration: 4,
  },
  {
    minute: 58, type: 'general', duration: 4,
    commentary: `${homeName} pressing high, looking to exploit the space.`,
  },
  {
    minute: 62, type: 'red', side: 'away', player: 2, playerName: 'W. SALIBA',
    commentary: "62' RED CARD! Saliba sees a second yellow and is sent off!",
    duration: 5,
  },
  {
    minute: 64, type: 'goal', side: 'home',
    scorer: 20, assist: 7, scorerName: 'C. PALMER', assistName: 'R. STERLING',
    commentary: "64' GOAL! Cole Palmer doubles the lead! A composed finish into the bottom corner.",
    duration: 12,
    setup: { ball: { x: 35, z: 8 }, shooter: 20, passer: 7 },
    shot: { targetX: 52.5, targetZ: 3, power: 19, loft: 0.05 },
  },
  {
    minute: 70, type: 'general', duration: 5,
    commentary: `${awayName} down to ten men, fighting to stay in this match.`,
  },
  {
    minute: 78, type: 'save', side: 'away', gk: 22, gkName: 'D. RAYA',
    commentary: "78' Superb save from David Raya to keep the deficit at one!",
    duration: 7,
    setup: { ball: { x: -30, z: 4 }, shooter: 20 },
    shot: { targetX: 52.5, targetZ: 0, power: 24 },
  },
  {
    minute: 82, type: 'general', duration: 4,
    commentary: 'The away side desperately searching for an equaliser.',
  },
  {
    minute: 85, type: 'yellow', side: 'away', player: 6, playerName: 'GABRIEL',
    commentary: "85' Yellow card for Gabriel — frustration showing.",
    duration: 4,
  },
  {
    minute: 88, type: 'penalty', side: 'home',
    taker: 20, takerName: 'C. PALMER', gk: 22,
    commentary: "88' PENALTY to Chelsea! Palmer steps up...",
    duration: 10,
    scored: false,
    setup: { ball: { x: 41.5, z: 0 }, shooter: 20 },
    shot: { targetX: 52.5, targetZ: 4, power: 22 },
  },
  {
    minute: 90, type: 'general', duration: 3,
    commentary: 'Three minutes of added time.',
  },
  {
    minute: 92, type: 'general', duration: 4,
    commentary: `${homeName} controlling possession in the dying moments.`,
  },
  {
    minute: 93, type: 'fulltime', duration: 2,
    commentary: 'Full time! What a match!',
  },
  ];
}

export class MatchController {
  constructor(script, callbacks) {
    this.script = script;
    this.cb = callbacks;
    this.matchMinute = 0;
    this.realTime = 0;
    this.score = { home: 0, away: 0 };
    this.eventIndex = 0;
    this.currentEvent = null;
    this.eventTimer = 0;
    this.phase = 'playing';
    this.paused = false;
    this.speed = 1;
    this.finished = false;
    this.keyMoments = [];
    this.yellowCards = {};
    this.goalDetected = false;
    this.potm = { side: 'home', number: 20, name: 'C. PALMER', rating: 9.2 };
  }

  get minuteToReal() {
    return MATCH.realDuration / (MATCH.halfDuration * 2 + MATCH.extraTime);
  }

  reset() {
    this.matchMinute = 0;
    this.realTime = 0;
    this.score = { home: 0, away: 0 };
    this.eventIndex = 0;
    this.currentEvent = null;
    this.eventTimer = 0;
    this.phase = 'playing';
    this.finished = false;
    this.keyMoments = [];
    this.yellowCards = {};
    this.goalDetected = false;
    this._startNextEvent();
  }

  setPaused(p) { this.paused = p; }
  setSpeed(s) { this.speed = s; }

  update(dt) {
    if (this.paused || this.finished) return null;

    const scaled = dt * this.speed;
    this.realTime += scaled;
    this.matchMinute = this.realTime / this.minuteToReal;

    if (this.currentEvent) {
      this.eventTimer += scaled;
      const result = this._updateCurrentEvent(scaled);
      if (result) return result;
    }

    while (
      this.eventIndex < this.script.length &&
      this.script[this.eventIndex].minute <= this.matchMinute &&
      !this.currentEvent
    ) {
      this._startEvent(this.script[this.eventIndex]);
      this.eventIndex++;
    }

    return { type: 'tick', minute: this.matchMinute, score: { ...this.score } };
  }

  _startNextEvent() {
    if (this.eventIndex < this.script.length) {
      this._startEvent(this.script[this.eventIndex]);
      this.eventIndex++;
    }
  }

  _startEvent(event) {
    this.currentEvent = event;
    this.eventTimer = 0;
    this.goalDetected = false;

    if (event.commentary) this.cb.onCommentary(event.commentary);

    switch (event.type) {
      case 'kickoff':
        this.cb.onKickoff(event.side);
        break;
      case 'halftime':
        this.phase = 'halftime';
        this.cb.onPhaseChange('Half Time');
        break;
      case 'fulltime':
        this.phase = 'fulltime';
        this.finished = true;
        this.cb.onFullTime();
        break;
      case 'yellow':
        this._addMoment(event.minute, 'Yellow Card', event.playerName, event.side);
        this.cb.onCard('yellow', event);
        break;
      case 'red':
        this._addMoment(event.minute, 'Red Card', event.playerName, event.side);
        this.cb.onCard('red', event);
        break;
      case 'goal':
      case 'save':
      case 'corner':
      case 'foul':
      case 'penalty':
      case 'general':
        this.cb.onEventStart(event);
        break;
    }
  }

  _updateCurrentEvent(dt) {
    const ev = this.currentEvent;
    if (!ev) return null;

    if (ev.type === 'goal' && !this.goalDetected) {
      const result = this.cb.onGoalUpdate(ev, this.eventTimer, dt);
      if (result === 'scored') {
        this.goalDetected = true;
        const side = ev.side;
        this.score[side]++;
        this._addMoment(ev.minute, 'Goal', ev.scorerName, side, this.score);
        this.cb.onGoalScored(ev, { ...this.score });
      }
    } else if (ev.type === 'save') {
      this.cb.onSaveUpdate(ev, this.eventTimer, dt);
      if (this.eventTimer > (ev.duration || 6) * 0.7 && !ev._logged) {
        ev._logged = true;
        this._addMoment(ev.minute, 'Save', ev.gkName, ev.side === 'home' ? 'away' : 'home');
      }
    } else if (ev.type === 'penalty') {
      const result = this.cb.onPenaltyUpdate(ev, this.eventTimer, dt);
      if (result === 'scored') {
        this.goalDetected = true;
        this.score[ev.side === 'home' ? 'home' : 'away']++;
        this._addMoment(ev.minute, 'Goal (PEN)', ev.takerName, ev.side, this.score);
        this.cb.onGoalScored({ ...ev, scorer: ev.taker, scorerName: ev.takerName, assist: null }, { ...this.score });
      } else if (result === 'saved' && !ev._logged) {
        ev._logged = true;
        this._addMoment(ev.minute, 'Penalty Saved', ev.takerName + ' (Saved)', ev.side);
      }
    } else if (ev.type === 'general' || ev.type === 'foul' || ev.type === 'corner') {
      this.cb.onGeneralPlay(ev, this.eventTimer, dt);
    }

    const dur = ev.duration || 5;
    if (this.eventTimer >= dur) {
      if (ev.type === 'halftime') this.phase = 'playing';
      if (ev.type === 'kickoff' && ev.minute >= 46) {
        this.cb.onPhaseChange('Second Half');
      }
      this.currentEvent = null;
      this.eventTimer = 0;
      this.cb.onEventEnd(ev);
    }

    return { type: 'event', event: ev, minute: this.matchMinute, score: { ...this.score } };
  }

  _addMoment(minute, type, player, side, score) {
    const m = Math.floor(minute);
    let text = `${m}' ${type}: ${player}`;
    if (score) text += ` (${score.home}-${score.away})`;
    this.keyMoments.push({ minute: m, type, player, side, text });
  }

  getTimelineEvents() {
    return this.script.filter(e =>
      ['goal', 'yellow', 'red', 'save', 'penalty'].includes(e.type)
    ).map(e => ({
      minute: e.minute,
      type: e.type === 'penalty' ? (e.scored ? 'goal' : 'save') : e.type,
      side: e.side,
    }));
  }
}
