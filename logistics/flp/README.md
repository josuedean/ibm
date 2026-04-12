# Logistics Network Design Game

A classroom web game accompanying **Chapter 9–10** of supply chain strategy coursework. Students design a distribution network across 6 quarterly scenarios, learning the core trade-off between facility costs, inventory overhead, transport cost, and service levels.

## How to play

1. Each quarter, a **demand or cost shock** is revealed
2. Decide which **distribution centres** to open (max 2)
3. **Assign demand zones** to open DCs
4. See the **full cost breakdown** — fixed, inventory, inbound, storage, outbound, late penalties
5. Review the **quarter analysis** with coaching on what drove your costs
6. Repeat for 6 quarters — lowest cumulative cost wins

## Learning objectives

- Understand the trade-off between facility count and total logistics cost (Ch. 9)
- Apply rough-cut facility location reasoning to a real cost structure (Ch. 10)
- See how demand shocks, SLA constraints, and capacity limits change the optimal network
- Learn why minimising transport cost alone does not minimise total logistics cost

## Hosting on GitHub Pages

```
1. Fork or clone this repo
2. Push to your GitHub account
3. Settings → Pages → Source: Deploy from branch → main / root
4. Your game will be live at https://<username>.github.io/<repo-name>
```

No build step. No dependencies. Pure HTML + CSS + vanilla JS modules.

## File structure

```
index.html   — Entry point (open this locally or deploy to Pages)
style.css    — All styling (industrial logistics dashboard aesthetic)
data.js      — Game constants: DCs, zones, events, tooltips, explainer logic
engine.js    — State management, cost calculation, validation
ui.js        — DOM rendering for all phases
main.js      — Game controller, wires engine + UI
```

## Classroom sequence

| Quarter | Event | Teaching focus |
|---------|-------|----------------|
| Q1 | Baseline | Find the optimal base network |
| Q2 | SE demand +25% | Capacity constraints |
| Q3 | Fuel cost +20% | Transport cost sensitivity |
| Q4 | Seoul SLA → 1 day | Service constraints override cost |
| Q5 | Busan fixed cost ↑ | Fixed cost break-even |
| Q6 | Gwangju capacity -20% | Capacity shock + reassignment |

## Scoring

`Score per quarter = 100,000,000 ÷ total logistics cost × 100`

Lower cost = more points. Maximum theoretical score per quarter is around 140 (optimal two-DC network ≈ ₩70,000). Total across 6 quarters: ~840 for a perfect run.

**Rank thresholds**
- S ≥ 800 — Logistics master
- A ≥ 600 — Strong performer  
- B ≥ 450 — Solid foundations
- C ≥ 300 — Room to improve
- D < 300 — Review Chapter 9 trade-offs

## Customising

All game parameters are in `data.js`:
- Change `GAME_CONFIG.invCostPerDC` to adjust inventory penalty difficulty
- Edit `EVENTS` array to add or change quarterly shocks
- Modify `DCS` costs/capacities to reflect real case study data
- Add zones to `ZONES` for a more complex network
