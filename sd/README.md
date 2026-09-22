# Space Dilemma: Strategy Lab

A static, browser-based lab for the university Data Analysis project. No build step, server-side execution, account, API key, or paid service. Upload Python, calculate once, watch recorded rounds, and download analysis data.

## Publish with GitHub Pages

1. Extract this ZIP. Put the **contents** of `strategy-lab/` in a GitHub repository (or its `docs/` folder). `index.html`, `styles.css`, `runner.py`, and `js/` must retain their relative locations.
2. In the repository, open **Settings → Pages**. Select **Deploy from a branch**, select your branch and `/ (root)` (or `/docs`), then save.
3. Open the published HTTPS address. Project paths such as `https://USERNAME.github.io/REPOSITORY/` work: application assets use relative URLs.
4. Run Always Share against Always Share for 10 rounds. Expect 30–30. Python downloads on the first run, so an internet connection and access to `cdn.jsdelivr.net` are required.

For local testing, run `python3 -m http.server 8000` in this folder, then visit `http://localhost:8000/`. Opening `index.html` directly as a `file:` URL is not supported. No npm installation is needed to run the application.

## Student workflow

Select a benchmark or upload a `.py` file on each side. Optionally set team names and faction labels. Choose 1–5,000 rounds and a seed; then run. Computation and playback progress are separate. Pause, step, scrub, replay, or skip without re-executing Python. Results are concealed until playback reaches its end. CSV buttons always export the complete computed record, including completed rounds of interrupted runs.

Rerun same/new seed uses the **last match's exact source and settings**, including team and faction labels. To apply edited setup fields, use Run match. Keep downloaded CSVs and original source files for future comparison; closing or reloading the page clears in-memory match data. Source previews, seeds, hashes, and UTC timestamp identify the recorded version.

## Python contract and limits

```python
def space_exploration_strategy(history, round_number, resource_multiplier):
    return 'S'  # exactly 'S' or 'K'
```

- History is a copied list of immutable `(my_move, opponent_move)` tuples; round 1 receives `[]`. Round n sees n−1 completed rounds, with each side's own perspective. Both moves are collected before scoring or revealing either.
- `resource_multiplier` is always `1.0`. Payoffs: SS = 3/3; SK = 1/5; KS = 5/1; KK = 2/2. No alternate multiplier rule is implied.
- Only `random` and `math` imports are supported. Use `import random`, not `rand`. Async and generator strategy functions are rejected. File I/O, dynamic execution, and introspection are intentionally restricted. Print output is discarded.
- Files are limited to 100 KB. Each initialization and each decision has a **2-second wall-clock limit**; runtime loading has a **60-second limit** per worker. Background-tab throttling or slow devices may cause timeouts. Keep the tab foreground while computing. The 5,000-round ceiling is a practical cap because copying and processing complete histories can be quadratic in round count. Complex strategies may hit limits sooner.
- Validation checks syntax, imports, callable existence, and whether its signature accepts three positional arguments. It executes module initialization in disposable workers but does **not** dry-run decisions. Return values and decision-time errors are checked when encountered in the real match. Error messages identify side, filename, line when available, and round (0 means initialization). A syntax/import/timeout failure stops the run. No substitute decisions or winner are supplied for incomplete runs.
- Two independent Web Workers own separate Pyodide interpreters. Disposable validation workers are destroyed before fresh match workers are initialized. Module state and random generators reset between matches, including self-play.
- The master seed is text; each side's unsigned 32-bit seed is FNV-1a over JavaScript UTF-16 character codes of `master + ':' + side` (`A` / `B`). Both side seeds are exported. `random.seed(side_seed)` runs before module initialization. Reproducibility assumes unchanged sources, rules, Python runtime, and deterministic dependencies. `random.Random()` without a seed, `SystemRandom`, explicit reseeding from entropy, time, or external data can break repeatability. Time and external-data imports are unsupported here.
- Tit for Tat is **benchmark only — prohibited for student submissions**. Close variants are prohibited; teams within a faction must develop substantially different strategies. Technical validation does not certify originality or tournament eligibility.

## Runtime, privacy, and execution boundary

Pyodide is pinned to **0.27.7**, fetched from `https://cdn.jsdelivr.net/pyodide/v0.27.7/full/`. See the [official worker documentation](https://pyodide.org/en/0.27.0/usage/webworker.html). The browser downloads interpreter resources; the application never uploads strategy source or match records to a service. Runtime downloads may be cached by the browser. There are no analytics, remote fonts, or AI calls.

**A Web Worker is not a complete security sandbox.** AST and built-in restrictions are defensive compatibility controls, not a guarantee against malicious Python or runtime exploits. Code executes on the visitor's device. Worker termination handles ordinary infinite loops, but a memory-exhaustion attack can still destabilize a tab or browser. Use trusted classroom files; do not present this as a hardened public arbitrary-code service. Browser isolation does not establish a strict memory limit or prove malicious code cannot access network capabilities by bypassing restrictions. Scores are computed in the main application, outside submitted code. For genuinely adversarial submissions, use a separately designed hardened execution environment.

## Analysis and interpretation

All rates use completed rounds N, except ending rates (last min(10,N) rounds). Null metrics appear as N/A and export as empty cells. Recovery counts rounds after the first SK/KS until the next SS; next-round recovery is 1. The summary uses local templates and recorded counts, never an external AI service. A run's faction labels do not describe an entire faction's tournament performance.

Combined efficiency = `(total_a + total_b)/(6*N) × 100`. SS, SK and KS each produce six combined points, so **100% efficiency does not establish mutual cooperation or fairness**. Climate and Trust are not defined or scored.

## File map and instructor edits

| File | Purpose / edit point |
|---|---|
| `index.html`, `styles.css` | Semantic interface and responsive amber/cyan terminal theme |
| `js/rules.js` | Sole payoff configuration, round cap, versions, source hashes, seed derivation |
| `js/strategies.js` | Add/edit benchmark names, explanations and Python source |
| `js/engine.js` | Worker lifecycle, disposable validation, simultaneous decisions, cancel/timeout, main-thread scoring |
| `js/worker.js`, `runner.py` | Pinned interpreter loading and Python validation/execution adapter |
| `js/playback.js` | Recorded playback and chart; never calls Python |
| `js/metrics.js` | Observed metrics and local summary; `instructorMetrics(rows)` is the future extension point |
| `js/exports.js` | Flat CSV records, metadata, formula-safe escaping |
| `js/app.js` | Interface state, immutable match snapshots, upload handling and results |
| `DATA_DICTIONARY.md` | Export columns, formulas and null conventions |
| `tests/` | Core, Python-contract and browser verification |

When editing payoff values, update the rules version and reassess the combined-efficiency denominator, explanatory copy and tests. The current six-point denominator belongs specifically to the supplied matrix. Future instructor metrics can be returned by `instructorMetrics(rows)` and will enter summary exports. Add explicit UI descriptions and dictionary definitions before exposing them to students. Never change scoring from a descriptive metric.

## Verification

See `VERIFICATION.md` for executed checks and limits. Run `npm test` for pure JavaScript checks (Node 18+). Run `python3 tests/test_runner.py` for host-Python contract tests. Browser checks require Playwright/Chromium and internet access to the pinned runtime; serve the parent folder on port 8765 and run `node tests/browser.cjs`. Tests request `/strategy-lab/` to check a Pages-style project subdirectory.

Runtime and UI-logic verification used real Pyodide in Node worker threads and JSDOM. Live browser visual checks were blocked by this workspace's process restrictions; browser-native workers and deployment should receive the included end-to-end check before classroom use. The full distinction is recorded in `VERIFICATION.md`.
