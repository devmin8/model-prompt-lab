// ui.js — broadcast HUD: setup screen, scoreboard, goal overlay, control bar,
// commentary ticker, event timeline and full-time panel.

import { SPEEDS } from './config.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

export class UI {
  constructor(root, handlers) {
    this.root = root;
    this.h = handlers;
    this.markers = [];
  }

  crest(team, size = 26) {
    const c = el('span', 'crest');
    c.style.width = c.style.height = size + 'px';
    c.style.background = team.crest;
    c.style.borderColor = team.crestAccent;
    c.textContent = team.short[0];
    c.style.fontSize = size * 0.5 + 'px';
    return c;
  }

  // --- Setup screen ------------------------------------------------------

  showSetup(defaults) {
    const wrap = el('div', 'setup');
    const card = el('div', 'setup-card');
    card.appendChild(el('div', 'setup-brand', 'PITCHSIDE'));
    card.appendChild(el('div', 'setup-sub', '3D FOOTBALL MATCH SIMULATOR'));

    const grid = el('div', 'setup-grid');
    const mkSide = (label, t) => {
      const col = el('div', 'setup-col');
      col.appendChild(el('div', 'setup-label', label));
      const name = el('input', 'setup-name');
      name.value = t.name;
      name.maxLength = 16;
      col.appendChild(name);
      const colors = el('div', 'setup-colors');
      const kit = el('input', 'setup-color');
      kit.type = 'color'; kit.value = t.kit;
      const kitL = el('label', 'setup-color-l', 'Kit');
      kitL.prepend(kit);
      const crest = el('input', 'setup-color');
      crest.type = 'color'; crest.value = t.crest;
      const crestL = el('label', 'setup-color-l', 'Crest');
      crestL.prepend(crest);
      colors.append(kitL, crestL);
      col.appendChild(colors);
      return { col, name, kit, crest };
    };
    const home = mkSide('HOME', defaults.home);
    const vs = el('div', 'setup-vs', 'VS');
    const away = mkSide('AWAY', defaults.away);
    grid.append(home.col, vs, away.col);
    card.appendChild(grid);

    const start = el('button', 'btn btn-primary setup-start', 'KICK OFF');
    card.appendChild(start);
    wrap.appendChild(card);
    this.root.appendChild(wrap);
    this.setupWrap = wrap;

    start.onclick = () => {
      const teams = JSON.parse(JSON.stringify(defaults));
      teams.home.name = (home.name.value || defaults.home.name).toUpperCase();
      teams.away.name = (away.name.value || defaults.away.name).toUpperCase();
      teams.home.kit = home.kit.value;
      teams.home.crest = home.crest.value;
      teams.home.socks = home.kit.value;
      teams.away.kit = away.kit.value;
      teams.away.crest = away.crest.value;
      teams.away.socks = away.kit.value;
      teams.home.short = teams.home.name.slice(0, 3);
      teams.away.short = teams.away.name.slice(0, 3);
      wrap.remove();
      this.h.onStart(teams);
    };
  }

  // --- HUD ---------------------------------------------------------------

