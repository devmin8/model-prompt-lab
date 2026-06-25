// Global configuration and shared state for Pitchside.
export const PITCH = {
  length: 105,   // X axis (goal-to-goal)
  width: 68,     // Z axis (touchline-to-touchline)
  goalDepth: 4,
  goalHeight: 2.44,
  goalWidth: 7.32,
};

// Match timing — simulated match minutes per phase, wall-clock seconds per phase at 1x.
// 90 match-minutes condensed into ~3 minutes of wall-clock at 1x.
export const MATCH = {
  firstHalfSeconds: 90,     // 1st half wall-clock at 1x
  halfTimeSeconds: 12,
  secondHalfSeconds: 90,
  matchMinutesFirst: 45,
  matchMinutesSecond: 50,   // a little stoppage
};

// Convert wall-clock seconds into match-minute display.
export function wallToMatchMinute(sec, phase) {
  if (phase === 'first') {
    return Math.min(45, Math.floor((sec / MATCH.firstHalfSeconds) * MATCH.matchMinutesFirst) + 1);
  }
  if (phase === 'half') return 45;
  // second half — second-half seconds, scale 45..95
  const m = 45 + Math.floor((sec / MATCH.secondHalfSeconds) * MATCH.matchMinutesSecond);
  return Math.min(95, m);
}

// Formations (positions in match units, X along length, Z along width).
// Home defends -X end, Away defends +X end.
// 4-3-3.
export const FORMATION_433 = [
  // [x, z, role]
  [ -48, 0,   'GK'],
  [ -30, -22, 'DEF'], [ -30, -8, 'DEF'], [-30, 8, 'DEF'],  [-30, 22, 'DEF'],
  [ -12, -14, 'MID'], [-14, 0, 'MID'],   [-12, 14, 'MID'],
  [   2, -18, 'FWD'], [  6, 0, 'FWD'],   [  2, 18, 'FWD'],
];

export const PLAYER_NAMES = {
  home: ['KEPA','JAMES','SILVA','KOUMIBA','CHILWELL','KANTE','JORGINHO','MOUNT','PALMER','JACKSON','STERLING'],
  away: ['RAYA','WHITE','SALIBA','GABRIEL','ZINCHENKO','PARTY','ODEGAARD','RICE','SAKA','MARTINELLI','JESUS'],
  numbers: { home: [1,28,6,14,21,7,5,8,20,9,11], away: [1,4,12,6,35,5,8,41,7,11,9] },
};

export const STATE = {
  phase: 'setup',           // setup | first | half | second | fulltime
  clock: 0,                 // wall-clock seconds within current phase
  speed: 1,
  paused: false,
  score: { home: 0, away: 0 },
  teams: {
    home: { name: 'CHELSEA', color: '#0b5bd3', accent: '#ffffff' },
    away: { name: 'ARSENAL', color: '#d3141f', accent: '#ffffff' },
    gkHome: '#1ddc4b',
    gkAway: '#f4c20d',
  },
  ball: null,               // {x, z, y, vx, vy, vz}
  events: [],               // upcoming events, populated by match.js
  log: [],                  // fired event log
  potm: null,
};
