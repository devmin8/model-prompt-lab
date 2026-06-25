// Ball mesh + simple physics state.
import * as THREE from 'three';

export function createBall() {
  const g = new THREE.Group();
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 20), ballMat);
  ball.position.y = 0.35;
  g.add(ball);
  // Pentagonal patches (visual) — small dark dots
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (let i = 0; i < 12; i++) {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 5), dotMat);
    const a = (i / 12) * Math.PI * 2;
    const b = (i % 2 === 0) ? 0.4 : -0.4;
    dot.position.set(Math.cos(a) * 0.32, 0.35 + b, Math.sin(a) * 0.32);
    dot.lookAt(dot.position.clone().multiplyScalar(2));
    ball.add(dot);
  }
  // Soft shadow blob
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 })
  );
  shadow.rotation.x = -Math.PI/2;
  shadow.position.y = 0.02;
  g.add(shadow);

  g.userData = {
    ball,
    shadow,
    spin: 0,
  };
  return g;
}

// Ball physics state — separate from mesh.
export function makeBallState(x = 0, z = 0) {
  return {
    x, y: 0.35, z,
    vx: 0, vy: 0, vz: 0,
    target: null,
    rolling: true,
    onGround: true,
  };
}

// Move ball toward (tx, tz) with given speed; auto-arc when air ball flag set.
export function rollToward(s, tx, tz, speed) {
  const dx = tx - s.x;
  const dz = tz - s.z;
  const d = Math.hypot(dx, dz) || 1;
  s.vx = (dx / d) * speed;
  s.vz = (dz / d) * speed;
  s.vy = 0;
  s.onGround = true;
}

// Pass through air with arc.
export function passToward(s, tx, tz, peak = 3, duration = 1.0) {
  const dx = tx - s.x;
  const dz = tz - s.z;
  s.vx = dx / duration;
  s.vz = dz / duration;
  s.vy = peak;
  s.onGround = false;
  // gravity handled in update
  s._airDuration = duration;
  s._airT = 0;
}

// Integrate ball physics. dt = seconds.
export function updateBall(s, ballMesh, dt) {
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  if (!s.onGround) {
    s._airT += dt;
    s.y += s.vy * dt * 2.2;
    s.vy -= 9.8 * dt * 0.6;
    if (s.y <= 0.35) {
      s.y = 0.35;
      s.vy = 0;
      s.onGround = true;
      // friction on landing
      s.vx *= 0.55; s.vz *= 0.55;
    }
  } else {
    // ground friction
    s.vx *= Math.pow(0.0125, dt);
    s.vz *= Math.pow(0.0125, dt);
  }
  ballMesh.position.set(s.x, s.y, s.z);
  // rolling spin
  ballMesh.userData.ball.rotation.x += (Math.hypot(s.vx, s.vz)) * dt * 0.5;
  // shadow stays on ground
  ballMesh.userData.shadow.position.set(0, 0.02 - s.y + 0.33, 0);
  const shScale = 1 + (s.y - 0.35) * 0.08;
  ballMesh.userData.shadow.scale.set(shScale, shScale, shScale);
}