  buildHUD(teams) {
    this.teams = teams;
    const hud = el('div', 'hud');
    this.hud = hud;

    // Scoreboard (top centre).
    const sb = el('div', 'scoreboard');
    const homeBox = el('div', 'sb-team sb-home');
    homeBox.appendChild(this.crest(teams.home));
    homeBox.appendChild(el('span', 'sb-name', teams.home.name));
    const score = el('div', 'sb-score');
    this.scoreEl = el('span', 'sb-score-num', '0&nbsp;-&nbsp;0');
    score.appendChild(this.scoreEl);
    this.clockEl = el('div', 'sb-clock', '00:00');
    this.phaseEl = el('div', 'sb-phase', 'KICK OFF');
    const center = el('div', 'sb-center');
    center.append(score, this.clockEl, this.phaseEl);
    const awayBox = el('div', 'sb-team sb-away');
    awayBox.appendChild(el('span', 'sb-name', teams.away.name));
    awayBox.appendChild(this.crest(teams.away));
    sb.append(homeBox, center, awayBox);
    hud.appendChild(sb);

    // Goal overlay (bottom-left), hidden initially.
    this.goalOverlay = el('div', 'goal-overlay');
    hud.appendChild(this.goalOverlay);

    // Full-time panel (right), hidden initially.
    this.ftPanel = el('div', 'ft-panel');
    hud.appendChild(this.ftPanel);

    // Commentary ticker.
    const ticker = el('div', 'ticker');
    this.tickerLabel = el('span', 'ticker-label', 'COMMENTARY');
    this.tickerText = el('span', 'ticker-text', 'Welcome to Pitchside.');
    ticker.append(this.tickerLabel, this.tickerText);
    hud.appendChild(ticker);

    // Control bar.
    const bar = el('div', 'controls');
    const mkBtn = (label, cls, fn) => {
      const b = el('button', 'btn ' + (cls || ''), label);
      b.onclick = fn;
      return b;
    };
    this.pauseBtn = mkBtn('❚❚ PAUSE', 'btn-ctrl', () => this._togglePause());
    const restart = mkBtn('↺ RESTART', 'btn-ctrl', () => this.h.onRestart());
    const newMatch = mkBtn('＋ NEW MATCH', 'btn-ctrl', () => this.h.onNewMatch());

    // Speed selector.
    const speedWrap = el('div', 'speed');
    this.speedBtns = SPEEDS.map((s) => {
      const b = el('button', 'speed-btn' + (s === 1 ? ' active' : ''), s + 'x');
      b.onclick = () => {
        this.speedBtns.forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        this.h.onSpeed(s);
      };
      return b;
    });
    speedWrap.append(...this.speedBtns);

    // Timeline.
    const tl = el('div', 'timeline');
    tl.appendChild(el('span', 'tl-cap', 'EVENT TIMELINE'));
    this.track = el('div', 'tl-track');
    this.track.appendChild(el('div', 'tl-half'));
    tl.appendChild(this.track);

    const live = el('div', 'live');
    live.append(el('span', 'live-dot'), el('span', 'live-txt', 'LIVE'));
    this.liveEl = live;

    const left = el('div', 'ctrl-left');
    left.append(this.pauseBtn, restart, newMatch);
    bar.append(left, speedWrap, tl, live);
    hud.appendChild(bar);

    // Phase tabs (very bottom).
    const tabs = el('div', 'phase-tabs');
    this.tabs = {};
    [['FIRST HALF', 'FIRST HALF'], ['HALF TIME', 'HALF TIME'],
     ['SECOND HALF', 'SECOND HALF'], ['FULL TIME', 'FULL TIME']].forEach(([k, lbl]) => {
      const t = el('div', 'phase-tab', lbl);
      this.tabs[k] = t;
      tabs.appendChild(t);
    });
    hud.appendChild(tabs);

    this.root.appendChild(hud);
  }

