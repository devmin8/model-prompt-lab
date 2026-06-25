// Builds the 3D scene: stadium floor, striped pitch, markings, goals, nets, ad boards, floodlights, lights.
import * as THREE from 'three';
import { PITCH } from './config.js';

export function buildScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080d);
  scene.fog = new THREE.Fog(0x06080d, 160, 280);

  // ---- Lights ----
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);

  const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x0a0e16, 0.55);
  scene.add(hemi);

  // Floodlight cones from 4 corner towers
  const corners = [
    [-PITCH.length/2 - 8, -PITCH.width/2 - 8],
    [ PITCH.length/2 + 8, -PITCH.width/2 - 8],
    [-PITCH.length/2 - 8,  PITCH.width/2 + 8],
    [ PITCH.length/2 + 8,  PITCH.width/2 + 8],
  ];
  for (const [cx, cz] of corners) {
    const spot = new THREE.SpotLight(0xffffff, 1.4, 220, Math.PI/4.5, 0.45, 1.2);
    spot.position.set(cx, 38, cz);
    spot.target.position.set(0, 0, 0);
    scene.add(spot);
    scene.add(spot.target);
  }
  // Key directional
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(-40, 60, 60);
  scene.add(dir);

  // ---- Floodlight towers (visual) ----
  for (const [cx, cz] of corners) {
    const tower = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, metalness: 0.7, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 38, 8), poleMat);
    pole.position.y = 19;
    tower.add(pole);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x9fb4cf, emissive: 0xffffff, emissiveIntensity: 0.7 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 3), headMat);
    head.position.y = 39;
    tower.add(head);
    tower.position.set(cx, 0, cz);
    scene.add(tower);
  }

  // ---- Surrounding dark floor (stadium ground) ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 260),
    new THREE.MeshStandardMaterial({ color: 0x0b1018, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.position.y = -0.05;
  scene.add(ground);

  // ---- Pitch: striped grass ----
  const stripes = 18;
  const stripeLen = PITCH.length / stripes;
  const grassA = new THREE.MeshStandardMaterial({ color: 0x0f7a2a, roughness: 0.95 });
  const grassB = new THREE.MeshStandardMaterial({ color: 0x129031, roughness: 0.95 });
  for (let i = 0; i < stripes; i++) {
    const x = -PITCH.length/2 + i*stripeLen + stripeLen/2;
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(stripeLen + 0.05, PITCH.width),
      (i % 2 === 0) ? grassA : grassB
    );
    stripe.rotation.x = -Math.PI/2;
    stripe.position.set(x, 0, 0);
    scene.add(stripe);
  }

  // ---- Pitch surround (run-off area) ----
  const surround = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.length + 10, PITCH.width + 10),
    new THREE.MeshStandardMaterial({ color: 0x0a5e20, roughness: 1 })
  );
  surround.rotation.x = -Math.PI/2;
  surround.position.y = -0.02;
  scene.add(surround);

  buildMarkings(scene);
  buildGoals(scene);
  buildAdBoards(scene);

  return scene;
}

// Paint white markings as flat lines using thin boxes on the grass.
function buildMarkings(scene) {
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, emissive: 0x222222, emissiveIntensity: 0.1 });
  const W = PITCH.width, L = PITCH.length;
  const t = 0.18; // line thickness
  const y = 0.02;

  const add = (x, z, w, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), lineMat);
    m.position.set(x, y, z);
    scene.add(m);
  };

  // Outer boundary
  add(0, -W/2, L, t);  add(0,  W/2, L, t);
  add(-L/2, 0, t, W);  add( L/2, 0, t, W);
  // Halfway line
  add(0, 0, t, W);
  // Center circle
  addCircle(scene, 0, 0, 9.15, lineMat);
  // Center spot
  add(0, 0, t, t);
  // Penalty areas (16.5m deep, 40.3m wide)
  for (const sgn of [-1, 1]) {
    const cx = sgn * (L/2 - 16.5);
    // box outline
    add(cx, -20.15, t, 40.3);   // far line
    add(cx + sgn*8.25, -20.15, 16.5, t);  // top
    add(cx + sgn*8.25,  20.15, 16.5, t);  // bottom
    // 6-yard box
    const gx = sgn * (L/2 - 5.5);
    add(gx, -9.16, t, 18.32);
    add(gx + sgn*2.75, -9.16, 5.5, t);
    add(gx + sgn*2.75,  9.16, 5.5, t);
    // Penalty spot
    add(sgn * (L/2 - 11), 0, t, t);
    // Penalty arc
    addArc(scene, sgn*(L/2-11), 0, 9.15, lineMat,
      sgn > 0 ? -Math.PI*0.32 : Math.PI - Math.PI*0.32,
      sgn > 0 ?  Math.PI*0.32 : Math.PI + Math.PI*0.32);
    // Goal area line on byline between posts
  }
}

