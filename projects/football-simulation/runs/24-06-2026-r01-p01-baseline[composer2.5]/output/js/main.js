import * as THREE from 'three';
import { createScene } from './scene.js';
import { createCamera, BroadcastCamera } from './camera.js';
import { PlayerManager } from './players.js';
import { Ball } from './ball.js';
import { MatchEngine } from './engine.js';
import { UIController } from './ui.js';
import { buildMatchScript } from './config.js';

const canvas = document.getElementById('pitch-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const ui = new UIController();
let scene = null;
let camera = null;
let broadcastCam = null;
let players = null;
let ball = null;
let engine = null;
let lastTime = 0;

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  if (camera) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function initMatch(homeName, awayName, homeColor, awayColor) {
  scene = createScene();
  camera = createCamera(canvas.clientWidth / canvas.clientHeight);
  broadcastCam = new BroadcastCamera(camera);

  players = new PlayerManager(scene, homeColor, awayColor);
  ball = new Ball(scene);

  const script = buildMatchScript(homeName, awayName);
  engine = new MatchEngine({ ball, players, ui, onStateChange: () => {} });
  engine.configure(homeName, awayName, homeColor, awayColor, script);

  ui.showMatchUI(homeName, awayName, homeColor, awayColor);
  ui.buildTimeline(script.events);
  engine.start();
}

function showSetup() {
  engine = null;
  scene = null;
  ui.showSetup();
}

function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (engine && scene && camera) {
    engine.update(dt);
    if (!engine.inScene) {
      ball.update(dt, players.players);
      players.update(dt, engine.activePlayer);
    }
    broadcastCam.update(ball.position, dt);
    renderer.render(scene, camera);
  } else {
    renderer.clear();
  }
}

ui.bindControls({
  onStart: () => {
    const homeName = document.getElementById('home-name').value.trim() || 'Chelsea';
    const awayName = document.getElementById('away-name').value.trim() || 'Arsenal';
    const homeColor = document.getElementById('home-color').value;
    const awayColor = document.getElementById('away-color').value;
    initMatch(homeName, awayName, homeColor, awayColor);
  },
  onPause: () => engine?.pause(),
  onResume: () => engine?.resume(),
  onRestart: () => engine?.restart(),
  onNew: showSetup,
  onSpeed: (s) => engine?.setSpeed(s),
});

resize();
window.addEventListener('resize', resize);
lastTime = performance.now();
requestAnimationFrame(animate);
