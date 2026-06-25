import * as THREE from 'three';

export class BroadcastCamera {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3();
    this.smoothPos = new THREE.Vector3(0, 18, 42);
    this.smoothLook = new THREE.Vector3();
  }

  update(ballPos, dt) {
    this.target.set(ballPos.x * 0.6, 0, ballPos.z * 0.3);

    const desiredPos = new THREE.Vector3(
      ballPos.x * 0.35,
      16 + Math.min(Math.abs(ballPos.x) * 0.05, 4),
      38 + ballPos.z * 0.15
    );
    const desiredLook = new THREE.Vector3(ballPos.x * 0.5, 1.5, ballPos.z * 0.4);

    const lerp = 1 - Math.pow(0.001, dt);
    this.smoothPos.lerp(desiredPos, lerp);
    this.smoothLook.lerp(desiredLook, lerp);

    this.camera.position.copy(this.smoothPos);
    this.camera.lookAt(this.smoothLook);
  }

  reset() {
    this.smoothPos.set(0, 18, 42);
    this.smoothLook.set(0, 1.5, 0);
    this.camera.position.copy(this.smoothPos);
    this.camera.lookAt(this.smoothLook);
  }
}

export function createCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 300);
  camera.position.set(0, 18, 42);
  camera.lookAt(0, 0, 0);
  return camera;
}
