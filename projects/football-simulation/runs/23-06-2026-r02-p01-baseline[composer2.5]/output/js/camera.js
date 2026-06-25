import * as THREE from 'three';
import { lerp } from './config.js';

export class BroadcastCamera {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 0, 0);
    this.smoothPos = new THREE.Vector3(0, 18, 55);
    this.smoothLook = new THREE.Vector3(0, 0, 0);
    this.mode = 'wide';
    this.shakeT = 0;
  }

  setMode(mode) {
    this.mode = mode;
  }

  shake(intensity = 0.3) {
    this.shakeT = intensity;
  }

  update(ballPos, dt) {
    this.target.set(ballPos.x, 0, ballPos.z);

    let desiredPos, desiredLook;

    switch (this.mode) {
      case 'close':
        desiredPos = new THREE.Vector3(
          ballPos.x - 12,
          8,
          ballPos.z + 18
        );
        desiredLook = new THREE.Vector3(ballPos.x, 1, ballPos.z);
        break;
      case 'goal':
        desiredPos = new THREE.Vector3(
          ballPos.x - 8,
          5,
          ballPos.z + 10
        );
        desiredLook = new THREE.Vector3(ballPos.x + 5, 1.5, ballPos.z);
        break;
      case 'penalty':
        desiredPos = new THREE.Vector3(
          ballPos.x - 15,
          6,
          ballPos.z + 5
        );
        desiredLook = new THREE.Vector3(ballPos.x, 1, ballPos.z);
        break;
      default:
        desiredPos = new THREE.Vector3(
          lerp(this.target.x, 0, 0.3) - 5,
          22,
          58
        );
        desiredLook = new THREE.Vector3(
          lerp(this.target.x, 0, 0.5),
          0,
          lerp(this.target.z, 0, 0.3)
        );
    }

    const smooth = this.mode === 'wide' ? 2 : 4;
    this.smoothPos.lerp(desiredPos, dt * smooth);
    this.smoothLook.lerp(desiredLook, dt * smooth);

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.camera.position.copy(this.smoothPos);
      this.camera.position.x += (Math.random() - 0.5) * this.shakeT;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeT * 0.5;
    } else {
      this.camera.position.copy(this.smoothPos);
    }

    this.camera.lookAt(this.smoothLook);
  }
}

export function createCamera() {
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  const camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 300);
  camera.position.set(0, 22, 58);
  camera.lookAt(0, 0, 0);
  return camera;
}
