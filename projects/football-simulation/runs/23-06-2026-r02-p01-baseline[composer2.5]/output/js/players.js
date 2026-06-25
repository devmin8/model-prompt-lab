import * as THREE from 'three';
import { PITCH, HOME_SQUAD, AWAY_SQUAD, hexToThree } from './config.js';

const FORMATION_HOME = [
  { x: -45, z: 0 }, { x: -35, z: -22 }, { x: -35, z: -8 }, { x: -35, z: 8 }, { x: -35, z: 22 },
  { x: -20, z: -18 }, { x: -20, z: 0 }, { x: -20, z: 18 },
  { x: -8, z: -14 }, { x: -8, z: 0 }, { x: -8, z: 14 },
];

const FORMATION_AWAY = FORMATION_HOME.map(p => ({ x: -p.x, z: p.z }));

export class PlayerManager {
  constructor(scene, teams) {
    this.scene = scene;
    this.teams = teams;
    this.players = [];
    this.referee = null;
    this._build();
  }

  _build() {
    this._createTeam('home', HOME_SQUAD, FORMATION_HOME, this.teams.home);
    this._createTeam('away', AWAY_SQUAD, FORMATION_AWAY, this.teams.away);
    const refPos = { x: 0, z: 5 };
    this.referee = this._createFigure(0x111111, 0x111111, refPos);
    Object.assign(this.referee.userData, {
      role: 'ref', name: 'REFEREE', number: '',
      basePos: { ...refPos },
      targetPos: { ...refPos },
      kickPhase: 0,
      celebrating: false,
      sentOff: false,
    });
    this.players.push(this.referee);
  }

  _createTeam(side, squad, formation, teamInfo) {
    squad.forEach((p, i) => {
      const isGk = p.role === 'gk';
      const kitColor = isGk ? teamInfo.gkColor : teamInfo.color;
      const pos = formation[i] || { x: side === 'home' ? -30 : 30, z: 0 };
      const fig = this._createFigure(kitColor, kitColor, pos);
      fig.userData = {
        side, role: p.role, name: p.name, number: p.number,
        basePos: { ...pos },
        targetPos: { ...pos },
        velocity: { x: 0, z: 0 },
        kickPhase: 0,
        celebrating: false,
        sentOff: false,
      };
      this.players.push(fig);
      if (side === 'home') this.homePlayers = this.homePlayers || [];
      if (side === 'away') this.awayPlayers = this.awayPlayers || [];
      (side === 'home' ? this.homePlayers : this.awayPlayers).push(fig);
    });
  }

