// DOM HUD wiring — exposes a small API consumed by engine + main.
import { STATE } from './config.js';

export class UI {
  constructor() {
    this.scoreEl = document.getElementById('sb-score');
    this.clockEl = document.getElementById('sb-clock');
    this.phaseEl = document.getElementById('sb-phase');
    this.tickerText = document.getElementById('ticker-text');
    this.goalOverlay = document.getElementById('goal-overlay');
    this.cardFlash = document.getElementById('card-flash');
    this.progressEl = document.getElementById('timeline-progress');
    this.markersEl = document.getElementById('timeline-markers');
    this.liveEl = document.getElementById('timeline-live');
    this.ftOverlay = document.getElementById('ft-overlay');
    this.playIcon = document.getElementById('play-icon');
  }

  init(teams) {
    document.getElementById('name-home').textContent = teams.home.name;
    document.getElementById('name-away').textContent = teams.away.name;
    document.getElementById('crest-home').textContent = teams.home.name.charAt(0);
    document.getElementById('crest-away').textContent = teams.away.name.charAt(0);
    document.getElementById('crest-home').style.background = teams.home.color;
    document.getElementById('crest-away').style.background = teams.away.color;
    // FT crests
    document.getElementById('ft-crest-home').style.background = teams.home.color;
    document.getElementById('ft-crest-home').textContent = teams.home.name.charAt(0);
    document.getElementById('ft-crest-away').style.background = teams.away.color;
    document.getElementById('ft-crest-away').textContent = teams.away.name.charAt(0);
    document.getElementById('ft-name-home').textContent = teams.home.name;
    document.getElementById('ft-name-away').textContent = teams.away.name;

    this.teams = teams;
    this.setScore({ home: 0, away: 0 });
    this.placeLiveMarker();
  }

  setScore(s) {
    this.scoreEl.textContent = `${s.home} — ${s.away}`;
  }

  setClock(minute, phase) {
    const m = Math.max(0, Math.floor(minute));
    const mm = String(m).padStart(2, '0');
    const ss = String(Math.floor((minute % 1) * 60)).padStart(2, '0');
    this.clockEl.textContent = `${mm}:${ss}`;
    this.setPhase(phase);
  }

  setPhase(phase) {
    const label = {
      first: '1ST HALF',
      half: 'HALF TIME',
      second: '2ND HALF',
      fulltime: 'FULL TIME',
    }[phase] || '';
    if (label) this.phaseEl.textContent = label;
  }

  setCommentary(lines) {
    if (!lines || !lines.length) return;
    const text = lines.join('  •  ');
    // Duplicate for seamless scroll
    this.tickerText.textContent = text + '   •   ' + text;
  }

  setTimelineProgress(frac) {
    const pct = Math.max(0, Math.min(1, frac)) * 100;
    this.progressEl.style.width = pct + '%';
    this.liveEl.style.left = pct + '%';
  }

  placeLiveMarker() { this.liveEl.style.left = '0%'; }

  addTimelineMarker(e) {
    if (!['goal', 'card'].includes(e.type)) return;
    const el = document.createElement('div');
    el.className = 'tl-marker ' + (e.type === 'goal' ? 'goal' : (e.red ? 'red' : 'yellow'));
    el.style.left = (parseFloat(this.progressEl.style.width || '0')) + '%';
    this.markersEl.appendChild(el);
  }

  showGoal(e, kits) {
    document.getElementById('goal-num').textContent = (e.scorer.slot + 1);
    document.getElementById('goal-name').textContent = e.name;
    document.getElementById('goal-min').textContent = e.minute + "'";
    const assistEl = document.getElementById('goal-assist');
    assistEl.textContent = e.assistName ? `Assist: ${e.assistName}` : (e.penalty ? 'Penalty' : '');
    // Portrait tint
    const port = document.getElementById('goal-portrait');
    const c = e.team === 'home' ? kits.home.color : kits.away.color;
    port.style.background = `linear-gradient(160deg, ${c}, #0f1420)`;
    this.goalOverlay.classList.remove('hidden');
    clearTimeout(this._goalT);
    this._goalT = setTimeout(() => this.goalOverlay.classList.add('hidden'), 5200);
  }

  showCard(e) {
    const ic = document.getElementById('cf-icon');
    ic.classList.toggle('red', !!e.red);
    document.getElementById('cf-name').textContent = (e.red ? 'RED CARD · ' : 'YELLOW · ') + e.name;
    document.getElementById('cf-reason').textContent = e.reason + (e.secondYellow ? ' · 2nd yellow' : '');
    this.cardFlash.classList.remove('hidden');
    clearTimeout(this._cardT);
    this._cardT = setTimeout(() => this.cardFlash.classList.add('hidden'), 4200);
  }

  setPlayState(playing) {
    this.playIcon.textContent = playing ? '❚❚' : '►';
  }

  showFullTime(score, potm, log) {
    document.getElementById('ft-score-text').textContent = `${score.home} — ${score.away}`;
    document.getElementById('ft-potm').textContent = potm.name + (potm.team ? `  (${this.teams[potm.team].name})` : '');
    const list = document.getElementById('ft-moments-list');
    list.innerHTML = '';
    for (const ev of log) {
      if (!['goal', 'card'].includes(ev.type)) continue;
      const li = document.createElement('li');
      const tag = ev.type === 'goal'
        ? `Goal · ${ev.name}`
        : (ev.red ? 'Red · ' : 'Yellow · ') + ev.name;
      li.innerHTML = `<span class="m-min">${ev.minute}'</span><span>${tag}</span>`;
      list.appendChild(li);
    }
    this.ftOverlay.classList.remove('hidden');
  }

  resetAll() {
    this.ftOverlay.classList.add('hidden');
    this.goalOverlay.classList.add('hidden');
    this.cardFlash.classList.add('hidden');
    this.markersEl.innerHTML = '';
    this.progressEl.style.width = '0%';
    this.placeLiveMarker();
    this.setScore({ home: 0, away: 0 });
    this.setClock(0, 'first');
    this.setPhase('first');
  }
}
