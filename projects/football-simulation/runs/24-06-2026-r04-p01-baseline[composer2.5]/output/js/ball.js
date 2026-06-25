import * as THREE from 'three';
import { PITCH } from './config.js';

export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    this.mesh.castShadow = true;
    this.mesh.position.set(0, 0.22, 0);
    scene.add(this.mesh);

    this.velocity = new THREE.Vector3();
    this.inNet = false;
    this.owner = null;
    this.airborne = false;
    this.kickPending = false;
  }

  reset(x = 0, z = 0) {
    this.mesh.position.set(x, 0.22, z);
    this.velocity.set(0, 0, 0);
    this.inNet = false;
    this.owner = null;
    this.airborne = false;
    this.kickPending = false;
  }

  kick(direction, power, loft = 0) {
    const dir = direction.clone().normalize();
    this.velocity.copy(dir.multiplyScalar(power));
    this.velocity.y = loft;
    this.airborne = loft > 0;
    this.owner = null;
    this.kickPending = false;
  }

  setOwner(player) {
    this.owner = player;
    this.velocity.set(0, 0, 0);
    this.airborne = false;
    const offset = new THREE.Vector3(0, 0, 0.6);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    this.mesh.position.copy(player.position).add(offset);
    this.mesh.position.y = 0.22;
  }

  update(dt, players) {
    if (this.owner) {
      const offset = new THREE.Vector3(0, 0, 0.55);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.owner.rotation.y);
      this.mesh.position.copy(this.owner.position).add(offset);
      this.mesh.position.y = 0.22;
      return;
    }

    if (this.inNet) return;

    const pos = this.mesh.position;
    const halfL = PITCH.length / 2;
    const halfW = PITCH.width / 2;

    if (this.airborne || pos.y > 0.22) {
      this.velocity.y -= 9.8 * dt;
      pos.addScaledVector(this.velocity, dt);
      if (pos.y <= 0.22) {
        pos.y = 0.22;
        this.velocity.y = Math.abs(this.velocity.y) * 0.3;
        if (this.velocity.y < 0.5) {
          this.airborne = false;
          this.velocity.y = 0;
        }
      }
    } else {
      pos.x += this.velocity.x * dt;
      pos.z += this.velocity.z * dt;
      const friction = 0.97;
      this.velocity.x *= friction;
      this.velocity.z *= friction;
      if (Math.abs(this.velocity.x) < 0.05) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.05) this.velocity.z = 0;
    }

    if (pos.z < -halfW + 0.5 || pos.z > halfW - 0.5) {
      this.velocity.z *= -0.6;
      pos.z = THREE.MathUtils.clamp(pos.z, -halfW + 0.5, halfW - 0.5);
    }
    if (pos.x < -halfL + 0.5 || pos.x > halfL - 0.5) {
      if (Math.abs(pos.z) < PITCH.goalWidth / 2 && pos.y < PITCH.goalHeight) {
        this.inNet = true;
        this.velocity.set(0, 0, 0);
        return;
      }
      this.velocity.x *= -0.6;
      pos.x = THREE.MathUtils.clamp(pos.x, -halfL + 0.5, halfL - 0.5);
    }

    for (const p of players) {
      if (p.userData.sentOff) continue;
      const dx = pos.x - p.position.x;
      const dz = pos.z - p.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.8 && dist > 0.01) {
        const speed = this.velocity.length();
        if (speed < 1.5 && !this.kickPending) {
          this.setOwner(p);
          return;
        }
        const nx = dx / dist;
        const nz = dz / dist;
        this.velocity.x += nx * 2;
        this.velocity.z += nz * 2;
      }
    }
  }

  get position() {
    return this.mesh.position;
  }

  isMoving() {
    return this.velocity.lengthSq() > 0.1 && !this.owner;
  }
}