  _createFigure(kitHex, skinTone, pos) {
    const kit = typeof kitHex === 'string' ? hexToThree(kitHex) : kitHex;
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: kit, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 8), bodyMat);
    torso.position.y = 1.1;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), skinMat);
    head.position.y = 1.75;
    head.castShadow = true;
    group.add(head);

    const legGeo = new THREE.CapsuleGeometry(0.1, 0.45, 4, 6);
    const leftLeg = new THREE.Mesh(legGeo, bootMat);
    leftLeg.position.set(-0.15, 0.45, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, bootMat);
    rightLeg.position.set(0.15, 0.45, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    const armGeo = new THREE.CapsuleGeometry(0.08, 0.35, 4, 6);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.45, 1.15, 0);
    leftArm.rotation.z = 0.3;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.45, 1.15, 0);
    rightArm.rotation.z = -0.3;
    group.add(rightArm);

    group.position.set(pos.x, 0, pos.z);
    group.userData.legs = [leftLeg, rightLeg];
    group.userData.rightLeg = rightLeg;
    this.scene.add(group);
    return group;
  }

  findPlayer(side, number) {
    return this.players.find(p => p.userData.side === side && p.userData.number === number);
  }

  findByName(side, partial) {
    const lower = partial.toLowerCase();
    return this.players.find(p =>
      p.userData.side === side && p.userData.name.toLowerCase().includes(lower)
    );
  }

  setTarget(player, x, z, speed = 5) {
    if (!player || player.userData.sentOff) return;
    player.userData.targetPos = { x, z };
    player.userData.moveSpeed = speed;
  }

  setKick(player) {
    if (!player) return;
    player.userData.kickPhase = 1;
  }

  startCelebration(side) {
    const team = side === 'home' ? this.homePlayers : this.awayPlayers;
    team.forEach(p => {
      if (!p.userData.sentOff && p.userData.role !== 'gk') {
        p.userData.celebrating = true;
        p.userData.celebrateT = 0;
      }
    });
  }

  stopCelebration() {
    this.players.forEach(p => { p.userData.celebrating = false; });
  }

  sendOff(player) {
    if (!player) return;
    player.userData.sentOff = true;
    player.visible = false;
  }

  resetPositions() {
    this.players.forEach(p => {
      if (p.userData.sentOff) return;
      if (p.userData.basePos) {
        p.position.set(p.userData.basePos.x, 0, p.userData.basePos.z);
        p.userData.targetPos = { ...p.userData.basePos };
      }
      p.userData.celebrating = false;
      p.userData.kickPhase = 0;
    });
  }

  kickoffPositions(kickingSide) {
    const homeKick = kickingSide === 'home';
    this.homePlayers.forEach((p, i) => {
      const pos = homeKick && i === 9
        ? { x: 0, z: 0 }
        : FORMATION_HOME[i];
      p.position.set(pos.x, 0, pos.z);
      p.userData.targetPos = { ...pos };
      p.userData.basePos = { ...pos };
    });
    this.awayPlayers.forEach((p, i) => {
      const pos = !homeKick && i === 9
        ? { x: 0, z: 0 }
        : FORMATION_AWAY[i];
      p.position.set(pos.x, 0, pos.z);
      p.userData.targetPos = { ...pos };
      p.userData.basePos = { ...pos };
    });
    this.referee.position.set(5, 0, 0);
    this.referee.userData.targetPos = { x: 5, z: 0 };
    this.referee.userData.basePos = { x: 5, z: 0 };
  }

  update(dt) {
    for (const p of this.players) {
      if (p.userData.sentOff) continue;
      const ud = p.userData;

      if (ud.kickPhase > 0) {
        ud.kickPhase -= dt * 4;
        const leg = p.userData.rightLeg;
        if (leg) leg.rotation.x = Math.sin((1 - ud.kickPhase) * Math.PI) * 1.2;
        if (ud.kickPhase <= 0) {
          ud.kickPhase = 0;
          if (leg) leg.rotation.x = 0;
        }
      }

      if (ud.celebrating) {
        ud.celebrateT = (ud.celebrateT || 0) + dt;
        p.position.y = Math.abs(Math.sin(ud.celebrateT * 6)) * 0.3;
        const legs = p.userData.legs;
        if (legs) {
          legs[0].rotation.x = Math.sin(ud.celebrateT * 8) * 0.5;
          legs[1].rotation.x = -Math.sin(ud.celebrateT * 8) * 0.5;
        }
        continue;
      }

      p.position.y = 0;
      if (!ud.targetPos) {
        ud.targetPos = { x: p.position.x, z: p.position.z };
      }
      const tx = ud.targetPos.x, tz = ud.targetPos.z;
      const dx = tx - p.position.x, dz = tz - p.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.15) {
        const speed = (ud.moveSpeed || 4) * dt;
        const move = Math.min(speed, d);
        p.position.x += (dx / d) * move;
        p.position.z += (dz / d) * move;
        p.rotation.y = Math.atan2(dx, dz);
        const legs = p.userData.legs;
        if (legs) {
          const walk = Math.sin(Date.now() * 0.01) * 0.4;
          legs[0].rotation.x = walk;
          legs[1].rotation.x = -walk;
        }
      } else {
        const legs = p.userData.legs;
        if (legs) { legs[0].rotation.x = 0; legs[1].rotation.x = 0; }
      }
    }
  }
}
