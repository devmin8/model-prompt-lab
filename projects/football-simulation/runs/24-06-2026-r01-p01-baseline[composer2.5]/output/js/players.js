import * as THREE from 'three';
import { FORMATION_HOME, FORMATION_AWAY } from './config.js';

export class PlayerManager {
  constructor(scene, homeColor, awayColor) {
    this.scene = scene;
    this.players = [];
    this.homeColor = new THREE.Color(homeColor);
    this.awayColor = new THREE.Color(awayColor);
    this._buildTeams();
    this._buildReferee();
  }

  _makePlayer(team, index, pos, role) {
    const group = new THREE.Group();
    let kitColor, gkColor;

    if (team === 'home') {
      kitColor = role === 'gk' ? 0x2d8a3e : this.homeColor;
      gkColor = role === 'gk';
    } else if (team === 'away') {
      kitColor = role === 'gk' ? 0xe8c820 : this.awayColor;
      gkColor = role === 'gk';
    } else {
      kitColor = 0x111111;
    }

    const bodyMat = new THREE.MeshStandardMaterial({
      color: kitColor,
      roughness: 0.7,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8 });
    const shortsMat = new THREE.MeshStandardMaterial({
      color: gkColor ? kitColor : (team === 'home' ? 0x0a2060 : 0xffffff),
      roughness: 0.7,
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.1, 8), bodyMat);
    torso.position.y = 1.1;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), skinMat);
    head.position.y = 1.85;
    head.castShadow = true;
    group.add(head);

    const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.35, 0.45, 8), shortsMat);
    shorts.position.y = 0.55;
    shorts.castShadow = true;
    group.add(shorts);

    const legMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
    for (const lz of [-0.12, 0.12]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 6), legMat);
      leg.position.set(0, 0.28, lz);
      leg.castShadow = true;
      group.add(leg);
    }

    group.position.set(pos.x, 0, pos.z);
    group.userData = {
      team, index, role,
      basePos: { x: pos.x, z: pos.z },
      targetPos: { x: pos.x, z: pos.z },
      celebrating: false,
      kicking: false,
      kickPhase: 0,
      sentOff: false,
    };

    this.scene.add(group);
    this.players.push(group);
    return group;
  }

  _buildTeams() {
    FORMATION_HOME.forEach((p, i) => this._makePlayer('home', i, p, p.role));
    FORMATION_AWAY.forEach((p, i) => this._makePlayer('away', i, p, p.role));
  }

  _buildReferee() {
    this._makePlayer('ref', 0, { x: 0, z: 5 }, 'ref');
  }

  getByTeam(team) {
    return this.players.filter(p => p.userData.team === team && !p.userData.sentOff);
  }

  getGoalkeeper(team) {
    return this.players.find(p => p.userData.team === team && p.userData.role === 'gk');
  }

  setTarget(player, x, z) {
    player.userData.targetPos = { x, z };
  }

  moveTowardTarget(player, speed, dt) {
    const ud = player.userData;
    const dx = ud.targetPos.x - player.position.x;
    const dz = ud.targetPos.z - player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.15) return;
    const step = Math.min(speed * dt, dist);
    player.position.x += (dx / dist) * step;
    player.position.z += (dz / dist) * step;
    player.rotation.y = Math.atan2(dx, dz);
  }

  celebrate(player, dt) {
    if (!player.userData.celebrating) return;
    player.position.y = Math.abs(Math.sin(Date.now() * 0.008)) * 0.4;
    player.rotation.y += dt * 3;
  }

  kickAnimation(player, dt) {
    if (!player.userData.kicking) return;
    player.userData.kickPhase += dt * 8;
    const phase = player.userData.kickPhase;
    if (phase < 1) {
      player.rotation.x = -phase * 0.5;
    } else if (phase < 2) {
      player.rotation.x = -(2 - phase) * 0.5;
    } else {
      player.userData.kicking = false;
      player.userData.kickPhase = 0;
      player.rotation.x = 0;
    }
  }

  sendOff(player) {
    player.userData.sentOff = true;
    player.visible = false;
  }

  resetPositions() {
    let hi = 0, ai = 0;
    for (const p of this.players) {
      if (p.userData.team === 'home') {
        const fp = FORMATION_HOME[hi++];
        p.position.set(fp.x, 0, fp.z);
        p.userData.basePos = { x: fp.x, z: fp.z };
        p.userData.targetPos = { x: fp.x, z: fp.z };
        p.userData.sentOff = false;
        p.visible = true;
        p.userData.celebrating = false;
      } else if (p.userData.team === 'away') {
        const fp = FORMATION_AWAY[ai++];
        p.position.set(fp.x, 0, fp.z);
        p.userData.basePos = { x: fp.x, z: fp.z };
        p.userData.targetPos = { x: fp.x, z: fp.z };
        if (!p.userData.sentOff) p.visible = true;
        p.userData.celebrating = false;
      }
      p.position.y = 0;
      p.rotation.set(0, 0, 0);
    }
  }

  update(dt, activePlayerId) {
    for (const p of this.players) {
      if (p.userData.celebrating) {
        this.celebrate(p, dt);
        continue;
      }
      if (p.userData.kicking) {
        this.kickAnimation(p, dt);
        continue;
      }
      if (p === activePlayerId) {
        this.moveTowardTarget(p, 7, dt);
      } else {
        const bp = p.userData.basePos;
        const dx = bp.x - p.position.x;
        const dz = bp.z - p.position.z;
        if (Math.sqrt(dx * dx + dz * dz) > 0.3) {
          this.setTarget(p, bp.x, bp.z);
          this.moveTowardTarget(p, 3, dt);
        }
      }
    }
  }
}
