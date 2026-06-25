# Run Notes — 22-06-2026-r03-p01-baseline[GLM5.2]

**Prompt:** p01-baseline
**Model:** GLM-5.2 (mapped from user shorthand `glm-5.2`)
**Date:** 2026-06-22

## What was built

A vanilla HTML/CSS/ES-module 3D football match highlights simulator ("Pitchside") with no build step. Three.js 0.160.0 is loaded via an importmap from unpkg. All assets are procedural (no external textures/models).

### Structure
- `index.html` — importmap + setup screen + HUD markup (scoreboard, goal overlay, card flash, commentary ticker, controls, full-time card)
- `css/styles.css` — dark broadcast theme, scoreboard grid, slide-in goal banner, timeline with markers
- `js/config.js` — pitch dims, match timing, 4-3-3 formation, Chelsea/Arsenal rosters, shared STATE
- `js/scene.js` — THREE.Scene: lights (ambient + hemi + 4 corner spots + dir), striped grass, line markings via tiny boxes (addArc/addCircle), goals with posts/crossbar/netting, floodlight towers, ad boards
- `js/players.js` — player rigs from primitives with pivot-group limbs; run/kick animation; referee (slot 99)
- `js/ball.js` — rolling + aerial pass with gravity arc; shadow blob
- `js/match.js` — 19-scene script: kickoff → Palmer goal 12' → Saka yellow 22' → save → corner → miss → Saka goal 38' → HT → Palmer penalty 55' → Partey yellow 60' → Partey 2nd yellow/red 70' → Jackson goal 78' → FT
- `js/engine.js` — RAF loop, scene walker, ball/kick triggers, actor steering, idle drift, broadcast camera, event dispatch, POTM computation
- `js/ui.js` — DOM HUD updates
- `js/main.js` — bootstrap, setup-screen wiring, control wiring

## Verification
- Served via `python -m http.server 8765` and exercised through Playwright (Chromium).
- 0 console errors across full match run (kickoff → full-time).
- Setup screen renders with team name inputs, kit swatches, Kick Off button.
- 3D scene renders: striped pitch, markings, goals with nets, floodlight towers, ad boards, human-shaped players in kits (blue home / red away / yellow GK), black referee.
- HUD renders: scoreboard with team names + score + clock + phase; commentary ticker; timeline with progress bar and LIVE indicator; speed controls (1× / 2× / 3×); play/pause + restart + new match buttons.
- Goal overlay fires (Palmer 12', Saka 38', Palmer 55' pen, Jackson 78') and updates the score.
- Card flash fires (Saka yellow 22', Partey yellows 60'/70' → red).
- Full-time card renders: CHELSEA 3 — 1 ARSENAL, POTM = PALMER, key moments list.
- Keyboard shortcuts work (Space pause, 1/2/3 speed).

## Notable bugs hit & fixed
1. **Referee slot 99 crash** — `FORMATION_433[99]` is undefined; guarded every index with `(FORMATION_433[slot] || fallback)[k]`.
2. **Away-mirror line accidentally removed** — an earlier Edit lopped off `if (team === 'away') g.userData.home = -g.userData.home;`. Restored.
3. **Kickoff restart from wrong spot** — post-goal scenes had `ball.from` set to a penalty-area coordinate; corrected to `[0,0]` for center-circle restarts.
4. **Clock frozen within scene** — `setClock` was called with the integer minute only; switched to `minute + t` so the clock ticks smoothly inside each beat.
5. **Module script missing from index.html** — initial HTML had no `<script type=module>` tag, so only the setup screen showed. Added after the importmap (importmap must precede module scripts per spec).
6. **CRITICAL — `this.scene` namespace collision in engine.js.** `advanceScene()` reassigned `this.scene` (the THREE.Scene) to a plain script-beat object. Next `renderer.render(this.scene, camera)` threw `TypeError: Cannot read properties of undefined (reading 'test')` deep inside three.js projectObject. Diagnosis: exposed `window.__engine` and read `eng.scene.constructor.name` → `'Object'` with keys `phase/minute/dur/ball/striker/...` instead of `Scene`. Fix: renamed every reference to the script beat from `this.scene` to `this.current` throughout engine.js. After rename, render path restored.
7. **kickAnimation wrong limb path** — `p.userData.legRU` is undefined (limbs live under `p.userData.limbs.legRU`). Corrected.
8. **Debug globals left in main.js** — removed `window.__scene/__renderer/__camera/__engine`.

## Workflow notes
- Benchmark isolation observed: did not read prior runs; built purely from `prompt.md` + reference image.
- `prompt.md` is a verbatim copy of `projects/football-simulation/prompts/p01-baseline.md`.
