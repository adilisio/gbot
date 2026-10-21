# Lanternfall

*A night-courier story of lights and the drowned.*

A hundred years after the Long Swell drowned the Great Lakes shore, the city of **Wickhaven** floats on paper lanterns above the water, kept alight by one enormous lantern called the **Heartwick**. Now the lights are going out, one street a night.

You're **Wren**, a night courier. You run parcels across docks, kite-yards and drowned bell towers, and you befriend **glimmers**, small light creatures that live in the lanterns. Late at night, Marlow on WKHV 1450 keeps the city company on the radio. The choices you make along your route (who you help, what you read, what you hand back to the lake, what you say on air) change the later chapters and decide how the Heartwick's last night ends.

**Play it:** https://adilisio.github.io/gbot/

## What's in it
- **5 chapters + epilogue**, 6 hand-built maps (Low Wick Docks, Reedmoss Floats, Kitefall Yards, the Drowned Steps, the Signal Heights, the Heartwick Crown), about 2–3 hours.
- **26 befriendable glimmers** (with evolutions) plus 4 boss glimmers, ~45 moves, passives, statuses, items.
- **6 affinities**: Ember, Tide, Bloom, Gale, Stone, Hush. Each one is strong against two others and resisted by two others and by itself. Press **T** anywhere, or click **?** in battle, to open the chart. The move menu shows effectiveness before you pick.
- Turn-based battles with switching, items and lantern befriending (team of 4, extras go to the Roost).
- Puzzles: crate and pressure-plate gates, wind-vent yards, radio tuning, a brazier sequence.
- **4 permanent choices** and **3 endings** (Gilded Night, Low Tide, Relay Dawn). Rivals and side characters show up as friends or enemies depending on what you did.
- Autosave on every map change, plus 3 manual slots (localStorage).

## Controls
| | |
|---|---|
| Move | WASD / arrow keys (hold Shift to run) or click a tile |
| Interact / confirm | E, Space, Enter, or click |
| Back / menu | Esc (also Backspace / Q) |
| Type chart | T |
| FPS / frame-time overlay | F3 |

Every menu and battle also works with the mouse alone (hover, click, wheel, right-click = back).

Settings: master/music/SFX volume, text speed, screen scale (auto or 1×–6× integer), low effects, FPS overlay.

## Run it
```bash
npm install
npm run dev       # http://localhost:5173/gbot/
npm run build     # type-check + production build into docs/
npm run preview   # serve the build
npm run validate  # map sanity checker (row widths, entity placement, reachability)
```
The build goes to `docs/` and is committed, so GitHub Pages serves it from **main /docs**. If you'd rather deploy with Actions, `deploy-pages.yml.example` is a ready workflow. Move it to `.github/workflows/` (that needs a token with `workflow` scope) and switch Pages' source to "GitHub Actions".

## Performance notes
It's built to hold a locked 60 fps on older laptops such as a Dell G7 15:
- Plain Canvas 2D at a fixed **384×216** internal resolution, scaled up by an integer factor with CSS `image-rendering: pixelated`. No WebGL, shaders, engine or runtime dependencies. The bundle is about 200 KB (68 KB gzipped).
- Fixed-timestep (60 Hz) update with `requestAnimationFrame`. It stops completely when the tab is hidden.
- Static map layers are **pre-rendered** once per map, with 3 water-animation frames (1 in low-effects mode). Glows are cached sprites drawn with additive blending. Text comes from a cached per-colour bitmap glyph atlas.
- The hot loops don't allocate per frame. The DOM is a single canvas.
- All art is procedural pixel art drawn in code, and all music and SFX are synthesized with Web Audio, so there are no asset downloads.
- **F3** shows FPS, average and worst frame time, and CPU time per frame. **Low effects** cuts particles, glow layers and water animation.

In headless Chromium (software rendering), 30 s of overworld walking and 30 s of battle each held 16.67 ms average frames, with the worst frame under 17 ms and CPU work under 1 ms per frame.

## Code layout
```
src/engine   canvas helpers, bitmap font, input, loop/stats, synth audio, saves, settings
src/data     types, moves, glimmers (stats + procedural art recipes), items
src/battle   battle rules/AI (engine.ts) and presentation (scene.ts)
src/overworld tiles + baking, map definitions, overworld scene, script API
src/ui       widgets, sprites, dialogue, menus, type chart, title/radio/ending scenes
src/story    chapters 1–5, endings
tools        map validator, Playwright playtests (dev only)
```

## Credits
Design, code, art and music: made for this repo. The UI font's lowercase glyphs are rasterised from **Pixelify Sans** (SIL Open Font License 1.1). The digits and capitals are hand-drawn.
