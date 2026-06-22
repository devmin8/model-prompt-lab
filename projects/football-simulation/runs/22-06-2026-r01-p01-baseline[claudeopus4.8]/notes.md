# Notes — p01-baseline · claudeopus4.8

## Approach
Vanilla ES modules + Three.js via CDN importmap (no build step). Open `output/index.html`.

- `js/config.js` — teams, 4-4-2 formation, rosters, constants.
- `js/scene.js` — Three.js stadium: canvas-drawn striped-grass + markings texture, goals
  with translucent nets, ad boards, corner floodlights, footballer primitives (kits +
  shirt numbers), broadcast camera with `broadcast` / `goal` / `celebrate` modes.
- `js/match.js` — scripted highlights engine. A sorted cue list fires by match-time `T`;
  a hybrid ball model (parametric `kick` for reliable passes/shots, friction `roll` for
  loose balls) plus per-player seek toward targets (no teleporting / magnetism).
- `js/ui.js` — scoreboard, goal overlay, commentary ticker, timeline markers, HT/FT cards.
- `js/main.js` — setup, control bar, speed (1×/2×/3×), keyboard (space/1-3/R), rAF loop.

## Result (matches the reference broadcast)
Chelsea 2–1 Arsenal · Palmer 23' (assist Sterling) · Gabriel 40' (corner) · Palmer 64' pen.
Yellow 31' then second-yellow RED 62' (Saliba) → penalty. Saves by Raya & Sánchez.
Player of the Match: Cole Palmer (9.2). Covers every required event: multiple goals, foul,
yellow, red (2 yellows), saves, corner, penalty, half/full time.

## Bug found & fixed during verification
First pass froze the master clock `T` during the half-time overlay (`this.frozen`). Because
the "start second half" cue fires on `T` reaching its timestamp, the match got stuck at
half time forever. Fix: `frozen` now pauses only ball/player physics; `T` keeps advancing
(only the user Pause stops the clock), so play resumes. Verified full match reaches FULL
TIME with all 5 key moments and no console errors.

## Verification
Served via static server; stepped the engine deterministically (the headless preview tab
throttles `requestAnimationFrame`/CSS transitions, so live screenshots advance slowly — a
preview artifact, not an app issue). Confirmed setup, live goal + overlay, and full-time
screen render correctly.