function addCircle(scene, cx, cz, r, mat) {
  addArc(scene, cx, cz, r, mat, 0, Math.PI * 2);
}
function addArc(scene, cx, cz, r, mat, a0, a1) {
  const seg = Math.max(8, Math.floor((a1 - a0) * 24));
  for (let i = 0; i < seg; i++) {
    const a = a0 + (a1 - a0) * (i / seg);
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.35), mat);
    m.position.set(x, 0.02, z);
    scene.add(m);
  }
}

function buildGoals(scene) {
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdddddd, emissiveIntensity: 0.15, roughness: 0.4 });
  const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, wireframe: true });
  const L = PITCH.length;
  const gW = PITCH.goalWidth, gH = PITCH.goalHeight, gD = PITCH.goalDepth;
  const r = 0.12;

  for (const sgn of [-1, 1]) {
    const grp = new THREE.Group();
    grp.position.set(sgn * L/2, 0, 0);
    // posts
    const postGeo = new THREE.CylinderGeometry(r, r, gH, 10);
    const lp = new THREE.Mesh(postGeo, postMat); lp.position.set(0, gH/2, -gW/2); grp.add(lp);
    const rp = new THREE.Mesh(postGeo, postMat); rp.position.set(0, gH/2,  gW/2); grp.add(rp);
    // crossbar
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, gW + r*2, 10), postMat);
    bar.rotation.x = Math.PI/2;
    bar.position.set(0, gH, 0);
    grp.add(bar);
    // back stanchion
    const back = sgn > 0 ? -1 : 1;
    // net (back)
    const backNet = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), netMat);
    backNet.position.set(back * gD, gH/2, 0);
    backNet.rotation.y = Math.PI/2;
    grp.add(backNet);
    // net (top)
    const topNet = new THREE.Mesh(new THREE.PlaneGeometry(gD, gW), netMat);
    topNet.rotation.x = -Math.PI/2;
    topNet.position.set(back * gD/2, gH, 0);
    topNet.rotation.z = Math.PI/2;
    grp.add(topNet);
    // side nets
    for (const sz of [-1, 1]) {
      const sn = new THREE.Mesh(new THREE.PlaneGeometry(gD, gH), netMat);
      sn.position.set(back * gD/2, gH/2, sz * gW/2);
      grp.add(sn);
    }
    scene.add(grp);
  }
}

function buildAdBoards(scene) {
  const colors = [0x1ba7d6, 0xd3141f, 0xf4c20d, 0xffffff, 0x0b5bd3];
  const boardMatBase = new THREE.MeshStandardMaterial({ color: 0x111419, roughness: 0.5 });
  const L = PITCH.length, W = PITCH.width;
  const offset = 4.5;
  const mk = (x, z, w, color, rotY) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0.4, z);
    grp.rotation.y = rotY;
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, 0.2), boardMatBase);
    grp.add(base);
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, 0.42, 0.02),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 })
    );
    accent.position.z = 0.11;
    grp.add(accent);
    scene.add(grp);
  };
  const segs = 10;
  const segW = L / segs;
  for (let i = 0; i < segs; i++) {
    const x = -L/2 + segW*(i + 0.5);
    mk(x, -W/2 - offset, segW * 0.95, colors[i % colors.length], 0);
    mk(x,  W/2 + offset, segW * 0.95, colors[(i+3) % colors.length], Math.PI);
  }
}

// Resize handler
export function resize(renderer, camera) {
  return () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
}
