export const PITCH = {
  length: 105,
  width: 68,
  stripeWidth: 5.5,
  goalWidth: 7.32,
  goalDepth: 2.5,
  goalHeight: 2.44,
  penaltyAreaLength: 16.5,
  penaltyAreaWidth: 40.32,
  centerCircleR: 9.15,
  cornerArcR: 1,
};

export const MATCH_DURATION_REAL = 180; // ~3 min at 1x for full highlights
export const HALF_TIME_PAUSE = 3;

export function buildMatchScript(homeName, awayName) {
  return {
    potm: { number: 20, name: 'COLE PALMER', rating: '9.2' },
    events: [
      { minute: 0, type: 'kickoff', commentary: `Welcome to Pitchside! ${homeName} vs ${awayName}.` },
      { minute: 12, type: 'goal', team: 'home', scorer: { number: 15, name: 'N. JACKSON' }, assist: null,
        commentary: "12' GOAL! N. Jackson fires home from close range!", scoreAfter: [1, 0] },
      { minute: 28, type: 'yellow', team: 'away', player: { number: 41, name: 'D. RICE' },
        commentary: "28' Yellow card for D. Rice — late challenge in midfield." },
      { minute: 36, type: 'goal', team: 'away', scorer: { number: 8, name: 'M. ØDEGAARD' }, assist: { number: 7, name: 'B. SAKA' },
        commentary: "36' GOAL! Ødegaard levels with a curling strike!", scoreAfter: [1, 1] },
      { minute: 45, type: 'halftime', commentary: 'Half time. All square at 1-1.' },
      { minute: 52, type: 'corner', team: 'home', commentary: "52' Corner for the home side." },
      { minute: 54, type: 'yellow', team: 'away', player: { number: 2, name: 'W. SALIBA' },
        commentary: "54' Saliba goes into the book for a tactical foul." },
      { minute: 62, type: 'red', team: 'away', player: { number: 2, name: 'W. SALIBA' },
        commentary: "62' Second yellow for Saliba — Arsenal down to ten!" },
      { minute: 64, type: 'goal', team: 'home', scorer: { number: 20, name: 'COLE PALMER' }, assist: { number: 7, name: 'R. STERLING' },
        commentary: "64' GOAL! Cole Palmer doubles the lead! A composed finish into the bottom corner.", scoreAfter: [2, 1] },
      { minute: 78, type: 'save', team: 'away', player: { number: 1, name: 'DAVID RAYA' },
        commentary: "78' Brilliant save! Raya denies a certain goal with a fingertip stop." },
      { minute: 85, type: 'yellow', team: 'away', player: { number: 6, name: 'GABRIEL' },
        commentary: "85' Gabriel shown a yellow for dissent." },
      { minute: 90, type: 'penalty', team: 'home', scorer: { number: 20, name: 'COLE PALMER' }, assist: null,
        commentary: "90+2' PENALTY! Palmer steps up...", scoreAfter: [3, 1], extraMinute: 2 },
      { minute: 92, type: 'fulltime', commentary: 'Full time! What a match!' },
    ],
  };
}

export const FORMATION_HOME = [
  { x: -48, z: 0, role: 'gk' },
  { x: -38, z: -22, role: 'def' }, { x: -38, z: -8, role: 'def' }, { x: -38, z: 8, role: 'def' }, { x: -38, z: 22, role: 'def' },
  { x: -22, z: -18, role: 'mid' }, { x: -22, z: 0, role: 'mid' }, { x: -22, z: 18, role: 'mid' },
  { x: -8, z: -14, role: 'fwd' }, { x: -8, z: 14, role: 'fwd' },
  { x: -2, z: 0, role: 'fwd' },
];

export const FORMATION_AWAY = FORMATION_HOME.map(p => ({ x: -p.x, z: p.z, role: p.role }));
