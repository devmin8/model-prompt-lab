// Scripted match: a sequence of scenes that drive ball + actors, each with a possible match event.
import { PITCH } from './config.js';

// slot indices: 0 GK, 1-4 DEF, 5-7 MID, 8-10 FWD
const H = (slot) => ({ team: 'home', slot });
const A = (slot) => ({ team: 'away', slot });

// Helper positions
const cx = PITCH.length / 2;   // 52.5
const bz = PITCH.width / 2;    // 34

// Each scene:
//   dur: wall-clock seconds at 1x
//   phase: 'first' | 'half' | 'second' | 'fulltime' (set at phase boundaries)
//   minute: match minute for commentary/timeline
//   ball: { from:[x,z], to:[x,z], air?:bool, peak?:number }
//   striker: { id: H/A, kickAt: 0..1 (relative) }  -- kicks ball from→to
//   event: optional — fired as scene ends
//   commentary: array of strings
export function buildScript() {
  return [
    // ----- 1ST HALF -----
    { phase:'first', minute:1, dur:5,
      ball:{ from:[0,0], to:[-15,8], air:false },
      striker: H(8), strikerKickAt:0.3,
      commentary: ['Kick-off at the Bridge. Chelsea in blue, Arsenal in red.'] },

    { phase:'first', minute:4, dur:6,
      ball:{ from:[-15,8], to:[-25,-10], air:false },
      striker: H(7), strikerKickAt:0.4,
      commentary: ['Mount switches play to the left flank.'] },

    { phase:'first', minute:9, dur:7,
      ball:{ from:[-25,-10], to:[28,6], air:true, peak:4 },
      striker: H(5), strikerKickAt:0.45,
      commentary: ['Kanté wins it, slides Sterling in behind with a peach of a ball.'] },

    { phase:'first', minute:12, dur:6,
      ball:{ from:[28,6], to:[cx-1,2], air:true, peak:3.4 },
      striker: H(10), strikerKickAt:0.55,
      event: { type:'goal', team:'home', scorer:H(8), assist:H(10), minute:12,
        name:'PALMER', assistName:'STERLING',
        text:'GOAL! Palmer opens the scoring with a clinical first-time finish!' },
      commentary: ['Sterling squares it... PALMER! Side-footed into the corner! 1-0 Chelsea!'] },

    { phase:'first', minute:14, dur:5,
      ball:{ from:[0,0], to:[15,-8], air:false },
      striker: A(8), strikerKickAt:0.3,
      commentary: ['Arsenal restart from the centre, looking for an immediate response.'] },

    { phase:'first', minute:22, dur:5,
      ball:{ from:[15,-8], to:[8,4], air:true, peak:2.5 },
      striker: A(8), strikerKickAt:0.5,
      event: { type:'foul', by:A(8), on:H(4), minute:22 },
      commentary: ['Saka late on Chilwell — that\'s a clear foul.'] },

    { phase:'first', minute:22, dur:3,
      ball:{ from:[8,4], to:[8,4], air:false },
      striker: null,
      event: { type:'card', color:'yellow', team:'away', player:A(8), name:'SAKA', reason:'Late challenge', minute:22 },
      commentary: ['Yellow card. Saka into the book.'] },

    { phase:'first', minute:28, dur:7,
      ball:{ from:[8,4], to:[-cx+4,5], air:true, peak:3 },
      striker: A(5), strikerKickAt:0.5,
      event: { type:'save', by:H(0), minute:28 },
      commentary: ['Partey from distance — Kanta... KEPA! Magnificent save, tipping it over!'] },

    { phase:'first', minute:29, dur:4,
      ball:{ from:[-cx+4, bz-2], to:[-cx+6,-6], air:true, peak:3 },
      striker: A(2), strikerKickAt:0.4,
      event: { type:'corner', team:'away', minute:29 },
      commentary: ['Corner to Arsenal. Ödegaard to deliver.'] },

    { phase:'first', minute:31, dur:5,
      ball:{ from:[-cx+6,-6], to:[-cx+18,0], air:true, peak:5 },
      striker: A(3), strikerKickAt:0.3,
      event: { type:'miss', minute:31 },
      commentary: ['Gabriel rises... over the bar! Arsenal\'s best chance goes begging.'] },

    { phase:'first', minute:38, dur:7,
      ball:{ from:[-cx+18,0], to:[cx-1,-2], air:true, peak:2.8 },
      striker: A(8), strikerKickAt:0.55,
      event: { type:'goal', team:'away', scorer:A(8), assist:A(6), minute:38,
        name:'SAKA', assistName:'ØDEGAARD',
        text:'GOAL! Saka levels it! Drilled low past the keeper — 1-1!' },
      commentary: ['Ödegaard slips him in... SAKA! 1-1! Game on!'] },

    { phase:'first', minute:45, dur:4,
      ball:{ from:[0,0], to:[0,0], air:false },
      striker: null,
      event: { type:'halftime', minute:45 },
      commentary: ['Half-time. 1-1 at the break — a lively first 45 here.'] },

    // ----- 2ND HALF -----
    { phase:'second', minute:46, dur:5,
      ball:{ from:[0,0], to:[12,-6], air:false },
      striker: A(7), strikerKickAt:0.3,
      commentary: ['Second half underway. Arsenal restart.'] },

    { phase:'second', minute:53, dur:6,
      ball:{ from:[12,-6], to:[cx-12,4], air:true, peak:3 },
      striker: H(10), strikerKickAt:0.45,
      event: { type:'foul', by:A(4), on:H(10), minute:53, handball:true },
      commentary: ['Into the wall... HANDBALL! The referee points to the spot!'] },

    { phase:'second', minute:55, dur:5,
      ball:{ from:[cx-11,0], to:[cx-1,0], air:true, peak:1.8 },
      striker: H(8), strikerKickAt:0.6,
      event: { type:'goal', team:'home', scorer:H(8), assist:null, minute:55, penalty:true,
        name:'PALMER', assistName:'',
        text:'GOAL! Palmer slots home the penalty — cool as you like. 2-1!' },
      commentary: ['Palmer steps up... and tucks it away. 2-1 Chelsea!'] },

    { phase:'second', minute:60, dur:4,
      ball:{ from:[0,0], to:[-5,2], air:false },
      striker: A(5), strikerKickAt:0.3,
      event: { type:'card', color:'yellow', team:'away', player:A(5), name:'PARTEY', reason:'Cynical trip', minute:60 },
      commentary: ['Partey cynically hauls down Mount. Second yellow-worthy? No — just yellow.'] },

    { phase:'second', minute:70, dur:4,
      ball:{ from:[-5,2], to:[-8,3], air:false },
      striker: A(5), strikerKickAt:0.2,
      event: { type:'card', color:'yellow', team:'away', player:A(5), name:'PARTEY', reason:'Late tackle', minute:70, secondYellow:true, red:true },
      commentary: ['Ohhh — Partey\'s done it again! Second yellow — and OFF! Arsenal down to ten!'] },

    { phase:'second', minute:78, dur:7,
      ball:{ from:[-8,3], to:[cx-1,-3], air:true, peak:2.6 },
      striker: H(9), strikerKickAt:0.5,
      event: { type:'goal', team:'home', scorer:H(9), assist:H(7), minute:78,
        name:'JACKSON', assistName:'MOUNT',
        text:'GOAL! Jackson makes it three! Mount the architect again — 3-1!' },
      commentary: ['Mount finds him... JACKSON! 3-1! That should be that!'] },

    { phase:'second', minute:90, dur:4,
      ball:{ from:[0,0], to:[0,0], air:false },
      striker: null,
      event: { type:'fulltime', minute:93 },
      commentary: ['Full-time. Chelsea take it 3-1 in a thrilling contest.'] },
  ];
}
