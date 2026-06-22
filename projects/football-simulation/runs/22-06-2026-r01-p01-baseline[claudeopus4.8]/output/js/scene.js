// Pitchside — 3D scene: pitch, goals, stands-free stadium, players, ball, camera.
import * as THREE from 'three';
import { FIELD, GOAL, FORMATION, ROSTER, REFEREE } from './config.js';

// ---------------------------------------------------------------------------
// Pitch texture — striped grass + white markings, drawn to a canvas.
// ---------------------------------------------------------------------------
function makePitchTexture() {
  const W = 2048, H = Math.round(2048 * (FIELD.width / FIELD.length));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sx = W / FIELD.length, sz = H / FIELD.width;
  const mx = (x) => (x + FIELD.halfL) * sx;        // metres(centre origin) -> px
  const mz = (z) => (z + FIELD.halfW) * sz;

  // Mowing stripes along the length.
  const stripes = 18;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? '#2f8a3c' : '#2a7e36';
    g.fillRect((i / stripes) * W, 0, W / stripes + 1, H);
  }

  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.lineWidth = Math.max(3, sx * 0.12);
  g.lineCap = 'round';

  const line = (x1, z1, x2, z2) => {
    g.beginPath(); g.moveTo(mx(x1), mz(z1)); g.lineTo(mx(x2), mz(z2)); g.stroke();
  };
  const rect = (x, z, w, h) => {
    g.strokeRect(mx(x), mz(z), w * sx, h * sz);
  };

  // Outer boundary (inset a touch from the texture edge).
  const margin = 2;
  rect(-FIELD.halfL + margin, -FIELD.halfW + margin,
       FIELD.length - margin * 2, FIELD.width - margin * 2);

  // Halfway line + centre circle + spot.
  line(0, -FIELD.halfW + margin, 0, FIELD.halfW - margin);
  g.beginPath(); g.arc(mx(0), mz(0), 9.15 * sx, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(mx(0), mz(0), sx * 0.35, 0, Math.PI * 2); g.fill();

  // Penalty + goal areas for each end.
  const ends = [-1, 1];
  for (const s of ends) {
    const goalLine = s * (FIELD.halfL - margin);
    // Penalty area 16.5m deep, 40.3m wide.
    const paDepth = 16.5, paHalfW = 40.32 / 2;
    const paX = s === -1 ? goalLine : goalLine - paDepth;
    rect(paX, -paHalfW, paDepth, paHalfW * 2);
    // Goal area 5.5m deep, 18.32m wide.
    const gaDepth = 5.5, gaHalfW = 18.32 / 2;
    const gaX = s === -1 ? goalLine : goalLine - gaDepth;
    rect(gaX, -gaHalfW, gaDepth, gaHalfW * 2);
    // Penalty spot.
    const spotX = s * (FIELD.halfL - margin - 11);
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(mx(spotX), mz(0), sx * 0.35, 0, Math.PI * 2); g.fill();
    // Penalty arc (the "D").
    g.beginPath();
    const a = Math.acos((paDepth - 11) / 9.15);
    if (s === 1) g.arc(mx(spotX), mz(0), 9.15 * sx, Math.PI - a, Math.PI + a);
    else g.arc(mx(spotX), mz(0), 9.15 * sx, -a, a);
    g.stroke();
  }

  // Corner arcs.
  for (const sx2 of ends) for (const sz2 of ends) {
    g.beginPath();
    const cx = sx2 * (FIELD.halfL - margin), cz = sz2 * (FIELD.halfW - margin);
    g.arc(mx(cx), mz(cz), 1 * sx, 0, Math.PI * 2);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Goal with frame + net.
// ---------------------------------------------------------------------------
function makeGoal(side) {
  const grp = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1, emissive: 0x222222 });
  const r = 0.08;
  const w = GOAL.width, h = GOAL.height, d = GOAL.depth;

  const post = (x, y, z, len, axis) => {
    const geo = axis === 'y'
      ? new THREE.CylinderGeometry(r, r, len, 12)
      : new THREE.BoxGeometry(axis === 'x' ? len : r * 2, r * 2, axis === 'z' ? len : r * 2);
    const m = new THREE.Mesh(geo, postMat);
    m.position.set(x, y, z);
    m.castShadow = true;
    grp.add(m);
    return m;
  };
  // Two uprights + crossbar.
  post(0, h / 2, -w / 2, h, 'y');
  post(0, h / 2, w / 2, h, 'y');
  post(0, h, 0, w, 'z');
  // Back frame.
  post(-d, h / 2, -w / 2, h, 'y');
  post(-d, h / 2, w / 2, h, 'y');
  post(-d, h, 0, w, 'z');
  post(-d / 2, h, -w / 2, d, 'x');
  post(-d / 2, h, w / 2, d, 'x');

  // Net — translucent grid panels (back, top, sides).
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    roughness: 1, metalness: 0, depthWrite: false,
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), netMat);
  back.position.set(-d, h / 2, 0); back.rotation.y = Math.PI / 2;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(d, w), netMat);
  top.position.set(-d / 2, h, 0); top.rotation.x = Math.PI / 2; top.rotation.z = Math.PI / 2;
  const sideA = new THREE.Mesh(new THREE.PlaneGeometry(d, h), netMat);
  sideA.position.set(-d / 2, h / 2, -w / 2);
  const sideB = sideA.clone(); sideB.position.z = w / 2;
  grp.add(back, top, sideA, sideB);

  // Net line grid for texture.
  const lines = new THREE.Group();
  const lmat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const pts = [new THREE.Vector3(-d, t * h, -w / 2), new THREE.Vector3(-d, t * h, w / 2)];
    lines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lmat));
  }
  for (let i = 0; i <= 14; i++) {
    const z = -w / 2 + (i / 14) * w;
    const pts = [new THREE.Vector3(-d, 0, z), new THREE.Vector3(-d, h, z)];
    lines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lmat));
  }
  grp.add(lines);

  // Position at the goal line, opening toward the pitch.
  grp.position.x = side * FIELD.halfL;
  grp.rotation.y = side === 1 ? 0 : Math.PI;
  return grp;
}

