// main.js — entry point. Wires the setup screen, world, match engine and HUD,
// and runs the render loop.

import * as THREE from 'three';
import { World } from './scene.js';
import { Match } from './match.js';
import { UI } from './ui.js';
import { DEFAULT_TEAMS } from './config.js';

const canvas = document.getElementById('scene');
const hudRoot = document.getElementById('hud-root');

let world = null;
let match = null;
const clock = new THREE.Clock();

const ui = new UI(hudRoot, {
  onStart: (teams) => start(teams),
  onPause: () => match && match.setPaused(true),
  onResume: () => match && match.setPaused(false),
  onRestart: () => match && match.restart(),
  onNewMatch: () => window.location.reload(),
  onSpeed: (s) => match && match.setSpeed(s),
});

ui.showSetup(DEFAULT_TEAMS);

function start(teams) {
  world = new World(canvas);
  ui.buildHUD(teams);
  match = new Match(world, teams, (ev) => ui.event(ev));
  clock.start();
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  if (match) {
    match.update(dt);
    ui.updateHUD(match.hud());
  }
  if (world) world.render();
}
