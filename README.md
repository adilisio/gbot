# Lanternfall

*A night-courier story of lights and the drowned.*

A hundred years after the Long Swell drowned the Great Lakes shore, the city of **Wickhaven** floats on paper lanterns above the water, kept alight by one enormous lantern called the **Heartwick**. Now the lights are going out, one street a night.

You're **Wren**, a night courier. You run parcels across docks, kite-yards and drowned bell towers with a lantern that holds three **glimmer wicks**: small, opinionated light spirits who fight the dark with you. Late at night, Marlow on WKHV 1450 keeps the city company on the radio. The choices you make along your route (who you help, what you read, what you hand back to the lake, what you say on air) change who joins you, the later chapters, and how the Heartwick's last night ends.

**Play it:** https://adilisio.github.io/gbot/

## What's in it
- **5 chapters + epilogue**, 6 hand-built maps (Low Wick Docks, Reedmoss Floats, Kitefall Yards, the Drowned Steps, the Signal Heights, the Heartwick Crown).
- **10 named glimmers, no catching.** Each one has a voice, a tactical role and three lights. Cindle, Ripplet and Sproutwick start with you. Cobble joins after Brannock's delivery, Mira and Wisp at relit shrines, and four only join if you make certain choices: Flit, Tack, Hollow and Static.
- **One lantern, three wicks.** Your lantern carries 3 glimmers and the rest ride in your satchel. You swap them at any **lit shrine** on one screen ("Swap wicks"). A short tutorial runs the first time a 4th glimmer joins.
- **Grid-tactics fights about light and dark**, on 7x7 to 9x9 boards:
  - Darkness creeps in from the edges every turn. Standing in it costs oil.
  - Lights come in shapes: cone, line, ring, lob, cross, swap. They burn, push, stun, soak, ward or grow light-moss.
  - Every shade shows its next strike in red before you move (Into-the-Breach style). Push it and the strike moves with it.
  - Goals vary: survive N turns, get Wren to the exit, relight the braziers, or drive the shades off. In boss fights you defeat the leaders and the rest scatter.
  - A few simple interactions replace the old type chart: water douses fire, wind fans flames, static jumps through wet shades, shades sink in water, lit braziers and moss hold back the creep. Press **T** in a fight for the Field Guide. Hovering a tile shows the light's area, damage, pushes and how much oil it costs.
- **Oil is your health and your mana.** Casting lights and taking hits both drain the shared oil meter. Relit shrines show a big glowing marker and a **Rest and refill** prompt: they refill oil, autosave, and become your respawn point. Every shrine you relight raises your max oil. Flasks (found or bought) top you up, even mid-fight. If you run dry, you wake at the last shrine. There's no game over.
- **Growth through bonds, not XP.** Deliveries made with a glimmer in your lantern, story beats and fights won deepen bonds, which unlock its 2nd and 3rd lights.
- **No random encounters.** Every fight is placed by hand. Wandering shades are visible on the map with a purple sight cone, so you can often sneak past them.
- The HUD shows your oil and a compass to the nearest shrine. The pause menu has a minimap with shrines and tells you where you last rested.
- Puzzles: crate and pressure-plate gates, wind-vent yards, radio tuning, a brazier sequence.
- **4 permanent choices** and **3 endings** (Gilded Night, Low Tide, Relay Dawn).
- Autosave at shrines and on map changes, plus 3 manual slots (localStorage). Saves from the old pre-rework build are not loaded.

## Controls
| | Overworld | Fights |
|---|---|---|
| Move / cursor | WASD / arrows (Shift runs), or click a tile | arrows, or hover with the mouse |
| Confirm | E, Space, Enter, or click | select a unit / move / cast (click) |
| Lights | | 1 / 2 / 3, or click a button |
| End turn / undo move | | F / Z, or the buttons |
| Cycle units | | Tab |
| Back / menu | Esc (also Backspace / Q), or right-click | Esc / right-click cancels |
| Field Guide | | T |
| FPS overlay | F3 | F3 |

Everything works with the mouse alone. Hovering in a fight shows the light-shape preview, the oil it costs, and the enemy intents (on the predicted board).

Settings: master/music/SFX volume, text speed, screen scale (auto or 1x-6x integer), low effects, FPS overlay.

## Run it
```bash
npm install
npm run dev       # http://localhost:5173/gbot/
npm run build     # type-check + production build into docs/
npm run preview   # serve the build
npm run validate  # map sanity checker (row widths, entity placement, reachability)
```
Add `?debug` to the URL (e.g. `/gbot/?debug`) to expose the `window.__lf` test hooks. They're off otherwise.

### Playtests
`tools/playtest/` holds Playwright scripts that run against `npm run preview` (port 4173):
- `suite.mjs` covers the starter and tutorial fight, relighting a shrine plus rest/refill/autosave, the wick-swap tutorial and a swap, a fight played with the mouse (select, light preview, intents, cast, End Turn), running dry and waking at the shrine, save/load, all three endings, and frame-time measurements.
- `balance.mjs` auto-plays every encounter headlessly with a greedy bot.
The build goes to `docs/` and is committed, so GitHub Pages serves it from **main /docs**. If you'd rather deploy with Actions, `deploy-pages.yml.example` is a ready workflow. Move it to `.github/workflows/` (that needs a token with `workflow` scope) and switch Pages' source to "GitHub Actions".

## Performance notes
It's built to hold a locked 60 fps on older laptops such as a Dell G7 15:
- Plain Canvas 2D at a fixed **384×216** internal resolution, scaled up by an integer factor with CSS `image-rendering: pixelated`. No WebGL, shaders, engine or runtime dependencies. The bundle is about 240 KB (80 KB gzipped).
- Fixed-timestep (60 Hz) update with `requestAnimationFrame`. It stops completely when the tab is hidden.
- Static map layers are **pre-rendered** once per map, with 3 water-animation frames (1 in low-effects mode). Glows are cached sprites drawn with additive blending. Text comes from a cached per-colour bitmap glyph atlas.
- The hot loops don't allocate per frame. The DOM is a single canvas.
- All art is procedural pixel art drawn in code, and all music and SFX are synthesized with Web Audio, so there are no asset downloads.
- **F3** shows FPS, average and worst frame time, and CPU time per frame. **Low effects** cuts particles, glow layers and water animation.

In headless Chromium (software rendering), 30 s of overworld walking and 30 s of a tactics fight with constant hover previews and enemy turns each held 16.67 ms average frames. The worst frame stayed under 17 ms, and CPU work was about 0.2 ms (overworld) and 0.7 ms (fights) per frame.

## Code layout
```
src/engine   canvas helpers, bitmap font, input, loop/stats, synth audio, saves, settings
src/data     wicks (the 10 glimmers + their lights), procedural art recipes, items, shrines
src/tactics  board rules + enemy planning (rules.ts), encounters, fight scene, Field Guide, test autoplayer
src/overworld tiles + baking, map definitions, overworld scene, script API
src/ui       widgets, sprites, dialogue, pause/lantern/shrine/bag menus, title/radio/ending scenes
src/story    chapters 1–5, endings
tools        map validator, Playwright playtests (dev only)
```

## Credits
Design, code, art and music: made for this repo. The UI font's lowercase glyphs are rasterised from **Pixelify Sans** (SIL Open Font License 1.1). The digits and capitals are hand-drawn.
