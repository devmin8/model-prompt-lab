// config.js — match setup, teams, kit colours and tunable constants.

export const PITCH = {
  // Field dimensions in world units (length along X, width along Z).
  length: 105,
  width: 68,
  lineColor: 0xffffff,
  stripeA: 0x2f7d34,
  stripeB: 0x276b2c,
  stripes: 14,
};

// Default teams. Home = Chelsea-style blue, Away = Arsenal-style red,
// matching the broadcast reference.
export const DEFAULT_TEAMS = {
  home: {
    name: 'CHELSEA',
    short: 'CHE',
    crest: '#1a3fb0',
    crestAccent: '#ffffff',
    kit: '#1f4fd6',
    kitShort: '#ffffff',
    socks: '#1f4fd6',
    gk: '#27c46b',
  },
  away: {
    name: 'ARSENAL',
    short: 'ARS',
    crest: '#c81f2b',
    crestAccent: '#ffffff',
    kit: '#e02531',
    kitShort: '#ffffff',
    socks: '#e02531',
    gk: '#f2d22e',
  },
};

export const REFEREE_COLOR = '#15171c';

// How fast the match clock runs relative to real time, before the user's
// speed multiplier (1x/2x/3x). ~45 minutes of match clock per ~70 real seconds.
export const CLOCK = {
  matchSecondsPerHalf: 45 * 60,
  realSecondsPerHalf: 70,
  halfTimeRealSeconds: 4,
};

export const SPEEDS = [1, 2, 3];