// ---------------------------------------------------------------------------
// Footballer from primitives.
// ---------------------------------------------------------------------------
function makePlayer(kitColor, accent, number, skin = 0xe0ac69) {
  const grp = new THREE.Group();
  const kit = new THREE.MeshStandardMaterial({ color: kitColor, roughness: 0.7 });
  const shorts = new THREE.MeshStandardMaterial({ color: accent === '#ffffff' ? 0xffffff : kitColor, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });

  // Torso.
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), kit);
  torso.position.y = 1.2; torso.castShadow = true; grp.add(torso);

  // Head + neck.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), skinMat);
  head.position.y = 1.72; head.castShadow = true; grp.add(head);

  // Arms.
  const armGeo = new THREE.BoxGeometry(0.13, 0.6, 0.13);
  const lArm = new THREE.Mesh(armGeo, skinMat);
  lArm.position.set(-0.36, 1.2, 0); lArm.geometry.translate(0, -0.3, 0); lArm.position.y = 1.5;
  const rArm = lArm.clone(); rArm.position.x = 0.36;
  lArm.castShadow = rArm.castShadow = true; grp.add(lArm, rArm);

  // Legs (pivot at hip).
  const legGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
  legGeo.translate(0, -0.4, 0);
  const lLeg = new THREE.Mesh(legGeo, shorts);
  lLeg.position.set(-0.14, 0.85, 0);
  const rLeg = new THREE.Mesh(legGeo.clone(), shorts);
  rLeg.position.set(0.14, 0.85, 0);
  lLeg.castShadow = rLeg.castShadow = true; grp.add(lLeg, rLeg);

  // Boots.
  const bootGeo = new THREE.BoxGeometry(0.2, 0.12, 0.34);
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  const lBoot = new THREE.Mesh(bootGeo, bootMat); lBoot.position.set(0, -0.78, 0.06); lLeg.add(lBoot);
  const rBoot = new THREE.Mesh(bootGeo.clone(), bootMat); rBoot.position.set(0, -0.78, 0.06); rLeg.add(rBoot);

  // Number on the back.
  if (number != null) {
    const nc = document.createElement('canvas'); nc.width = nc.height = 128;
    const ng = nc.getContext('2d');
    ng.fillStyle = accent === '#ffffff' ? '#ffffff' : '#ffffff';
    ng.font = 'bold 90px Arial'; ng.textAlign = 'center'; ng.textBaseline = 'middle';
    ng.fillText(String(number), 64, 70);
    const ntex = new THREE.CanvasTexture(nc);
    const np = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4),
      new THREE.MeshBasicMaterial({ map: ntex, transparent: true }));
    np.position.set(0, 1.25, -0.17); np.rotation.y = Math.PI; torso.add(np);
  }

  return { group: grp, lLeg, rLeg, lArm, rArm, head, torso };
}

