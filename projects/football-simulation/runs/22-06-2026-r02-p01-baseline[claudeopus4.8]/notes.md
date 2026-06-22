# Run notes — p01-baseline · claudeopus4.8 · r02

## Outcome
Complete, runnable 3D football broadcast simulator. `output/index.html` opens with
no build step (Three.js 0.160 via CDN importmap). Verified end-to-end in a browser.

## Approach
- **Stack:** vanilla ES modules + Three.js, no bundler. Split into `config` /
  `scene` / `match` / `ui` / `main`.
- **Scene:** striped turf (alternating planes), full markings, goals with wireframe
  nets, ad boards, four floodlights, footballer-shaped players from capsules/spheres
  with animated legs, smooth ball-tracking broadcast camera.
- **Match engine:** a *scripted* highlights director rather than emergent AI. The
  match clock (~70 real s per half) drives minute-based cues; each cue choreographs
  passes/shots via arc tweens on the ball with receivers running onto the
  destination (no magnetic possession). Free physics only for settle/celebration.
- **Phases:** Kick Off → First Half → Half Time (auto break) → Second Half → Full Time.

## Scripted storyline (deterministic)
Final **CHELSEA 2-1 ARSENAL**, mirroring the reference image:
- 14' Goal — 9 N. Jackson (assist Mudryk)
- 26' Yellow — 41 D. Rice
- 31' Save — D. Raya
- 35' Corner
- 41' Goal — 7 B. Saka (assist Odegaard)
- 56' Penalty → 57' saved by R. Sanchez
- 65' Goal — 20 Cole Palmer (assist Sterling)  ← matches reference scorer/minute
- 72' Yellow — 25 M. Caicedo
- 78' Save — R. Sanchez
- 83' Second yellow → **Red** for 41 D. Rice (sent off, walks off)
- Player of the Match: **20 Cole Palmer, 9.0** (decisive-goal bonus)

## Verification
Driven deterministically through `match.update(dt)` (preview tab throttles rAF in
the background). Confirmed: all goals/cards/saves/penalty/corner fire at the right
minutes, red card via two yellows, phase transitions, ball visibly enters the net,
goal overlay + commentary + timeline markers + full-time panel all populate.

## Notes for comparison
- Matches the reference broadcast layout closely: scoreboard, bottom-left GOAL!
  overlay, control bar (pause/resume/restart/new match, 1x/2x/3x, event timeline,
  LIVE), commentary ticker, phase tabs, right-side full-time panel.
- Setup screen allows team names + kit/crest colours before kick off.
- Highlights are fully scripted (same storyline every run) — predictable to grade,
  but not procedurally varied between matches.
