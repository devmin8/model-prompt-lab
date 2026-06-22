// Pitchside — DOM broadcast overlay controller.
const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      sbHomeName: $('sbHomeName'), sbAwayName: $('sbAwayName'),
      sbHomeCrest: $('sbHomeCrest'), sbAwayCrest: $('sbAwayCrest'),
      sbHomeScore: $('sbHomeScore'), sbAwayScore: $('sbAwayScore'),
      sbClock: $('sbClock'), sbPhase: $('sbPhase'),
      goalOverlay: $('goalOverlay'), goalPortrait: $('goalPortrait'),
      goalNumber: $('goalNumber'), goalName: $('goalName'),
      goalMinute: $('goalMinute'), goalAssist: $('goalAssist'),
      goalBanner: document.querySelector('.goal-banner span'),
      ticker: $('tickerText'),
      tlProgress: $('tlProgress'), tlMarkers: $('tlMarkers'), tlClock: $('tlClock'),
      livePill: $('livePill'),
      halftime: $('halftime'), htScore: $('htScore'),
      fulltime: $('fulltime'), ftHome: $('ftHome'), ftAway: $('ftAway'),
      ftScore: $('ftScore'), potmNum: $('potmNum'), potmName: $('potmName'),
      potmRating: $('potmRating'), ftMoments: $('ftMoments'),
    };
    this._goalTimer = null;
  }

  applyTeams(teams) {
    this.teams = teams;
    const r = document.documentElement.style;
    r.setProperty('--home', teams.home.kit);
    r.setProperty('--away', teams.away.kit);
    this.el.sbHomeName.textContent = teams.home.name;
    this.el.sbAwayName.textContent = teams.away.name;
    this.el.sbHomeCrest.textContent = teams.home.short;
    this.el.sbAwayCrest.textContent = teams.away.short;
    this.el.sbHomeCrest.style.background = teams.home.kit;
    this.el.sbAwayCrest.style.background = teams.away.kit;
    this.el.goalPortrait.style.background =
      `linear-gradient(160deg, ${teams.home.kit}, #0b1c4a)`;
  }

  onScore(h, a) {
    this.el.sbHomeScore.textContent = h;
    this.el.sbAwayScore.textContent = a;
  }

  onPhase(name) { this.el.sbPhase.textContent = name; }

  onClock(text, frac, live) {
    this.el.sbClock.textContent = text;
    this.el.tlClock.textContent = text;
    this.el.tlProgress.style.width = `${Math.min(100, frac * 100)}%`;
    this.el.livePill.classList.toggle('off', !live);
    this.el.livePill.textContent = live ? '● LIVE' : '● PAUSED';
  }

  onCommentary(text) {
    const t = this.el.ticker;
    t.style.opacity = '0';
    clearTimeout(this._tk);
    this._tk = setTimeout(() => { t.textContent = text; t.style.opacity = '1'; }, 160);
  }

  onGoal(team, data) {
    const color = team === 'home' ? this.teams.home.kit : this.teams.away.kit;
    this.el.goalPortrait.style.background = `linear-gradient(160deg, ${color}, #0b1224)`;
    this.el.goalPortrait.textContent = data.number;
    this.el.goalNumber.textContent = data.number;
    this.el.goalName.textContent = data.name;
    this.el.goalMinute.textContent = `${data.minute}'`;
    this.el.goalAssist.textContent = data.assist ? `ASSIST: ${data.assist}` : '';
    // Re-trigger banner animation.
    this.el.goalBanner.style.animation = 'none';
    void this.el.goalBanner.offsetWidth;
    this.el.goalBanner.style.animation = '';
    this.el.goalOverlay.classList.remove('goal-hidden');
    clearTimeout(this._goalTimer);
    this._goalTimer = setTimeout(() => this.el.goalOverlay.classList.add('goal-hidden'), 5200);
  }

  onCard(team, colour, data) {
    // Brief flash via the ticker tag colour; markers handle the record.
    const tag = document.querySelector('.ticker-tag');
    tag.style.background = colour === 'red' ? '#ff3b3b' : '#ffd23f';
    tag.style.color = colour === 'red' ? '#fff' : '#1a1205';
    tag.textContent = colour === 'red' ? 'RED' : 'YELLOW';
    clearTimeout(this._cardTk);
    this._cardTk = setTimeout(() => {
      tag.style.background = ''; tag.style.color = ''; tag.textContent = 'LIVE';
    }, 2600);
  }

  onSave(keeper) {
    const tag = document.querySelector('.ticker-tag');
    tag.style.background = '#2563eb'; tag.style.color = '#fff'; tag.textContent = 'SAVE';
    clearTimeout(this._saveTk);
    this._saveTk = setTimeout(() => {
      tag.style.background = ''; tag.style.color = ''; tag.textContent = 'LIVE';
    }, 2200);
  }

  onTimeline(moments) {
    this.el.tlMarkers.innerHTML = '';
    for (const m of moments) {
      const d = document.createElement('div');
      d.className = `tl-mark ${m.type}`;
      d.style.left = `${Math.min(99, (m.minute / 90) * 100)}%`;
      d.dataset.label = m.text;
      this.el.tlMarkers.appendChild(d);
    }
  }

  onHalfTime(score) {
    this.el.htScore.textContent = `${score.home} – ${score.away}`;
    this.el.halftime.classList.remove('hidden');
  }
  onHideHalfTime() { this.el.halftime.classList.add('hidden'); }

  onFullTime(summary) {
    this.el.ftHome.textContent = this.teams.home.name;
    this.el.ftAway.textContent = this.teams.away.name;
    this.el.ftScore.textContent = `${summary.score.home} – ${summary.score.away}`;
    this.el.potmNum.textContent = summary.potm.number;
    this.el.potmName.textContent = summary.potm.name;
    this.el.potmRating.textContent = summary.potm.rating;
    this.el.ftMoments.innerHTML = '';
    const sorted = [...summary.moments].sort((a, b) => a.minute - b.minute);
    for (const m of sorted) {
      const li = document.createElement('li');
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.style.background = m.type === 'goal' ? '#f5c542' : m.type === 'red' ? '#ff3b3b' : '#ffd23f';
      li.appendChild(badge);
      const label = m.type === 'goal' ? '⚽ GOAL' : m.type === 'red' ? '🟥 RED CARD' : '🟨 YELLOW';
      li.append(`${m.minute}'  ${label} — ${m.text.replace(/\s+\d+'$/, '')}`);
      this.el.ftMoments.appendChild(li);
    }
    this.el.fulltime.classList.remove('hidden');
  }

  onHideOverlays() {
    this.el.fulltime.classList.add('hidden');
    this.el.halftime.classList.add('hidden');
    this.el.goalOverlay.classList.add('goal-hidden');
  }
}
