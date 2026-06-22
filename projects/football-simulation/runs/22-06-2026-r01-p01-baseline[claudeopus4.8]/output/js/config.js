// Pitchside — shared configuration & match data.
// All distances in metres. Pitch runs along X (length) and Z (width).

export const FIELD = {
  length: 105,
  width: 68,
  get halfL() { return this.length / 2; },   // 52.5
  get halfW() { return this.width / 2; },     // 34
};

export const GOAL = {
  width: 7.32,
  height: 2.44,
  depth: 2.2,
};

// Home attacks +X (right goal), Away attacks -X (left goal).
export const DIR = { HOME: 1, AWAY: -1 };

// Default teams (matching the broadcast reference: Chelsea vs Arsenal).
export const DEFAULT_TEAMS = {
  home: { name: 'CHELSEA', short: 'CHE', kit: '#1d4ed8', accent: '#ffffff', gk: '#22c55e' },
  away: { name: 'ARSENAL', short: 'ARS', kit: '#dc2626', accent: '#ffffff', gk: '#facc15' },
};

// 4-4-2 formation as (x,z) for a team attacking +X. Mirror X for the other side.
// x is measured from centre (negative = own half).
export const FORMATION = [
  { role: 'GK', x: -49, z: 0 },
  { role: 'DF', x: -34, z: -20 },
  { role: 'DF', x: -36, z: -7 },
  { role: 'DF', x: -36, z: 7 },
  { role: 'DF', x: -34, z: 20 },
  { role: 'MF', x: -16, z: -22 },
  { role: 'MF', x: -18, z: -7 },
  { role: 'MF', x: -18, z: 7 },
  { role: 'MF', x: -16, z: 22 },
  { role: 'FW', x: -3, z: -8 },
  { role: 'FW', x: -3, z: 8 },
];

// Rosters — numbers + surnames. Index aligns with FORMATION above.
export const ROSTER = {
  home: [
    { n: 1,  name: 'SÁNCHEZ' },
    { n: 24, name: 'JAMES' },
    { n: 6,  name: 'COLWILL' },
    { n: 5,  name: 'BADIASHILE' },
    { n: 21, name: 'CUCURELLA' },
    { n: 8,  name: 'ENZO' },
    { n: 25, name: 'CAICEDO' },
    { n: 10, name: 'STERLING' },
    { n: 11, name: 'MADUEKE' },
    { n: 20, name: 'PALMER' },
    { n: 15, name: 'JACKSON' },
  ],
  away: [
    { n: 22, name: 'RAYA' },
    { n: 4,  name: 'WHITE' },
    { n: 6,  name: 'GABRIEL' },
    { n: 2,  name: 'SALIBA' },
    { n: 33, name: 'TIMBER' },
    { n: 41, name: 'RICE' },
    { n: 8,  name: 'ØDEGAARD' },
    { n: 29, name: 'HAVERTZ' },
    { n: 7,  name: 'SAKA' },
    { n: 19, name: 'TROSSARD' },
    { n: 9,  name: 'JESUS' },
  ],
};

export const REFEREE = { kit: '#111827', accent: '#fde047' };

// Speed presets selectable from the control bar.
export const SPEEDS = [1, 2, 3];
