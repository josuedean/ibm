# Space Dilemma CSV data dictionary

UTF-8 CSV, one header row, CRLF line endings, decimal point numeric values. Strings containing commas, quotes or newlines are quoted; embedded quotes are doubled. Text beginning with `=`, `+`, `-`, `@`, tab or a line break receives a leading apostrophe to prevent spreadsheet formula execution. Numeric values (including negative score differences) remain numeric. Import `master_seed` as text in spreadsheet software if it looks numeric and contains leading zeroes. Dates are UTC ISO 8601.

Empty fields represent missing/not applicable values, not zero. `first_keep_*` empty means never for N>0, or N/A for N=0. Consult `completed_rounds` and `recovery_status` to distinguish missing-value cases. Percentages are exported on a 0–100 scale at full JavaScript numeric precision; displayed values are rounded. A/B always indicate match sides, not fixed factions.

## Shared fields (both exports)

| Field | Definition |
|---|---|
| `match_id` | Random UUID for this calculation; reruns receive a new ID |
| `timestamp` | Calculation start time, UTC ISO 8601 |
| `rules_version` | Payoff/interface configuration version, `space-dilemma-1.0` |
| `metric_version` | Metric definition version, `observed-1.0` |
| `requested_rounds` | Positive integer target (1–5,000) |
| `master_seed` | Exact user-entered seed string |
| `seed_a`, `seed_b` | Separate unsigned 32-bit integers passed to Python random.seed |
| `resource_multiplier` | Always 1.0 |
| `match_status` | `complete`, `incomplete` (error), or `cancelled` |
| `error` | Empty on success; otherwise side, filename, line when known, round and diagnostic where available |
| `strategy_a_id`, `strategy_b_id` | Benchmark ID or `upload` |
| `strategy_a_name`, `strategy_b_name` | Benchmark name or uploaded filename without .py |
| `strategy_a_team`, `strategy_b_team` | Optional team labels; empty if absent |
| `strategy_a_faction`, `strategy_b_faction` | Orion Space Agency (OSA), Terra Galactic Federation (TGF), or Unassigned |
| `strategy_a_filename`, `strategy_b_filename` | Executed filename, including extension |
| `strategy_a_hash`, `strategy_b_hash` | SHA-256 hex digest of UTF-8 encoded source text executed by the browser |

## Round-by-round CSV

One row per fully completed round. A partially decided round is discarded if either strategy fails. Metadata/status/error describe the complete run and repeat on every row. A zero-completed-round run exports headers only: use its summary CSV to retain the failure metadata.

| Field | Definition / units |
|---|---|
| `round` | One-based integer round number |
| `move_a`, `move_b` | S (Share) or K (Keep) |
| `outcome` | Concatenated moves, A then B: SS, SK, KS or KK |
| `points_a`, `points_b` | Round points from the authoritative payoff table |
| `total_a`, `total_b` | Cumulative points through this round |

## Match-summary CSV

One row per calculation. N = `completed_rounds`; E = `ending_rounds` = min(10,N). All rates below are `100 × count / N` unless explicitly using E. A zero denominator produces an empty field. `{a,b}` and `{SS,SK,KS,KK}` below indicate separate literal columns for each choice.

| Field(s) | Formula / meaning |
|---|---|
| `completed_rounds` | N, integer count of recorded round rows |
| `total_a`, `total_b` | Sum of corresponding round points (zero when N=0) |
| `average_a`, `average_b` | Corresponding total / N, points per round |
| `share_{a,b}_count`, `keep_{a,b}_count` | Count of corresponding side's S or K moves |
| `share_{a,b}_pct`, `keep_{a,b}_pct` | Corresponding count / N × 100 |
| `outcome_{SS,SK,KS,KK}_count` | Number of rounds with each outcome |
| `outcome_{SS,SK,KS,KK}_pct` | Outcome count / N × 100 |
| `mutual_sharing_pct` | SS count / N × 100 |
| `mutual_keeping_pct` | KK count / N × 100 |
| `one_sided_keeping_pct` | (SK + KS counts) / N × 100; descriptive exploitation outcomes, no intent inferred |
| `benefit_a_count`, `benefit_b_count` | A: KS count; B: SK count (keeps against Share) |
| `exposure_a_count`, `exposure_b_count` | A: SK count; B: KS count (shares against Keep) |
| `benefit_{a,b}_pct`, `exposure_{a,b}_pct` | Corresponding count / N × 100 |
| `first_move_a`, `first_move_b` | Opening S/K; empty if N=0 |
| `first_keep_a`, `first_keep_b` | First Keep round; empty if never or N=0 |
| `first_one_sided_keep_round` | First SK or KS round; empty if none |
| `first_one_sided_keep_side` | Side A/B that kept in that round; empty if none |
| `recovery_rounds` | Next SS round minus first SK/KS round (minimum 1); empty if unobserved/not applicable |
| `recovery_status` | `observed`, `not_observed` (no later SS), or `not_applicable` (no SK/KS) |
| `ending_rounds` | E = min(10,N) |
| `ending_{SS,SK,KS,KK}_count` | Count of each outcome in final E recorded rounds |
| `ending_{SS,SK,KS,KK}_pct` | Corresponding ending count / E × 100 |
| `difference_a_minus_b` | total_a − total_b, signed points |
| `absolute_gap` | Absolute value of difference_a_minus_b, points |
| `combined_score` | total_a + total_b, points |
| `combined_efficiency_pct` | combined_score / (6 × N) × 100; empty for N=0 |
| `winner` | A, B, or draw for completed matches; empty for incomplete/cancelled runs |

Reconciliation: share + keep counts = N on each side; SS + SK + KS + KK counts = N; ending counts sum to E; last cumulative round scores equal summary totals; summed round points equal those totals. Incomplete metrics describe only the completed prefix and must not be treated as a finished match.

SS, SK, and KS each yield six combined points. An efficiency of 100% is compatible with persistent one-sided advantage and is not evidence of mutual cooperation or fairness. No Climate or Trust score is defined. Future instructor extensions must add named fields here and increment the metric version.
