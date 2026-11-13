# The Constant Walker — prototype 0.3.1

A playable exploration and containment game using JavaScript and Canvas. This update implements the design interview recorded in docs/Constant_Walker_Design_Baseline.md.

## Play

Open **Constant_Walker_Playable.html** in a modern desktop browser. It contains the game, styles, and terrain noise implementation, with no external downloads or runtime dependencies.

For the modular source, serve this directory:

~~~sh
python3 -m http.server 8000
~~~

Open http://localhost:8000/tcw2.html. The tcw.html entrypoint loads the same game.

Choose a seed and select **Begin expedition**. A saved checkpoint for that seed makes **Continue checkpoint** available.

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Sprint; release after exhaustion before sprinting again |
| Q | Explore the selected area |
| E | Collect nearby finds, or enter / leave an underground opening |
| Click the map | Select ground for a tool action |
| Here | Return the tool target to your current tile |
| Esc / Stop work | Interrupt ordinary work; sleep remains committed |
| Field kit | Excavate, place equipment, choose sleep duration, save or load |
| 1× / 5× / 20× | Advance a long action and the entire world together |

Touch movement controls are included. The HTML/CSS and native touch behavior still need browser/device playtesting; see verification below.

## Saving and sessions

Checkpoints can only be made while underground in a completed dug refuge or natural cave. Surface safety and shelter do not enable saving. A sleeping Explorer can save if already inside a refuge; the checkpoint retains the committed sleep action.

Capture offers a return to the last checkpoint. Until the first checkpoint is made, capture restarts the opening in the same world. Loading restores terrain, found items, inventory, food, fatigue, actions, placed charges, decoys, and the Walker's position and remembered target.

Checkpoints use browser local storage and are kept separately by seed. The backup controls export or import a checkpoint JSON file. Use a backup when moving the standalone HTML to another location, changing browsers, or clearing browser data. If browser storage is unavailable or full, the game reports the limitation and retains an in-session checkpoint for export.

The simulation suspends while the tab is hidden and does not run offline. Reloading or closing without a checkpoint loses unsaved world progress. Panels, controls, the notebook, and the help dialog do not pause an active visible session.

Player-written notes are retained separately by seed and survive capture. They can also be exported as text. The game never writes behavioral discoveries into them.

## Implemented systems

- Seeded elevation, cover density, ground materials, slopes, rivers, shallow crossings, streams, and sparse caves.
- Distinct Explorer and Walker traversal; symmetric uphill/downhill limits for the Walker.
- Terrain routing beyond the camera, constrained circling, and last-known-position pursuit.
- Unlimited equipped diving in deep water; shallow crossings and shore restore detection.
- Timed exploration, hidden equipment, misleading environmental clues, separate collection, and unrestricted carrying.
- A found shovel, shelter, climbing equipment, fishing pole, diving equipment, decoys, and six total dynamite charges per world.
- Forest provisions and fishing, consumption over world time, fatigue, and committed sleep with a recovery preview.
- Resumable excavation anywhere suitable soil permits, including riverbeds.
- Timed terrain deformation. Explosions affect terrain, with no direct health/damage system for either actor.
- Permanent containment recognition and sparse recurring natural basins supporting solutions without explosives.

There is no crafting, thirst system, or connected underground network.

## First balance values

These are adjustable test values, not a finished balance pass.

| Setting | Value |
| --- | --- |
| Open-ground walking / sprinting | 2.4 / 4.8 tiles per second |
| Walker travel rate | 1.8 tiles per second |
| Simulation step | 1/30 second, independent of display frame rate |
| World hour | 60 simulation seconds |
| Fatigue reaches 100 | 30 normal-speed minutes awake |
| Initial provisions | 24 world hours |
| Explore an area | 8 seconds; one area is 3 × 3 tiles |
| Excavate a refuge | 20 seconds, with a clear level apron |
| Shovel cut | Up to 0.9 elevation units over 80 seconds, limited by soil depth |
| Dynamite | Six charges; 8-second fuse; radius 1.65 tiles |
| Walker slope limit | 30 degrees, uphill and downhill |
| Normal Explorer slope limit | 45 degrees; steeper changes require climbing equipment |
| Deep water | Depth above 0.52 elevation units |
| Strong current | Blocks the Walker; generated fords have gentle current |
| Ordinary circling radius | Approximately 3 tiles, adjusted for legal terrain routes |

Food has no carrying cap. Forest food and fish can be harvested again after five world hours by completing another search. A depleted food reserve slows movement and removes usable stamina while leaving ordinary movement possible.

Partial exploration and excavation progress are retained. This resolves the interview's open choice about interrupted searches in favor of allowing retreats.

The Explorer can choose 0.5–8 world hours of sleep. Short sleeps of two hours or less provide no fatigue recovery. A shelter improves recovery; six uninterrupted sheltered hours or eight exposed hours can remove 100 fatigue points. The preview includes the effect of food depletion on walking pace at wake-up.

## Source map

| File | Responsibility |
| --- | --- |
| config.js | Test balance, equipment definitions, sleep curve, shared units |
| world.js | Deterministic terrain, traversal rules, finds, resources, persistent edits |
| navigation.js | A* routing, including a legal frontier when a search budget is reached |
| player.js | Movement, climbing, swimming, stamina, fatigue and food effects |
| tcw.js | Pursuit, last known position, legal circuits, and decoy targeting |
| game.js | Fixed-step simulation, actions, terrain work, containment and checkpoint validation |
| render.js | Canvas map, terrain marks, clues, finds, entrances and actors |
| input.js | Keyboard and touch input |
| hud.js / styles.css | Field kit, inventory, notes, action feedback and responsive layout |
| main.js | Browser lifecycle, one animation chain, local storage and backup controls |
| geometry.js | Swept contact, coordinates and off-screen indicators |
| build.mjs | Build the dependency-free standalone HTML |
| tests/ | Simulation and DOM/Canvas integration checks |
| TESTING.md | Developer test scenarios, including spoilers and test-world coordinates |
| REVIEW_AND_ROADMAP.md | Current coverage, validation and remaining work |

## Build and verify

A current Node.js installation is sufficient for the automated suite; no package install is required.

~~~sh
npm run build
npm test
~~~

Run the build after source edits so the standalone matches the modules.

The test suite checks simulation rates, navigation, both slope directions, concealment transitions, actions, fixed dynamite, a tool-only trap, checkpoint restoration and the actual standalone entrypoint using DOM/Canvas doubles.

Native Canvas map renders have also been inspected. The v0.3.1 release was opened through the supported managed preview in live Chromium: its visible release label, enabled Explore control, and active timed exploration were verified. The added release-contract test also checks that the actual standalone bundle applies woodland movement costs. Full browser campaign testing, native touch, other browsers, and device performance remain to be checked.

## Content and next work

This is a rules-complete first playable balance pass. The world generator remains a stylized scaffold with a compact introductory item set and recurring natural test basins. Narrative discoveries, a curated multi-session content arc, full hydrology, and wider terrain/tool variety remain future work. Generated terrain and traversal are functional; their numerical values still need playtesting.
