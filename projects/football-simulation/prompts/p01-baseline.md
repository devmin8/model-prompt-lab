# Pitchside - 3D football match simulator

Build a browser-based 3D football match simulator using vanilla HTML/CSS/ES modules + Three.js (CDN importmap, no build step). Deliver complete runnable files.

### Reference

![Pitchside broadcast UI reference](../../reference-images/reference-image.png)

Use `projects/football-simulation/reference-images/reference-image.png` as the visual target for layout, styling, and broadcast feel. Match:

* **Scoreboard (top centre):** team crests + names, central score, match clock below
* **Goal overlay (bottom-left):** bold “GOAL!” banner, scorer portrait, number, name, minute, assist line
* **Control bar (bottom):** Pause, Resume, speed (1x/2x/3x), event timeline with goal/card markers, LIVE indicator
* **Pitch & camera:** televised side-on view, striped grass, white markings, goals, ad boards, floodlights
* **Kits:** contrasting home/away colours, green/yellow goalkeeper, black referee

The reference shows stadium seating; omit crowd geometry in the 3D scene (see Scene below).

### Scene

* Full-screen pitch matching the reference
* Striped grass, white markings, goals + nets, ad boards, floodlights
* No crowd
* Footballer-shaped players from primitives
* Home/Away kits, green/yellow GKs, black referee
* Smooth broadcast camera tracking ball

### Match

* Scripted ~3-minute highlights reel
* First Half → Half Time → Second Half → Full Time
* Include: multiple goals, fouls, yellow cards, red card (2 yellows), saves, corner, penalty
* Respect football rules

### Movement

* Smooth ball physics
* Pass to space; receiver runs onto ball
* No teleporting / magnetic possession
* Kick animation when striking
* Idle players remain still

### Goals

* Ball visibly enters net
* Celebration sequence
* Animated GOAL banner
* Show scorer, number, minute, assist
* Restart from kickoff

### UI

* Premium dark broadcast style
* Setup: team names + kit colours
* Scoreboard: crests, score, clock, phase
* Commentary ticker
* Controls: Pause, Resume, Restart, New Match, 1x/2x/3x, timeline, LIVE
* Pause freezes everything

### Full Time

* Final score
* Player of the Match
* Key moments
* New Match

Target: polished TV-style football broadcast, not a technical demo.
