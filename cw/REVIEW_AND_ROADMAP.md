# Constant Walker — implementation review and roadmap
13 November 2026 · prototype 0.3.1

This update implements the gameplay direction recorded in Constant_Walker_Design_Baseline.md. The earlier prototype audit is preserved in docs/REVIEW_0.2.md; its statements about cosmetic terrain, direct pursuit, background catch-up, and absent saving describe version 0.2 only.

## Implemented in this update

| Design rule | Result |
| --- | --- |
| Understand the Walker through observation | Minimal opening guidance, consistent rules between seeds, player-written notes only. |
| Terrain-aware pursuit | A* navigation on independent elevation, material, density, water depth and current. Terrain outside the camera participates. |
| Symmetric uphill/downhill limits | The same 30-degree provisional threshold is applied to both directions, including diagonal corner checks. |
| Continual movement around an unreachable Explorer | Legal terrain circuits around the remembered or unreachable position, with a wider legal circuit if the default radius intersects obstacles. |
| Underground concealment | Dug refuges and sparse caves retain the last surface target. |
| Unlimited diving | Deep water conceals an equipped Explorer; shore and shallow water immediately restore detection. No rest, sleep or saving while swimming. |
| Periodic river crossings | Full-width shallow bands provide traversable fords and break ordinary submerged travel. |
| Deliberate exploration | An interruptible eight-second search reveals eligible finds. Collection is separate, and carrying is unrestricted. |
| Equipment progression | Shovel, shelter, climbing equipment, fishing pole, diving equipment, decoys and fixed dynamite caches. |
| Provisions | Forest food and fishing, world-time depletion, slower movement and unavailable stamina at zero food. |
| Fatigue and sleep | Progressive loss of movement speed and stamina capacity; selectable, previewed, uninterruptible sleep with shelter benefits. |
| Terrain alteration | Resumable shovel cuts in suitable soil and sediment, plus scarce explosives for hard ground. |
| Countdown dynamite | Six charges per world, eight-second fuses, persistent timers, predictable material-dependent deformation, no direct actor damage. |
| Permanent containment | A closed Walker component with the Explorer outside is recognized as victory; surface refuge alone is not victory. |
| A solution after all explosives are spent | Ordinary tools can close the earthen approach to natural rock basins. These basins recur beyond the initial region, so blasting the first site does not exhaust all opportunities. |
| Restricted checkpoints | Saves only while underground in dug refuges or caves; complete simulation/world restoration and checkpoint import/export. |
| Sessions and notes | No offline pursuit. Notes persist separately per seed after capture. |

No crafting, thirst, or underground refuge connections were added.

## Verification

The final automated suite contains 65 passing tests on Node.js v24.22.1. It uses the built-in test runner and no installed project dependencies.

Coverage includes:

- Consistent simulation at 30, 60 and 144 display updates per second.
- Normalized movement, sprint exhaustion, density and directional slope effects.
- Uphill/downhill symmetry, shoreline cliffs, diagonal corner prevention and ford detours.
- Capped path searches returning a legal frontier instead of falsely declaring a location unreachable.
- Last-known-position transitions, underwater concealment, exposure in shallows, legal circling and decoy destruction.
- Partial search/excavation, separate collection, finite explosive supply, food regeneration and starvation recovery.
- Fatigue after 25 minutes, committed sleep, accelerated world time and exposed-sleep capture.
- Exact saved-state restoration, matching future simulation after restore, fuse/work persistence, and rejection of malformed imports without partial mutation.
- First shovel-to-refuge-to-checkpoint sequences in four seeds.
- A final manual containment cut with zero dynamite and additional independent basins after explosives are exhausted.
- The actual generated standalone script running with DOM/Canvas test doubles: keyboard/touch input, controls, inventory, sleep preview, storage errors, notes, overlays, resize and one animation chain.
- Standalone syntax, unique HTML IDs, matching modular entrypoints, and absence of external script/style dependencies.

Opening, river, basin and underground-refuge map scenes were rendered with a native Canvas implementation and visually inspected.

Live Chromium verification was completed for v0.3.1 using the supported managed preview route. The visible version, field kit, Explore control and running exploration timer were observed. The earlier claim that live preview was unavailable was too broad: the initial attempt used an unsuitable server route. Full campaign and device testing are still outstanding.

## Important implementation choices

These resolve details left open by the interview and can be changed after playtesting:

- A world hour is 60 simulation seconds; a full day is 24 normal-speed minutes.
- Fatigue reaches 100 after 30 minutes awake and becomes consequential within the requested 20–30-minute window.
- Interrupted searches retain progress.
- Notes are saved separately from checkpointed world progress and survive capture.
- Food is consumed automatically; known sources can be searched for another harvest after five world hours.
- The whole visible session keeps advancing through panels and help. Hidden tabs suspend the simulation. Reopening only restores an actual checkpoint, without offline catch-up.
- Ordinary terrain penalties use the strongest applicable slowdown, followed by fatigue and food effects.
- Climbing equipment changes directional slope movement; a neighboring cliff does not slow travel along a flat plateau.
- Explosions directly damage neither actor. Their terrain effects can still obstruct or enclose either one.
- Generated basins are simple geological test fixtures with ordinary editable terrain, not scripted victory triggers.

## Remaining work

1. Playtest the standalone and modular builds in real desktop and mobile browsers, including short viewports, local-file storage and high-DPI/touch behavior.
2. Tune spawn distance, find visibility, search/work time, fatigue, provisions and sleep together through complete expeditions.
3. Expand the terrain/material effect table and equipment variety only where an item creates a distinct choice.
4. Replace the stylized water/mountain scaffold with fuller landscape generation and hydrology. Preserve traversable fords, compact obstruction pockets and alternative tool-only plans.
5. Author the wider stakes, environmental narrative and a multi-session content arc. The current build implements the survival and containment systems rather than a finished narrative campaign.
6. Profile pathological very large edits, path searches and component checks before expanding world-generation complexity.
7. Add connected underground networks later with the separate equipment originally proposed.

The original PRD is retained as historical project context. The design baseline and this implementation report define the new gameplay direction.
