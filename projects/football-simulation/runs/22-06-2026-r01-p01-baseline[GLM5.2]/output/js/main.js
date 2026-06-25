// Entry point: bootstrap renderer, scene, players, ball, UI, engine.
import * as THREE from 'three';
import { buildScene, resize } from './scene.js';
import { buildAllPlayers } from './players.js';
import { createBall } from './ball.js';
import { buildScript } from './match.js';
import { Engine } from './engine.js';
import { UI } from './ui.js';
import { STATE } from './config.js';

init();

function init() {
  const stage = document.getElementById('stage');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 600);
  camera.position.set(0, 30, PITCH_WIDTH_HALF() + 42);
  camera.lookAt(0, 1.5, 0);

  const scene = buildScene(renderer);

  const ui = new UI();
  let engine = null;

  // ----- Setup screen handlers -----
  let homeColor = '#0b5bd3';
  let awayColor = '#d3141f';
  const homeNameInput = document.getElementById('home-name');
  const awayNameInput = document.getElementById('away-name');

  document.querySelectorAll('.kit-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const kit = btn.dataset.kit;
      const color = btn.dataset.color;
      document.querySelectorAll(`.kit-swatch[data-kit="${kit}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (kit === 'home') homeColor = color;
      else awayColor = color;
    });
  });

  const kickoffBtn = document.getElementById('kickoff-btn');
  kickoffBtn.addEventListener('click', () => startMatch());

  function startMatch() {
    const teams = {
      home: { name: (homeNameInput.value || 'HOME').toUpperCase(), color: homeColor, accent: '#ffffff' },
      away: { name: (awayNameInput.value || 'AWAY').toUpperCase(), color: awayColor, accent: '#ffffff' },
      gkHome: '#1ddc4b',
      gkAway: '#f4c20d',
    };
    STATE.teams = teams;

    // Build players with these kits
    for (const p of players.all) {
      scene.remove(p);
    }
    players = buildAllPlayers(scene, teams);
    ui.init(teams);
    ui.setPlayState(true);

    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    engine = new Engine({
      renderer, scene, camera,
      ballMesh,
      players,
      script: buildScript(),
      ui,
      kits: teams,
    });
    STATE.paused = false;
    engine.start();
    wireControls(engine);
  }

  let players = buildAllPlayers(scene, STATE.teams); // placeholder for initial sizing
  const ballMesh = createBall();
  ballMesh.position.set(0, 0.35, 0);
  scene.add(ballMesh);

  // Resize
  window.addEventListener('resize', resize(renderer, camera));

  // Render a single frame so the scene is visible behind the setup card
  renderer.render(scene, camera);

  function wireControls(engine) {
    document.getElementById('btn-play').onclick = () => engine.togglePause();
    document.getElementById('btn-restart').onclick = () => engine.reset();
    document.getElementById('btn-new').onclick = () => location.reload();
    document.getElementById('ft-new').onclick = () => location.reload();
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        engine.setSpeed(parseFloat(btn.dataset.speed));
      };
    });
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); engine.togglePause(); }
      if (e.code === 'Digit1') triggerSpeed(1);
      if (e.code === 'Digit2') triggerSpeed(2);
      if (e.code === 'Digit3') triggerSpeed(3);
    });
    function triggerSpeed(n) {
      const b = document.querySelector(`.speed-btn[data-speed="${n}"]`);
      if (b) b.click();
    }
  }
}

function PITCH_WIDTH_HALF() { return 34; }
