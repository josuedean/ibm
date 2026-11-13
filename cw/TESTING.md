# Constant Walker 0.3.1 — developer test guide

This file contains spoilers. The opening screen intentionally explains only controls and immediate danger.

## Automated checks

Run npm run build followed by npm test. No runtime or test dependencies need installation. The test harness is a deterministic DOM/Canvas double, not a browser emulator.

## Default world fixtures

Use seed constant-walker. Coordinates here are tile coordinates shown by the field kit; the top status readout displays north as negative map Y.

| Find or feature | Tile |
| --- | --- |
| Shovel | 3, -1 |
| Shelter roll | -5, -4 |
| Introductory provisions | 0, 3 |
| Climbing equipment | 12, -7 |
| Fishing pole | 19, 6 |
| Diving equipment | 28, 13 |
| Two decoys | 31, -10 |
| Two dynamite charges | -14, -12 |
| Two dynamite charges | 36, 9 |
| Two dynamite charges | 64, -31 |
| Natural cave | -19, 12 |
| Natural basin interior | Around 45, -22 |
| Basin's earthen approach | 45, -18 |

Some starting positions vary with other seeds. Tools are revealed by searching their 3 × 3 area, then collected within reach. Pale crossed marks suggest possible search sites; many are red herrings.

## Opening and checkpoint

1. Start the default world and move toward the shovel area.
2. Explore, collect the shovel, and select your current ground using Here.
3. Excavate a refuge on level, clear soil. Ordinary movement can interrupt the work and preserve progress.
4. Enter the completed opening with E or Interact.
5. Save. Reload or return after capture and verify that the checkpoint state is restored.
6. Test the natural cave separately. Standing on inaccessible surface terrain must never enable saving.

The automated suite completes the search-to-first-checkpoint sequence in four different seeded worlds with the Walker active.

## Detection and pursuit

- Aboveground movement changes the Walker's target immediately.
- Entering a refuge leaves it circling the last surface position.
- With diving equipment, cross a deep river segment. The Walker should not track submerged progress.
- Crossing an intact shallow band reveals the new location. Deepening a channel through that band extends submerged travel and changes the Walker's available crossings.
- Swift shallow water blocks traversal but does not conceal the Explorer.
- Circling and pursuit continue outside the visible map.
- Routes may take large detours. Reaching the pathfinder's search budget must not declare the target unreachable.

## Sleep, food and timing

- Let fatigue rise naturally; an uninterrupted 25-minute normal-speed interval should make it consequential.
- Try different sleep durations and shelter states. Verify the fatigue and food-at-wake preview.
- Sleep cannot be canceled by Esc, movement, changing actions, or approaching danger.
- Swimming prevents rest, sleep and saving.
- With an empty food reserve, the Explorer must still be able to move and search for food.
- Use 5× or 20× during work or sleep. Charges and the Walker must advance with the same world clock.
- Close and reopen from a checkpoint. There must be no offline pursuit.
- Notes remain player-written and are preserved separately after capture.

## Terrain and explosives

- A shovel gradually lowers soil and sediment. Interrupt and resume it several times.
- Intact bedrock cannot be excavated with the shovel.
- Place a charge on suitable selected ground. The eight-second countdown continues independently of the player.
- Detonation cuts ground and clears cover according to material. It does not directly harm either actor.
- Inspect a ford before and after deepening it.
- Test both ascending and descending a cliff. The Walker must reject both.
- Check that walking along a flat clifftop is not slowed merely because an adjacent drop exists.
- Placed charges, their remaining fuses, and unfinished excavation must restore with a checkpoint.

## A containment plan without dynamite

The default natural basin has irregular bedrock sides and one soil approach. Climbing equipment lets the Explorer cross its walls; the Walker needs the approach.

Prepare the approach by lowering it almost to the Walker's traversal limit, preserving the last small amount of work. Draw the Walker into the interior, get onto the rock rim using climbing equipment, and finish the cut from within tool reach.

The exact timing is part of the puzzle. Closing the approach with the Walker still outside merely changes its route and is not a win. Containment is recognized when the Walker's entire traversable component is closed and the Explorer is outside it.

The automated tests verify both the final manual closure and the presence of a manually closable basin in several seeds. All six dynamite charges can be absent.

## Browser/device checks still required

v0.3.1 was opened in live Chromium and its version label and timed Explore action were verified. The remaining checks below have not all been performed.

Verify the standalone and both modular entrypoints in desktop Chrome, Firefox and Safari, then narrow mobile portrait and short landscape viewports. Check keyboard focus, the scrollable field kit, the opening and capture overlays, help, high-DPI resize, multi-touch cancellation, checkpoint downloads/imports, and browser storage denial.

The browser may restrict local-file storage or associate it with the file's location. Check exported backups when moving the game file. The game reports storage failures rather than claiming a durable save.
