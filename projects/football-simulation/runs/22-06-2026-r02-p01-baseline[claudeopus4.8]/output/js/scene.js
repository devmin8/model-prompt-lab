// scene.js — builds the Three.js world: pitch, markings, goals, ad boards,
// floodlights, footballer-shaped players and a broadcast camera.

import * as THREE from 'three';
import { PITCH } from './config.js';

const HALF_L = PITCH.length / 2;
const HALF_W = PITCH.width / 2;

function hex(c) {
  return new THREE.Color(c);
}

export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = hex(0x05070d);
    this.scene.fog = new THREE.Fog(0x05070d, 140, 320);

    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 1000);
    // Broadcast side-on default position.
    this.camera.position.set(0, 42, 96);
    this.camera.lookAt(0, 0, 0);

    // Camera rig state for smooth ball tracking.
    this.camTarget = new THREE.Vector3(0, 0, 0);
    this.camPos = this.camera.position.clone();

    this.players = [];
    this.referee = null;
    this.ball = null;

    this._buildLights();
    this._buildPitch();
    this._buildGoals();
    this._buildAdBoards();
    this._buildFloodlights();
    this._buildBall();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xaecbff, 0x16331b, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(40, 90, 30);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const d = 90;
    key.shadow.camera.left = -d;
    key.shadow.camera.right = d;
    key.shadow.camera.top = d;
    key.shadow.camera.bottom = -d;
    key.shadow.camera.far = 260;
    key.shadow.bias = -0.0004;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xbcd0ff, 0.4);
    fill.position.set(-50, 60, -40);
    this.scene.add(fill);
  }

  _buildPitch() {
    const grass = new THREE.Group();

    // Striped turf built from alternating planes.
    const stripeW = PITCH.length / PITCH.stripes;
    for (let i = 0; i < PITCH.stripes; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? PITCH.stripeA : PITCH.stripeB,
        roughness: 0.95,
        metalness: 0,
      });
      const geo = new THREE.PlaneGeometry(stripeW, PITCH.width);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.x = -HALF_L + stripeW * (i + 0.5);
      m.receiveShadow = true;
      grass.add(m);
    }

    // Surrounding darker ground.
    const surround = new THREE.Mesh(
      new THREE.PlaneGeometry(PITCH.length + 60, PITCH.width + 50),
      new THREE.MeshStandardMaterial({ color: 0x0c2410, roughness: 1 })
    );
    surround.rotation.x = -Math.PI / 2;
    surround.position.y = -0.02;
    surround.receiveShadow = true;
    grass.add(surround);

    this.scene.add(grass);
    this._buildMarkings();
  }

  _line(points, y = 0.05) {
    const mat = new THREE.LineBasicMaterial({ color: PITCH.lineColor });
    const geo = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p[0], y, p[1]))
    );
    return new THREE.Line(geo, mat);
  }

  _buildMarkings() {
    const g = new THREE.Group();
    // Outer boundary + halfway line.
    g.add(
      this._line([
        [-HALF_L, -HALF_W], [HALF_L, -HALF_W], [HALF_L, HALF_W],
        [-HALF_L, HALF_W], [-HALF_L, -HALF_W],
      ])
    );
    g.add(this._line([[0, -HALF_W], [0, HALF_W]]));

    // Centre circle + spot.
    const circ = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      circ.push([Math.cos(a) * 9.15, Math.sin(a) * 9.15]);
    }
    g.add(this._line(circ));
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.y = 0.05;
    g.add(spot);

    // Penalty + goal areas, both ends.
    for (const s of [-1, 1]) {
      const xEdge = s * HALF_L;
      const pBox = 16.5;
      const pW = 40.3 / 2;
      g.add(
        this._line([
          [xEdge, -pW], [xEdge - s * pBox, -pW],
          [xEdge - s * pBox, pW], [xEdge, pW],
        ])
      );
      const gBox = 5.5;
      const gW = 18.3 / 2;
      g.add(
        this._line([
          [xEdge, -gW], [xEdge - s * gBox, -gW],
          [xEdge - s * gBox, gW], [xEdge, gW],
        ])
      );
      // Penalty spot.
      const ps = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      ps.rotation.x = -Math.PI / 2;
      ps.position.set(xEdge - s * 11, 0.05, 0);
      g.add(ps);
      // Penalty arc.
      const arc = [];
      for (let i = 0; i <= 32; i++) {
        const a = -Math.PI / 2 + (i / 32) * Math.PI;
        const px = xEdge - s * 11 - s * Math.cos(a) * 9.15;
        const pz = Math.sin(a) * 9.15;
        if (Math.abs(xEdge - px) > pBox) arc.push([px, pz]);
      }
      if (arc.length) g.add(this._line(arc));
    }
    this.scene.add(g);
  }

  _buildGoals() {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.4, metalness: 0.1,
    });
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.12,
      side: THREE.DoubleSide, wireframe: true,
    });
    const goalW = 7.32;
    const goalH = 2.44;
    const depth = 2.2;
    this.goals = {};
    for (const s of [-1, 1]) {
      const grp = new THREE.Group();
      const xEdge = s * HALF_L;
      const r = 0.12;
      const post = (z) => {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r, goalH, 12), postMat
        );
        m.position.set(xEdge, goalH / 2, z);
        m.castShadow = true;
        grp.add(m);
      };
      post(-goalW / 2);
      post(goalW / 2);
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, goalW, 12), postMat
      );
      bar.rotation.x = Math.PI / 2;
      bar.position.set(xEdge, goalH, 0);
      bar.castShadow = true;
      grp.add(bar);

      // Net: back + top + sides as wireframe planes.
      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(goalW, goalH, 14, 6), netMat
      );
      back.position.set(xEdge + s * depth, goalH / 2, 0);
      back.rotation.y = Math.PI / 2;
      grp.add(back);
      const top = new THREE.Mesh(
        new THREE.PlaneGeometry(depth, goalW, 4, 14), netMat
      );
      top.position.set(xEdge + (s * depth) / 2, goalH, 0);
      top.rotation.x = Math.PI / 2;
      top.rotation.z = Math.PI / 2;
      grp.add(top);
      for (const sz of [-1, 1]) {
        const side = new THREE.Mesh(
          new THREE.PlaneGeometry(depth, goalH, 4, 6), netMat
        );
        side.position.set(xEdge + (s * depth) / 2, goalH / 2, (sz * goalW) / 2);
        grp.add(side);
      }
      this.scene.add(grp);
      this.goals[s] = { x: xEdge, width: goalW, height: goalH };
    }
  }

  _buildAdBoards() {
    const mkBoard = (len, color) => {
      const geo = new THREE.PlaneGeometry(len, 1.4);
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: hex(color).multiplyScalar(0.25), roughness: 0.5,
      });
      return new THREE.Mesh(geo, mat);
    };
    const palette = [0x0d2a66, 0x102a44, 0x14213d];
    const off = 3.2;
    // Long sides.
    for (const z of [-HALF_W - off, HALF_W + off]) {
      for (let i = 0; i < 9; i++) {
        const b = mkBoard(PITCH.length / 9 - 0.4, palette[i % palette.length]);
        b.position.set(-HALF_L + (PITCH.length / 9) * (i + 0.5), 0.7, z);
        b.rotation.y = z < 0 ? 0 : Math.PI;
        this.scene.add(b);
      }
    }
  }

  _buildFloodlights() {
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x444a55, roughness: 0.6, metalness: 0.4,
    });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const grp = new THREE.Group();
        const px = sx * (HALF_L + 14);
        const pz = sz * (HALF_W + 12);
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.7, 34, 10), poleMat
        );
        pole.position.set(px, 17, pz);
        grp.add(pole);
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(7, 3.6, 1), poleMat
        );
        head.position.set(px, 34, pz);
        head.lookAt(0, 0, 0);
        grp.add(head);
        // Emissive lamp faces + a real light for glow.
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(6.6, 3.2, 0.3),
          new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: 0xfff4d0, emissiveIntensity: 1.4,
          })
        );
        lamp.position.copy(head.position);
        lamp.lookAt(0, 0, 0);
        lamp.translateZ(0.6);
        grp.add(lamp);
        const spot = new THREE.SpotLight(0xfff6e0, 0.5, 360, Math.PI / 5, 0.4);
        spot.position.set(px, 34, pz);
        spot.target.position.set(px * 0.3, 0, pz * 0.3);
        grp.add(spot);
        grp.add(spot.target);
        this.scene.add(grp);
      }
    }
  }

  _buildBall() {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
    );
    ball.castShadow = true;
    ball.position.set(0, 0.34, 0);
    this.scene.add(ball);
    this.ball = ball;
  }

  // --- Players -----------------------------------------------------------

  makePlayer({ shirt, shorts, socks, number, role }) {
    const grp = new THREE.Group();
    const skin = 0xe0a87c;

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.7 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: shorts, roughness: 0.7 });
    const sockMat = new THREE.MeshStandardMaterial({ color: socks, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });

    // Torso.
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 4, 10), shirtMat);
    torso.position.y = 1.32;
    torso.castShadow = true;
    grp.add(torso);

    // Head.
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat);
    head.position.y = 1.92;
    head.castShadow = true;
    grp.add(head);

    // Arms.
    const armGeo = new THREE.CapsuleGeometry(0.1, 0.5, 3, 6);
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.position.set(-0.42, 1.32, 0);
    grp.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.42;
    grp.add(armR);

    // Legs (animated for kicks/running).
    const legGeo = new THREE.CapsuleGeometry(0.13, 0.6, 3, 6);
    const hip = 0.18;
    const legL = new THREE.Group();
    const legLMesh = new THREE.Mesh(legGeo, shortsMat);
    legLMesh.position.y = -0.42;
    const sockL = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.28, 3, 6), sockMat);
    sockL.position.y = -0.78;
    legL.add(legLMesh, sockL);
    legL.position.set(-hip, 1.0, 0);
    grp.add(legL);
    const legR = legL.clone();
    legR.position.x = hip;
    grp.add(legR);

    grp.scale.setScalar(0.92);

    const player = {
      mesh: grp, number, role,
      legL, legR,
      pos: new THREE.Vector3(),
      target: new THREE.Vector3(),
      home: new THREE.Vector3(),
      facing: 0,
      moving: false,
      kickTimer: 0,
      runPhase: Math.random() * Math.PI * 2,
      speed: role === 'GK' ? 7 : 9.5,
      sentOff: false,
    };
    this.scene.add(grp);
    return player;
  }

  setBall(x, z, y = 0.34) {
    this.ball.position.set(x, y, z);
  }

  // Smoothly track the ball with a slight broadcast lead.
  updateCamera(dt, ballPos, intensity = 0) {
    const lead = THREE.MathUtils.clamp(ballPos.x * 0.18, -16, 16);
    const desiredPos = new THREE.Vector3(
      lead,
      40 - intensity * 6,
      96 - intensity * 14
    );
    const desiredTarget = new THREE.Vector3(ballPos.x * 0.55, 2.5, ballPos.z * 0.25);

    const k = 1 - Math.pow(0.0015, dt);
    this.camPos.lerp(desiredPos, k);
    this.camTarget.lerp(desiredTarget, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
