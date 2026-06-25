import * as THREE from 'three';
import { PITCH } from './config.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1420);
  scene.fog = new THREE.Fog(0x0a1420, 80, 200);

  const ambient = new THREE.AmbientLight(0x404860, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 150;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  scene.add(sun);

  createFloodlights(scene);
  createPitch(scene);
  createMarkings(scene);
  createGoals(scene);
  createAdBoards(scene);

  return scene;
}

function createFloodlights(scene) {
  const positions = [
    [-50, 25, -38], [-50, 25, 38], [50, 25, -38], [50, 25, 38],
  ];
  for (const [x, y, z] of positions) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, y, 8),
      new THREE.MeshStandardMaterial({ color: 0x333340, metalness: 0.6 })
    );
    pole.position.set(x, y / 2, z);
    pole.castShadow = true;
    scene.add(pole);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8 })
    );
    head.position.set(x, y, z);
    scene.add(head);

    const light = new THREE.SpotLight(0xfff8e8, 800, 120, Math.PI / 5, 0.5);
    light.position.set(x, y - 0.5, z);
    light.target.position.set(0, 0, z > 0 ? -10 : 10);
    scene.add(light);
    scene.add(light.target);
  }
}

function createPitch(scene) {
  const { length, width, stripeWidth } = PITCH;
  const stripes = Math.ceil(length / stripeWidth);
  const grassA = new THREE.Color(0x2d6b30);
  const grassB = new THREE.Color(0x358a3a);

  for (let i = 0; i < stripes; i++) {
    const geo = new THREE.PlaneGeometry(stripeWidth, width);
    const mat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? grassA : grassB,
      roughness: 0.85,
    });
    const stripe = new THREE.Mesh(geo, mat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-length / 2 + stripeWidth / 2 + i * stripeWidth, 0.01, 0);
    stripe.receiveShadow = true;
    scene.add(stripe);
  }
}

function createMarkings(scene) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const y = 0.02;
  const { length: L, width: W, penaltyAreaLength: paL, penaltyAreaWidth: paW, centerCircleR: cR, goalWidth: gW } = PITCH;

  function line(w, h, x, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    scene.add(m);
  }

  line(L, 0.12, 0, -W / 2);
  line(L, 0.12, 0, W / 2);
  line(0.12, W, -L / 2, 0);
  line(0.12, W, L / 2, 0);
  line(0.12, W, 0, 0);

  line(paL, 0.12, -L / 2 + paL / 2, 0);
  line(0.12, paW, -L / 2 + paL, 0);
  line(paL, 0.12, L / 2 - paL / 2, 0);
  line(0.12, paW, L / 2 - paL, 0);

  const circle = new THREE.Mesh(
    new THREE.RingGeometry(cR - 0.06, cR + 0.06, 64),
    mat
  );
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = y;
  scene.add(circle);

  const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-L / 2 + 11, L / 2 - 11]) {
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), spotMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(sx, y, 0);
    scene.add(spot);
  }
  const centerSpot = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), spotMat);
  centerSpot.rotation.x = -Math.PI / 2;
  centerSpot.position.y = y;
  scene.add(centerSpot);
}

function createGoals(scene) {
  const { length: L, goalWidth: gW, goalDepth: gD, goalHeight: gH } = PITCH;
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3 });
  const netMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.35, wireframe: true });

  for (const side of [-1, 1]) {
    const gx = side * L / 2;
    const group = new THREE.Group();

    const postR = 0.08;
    for (const [px, py, pz] of [
      [0, gH / 2, -gW / 2], [0, gH / 2, gW / 2], [0, gH, 0],
    ]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, py === gH ? gW : gH, 8), postMat);
      if (py === gH) {
        post.rotation.x = Math.PI / 2;
        post.position.set(px, py, pz);
      } else {
        post.position.set(px, py / 2, pz);
      }
      group.add(post);
    }

    const net = new THREE.Mesh(new THREE.BoxGeometry(gD, gH, gW), netMat);
    net.position.set(side * gD / 2, gH / 2, 0);
    group.add(net);

    group.position.x = gx;
    scene.add(group);
  }
}

function createAdBoards(scene) {
  const { length: L, width: W } = PITCH;
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a2540, emissive: 0x0a1530, emissiveIntensity: 0.3 });
  const texts = ['PITCHSIDE', '3D FOOTBALL SIMULATOR', 'PITCHSIDE'];

  function board(w, h, x, y, z, rotY) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), boardMat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    scene.add(mesh);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e6fff';
    ctx.font = 'bold 28px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(texts[Math.floor(Math.random() * texts.length)], 256, 42);
    const tex = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.9, h * 0.7),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    sign.position.set(x, y, z + (rotY === 0 ? 0.2 : rotY > 0 ? 0.2 : -0.2));
    sign.rotation.y = rotY;
    scene.add(sign);
  }

  const offset = 6;
  for (let i = -2; i <= 2; i++) {
    board(18, 1.2, i * 20, 0.6, -W / 2 - offset, 0);
    board(18, 1.2, i * 20, 0.6, W / 2 + offset, Math.PI);
  }
  board(30, 1.2, -L / 2 - offset, 0.6, 0, Math.PI / 2);
  board(30, 1.2, L / 2 + offset, 0.6, 0, -Math.PI / 2);
}
