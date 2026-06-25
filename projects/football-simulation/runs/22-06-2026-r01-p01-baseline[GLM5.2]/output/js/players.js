// Build footballer-shaped players from primitives + manage per-frame pose.
import * as THREE from 'three';
import { FORMATION_433, PITCH, PLAYER_NAMES } from './config.js';

// Each player is a Group with userData controlling kit + role.
export function createPlayer(team, slot, kits) {
  const g = new THREE.Group();

  const isGK = slot === 0;
  const kit = isGK
    ? (team === 'home' ? kits.gkHome : kits.gkAway)
    : (team === 'home' ? kits.home.color : kits.away.color);
  const skin = 0xc97a52;
  const hair = 0x161616;

  const shortsCol = new THREE.Color(kit).multiplyScalar(0.65).getHex();

  // Materials
  const matShirt = new THREE.MeshStandardMaterial({ color: kit, roughness: 0.7 });
  const matShorts = new THREE.MeshStandardMaterial({ color: shortsCol, roughness: 0.7 });
  const matSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
  const matHair = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.8 });
  const matShoe = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), matShirt);
  torso.position.y = 1.55;
  g.add(torso);

  // Shorts
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.5, 0.52), matShorts);
  shorts.position.y = 0.95;
  g.add(shorts);

  // Shoulders/sleeves
  const sleeveL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 0.45), matShirt);
  sleeveL.position.set(-0.58, 1.75, 0); g.add(sleeveL);
  const sleeveR = sleeveL.clone(); sleeveR.position.x = 0.58; g.add(sleeveR);

  // Arms (upper + lower) — pivot groups for kick/run animation
  const armLU = makeLimb(0.22, 0.5, 0.22, matSkin); armLU.position.set(-0.58, 1.95, 0); armLU.userData.fwd = 1; g.add(armLU);
  const armRU = makeLimb(0.22, 0.5, 0.22, matSkin); armRU.position.set( 0.58, 1.95, 0); armRU.userData.fwd = -1; g.add(armRU);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), matSkin);
  head.position.y = 2.45; g.add(head);
  // Hair cap
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.345, 16, 12, 0, Math.PI*2, 0, Math.PI*0.55), matHair);
  hairMesh.position.y = 2.5; g.add(hairMesh);

  // Legs (upper + lower) — pivots
  const legLU = makeLimb(0.28, 0.7, 0.28, matShorts, matShoe); legLU.position.set(-0.22, 0.95, 0); legLU.userData.fwd = 1; g.add(legLU);
  const legRU = makeLimb(0.28, 0.7, 0.28, matShorts, matShoe); legRU.position.set( 0.22, 0.95, 0); legRU.userData.fwd = -1; g.add(legRU);

  g.userData = {
    team, slot, isGK,
    role: (FORMATION_433[slot] || ['REF','REF','REF'])[2],
    home: (FORMATION_433[slot] || [0,0,'REF'])[0],
    baseZ: (FORMATION_433[slot] || [0,0,'REF'])[1],
    limbs: { armLU, armRU, legLU, legRU },
    body: torso,
    name: (PLAYER_NAMES[team] || [])[slot] || 'REFEREE',
    number: ((PLAYER_NAMES.numbers[team] || [])[slot]) || (slot + 1),
    target: new THREE.Vector3(),
    walkPhase: Math.random() * Math.PI * 2,
    facing: team === 'home' ? 0 : Math.PI,
  };

  // Away formation mirrored on X
  if (team === 'away') g.userData.home = -g.userData.home;
  // initial position
  g.position.set(g.userData.home, 0, team === 'away' ? -g.userData.baseZ : g.userData.baseZ);
  return g;
}

function makeLimb(w, h, d, matMat, shoeMat) {
  const pivot = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matMat);
  upper.position.y = -h/2;
  pivot.add(upper);
  if (shoeMat) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(w * 1.15, 0.18, d * 1.5), shoeMat);
    shoe.position.set(0, -h + 0.06, d * 0.3);
    upper.add(shoe);
  } else {
    // arm: lower + hand
    const lower = new THREE.Mesh(new THREE.BoxGeometry(w*0.85, h*0.95, d*0.85), matMat);
    lower.position.y = -h*0.95;
    upper.add(lower);
  }
  return pivot;
}

// Animate walking/idle. speed = how fast the limbs swing.
export function animatePlayer(p, moving, dt, speedFactor = 1) {
  const u = p.userData;
  if (moving) {
    u.walkPhase += dt * 9 * speedFactor;
    const s = Math.sin(u.walkPhase) * 0.6;
    const c = Math.cos(u.walkPhase) * 0.35;
    u.limbs.legLU.rotation.x = s;
    u.limbs.legRU.rotation.x = -s;
    u.limbs.armLU.rotation.x = -s * 0.7;
    u.limbs.armRU.rotation.x =  s * 0.7;
    // slight torso bob
    u.body.position.y = 1.55 + Math.abs(Math.sin(u.walkPhase * 2)) * 0.04;
  } else {
    // ease to rest
    u.limbs.legLU.rotation.x *= 0.85;
    u.limbs.legRU.rotation.x *= 0.85;
    u.limbs.armLU.rotation.x *= 0.85;
    u.limbs.armRU.rotation.x *= 0.85;
  }
}

// Kick animation — single-shot tween triggered on strike.
export function kickAnimation(p, onDone) {
  const leg = p.userData.facing > Math.PI/2 ? p.userData.limbs.legRU : p.userData.limbs.legLU;
  const start = performance.now();
  const dur = 280;
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    // wind up then swing through
    const a = t < 0.35
      ? -0.8 * (t / 0.35)
      : -0.8 + (1.6) * ((t - 0.35) / 0.65);
    leg.rotation.x = a;
    if (t < 1) requestAnimationFrame(step);
    else { leg.rotation.x = 0; onDone && onDone(); }
  }
  requestAnimationFrame(step);
}

export function setFacing(p, dx, dz) {
  if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
  // Face along X axis primarily (players face the direction of motion in the X-Z plane)
  const targetRot = Math.atan2(dx, dz) - Math.PI/2;
  // smooth
  const cur = p.rotation.y;
  let diff = targetRot - cur;
  while (diff > Math.PI) diff -= Math.PI*2;
  while (diff < -Math.PI) diff += Math.PI*2;
  p.rotation.y = cur + diff * Math.min(1, 0.2);
}

// Build both teams + referee
export function buildAllPlayers(scene, kits) {
  const players = { home: [], away: [], all: [] };
  for (let i = 0; i < FORMATION_433.length; i++) {
    const hp = createPlayer('home', i, kits);
    scene.add(hp); players.home.push(hp); players.all.push(hp);
    const ap = createPlayer('away', i, kits);
    scene.add(ap); players.away.push(ap); players.all.push(ap);
  }
  // Referee
  const ref = createPlayer('home', 99, { home: { color: '#111111' }, away: {}, gkHome: '#111111', gkAway: '#111111' });
  ref.userData.isGK = false;
  ref.userData.role = 'REF';
  ref.userData.name = 'OLIVER';
  ref.userData.number = 0;
  // override kit color of shirt
  ref.children[0].material = ref.children[0].material.clone();
  ref.children[0].material.color.set('#111111');
  ref.position.set(-10, 0, -15);
  scene.add(ref);
  players.ref = ref;
  players.all.push(ref);
  return players;
}
