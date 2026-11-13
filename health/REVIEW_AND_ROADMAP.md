# Source review and improvement roadmap
13 November 2026 - prototype 0.2

## What the supplied code actually did

The modular implementation was **tcw2.html -> main.js**.
A separate older game ran through **tcw.html -> game.js**.
The noise file already exported an ES module correctly; there was no source evidence of the historical import or constructor errors described provisionally in the PRD.

| Confirmed source discrepancy | Change |
| --- | --- |
| Two entrypoints ran incompatible implementations | Both HTML files now use main.js; game.js is the shared simulation |
| Movement, pursuit and stamina were measured per rendered frame | Seconds-based rates with a 120 Hz simulation step independent of rendering |
| Cardinal updates accumulated, making diagonal travel faster | Normalize the resolved input vector, including opposing-key cancellation |
| Modular walk speed was 0.05 tiles/frame and pursuit 0.07 | Provisional PRD ratio: walk 2.4, sprint 4.8, pursuit 1.8 tiles/second |
| Catch timer subtracted pixel radii from tile distances, using per-frame speed as seconds | One tile unit system and the same collision radii throughout |
| Walker returned its pre-update distance for collision | Swept circle contact across each simulation step, including tangency |
| Near-empty stamina could alternate between run and walk while Shift stayed held | Exhaustion walks until sprint is released |
| Legacy sprint input consumed stamina even when stationary | Recovery follows actual movement state |
| Key strings could miss shifted letter keys; no blur/cancel cleanup | Physical key codes, scroll prevention, blur and pointer cancellation |
| Modular restart manually duplicated state resets; legacy restart added RAF chains | Central reset and one lifetime RAF chain |
| Terrain used a random global seed with no replayable seed contract | Stable URL seed and isolated noise instances |
| One noise field classified all terrain | Independent elevation and vegetation fields with explicit precedence |
| Only nine chunks rendered, regardless of viewport; old chunks were never evicted | Viewport-derived coverage, bounded retention and cached chunk bitmaps |
| Canvas used backing dimensions as CSS pixels | Separate CSS size and DPR backing store; shared camera conversions |
| Frame-by-frame walker logging | Removed |

## PRD coverage

| Requirements | Current result |
| --- | --- |
| FR-01/02: walk, sprint, rest and stamina | Implemented and automated checks pass |
| FR-03/04/05: invariant direct pursuit, independent of chunks | Implemented and automated checks pass |
| FR-06/07: centered player, visible circle and off-screen arrow | Implemented; drawing geometry and Canvas output checked |
| FR-08/09: coordinates, left stamina meter and catch time | Implemented; stationary timer exact under this model; moving display explicitly says "Catch if you stop" |
| FR-10/11: physical contact and complete restart | Implemented and automated checks pass |
| FR-12: deterministic world coordinates and seed | Implemented and automated checks pass, including negative chunks and reload order |
| FR-13: independent elevation and vegetation | Implemented; dry and wet mountain regions checked |
| FR-14: connected rivers and mountain regions | Partial terrain foundation: broad elevation plus detail, continuous river polylines, attached tributaries, intersecting lakes and accessible shallows. Elevation-aware drainage and designed mountain-range topology remain future work. |

The original PRD remains a useful scope document and has not been rewritten.
This pass retains its lightweight architecture and open-terrain rules.
Resources, hunger, sleep, inventory, combat, safe zones and obstacle pathfinding have not been specified or added.

## Validation actually completed

- **35 automated tests pass**, using Node.js 24.22.1 on Linux. No npm dependencies are required.
- Equal movement, stamina and pursuit outcomes at 30, 60 and 144 display updates/second.
- Stationary countdown and simulated catch agree within the test tolerance of 0.0000001 seconds; the HUD intentionally rounds to tenths.
- Contact, tangency, near misses, path crossing, off-screen pursuit and large negative coordinates.
- Initial ready state, physical key codes, shortcut handling, sprint/rest, opposing keys, blur cleanup, touch-pointer cancellation, DPR resize, hidden-tab return and repeated restarts.
- Same-seed regeneration, independent simultaneous worlds, all ten terrain categories, wide viewport coverage, bounded chunk retention and tributary/river joins.
- Three gameplay scenes rendered using a native Canvas implementation and visually inspected: forest/grassland, mountain/foothills and river/shallows.
- Static module syntax and the standalone bundle syntax checked.
- **Live browser playtesting and full HTML/CSS visual QA were unavailable**: the local headless browser could not start under the environment's socket restrictions, and the remote browser could not access the local game server. DOM/Canvas doubles and native Canvas renders are not substitutes for that release check.

## Timing and world decisions made for this pass

An active run has no pause. Hidden-tab or long-stall time is resolved as stationary rest and continuous pursuit.
Large gaps are solved analytically instead of running thousands of missed ticks or silently discarding elapsed time.
For gaps above 250 ms, held input is cleared; this can stop movement on a severe foreground stall as well.
Normal updates use 1/120-second steps, with swept contact across each step.

Water channels are explicitly connected geometry, not absolute-noise contours.
They are stylized rather than hydrological: main rivers generally travel east-west in broad bands,
tributaries join them, and lakes intersect them. They can still cross terrain that would require carving or drainage modeling.
The present terrain does not constrain either entity.

Chunk bitmaps are rendered once at the CSS tile scale and reused.
Memory depends on the viewport and a small retention margin, rather than all territory visited.
The world is practically unbounded within JavaScript's numeric precision, not mathematically infinite.

## Recommended next decisions, in order

1. **Make stopping worthwhile.** Walking faster than the walker permits indefinite survival in a straight line. Test whether exploration alone creates enough tension. If not, design one optional resource or discovery that costs a few seconds to collect. Measure time spent stopped, closest gap, sprint use and survival duration before tuning. Preserve the walker's invariant speed.
2. **Approve one survival rule set.** A small food or rest mechanic could make distance a resource. Define its rates, UI, failure state and recovery before implementation. Avoid adding several needs at once.
3. **Finish terrain topology.** Replace the banded river scaffold with an elevation-aware drainage graph and river-carved terrain. Define outlets, tributary accumulation and lakes. Add explicit ridge structures for more recognizable mountain ranges.
4. **Decide traversability before obstacles.** Decide whether the player and walker obey identical terrain rules, how water works, and whether the walker follows terrain routes or ignores them. Only then choose navigation and test shortest paths across unloaded chunks.
5. **Conduct device playtests.** Verify desktop Chrome/Firefox/Safari, narrow and short mobile screens, multi-touch, keyboard focus, high-DPI zoom and background return. Profile new-chunk generation before moving it to a worker.
6. **Add restrained feedback.** Consider optional proximity audio and an on-screen directional label. Keep the exact circle boundary readable and provide independent volume/mute controls.
7. **Choose session persistence deliberately.** The current run resets on refresh. Decide whether saving is needed and whether pursuit advances between visits. Persist seeds and world changes only after those rules are explicit.

Suggested next milestone: a 10-minute playtest build with one approved reason to stop, simple local run metrics,
and a feedback form. Use that evidence to tune player stamina and spawn distance without changing pursuit speed.

## Technical references

- MDN, requestAnimationFrame: use timestamps for progress; browsers commonly suspend callbacks in hidden tabs.
  [requestAnimationFrame documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- MDN, Optimizing canvas: pre-render repeated primitives to an offscreen surface and reuse the result.
  [Canvas optimization documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
