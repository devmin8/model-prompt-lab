import * as THREE from 'three';
import { PITCH, hexToThree } from './config.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1628);
  scene.fog = new THREE.Fog(0x0a1628, 120, 260);
  return scene;
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(Math.max(w, 1), Math.max(h, 1), false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  return renderer;
}

export function createLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x9bb8ff, 0x3d6b3d, 0.45);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
  sun.position.set(30, 60, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  scene.add(sun);

  const floodPositions = [
    [-40, 35, -30], [40, 35, -30], [-40, 35, 30], [40, 35, 30],
    [0, 38, -45], [0, 38, 45],
  ];
  for (const [x, y, z] of floodPositions) {
    const spot = new THREE.SpotLight(0xfff5e0, 1200, 160, Math.PI / 4, 0.6, 1);
    spot.position.set(x, y, z);
    spot.target.position.set(x * 0.3, 0, z * 0.3);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    scene.add(spot);
    scene.add(spot.target);

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, y, 8),
      new THREE.MeshStandardMaterial({ color: 0x333344 })
    );
    tower.position.set(x, y / 2, z);
    scene.add(tower);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.4, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x555566, emissive: 0xfff5e0, emissiveIntensity: 0.3 })
    );
    head.position.set(x, y - 0.5, z);
    scene.add(head);
  }
}

function stripeMaterial(light) {
  return new THREE.MeshStandardMaterial({
    color: light ? 0x3a8c3a : 0x2d7a2d,
    roughness: 0.85,
    metalness: 0.05,
  });
}

export function createPitch(scene) {
  const group = new THREE.Group();
  const { length: L, width: W, stripeWidth: SW } = PITCH;

  const stripes = Math.ceil(W / SW);
  for (let i = 0; i < stripes; i++) {
    const sw = Math.min(SW, W - i * SW);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(L, sw),
      stripeMaterial(i % 2 === 0)
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.01, -W / 2 + i * SW + sw / 2);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lineW = 0.12;

  function addLine(w, h, x, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.02, z);
    group.add(m);
  }

  addLine(L, lineW, 0, -W / 2);
  addLine(L, lineW, 0, W / 2);
  addLine(lineW, W, -L / 2, 0);
  addLine(lineW, W, L / 2, 0);

  const halfL = L / 2, halfW = W / 2;
  addLine(lineW, W, 0, 0);

  const ccSegs = 64;
  const ccGeo = new THREE.BufferGeometry();
  const ccVerts = [];
  for (let i = 0; i <= ccSegs; i++) {
    const a = (i / ccSegs) * Math.PI * 2;
    ccVerts.push(Math.cos(a) * PITCH.centerCircleRadius, 0.02, Math.sin(a) * PITCH.centerCircleRadius);
  }
  ccGeo.setAttribute('position', new THREE.Float32BufferAttribute(ccVerts, 3));
  const ccLine = new THREE.Line(ccGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
  group.add(ccLine);

  const paL = PITCH.penaltyAreaLength;
  const paW = PITCH.penaltyAreaWidth;
  addLine(paL, lineW, -halfL + paL / 2, 0);
  addLine(lineW, paW, -halfL, 0);
  addLine(paL, lineW, halfL - paL / 2, 0);
  addLine(lineW, paW, halfL, 0);

  const spotGeo = new THREE.CircleGeometry(0.3, 16);
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-1, 1].forEach(side => {
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(side * (halfL - 11), 0.025, 0);
    group.add(spot);
  });

  const centerSpot = new THREE.Mesh(spotGeo, spotMat);
  centerSpot.rotation.x = -Math.PI / 2;
  centerSpot.position.set(0, 0.025, 0);
  group.add(centerSpot);

  createGoals(group, halfL);
  createAdBoards(group, halfL, halfW);

  scene.add(group);
  return group;
}

function createGoals(group, halfL) {
  const { goalWidth: GW, goalDepth: GD, goalHeight: GH } = PITCH;
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.3 });
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
  });

  [-1, 1].forEach(side => {
    const gx = side * halfL;
    const postR = 0.06;

    const posts = [
      [gx, GH / 2, -GW / 2], [gx, GH / 2, GW / 2],
    ];
    posts.forEach(([x, y, z]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, GH, 8), postMat);
      p.position.set(x, y, z);
      group.add(p);
    });

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, GW, 8), postMat);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(gx, GH, 0);
    group.add(crossbar);

    const net = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), netMat);
    net.position.set(gx + side * GD / 2, GH / 2, 0);
    net.rotation.y = side * Math.PI / 2;
    group.add(net);

    const sideNetL = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), netMat);
    sideNetL.position.set(gx + side * GD / 2, GH / 2, -GW / 2);
    sideNetL.rotation.y = 0;
    group.add(sideNetL);

    const sideNetR = sideNetL.clone();
    sideNetR.position.z = GW / 2;
    group.add(sideNetR);

    const topNet = new THREE.Mesh(new THREE.PlaneGeometry(GD, GW), netMat);
    topNet.rotation.x = Math.PI / 2;
    topNet.position.set(gx + side * GD / 2, GH, 0);
    group.add(topNet);
  });
}

function createAdBoards(group, halfL, halfW) {
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#2d8cff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PITCHSIDE', 256, 30);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#8899aa';
  ctx.fillText('3D FOOTBALL SIMULATOR', 256, 52);
  const tex = new THREE.CanvasTexture(canvas);
  const adMat = new THREE.MeshStandardMaterial({ map: tex });

  const boardH = 1.0;
  const offset = 3;
  const segments = [
    { w: halfL * 2, x: 0, z: -halfW - offset, ry: 0 },
    { w: halfL * 2, x: 0, z: halfW + offset, ry: 0 },
    { w: halfW * 2, x: -halfL - offset, z: 0, ry: Math.PI / 2 },
    { w: halfW * 2, x: halfL + offset, z: 0, ry: Math.PI / 2 },
  ];
  segments.forEach(s => {
    const board = new THREE.Mesh(new THREE.BoxGeometry(s.w, boardH, 0.15), boardMat);
    board.position.set(s.x, boardH / 2, s.z);
    board.rotation.y = s.ry;
    group.add(board);

    const ad = new THREE.Mesh(new THREE.PlaneGeometry(s.w * 0.9, boardH * 0.7), adMat);
    ad.position.set(s.x, boardH * 0.55, s.z + (s.ry === 0 ? (s.z < 0 ? -0.1 : 0.1) : 0));
    if (s.ry !== 0) {
      ad.rotation.y = s.ry;
      ad.position.x += s.x < 0 ? -0.1 : 0.1;
    }
    group.add(ad);
  });
}

export function resizeRenderer(renderer, camera, canvas) {
  let w = canvas.clientWidth;
  let h = canvas.clientHeight;
  if (w === 0 || h === 0) {
    const parent = canvas.parentElement;
    w = parent?.clientWidth || window.innerWidth;
    h = parent?.clientHeight || window.innerHeight;
  }
  if (w === 0 || h === 0) return false;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  return true;
}
