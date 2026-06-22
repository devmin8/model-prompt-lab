// Pitchside — entry point: wire setup, scene, match engine, controls, loop.
import { Stadium } from './scene.js';
import { Match } from './match.js';
import { UI } from './ui.js';
import { SPEEDS } from './config.js';

const $ = (id) => document.getElementById(id);

function showError(e) {
  const box = $('loadError');
  box.classList.remove('hidden');
  box.textContent = 'Failed to start Pitchside.\n\n' + (e && e.stack ? e.stack : e);
  console.error(e);
}

let stadium, match, ui;
let speed = 1;
let last = performance.now();

function teamsFromSetup() {
  const short = (n) => n.trim().slice(0, 3).toUpperCase() || 'TBD';
  return {
    home: {
      name: ($('homeName').value || 'HOME').toUpperCase(),
      short: short($('homeName').value || 'HOM'),
      kit: $('homeKit').value, accent: $('homeAccent').value, gk: '#22c55e',
    },
    away: {
      name: ($('awayName').value || 'AWAY').toUpperCase(),
      short: short($('awayName').value || 'AWY'),
      kit: $('awayKit').value, accent: $('awayAccent').value, gk: '#facc15',
    },
  };
}

function startMatch() {
  const teams = teamsFromSetup();
  stadium.setTeams(teams);
  ui.applyTeams(teams);
  $('setup').classList.add('hidden');
  $('hud').classList.remove('hidden');
  match.restart();
  match.setPaused(false);
  setSpeed(1);
}

function setSpeed(s) {
  speed = s;
  document.querySelectorAll('.spd').forEach((b) =>
    b.classList.toggle('active', Number(b.dataset.spd) === s));
}

function bindControls() {
  $('kickoffBtn').addEventListener('click', startMatch);

  $('btnPause').addEventListener('click', () => { match.setPaused(true); ui.onClock(ui.el.sbClock.textContent, parseFloat(ui.el.tlProgress.style.width) / 100 || 0, false); });
  $('btnResume').addEventListener('click', () => match.setPaused(false));
  $('btnRestart').addEventListener('click', () => { match.restart(); match.setPaused(false); });
  $('btnNew').addEventListener('click', backToSetup);
  $('btnNew2').addEventListener('click', backToSetup);

  document.querySelectorAll('.spd').forEach((b) =>
    b.addEventListener('click', () => setSpeed(Number(b.dataset.spd))));

  window.addEventListener('keydown', (e) => {
    if ($('setup').classList.contains('hidden') === false) return;
    if (e.code === 'Space') { e.preventDefault(); match.setPaused(!match.paused); }
    if (e.key === '1') setSpeed(1);
    if (e.key === '2') setSpeed(2);
    if (e.key === '3') setSpeed(3);
    if (e.key.toLowerCase() === 'r') { match.restart(); match.setPaused(false); }
  });

  window.addEventListener('resize', () => stadium.resize());
}

function backToSetup() {
  match.setPaused(true);
  ui.onHideOverlays();
  $('hud').classList.add('hidden');
  $('setup').classList.remove('hidden');
}

function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05) * speed;   // clamp big frame gaps, apply speed
  try {
    match.update(dt);
    stadium.render();
  } catch (e) {
    showError(e);
  }
}

try {
  const canvas = $('scene');
  stadium = new Stadium(canvas);
  ui = new UI();
  match = new Match(stadium, ui);
  ui.applyTeams(stadium.teams);
  bindControls();
  requestAnimationFrame(loop);
} catch (e) {
  showError(e);
}

// Expose for quick debugging.
window.PITCHSIDE = { get match() { return match; }, get stadium() { return stadium; } };
