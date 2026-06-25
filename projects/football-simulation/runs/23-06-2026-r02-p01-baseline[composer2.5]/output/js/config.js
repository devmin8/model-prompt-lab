export const PITCH = {
  length: 105,
  width: 68,
  stripeWidth: 5.5,
  goalWidth: 7.32,
  goalDepth: 2.5,
  goalHeight: 2.44,
  penaltyAreaLength: 16.5,
  penaltyAreaWidth: 40.32,
  centerCircleRadius: 9.15,
};

export const PHYSICS = {
  gravity: 9.81,
  ballRadius: 0.11,
  ballFriction: 0.985,
  ballBounce: 0.55,
  maxBallSpeed: 28,
};

export const MATCH = {
  halfDuration: 45,
  extraTime: 3,
  realDuration: 180,
  celebrationDuration: 4,
  goalOverlayDuration: 5,
};

export const DEFAULT_TEAMS = {
  home: { name: 'Chelsea', color: '#034694', gkColor: '#2ecc71' },
  away: { name: 'Arsenal', color: '#EF0107', gkColor: '#f0c040' },
};

export const HOME_SQUAD = [
  { number: 1, name: 'R. SÁNCHEZ', role: 'gk' },
  { number: 24, name: 'J. CHILWELL', role: 'def' },
  { number: 6, name: 'T. SILVA', role: 'def' },
  { number: 2, name: 'R. JAMES', role: 'def' },
  { number: 21, name: 'B. CHILWELL', role: 'def' },
  { number: 8, name: 'E. FERNÁNDEZ', role: 'mid' },
  { number: 25, name: 'M. CAICEDO', role: 'mid' },
  { number: 7, name: 'R. STERLING', role: 'fwd' },
  { number: 20, name: 'C. PALMER', role: 'fwd' },
  { number: 15, name: 'N. JACKSON', role: 'fwd' },
  { number: 11, name: 'N. MUDRYK', role: 'fwd' },
];

export const AWAY_SQUAD = [
  { number: 22, name: 'D. RAYA', role: 'gk' },
  { number: 4, name: 'B. WHITE', role: 'def' },
  { number: 2, name: 'W. SALIBA', role: 'def' },
  { number: 6, name: 'GABRIEL', role: 'def' },
  { number: 35, name: 'O. ZINCHENKO', role: 'def' },
  { number: 41, name: 'D. RICE', role: 'mid' },
  { number: 8, name: 'M. ØDEGAARD', role: 'mid' },
  { number: 7, name: 'B. SAKA', role: 'fwd' },
  { number: 11, name: 'G. MARTINELLI', role: 'fwd' },
  { number: 19, name: 'L. TROSSARD', role: 'fwd' },
  { number: 9, name: 'G. JESUS', role: 'fwd' },
];

export function hexToThree(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function dist2d(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  return Math.sqrt(dx * dx + dz * dz);
}

export function formatClock(minute) {
  const m = Math.floor(minute);
  const s = Math.floor((minute - m) * 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function phaseLabel(minute) {
  if (minute < 0) return 'Kick Off';
  if (minute < 45) return 'First Half';
  if (minute < 46) return 'Half Time';
  if (minute < 90) return 'Second Half';
  return 'Full Time';
}
