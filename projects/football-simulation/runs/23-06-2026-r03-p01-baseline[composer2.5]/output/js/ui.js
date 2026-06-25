import { MATCH, formatClock, phaseLabel } from './config.js';

export class UIController {
  constructor(teams) {
    this.teams = teams;
    this.goalTimeout = null;
    this._bindElements();
    this._bindControls();
    this._buildTimeline();
  }

  _bindElements() {
    this.el = {
      setupScreen: document.getElementById('setup-screen'),
      matchScreen: document.getElementById('match-screen'),
      homeName: document.getElementById('home-name'),
      awayName: document.getElementById('away-name'),
      homeColor: document.getElementById('home-color'),
      awayColor: document.getElementById('away-color'),
      startMatch: document.getElementById('start-match'),
      sbHome: document.getElementById('sb-home-name'),
      sbAway: document.getElementById('sb-away-name'),
      homeCrest: document.getElementById('home-crest'),
      awayCrest: document.getElementById('away-crest'),
      score: document.getElementById('score-display'),
      clock: document.getElementById('clock-display'),
      phase: document.getElementById('phase-display'),
      commentary: document.getElementById('commentary-text'),
      goalOverlay: document.getElementById('goal-overlay'),
      goalNumber: document.getElementById('goal-number'),
      goalName: document.getElementById('goal-name'),
      goalMinute: document.getElementById('goal-minute'),
      goalAssist: document.getElementById('goal-assist'),
      goalPortrait: document.getElementById('goal-portrait'),
      timelineTrack: document.getElementById('timeline-track'),
      timelineMarker: document.getElementById('timeline-marker'),
      fulltimePanel: document.getElementById('fulltime-panel'),
      ftScore: document.getElementById('ft-score'),
      potmNumber: document.getElementById('potm-number'),
      potmName: document.getElementById('potm-name'),
      potmRating: document.getElementById('potm-rating'),
      potmPortrait: document.getElementById('potm-portrait'),
      keyMomentsList: document.getElementById('key-moments-list'),
      btnPause: document.getElementById('btn-pause'),
      btnResume: document.getElementById('btn-resume'),
      btnRestart: document.getElementById('btn-restart'),
      btnNew: document.getElementById('btn-new'),
      ftNewMatch: document.getElementById('ft-new-match'),
      liveIndicator: document.getElementById('live-indicator'),
    };
  }

  _bindControls() {
    this.el.startMatch.addEventListener('click', () => {
      const teams = {
        home: {
          name: this.el.homeName.value || 'Home',
          color: this.el.homeColor.value,
          gkColor: '#2ecc71',
        },
        away: {
          name: this.el.awayName.value || 'Away',
          color: this.el.awayColor.value,
          gkColor: '#f0c040',
        },
      };
      if (this.onStart) this.onStart(teams);
    });

    this.el.btnPause.addEventListener('click', () => { if (this.onPause) this.onPause(); });
    this.el.btnResume.addEventListener('click', () => { if (this.onResume) this.onResume(); });
    this.el.btnRestart.addEventListener('click', () => { if (this.onRestart) this.onRestart(); });
    this.el.btnNew.addEventListener('click', () => { if (this.onNewMatch) this.onNewMatch(); });
    this.el.ftNewMatch.addEventListener('click', () => { if (this.onNewMatch) this.onNewMatch(); });

    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.onSpeed) this.onSpeed(parseInt(btn.dataset.speed));
      });
    });
  }

  _buildTimeline() {
    const events = [
      { min: 12, type: 'goal' },
      { min: 28, type: 'yellow' },
      { min: 36, type: 'goal' },
      { min: 54, type: 'yellow' },
      { min: 62, type: 'red' },
      { min: 64, type: 'goal' },
      { min: 78, type: 'save' },
      { min: 85, type: 'yellow' },
      { min: 88, type: 'save' },
    ];
    events.forEach(ev => {
      const div = document.createElement('div');
      div.className = `timeline-event ${ev.type}`;
      const pct = (ev.min / 93) * 100;
      div.style.left = `${pct}%`;
      if (ev.type === 'goal') div.textContent = '⚽';
      else if (ev.type === 'save') div.textContent = 'GK';
      div.title = `${ev.min}'`;
      this.el.timelineTrack.appendChild(div);
    });
  }

  showMatch(teams) {
    this.teams = teams;
    this.el.setupScreen.classList.remove('active');
    this.el.matchScreen.classList.add('active');
    this.el.sbHome.textContent = teams.home.name;
    this.el.sbAway.textContent = teams.away.name;
    this.el.homeCrest.style.background = teams.home.color;
    this.el.awayCrest.style.background = teams.away.color;
    this.el.goalPortrait.style.background = teams.home.color;
    this.el.fulltimePanel.classList.add('hidden');
    this.el.goalOverlay.classList.add('hidden');
    this.el.liveIndicator.style.display = 'flex';
  }

  showSetup() {
    this.el.setupScreen.classList.add('active');
    this.el.matchScreen.classList.remove('active');
  }

  updateScore(home, away) {
    this.el.score.textContent = `${home} - ${away}`;
  }

  updateClock(minute) {
    this.el.clock.textContent = formatClock(minute);
    this.el.phase.textContent = phaseLabel(minute);
    const pct = Math.min(minute / 93, 1) * 100;
    this.el.timelineMarker.style.left = `${pct}%`;
  }

  setCommentary(text) {
    this.el.commentary.textContent = text;
  }

  showGoal(event, score, teamColor) {
    this.el.goalOverlay.classList.remove('hidden');
    this.el.goalNumber.textContent = event.scorer || event.taker;
    this.el.goalName.textContent = (event.scorerName || event.takerName || '').toUpperCase();
    this.el.goalMinute.textContent = `${Math.floor(event.minute)}'`;
    if (event.assist && event.assistName) {
      this.el.goalAssist.textContent = `Assist: ${event.assist} ${event.assistName}`;
      this.el.goalAssist.style.display = '';
    } else {
      this.el.goalAssist.style.display = 'none';
    }
    this.el.goalPortrait.style.background = teamColor;

    if (this.goalTimeout) clearTimeout(this.goalTimeout);
    this.goalTimeout = setTimeout(() => {
      this.el.goalOverlay.classList.add('hidden');
    }, MATCH.goalOverlayDuration * 1000);
  }

  showFullTime(teams, score, potm, keyMoments) {
    this.el.liveIndicator.style.display = 'none';
    this.el.fulltimePanel.classList.remove('hidden');
    this.el.ftScore.textContent = `${teams.home.name} ${score.home} - ${score.away} ${teams.away.name}`;
    this.el.potmNumber.textContent = potm.number;
    this.el.potmName.textContent = potm.name;
    this.el.potmRating.textContent = `${potm.rating} ★`;
    this.el.potmPortrait.style.background = teams.home.color;

    this.el.keyMomentsList.innerHTML = '';
    keyMoments.forEach(km => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="min">${km.minute}'</span>${km.type}: ${km.player}${km.text.includes('(') ? ' ' + km.text.match(/\(.*\)/)?.[0] : ''}`;
      this.el.keyMomentsList.appendChild(li);
    });
  }

  setPhase(text) {
    this.el.phase.textContent = text;
  }
}
