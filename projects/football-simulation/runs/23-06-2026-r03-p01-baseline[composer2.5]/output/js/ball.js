import * as THREE from 'three';
import { PITCH, PHYSICS, clamp } from './config.js';

export class Ball {
  constructor(scene) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(PHYSICS.ballRadius, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    const pentMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (let i = 0; i < 5; i++) {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.04, 6), pentMat);
      const a = (i / 5) * Math.PI * 2;
      patch.position.set(Math.cos(a) * 0.07, 0.05, Math.sin(a) * 0.07);
      this.mesh.add(patch);
    }

    this.pos = { x: 0, y: PHYSICS.ballRadius, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.owner = null;
    this.inPlay = true;
    this.spin = 0;
  }

  reset(x = 0, z = 0) {
    this.pos = { x, y: PHYSICS.ballRadius, z };
    this.vel = { x: 0, y: 0, z: 0 };
    this.owner = null;
    this.inPlay = true;
    this._syncMesh();
  }

  kick(direction, power, loft = 0) {
    this.owner = null;
    const len = Math.sqrt(direction.x ** 2 + direction.z ** 2) || 1;
    this.vel.x = (direction.x / len) * power;
    this.vel.z = (direction.z / len) * power;
    this.vel.y = loft * power * 0.15;
    this.inPlay = true;
  }

  passTo(targetX, targetZ, power = 14) {
    const dx = targetX - this.pos.x;
    const dz = targetZ - this.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const t = dist / power;
    this.owner = null;
    this.vel.x = dx / t;
    this.vel.z = dz / t;
    this.vel.y = dist > 20 ? 2 : 0.5;
  }

  setOwner(player) {
    this.owner = player;
    this.vel = { x: 0, y: 0, z: 0 };
  }

  update(dt, playerManager) {
    if (this.owner) {
      const p = this.owner;
      const fwd = new THREE.Vector3(Math.sin(p.rotation.y), 0, Math.cos(p.rotation.y));
      this.pos.x = p.position.x + fwd.x * 0.5;
      this.pos.z = p.position.z + fwd.z * 0.5;
      this.pos.y = PHYSICS.ballRadius;
      this._syncMesh();
      return;
    }

    this.vel.y -= PHYSICS.gravity * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    if (this.pos.y <= PHYSICS.ballRadius) {
      this.pos.y = PHYSICS.ballRadius;
      if (this.vel.y < -0.5) {
        this.vel.y = -this.vel.y * PHYSICS.ballBounce;
      } else {
        this.vel.y = 0;
      }
    }

    this.vel.x *= PHYSICS.ballFriction;
    this.vel.z *= PHYSICS.ballFriction;

    const speed = Math.sqrt(this.vel.x ** 2 + this.vel.z ** 2);
    if (speed > PHYSICS.maxBallSpeed) {
      const s = PHYSICS.maxBallSpeed / speed;
      this.vel.x *= s;
      this.vel.z *= s;
    }

    const halfL = PITCH.length / 2;
    const halfW = PITCH.width / 2;

    if (Math.abs(this.pos.z) > halfW) {
      this.pos.z = clamp(this.pos.z, -halfW, halfW);
      this.vel.z *= -0.6;
    }

    if (Math.abs(this.pos.x) > halfL + 1) {
      this.vel.x *= 0.3;
      this.pos.x = clamp(this.pos.x, -halfL - 1, halfL + 1);
    }

    this._syncMesh();
    this.mesh.rotation.x += this.vel.z * dt * 2;
    this.mesh.rotation.z -= this.vel.x * dt * 2;
  }

  isInGoal() {
    const halfL = PITCH.length / 2;
    const gw = PITCH.goalWidth / 2;
    const gh = PITCH.goalHeight;
    if (this.pos.x < -halfL && this.pos.y < gh && Math.abs(this.pos.z) < gw) return 'home';
    if (this.pos.x > halfL && this.pos.y < gh && Math.abs(this.pos.z) < gw) return 'away';
    return null;
  }

  isMoving() {
    return Math.sqrt(this.vel.x ** 2 + this.vel.z ** 2 + this.vel.y ** 2) > 0.3;
  }

  _syncMesh() {
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
  }
}
