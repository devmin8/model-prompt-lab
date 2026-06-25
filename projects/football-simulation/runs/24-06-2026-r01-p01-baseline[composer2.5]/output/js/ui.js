export class UIController {
  constructor() {
    this.els = {
      setup: document.getElementById('setup-overlay'),
      scoreboard: document.getElementById('scoreboard'),
      homeName: document.getElementById('sb-home-name'),
      awayName: document.getElementById('sb-away-name'),
      score: document.getElementById('sb-score'),
      clock: document.getElementById('sb-clock'),
      phase: document.getElementById('sb-phase'),
      homeCrest: document.getElementById('home-crest'),
      awayCrest: document.getElementById('away-crest'),
      goalOverlay: document.getElementById('goal-overlay'),
      goalCrest: document.getElementById('goal-crest'),
      goalNumber: document.getElementById('goal-number'),
      goalScorer: document.getElementById('goal-scorer'),
      goalMinute: document.getElementById('goal-minute'),
      goalAssist: document.getElementById('goal-assist'),
      cardOverlay: document.getElementById('card-overlay'),
      cardIcon: document.getElementById('card-icon'),
      cardPlayer: document.getElementById('card-player'),
      commentary: document.getElementById('commentary-bar'),
      commentaryText: document.getElementById('commentary-text'),
      controlBar: document.getElementById('control-bar'),
      timelineMarkers: document.getElementById('timeline-markers'),
      timelineCursor: document.getElementById('timeline-cursor'),
      halftime: document.getElementById('halftime-banner'),
      fulltime: document.getElementById('fulltime-panel'),
      ftScore: document.getElementById('ft-score'),
      potmNumber: document.getElementById('potm-number'),
      potmName: document.getElementById('potm-name'),
      potmRating: document.getElementById('potm-rating'),
      keyMomentsList: document.getElementById('key-moments-list'),
      phaseSteps: document.querySelectorAll('.phase-step'),
    };
    this.homeColor = '#034694';
    this.awayColor = '#EF0107';
  }

  showMatchUI(homeName, awayName, homeColor, awayColor) {
    this.homeColor = homeColor;
    this.awayColor = awayColor;
    this.els.setup.classList.remove('visible');
    this.els.setup.classList.add('hidden');
    this.els.scoreboard.classList.remove('hidden');
    this.els.commentary.classList.remove('hidden');
    this.els.controlBar.classList.remove('hidden');
    this.els.homeName.textContent = homeName;
    this.els.awayName.textContent = awayName;
    this.els.homeCrest.style.background = homeColor;
    this.els.awayCrest.style.background = awayColor;
  }

  showSetup() {
    this.els.setup.classList.add('visible');
    this.els.setup.classList.remove('hidden');
    this.els.scoreboard.classList.add('hidden');
    this.els.commentary.classList.add('hidden');
    this.els.controlBar.classList.add('hidden');
    this.els.fulltime.classList.add('hidden');
    this.hideOverlays();
  }

  updateScore(score, homeName, awayName) {
    this.els.score.textContent = `${score[0]} — ${score[1]}`;
  }

  updateClock(minute, phaseLabel) {
    const m = Math.floor(minute);
    const s = Math.floor((minute - m) * 60);
    const extra = minute > 90 ? `+${Math.floor(minute - 90)}` : '';
    this.els.clock.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${extra}`;
    this.els.phase.textContent = phaseLabel;
  }

  setPhase(phase) {
    this.els.phaseSteps.forEach(el => {
      el.classList.toggle('active', el.dataset.phase === phase);
    });
  }

  setCommentary(text) {
    this.els.commentaryText.textContent = text;
  }

  buildTimeline(events) {
    this.els.timelineMarkers.innerHTML = '';
    const markerTypes = ['goal', 'yellow', 'red', 'save', 'corner', 'penalty'];
    for (const ev of events) {
      if (markerTypes.includes(ev.type) || (ev.type === 'penalty')) {
        this.addTimelineMarker(ev.minute + (ev.extraMinute || 0), ev.type === 'penalty' ? 'penalty' : ev.type, false);
      }
    }
  }

  addTimelineMarker(minute, type, animate = true) {
    const marker = document.createElement('div');
    marker.className = `timeline-marker ${type}`;
    const pct = Math.min(minute / 92, 1) * 100;
    marker.style.left = `${pct}%`;
    if (animate) {
      marker.style.animation = 'goalSlideIn 0.3s ease';
    }
    this.els.timelineMarkers.appendChild(marker);
  }

  updateTimelineCursor(minute) {
    const pct = Math.min(minute / 92, 1) * 100;
    this.els.timelineCursor.style.left = `${pct}%`;
  }

  showGoal(ev, teamColor) {
    this.els.goalCrest.style.background = teamColor;
    this.els.goalNumber.textContent = ev.scorer.number;
    this.els.goalScorer.textContent = ev.scorer.name;
    const displayMin = ev.minute + (ev.extraMinute || 0);
    this.els.goalMinute.textContent = `${displayMin}'`;
    if (ev.assist) {
      this.els.goalAssist.textContent = `Assist: ${ev.assist.number} ${ev.assist.name}`;
      this.els.goalAssist.classList.remove('hidden');
    } else {
      this.els.goalAssist.textContent = '';
      this.els.goalAssist.classList.add('hidden');
    }
    this.els.goalOverlay.classList.remove('hidden');
    this.els.goalOverlay.style.animation = 'none';
    void this.els.goalOverlay.offsetWidth;
    this.els.goalOverlay.style.animation = '';
  }

  hideGoal() {
    this.els.goalOverlay.classList.add('hidden');
  }

  showCard(player, color) {
    this.els.cardIcon.className = `card-icon ${color}`;
    this.els.cardPlayer.textContent = `${player.number} ${player.name}`;
    this.els.cardOverlay.classList.remove('hidden');
  }

  hideCard() {
    this.els.cardOverlay.classList.add('hidden');
  }

  showHalftime() {
    this.els.halftime.classList.remove('hidden');
  }

  hideHalftime() {
    this.els.halftime.classList.add('hidden');
  }

  showFulltime({ homeName, awayName, score, potm, keyMoments }) {
    this.els.ftScore.textContent = `${homeName} ${score[0]} — ${score[1]} ${awayName}`;
    this.els.potmNumber.textContent = potm.number;
    this.els.potmName.textContent = potm.name;
    this.els.potmRating.textContent = `${potm.rating} ★`;
    this.els.keyMomentsList.innerHTML = keyMoments
      .map(km => `<li>${km.minute}' ${km.icon} ${km.text}</li>`)
      .join('');
    this.els.fulltime.classList.remove('hidden');
  }

  hideFulltime() {
    this.els.fulltime.classList.add('hidden');
  }

  hideOverlays() {
    this.hideGoal();
    this.hideCard();
    this.hideHalftime();
    this.hideFulltime();
    this.els.timelineMarkers.innerHTML = '';
  }

  bindControls({ onStart, onPause, onResume, onRestart, onNew, onSpeed }) {
    document.getElementById('start-match').addEventListener('click', onStart);
    document.getElementById('btn-pause').addEventListener('click', onPause);
    document.getElementById('btn-resume').addEventListener('click', onResume);
    document.getElementById('btn-restart').addEventListener('click', onRestart);
    document.getElementById('btn-new').addEventListener('click', onNew);
    document.getElementById('ft-new-match').addEventListener('click', onNew);

    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSpeed(parseInt(btn.dataset.speed, 10));
      });
    });
  }
}