  _togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseBtn.innerHTML = '▶ RESUME';
      this.pauseBtn.classList.add('resume');
      this.liveEl.classList.add('paused');
      this.h.onPause();
    } else {
      this.pauseBtn.innerHTML = '❚❚ PAUSE';
      this.pauseBtn.classList.remove('resume');
      this.liveEl.classList.remove('paused');
      this.h.onResume();
    }
  }

  updateHUD(hud) {
    this.scoreEl.innerHTML = `${hud.score.home}&nbsp;-&nbsp;${hud.score.away}`;
    this.clockEl.textContent = hud.clock;
    this.phaseEl.textContent = hud.phase;
    // Highlight active phase tab.
    const map = {
      'KICK OFF': 'FIRST HALF', 'FIRST HALF': 'FIRST HALF',
      'HALF TIME': 'HALF TIME', 'SECOND HALF': 'SECOND HALF',
      'FULL TIME': 'FULL TIME',
    };
    const active = map[hud.phase];
    for (const k in this.tabs) this.tabs[k].classList.toggle('active', k === active);
    // Progress fill on the timeline track.
    if (this.track) this.track.style.setProperty('--prog', (hud.minute / 90 * 100) + '%');
  }

  // --- Events ------------------------------------------------------------

  event(ev) {
    switch (ev.type) {
      case 'commentary': return this._ticker(ev.text);
      case 'goal': return this._goal(ev);
      case 'card': return this._marker(ev.minute, ev.color === 'red' ? 'red' : 'yellow', ev);
      case 'save': return this._marker(ev.minute, 'save', ev);
      case 'penalty': return this._marker(ev.minute, 'pen', ev);
      case 'corner': return this._marker(ev.minute, 'corner', ev);
      case 'phase': return;
      case 'reset': return this._reset();
      case 'fulltime': return this._fullTime(ev);
    }
  }

  _ticker(text) {
    this.tickerText.textContent = text;
    this.tickerText.classList.remove('pop');
    void this.tickerText.offsetWidth;
    this.tickerText.classList.add('pop');
  }

  _marker(minute, kind, ev) {
    const m = el('span', 'tl-marker tl-' + kind);
    m.style.left = (minute / 90 * 100) + '%';
    if (ev && ev.team && (kind === 'goal')) {
      m.style.background = this.teams[ev.team].crest;
    }
    m.title = `${minute}' ${ev && ev.label ? ev.label : kind}`;
    this.track.appendChild(m);
    this.markers.push(m);
  }

  _goal(ev) {
    this._marker(ev.minute, 'goal', ev);
    const team = this.teams[ev.team];
    const o = this.goalOverlay;
    o.innerHTML = '';
    o.style.setProperty('--team', team.crest);
    const banner = el('div', 'go-banner', 'GOAL!');
    const row = el('div', 'go-row');
    row.appendChild(this.crest(team, 30));
    const info = el('div', 'go-info');
    info.appendChild(el('div', 'go-scorer',
      `<span class="go-num">${ev.scorer}</span> ${ev.scorerName}`));
    info.appendChild(el('div', 'go-min', `${ev.minute}'`));
    row.appendChild(info);
    o.append(banner, row);
    if (ev.assist) o.appendChild(el('div', 'go-assist', `ASSIST: ${ev.assist}`));
    o.classList.add('show');
    clearTimeout(this._goalTimer);
    this._goalTimer = setTimeout(() => o.classList.remove('show'), 4800);
  }

  _reset() {
    this.goalOverlay.classList.remove('show');
    this.ftPanel.classList.remove('show');
    this.markers.forEach((m) => m.remove());
    this.markers = [];
    if (this.paused) this._togglePause();
  }

  _fullTime(ev) {
    const p = this.ftPanel;
    p.innerHTML = '';
    p.appendChild(el('div', 'ft-title', 'FULL TIME'));
    const sc = el('div', 'ft-score');
    sc.appendChild(this.crest(this.teams.home, 24));
    sc.appendChild(el('span', 'ft-score-num', `${ev.score.home} - ${ev.score.away}`));
    sc.appendChild(this.crest(this.teams.away, 24));
    p.appendChild(sc);

    p.appendChild(el('div', 'ft-h', 'PLAYER OF THE MATCH'));
    const motm = el('div', 'ft-motm');
    motm.appendChild(this.crest(this.teams[ev.motm.team], 22));
    motm.appendChild(el('span', 'ft-motm-name',
      `<b>${ev.motm.number} ${ev.motm.name}</b>`));
    motm.appendChild(el('span', 'ft-motm-rating', ev.motm.rating));
    p.appendChild(motm);

    p.appendChild(el('div', 'ft-h', 'KEY MOMENTS'));
    const list = el('div', 'ft-moments');
    const key = ev.events.filter((e) =>
      ['goal', 'card', 'penalty', 'save'].includes(e.type)).slice(0, 8);
    if (!key.length) list.appendChild(el('div', 'ft-moment', 'No major incidents.'));
    key.forEach((e) => {
      const row = el('div', 'ft-moment');
      const icon = { goal: '⚽', card: e.color === 'red' ? '🟥' : '🟨',
                     penalty: '◎', save: '🧤' }[e.type] || '•';
      const label = e.scorerName ? `${e.scorer} ${e.scorerName}` :
                    e.playerName ? `${e.number} ${e.playerName}` : e.label;
      row.innerHTML = `<span class="ft-min">${e.minute}'</span>
        <span class="ft-icon">${icon}</span>
        <span class="ft-label">${label}</span>`;
      list.appendChild(row);
    });
    p.appendChild(list);

    const nm = el('button', 'btn btn-primary ft-new', 'NEW MATCH');
    nm.onclick = () => this.h.onNewMatch();
    p.appendChild(nm);

    p.classList.add('show');
    this.liveEl.classList.add('ended');
  }
}
