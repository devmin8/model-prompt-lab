# Open Issues — 22-06-2026-r03-p01-baseline[GLM5.2]

These are minor UX polish items; the deliverable meets the prompt's requirements.

## 1. Score/commentary desync during goal scenes
**Symptom:** When a goal-scene begins, the commentary ticker immediately shows the goal text ("GOAL! Palmer slots home…"), but the scoreboard score only increments ~duration seconds later when `fireSceneEvent()` runs at scene end.

**Root cause:** `engine.js` calls `ui.setCommentary(...)` in `advanceScene()` (scene start) but `STATE.score[e.team]++` inside `fireSceneEvent()` (scene end).

**Suggested fix:** For goal events, increment the score at scene start (or split: show the goal overlay at start, increment score at the moment the ball crosses the line which is already modeled via the kick + ball travel). Cleanest: when `current.event.type === 'goal'`, call `ui.setScore` with the projected score in `advanceScene`.

**Severity:** Cosmetic. Does not affect final scorecard.

## 2. Goal overlay timing
The goal overlay banner currently appears at the *end* of the goal scene (when `fireSceneEvent` runs). By then the ball has already settled in the net, so the visual punch of "GOAL!" landing as the ball crosses the line is muted. Same fix as #1 (fire goal UI at scene start or mid-scene at kick-follow-through).

## 3. Striker does not visibly re-approach after kick
After the kick fires, `moveActors` still steers the striker toward `this.ball.x/z` (the live ball position), which gives a convincing chase. But before the kick the striker beelines to the ball's *starting* position rather than the moving ball — fine in practice because the ball is stationary until the kick. Non-issue for the scripted reel, just noting.

## 4. No audio
Out of scope for p01-baseline (prompt did not require sound), but a crowd/whistle layer would sell the broadcast feel. Not blocking.

## 5. Mobile / narrow viewport
HUD is tuned for desktop broadcast aspect ratios. On phone aspect the scoreboard and controls can crowd. Prompt did not require responsive; noting for future prompts.