// ---------------------------------------------------------------------------
// Scene wrapper.
// ---------------------------------------------------------------------------
export class Stadium {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05080f);
    this.scene.fog = new THREE.Fog(0x05080f, 120, 240);

    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 600);
    this.camera.position.set(0, 34, 62);

    this._camPos = new THREE.Vector3(0, 34, 62);
    this._camLook = new THREE.Vector3(0, 0, 0);

    this._buildLights();
    this._buildPitch();
    this._buildSurround();
    this.scene.add(makeGoal(1), makeGoal(-1));

    this.players = { home: [], away: [] };
    this.referee = null;
    this._buildTeams();
    this._buildBall();

    this.resize();
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x9fbfff, 0x16301a, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(40, 80, 50);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const s = 70;
    key.shadow.camera.left = -s; key.shadow.camera.right = s;
    key.shadow.camera.top = s; key.shadow.camera.bottom = -s;
    key.shadow.camera.far = 220; key.shadow.bias = -0.0004;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd2ff, 0.7);
    fill.position.set(-50, 60, -40);
    this.scene.add(fill);
  }

  _buildPitch() {
    const tex = makePitchTexture();
    const geo = new THREE.PlaneGeometry(FIELD.length, FIELD.width);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
    this.pitch = new THREE.Mesh(geo, mat);
    this.pitch.rotation.x = -Math.PI / 2;
    this.pitch.receiveShadow = true;
    this.scene.add(this.pitch);

    // Surrounding apron / running track.
    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD.length + 24, FIELD.width + 22),
      new THREE.MeshStandardMaterial({ color: 0x0c2a14, roughness: 1 }),
    );
    apron.rotation.x = -Math.PI / 2; apron.position.y = -0.02;
    apron.receiveShadow = true;
    this.scene.add(apron);
  }

  _buildSurround() {
    // Ad boards (emissive panels) around the touchlines.
    const adColors = [0x1565c0, 0x0d47a1, 0xc62828, 0x2e7d32, 0x6a1b9a, 0xef6c00];
    const boardMat = (i) => new THREE.MeshStandardMaterial({
      color: adColors[i % adColors.length], emissive: adColors[i % adColors.length],
      emissiveIntensity: 0.45, roughness: 0.6,
    });
    const boardH = 1.0, segW = 5;
    const zEdge = FIELD.halfW + 2.5;
    for (const z of [-zEdge, zEdge]) {
      const n = Math.floor(FIELD.length / segW);
      for (let i = 0; i < n; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(segW - 0.2, boardH, 0.3), boardMat(i));
        b.position.set(-FIELD.halfL + segW * (i + 0.5), boardH / 2, z);
        b.rotation.x = z > 0 ? -0.18 : 0.18;
        this.scene.add(b);
      }
    }

    // Floodlight towers at the four corners.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const tower = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 34, 10),
        new THREE.MeshStandardMaterial({ color: 0x444a52, roughness: 0.6 }),
      );
      pole.position.y = 17; tower.add(pole);
      const rig = new THREE.Mesh(
        new THREE.BoxGeometry(6, 2.4, 1),
        new THREE.MeshStandardMaterial({ color: 0x111418 }),
      );
      rig.position.y = 35; tower.add(rig);
      // Lamp panels (emissive) + a soft spotlight.
      for (let i = 0; i < 12; i++) {
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 0.7, 0.2),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 2 }),
        );
        lamp.position.set(-2.2 + (i % 4) * 1.4, 35 + (Math.floor(i / 4) - 1) * 0.75, 0.55);
        tower.add(lamp);
      }
      tower.position.set(sx * (FIELD.halfL + 12), 0, sz * (FIELD.halfW + 10));
      const spot = new THREE.SpotLight(0xfff4e0, 120, 220, Math.PI / 5, 0.5, 1.2);
      spot.position.set(sx * (FIELD.halfL + 12), 36, sz * (FIELD.halfW + 10));
      spot.target.position.set(sx * 18, 0, sz * 8);
      this.scene.add(spot, spot.target, tower);
    }

    // Distant dark stand geometry hint (no crowd) — low rings around the apron.
    for (const sz of [-1, 1]) {
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(FIELD.length + 30, 14, 6),
        new THREE.MeshStandardMaterial({ color: 0x0a0d14, roughness: 1 }),
      );
      stand.position.set(0, 7, sz * (FIELD.halfW + 9));
      this.scene.add(stand);
    }
    for (const sx of [-1, 1]) {
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(6, 14, FIELD.width + 22),
        new THREE.MeshStandardMaterial({ color: 0x0a0d14, roughness: 1 }),
      );
      stand.position.set(sx * (FIELD.halfL + 13), 7, 0);
      this.scene.add(stand);
    }
  }

  setTeams(teams) {
    this.teams = teams;
    this._applyKits();
  }

  _buildTeams() {
    this.teams = {
      home: { name: 'CHELSEA', short: 'CHE', kit: '#1d4ed8', accent: '#ffffff', gk: '#22c55e' },
      away: { name: 'ARSENAL', short: 'ARS', kit: '#dc2626', accent: '#ffffff', gk: '#facc15' },
    };
    for (const side of ['home', 'away']) {
      const dir = side === 'home' ? 1 : -1;
      FORMATION.forEach((slot, i) => {
        const roster = ROSTER[side][i];
        const isGK = slot.role === 'GK';
        const color = isGK ? this.teams[side].gk : this.teams[side].kit;
        const p = makePlayer(
          new THREE.Color(color), this.teams[side].accent, roster.n,
        );
        const baseX = slot.x * dir, baseZ = slot.z * dir;
        const player = {
          ...p, side, role: slot.role, number: roster.n, name: roster.name,
          baseX, baseZ, x: baseX, z: baseZ, tx: baseX, tz: baseZ,
          speed: 7, phase: Math.random() * 6, kickT: 0, facing: dir > 0 ? 1 : -1,
          celebrate: 0, isGK,
        };
        p.group.position.set(baseX, 0, baseZ);
        this.scene.add(p.group);
        this.players[side].push(player);
      });
    }
    // Referee.
    const rp = makePlayer(new THREE.Color(REFEREE.kit), REFEREE.accent, null);
    rp.group.position.set(6, 0, -6);
    this.scene.add(rp.group);
    this.referee = { ...rp, side: 'ref', x: 6, z: -6, tx: 6, tz: -6, speed: 6, phase: 0, kickT: 0, facing: 1 };
  }

  _applyKits() {
    for (const side of ['home', 'away']) {
      this.players[side].forEach((p) => {
        const color = p.isGK ? this.teams[side].gk : this.teams[side].kit;
        p.torso.material.color.set(color);
      });
    }
  }

  _buildBall() {
    const geo = new THREE.SphereGeometry(0.22, 24, 24);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 });
    this.ballMesh = new THREE.Mesh(geo, mat);
    this.ballMesh.castShadow = true;
    this.ballMesh.position.set(0, 0.22, 0);
    this.scene.add(this.ballMesh);
  }

  allPlayers() {
    return [...this.players.home, ...this.players.away, this.referee];
  }

  // Animate a single character toward its target.
  _stepPlayer(p, dt) {
    const dx = p.tx - p.x, dz = p.tz - p.z;
    const dist = Math.hypot(dx, dz);
    const moving = dist > 0.15;
    if (moving) {
      const step = Math.min(dist, p.speed * dt);
      p.x += (dx / dist) * step;
      p.z += (dz / dist) * step;
      p.facing = Math.atan2(dx, dz);
      p.phase += dt * 11;
    } else {
      p.phase += dt * 0.0; // idle players stay still
    }
    p.group.position.set(p.x, 0, p.z);
    // Face travel direction (or stored facing for idle).
    if (moving) p.group.rotation.y = p.facing;

    // Leg / arm swing.
    const swing = moving ? Math.sin(p.phase) * 0.7 : 0;
    p.lLeg.rotation.x = swing;
    p.rLeg.rotation.x = -swing;
    p.lArm.rotation.x = -swing * 0.6;
    p.rArm.rotation.x = swing * 0.6;

    // Kick animation overrides one leg.
    if (p.kickT > 0) {
      p.kickT -= dt;
      const k = Math.sin((1 - Math.max(p.kickT, 0) / 0.35) * Math.PI);
      p.rLeg.rotation.x = -1.4 * k;
      p.group.rotation.y = p.kickFacing ?? p.group.rotation.y;
    }

    // Celebration — arms up, little hop.
    if (p.celebrate > 0) {
      p.celebrate -= dt;
      p.lArm.rotation.x = -2.6;
      p.rArm.rotation.x = -2.6;
      p.group.position.y = Math.abs(Math.sin(p.phase * 0.6)) * 0.25;
    } else if (p.group.position.y !== 0) {
      p.group.position.y = 0;
    }
  }

  triggerKick(p, facing) {
    p.kickT = 0.35;
    p.kickFacing = facing;
  }

  update(dt) {
    for (const p of this.allPlayers()) this._stepPlayer(p, dt);
  }

  updateCamera(target, dt, mode = 'broadcast') {
    let desired, look;
    if (mode === 'broadcast') {
      desired = new THREE.Vector3(target.x * 0.55, 33, 60);
      look = new THREE.Vector3(target.x * 0.5, 1, target.z * 0.2);
    } else if (mode === 'goal') {
      desired = new THREE.Vector3(target.x * 0.7 + 14, 8, 26);
      look = new THREE.Vector3(target.x, 1.5, target.z);
    } else if (mode === 'celebrate') {
      desired = new THREE.Vector3(target.x + 10, 6, 20);
      look = new THREE.Vector3(target.x, 2, target.z);
    }
    const lerp = 1 - Math.pow(0.001, dt);
    this._camPos.lerp(desired, lerp);
    this._camLook.lerp(look, lerp);
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);
  }

  setBall(x, y, z) {
    this.ballMesh.position.set(x, y, z);
  }

  spinBall(dx, dz, dt) {
    this.ballMesh.rotation.z -= dx * dt * 2;
    this.ballMesh.rotation.x += dz * dt * 2;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
