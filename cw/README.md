# The Constant Walker - prototype 0.2

An open-world pursuit prototype using vanilla JavaScript, Canvas and ES modules.
The player stays centered. The walker pursues directly at one fixed speed, even off-screen.
All terrain is currently traversable and cosmetic.

## Play

The easiest option is to open **Constant_Walker_Playable.html** in a modern browser.
It includes the complete game, styling and noise implementation and needs no server or Internet connection.

For development, serve this directory:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000/tcw2.html**.
**tcw.html** loads the same game for compatibility. The modular pages need HTTP, rather than file://.

Select **Begin the walk**. Use **WASD** or **arrow keys** to move.
Hold **Shift** to sprint; release movement to rest.
On touch devices, hold the direction buttons and optionally the sprint button.
After exhaustion, release sprint before trying to sprint again.
The red circle is the walker; its red edge arrow points toward it when off-screen.

A run keeps advancing while its tab is hidden, with the player treated as stationary.
Returning after a long absence may show that you were caught. Closing or reloading discards the run.
There is no in-run pause, permanent safe area, resource collection or obstacle collision.

## World seeds

The default seed is `constant-walker`.
Use `tcw2.html?seed=your-seed` or add the same query to the standalone file URL.
The World link at the bottom reloads that seed. Seeds are limited to 64 characters in the UI.
Restarts reuse the same world. Chunk unload/reload and load order do not change it.

## Provisional balance

These settings are centralized in **config.js**. All positions and radii use tiles;
one tile is 50 CSS pixels, independently of device pixel ratio.

| Setting | Tiles / second | CSS pixels / second |
| --- | ---: | ---: |
| Walking | 2.4 | 120 |
| Sprinting | 4.8 | 240 |
| Walker | 1.8 | 90 |

Player radius is 0.2 tiles; walker radius is 0.3 tiles.
Player starts at (0, 0); walker starts at (30, -30), both on first start and restart.
Stationary contact occurs after approximately **23.292 seconds**.
Stamina drains at 30 points/second, recovers at 6 while walking and 60 while resting, and caps at 100.

These retain the PRD's historical speed ratio at 60 FPS, rather than the inconsistent tile-based ratio in the supplied modular prototype.
They are initial tuning values, not final game balance.

## Source map

| File | Responsibility |
| --- | --- |
| tcw2.html / tcw.html | Identical entry shells, dialogs, HUD and touch controls |
| main.js | One animation loop, orchestration, drawing, focus and browser lifecycle |
| game.js | DOM-free fixed-step simulation, collision, restart and background catch-up |
| config.js | Shared units, movement, stamina and spawn configuration |
| geometry.js | Coordinate conversions, collision geometry, gap, timer and edge placement |
| player.js | Player movement and stamina states |
| tcw.js | Fixed-speed, direct pursuit |
| world.js | Seeded terrain, connected water channels, chunks, cached tile rendering |
| noise.min.js | Existing attributed Perlin implementation, adapted to isolated instances |
| input.js | Keyboard codes, multitouch and cancellation |
| hud.js / styles.css | Readable HUD, accessible status and responsive styling |
| build.mjs | Regenerate the standalone game |
| tests/ | Simulation and DOM/Canvas integration checks |
| REVIEW_AND_ROADMAP.md | Audit, PRD coverage, limitations and prioritized design suggestions |

No runtime package install is required.

## Verify and rebuild

Use a current Node.js release with the built-in test runner:

```sh
npm test
npm run build
```

The automated suite checks movement at 30/60/144 Hz, stamina, physical collision and near misses,
fixed pursuit, restart, background time, coordinates, indicators, terrain, memory limits, and entrypoint wiring.
Integration checks use DOM/Canvas test doubles; they do not certify browser layout or native touch behavior.

Before a release, playtest the two modular entrypoints and the standalone page in desktop and mobile browsers.
Check short landscape viewports, high-DPI resizing, multi-finger touch cancellation and hidden-tab return.
