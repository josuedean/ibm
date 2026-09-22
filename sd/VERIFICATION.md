# Verification report

## Passed

- All four payoff outcomes and 10-round reference results: Share/Share 30–30; Keep/Share 50–10; Keep/Keep 20–20; Share/Keep 10–50.
- Real **Pyodide 0.27.7 WebAssembly execution**, using the unchanged `js/worker.js` and `runner.py`, with a Node worker-thread adapter supplying locally downloaded copies of the pinned runtime assets.
- Round numbering, multiplier 1.0, history length, both own-side history perspectives, simultaneous decisions based on previous completed rounds, and copied histories.
- Self-play state isolation, reset between matches, disposable validation state, separate side seeds, and seeded repeatability.
- Syntax errors, unsupported imports, missing functions, incompatible signatures, invalid returns, and error location reporting.
- Real infinite-loop timeouts, worker termination, user cancellation after 10 rounds, preservation of completed data, and successful subsequent matches. Incomplete matches do not announce a winner.
- Runtime-loading failure handling and cancellation during loading (simulated worker failure/stall).
- Full 5,000-round computation; round CSV and summary totals reconcile.
- Recovery metrics, outcome distributions, end-window denominator, zero-observation N/A values, numeric CSV cells, escaping and spreadsheet formula protection.
- Playback unit checks: seeking/replaying changes only recorded position, not decisions or data.
- Interface behavior in **JSDOM with real Python worker execution**: uploading source, previewing it, running a match, concealing results before the end, pause/step/replay/skip, full-record CSV export during playback, changing setup without changing existing results, exact snapshot reruns, zero-round failures and exports.
- Optional browser-agent API registration and representative valid/invalid actions in a simulated registry.
- HTML IDs are unique; relative HTML asset targets exist.

## Not verified in this environment

A real Chromium launch was blocked by the workspace's process/socket restrictions. Therefore **live browser rendering, visual/mobile layout, browser-native worker loading, native file pickers/downloads, and GitHub Pages subdirectory execution have not been verified end to end**. JSDOM and Node worker tests establish behavior and real Python execution, but are not substitutes for those browser checks. The app has not been deployed to the user's GitHub account.

The provided `tests/browser.cjs` exercises those checks from `/strategy-lab/`, including uploads, seeded runs, error handling, cancel/timeout recovery, playback, CSV download, and mobile overflow. Run it in an ordinary environment with Playwright/Chromium and access to the Pyodide CDN. A native WebMCP context was unavailable; optional API checks used a simulated registry.

## Reproduce

```sh
# Pure JavaScript and host-Python checks
npm test
python3 tests/test_runner.py
node tests/loading.test.mjs

# Real Pyodide via Node worker threads
# Download pyodide.js, pyodide.asm.js, pyodide.asm.wasm,
# python_stdlib.zip and pyodide-lock.json from the pinned CDN directory
# into a local folder, then set its absolute path:
PYODIDE_HOME=/absolute/path/to/pyodide node tests/runtime.test.mjs

# DOM behavior checks (requires jsdom installed locally)
PYODIDE_HOME=/absolute/path/to/pyodide node tests/dom.test.mjs
# Or use JSDOM_PATH=/absolute/path/to/node_modules/jsdom.

# Browser checks (requires playwright and its Chromium browser)
# Serve the parent of strategy-lab/ on port 8765 in another terminal:
python3 -m http.server 8765
# Then from strategy-lab/:
node tests/browser.cjs
```

`CHROME_PATH` may point to a custom Chromium executable for the browser checks. Browser tests save desktop/mobile screenshots under `/tmp` by default; set `SCREENSHOT_DIR` to an existing output directory to change that. Test dependencies are development-only and are not needed to host or use the lab.
