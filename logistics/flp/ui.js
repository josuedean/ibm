// ============================================================
// LOGISTICS NETWORK GAME — UI MODULE
// All DOM rendering functions
// ============================================================

import { TOOLTIPS, DCS, ZONES, OUTBOUND, TRANSIT } from './data.js';
import { getSLAStatus, getEffectiveData, getCurrentEvent, validateNetwork, validateAssignments, GAME_CONFIG } from './engine.js';

// ── Tooltip helper ────────────────────────────────────────────
function tooltip(key, side = '') {
  const t = TOOLTIPS[key];
  if (!t) return '';
  return `<span class="tooltip-anchor${side ? ' tip-' + side : ''}">
    <span class="tooltip-icon">?</span>
    <span class="tooltip-box">
      <div class="tooltip-box-title">${t.title}</div>
      <div class="tooltip-box-body">${t.body}</div>
    </span>
  </span>`;
}

function inlineTooltip(title, body, side = '') {
  return `<span class="tooltip-anchor${side ? ' tip-' + side : ''}">
    <span class="tooltip-icon">?</span>
    <span class="tooltip-box">
      <div class="tooltip-box-title">${title}</div>
      <div class="tooltip-box-body">${body}</div>
    </span>
  </span>`;
}

// ── Format helpers ────────────────────────────────────────────
const won = v => '₩' + Math.round(v).toLocaleString();
const pct = v => Math.round(v) + '%';

// ── Phase stepper ─────────────────────────────────────────────
export function renderStepper(phase) {
  const steps = ['event', 'network', 'assign', 'results', 'explainer'];
  const labels = ['1 · Event', '2 · Network', '3 · Assign', '4 · Costs', '5 · Review'];
  const idx = steps.indexOf(phase);
  return steps.map((s, i) => {
    const cls = i < idx ? 'done' : i === idx ? 'active' : '';
    return `<div class="phase-step ${cls}">${labels[i]}</div>`;
  }).join('');
}

// ── HUD ───────────────────────────────────────────────────────
export function renderHUD(state) {
  const openCount = Object.values(state.openDCs).filter(Boolean).length;
  const lastCost = state.history.length > 0
    ? state.history[state.history.length - 1].costs.total : null;
  const costColor = !lastCost ? '' : lastCost < 75000 ? 'green' : lastCost < 100000 ? 'amber' : 'red';

  return `
    <div class="hud-cell"><div class="hud-label">Quarter</div><div class="hud-val">Q${state.quarter} / ${GAME_CONFIG.totalQuarters}</div></div>
    <div class="hud-cell"><div class="hud-label">Open DCs</div><div class="hud-val ${openCount > 0 ? 'green' : 'red'}">${openCount || '—'}</div></div>
    <div class="hud-cell"><div class="hud-label">Last cost</div><div class="hud-val ${costColor}">${lastCost ? won(lastCost) : '—'}</div></div>
    <div class="hud-cell"><div class="hud-label">Score ${inlineTooltip('How scoring works', TOOLTIPS.score.body, 'right')}</div><div class="hud-val green">${state.score.toLocaleString()}</div></div>
  `;
}

// ── Phase 1: Event ────────────────────────────────────────────
export function renderEventPhase(state) {
  const event = getCurrentEvent(state);
  const isLastQ = state.quarter === GAME_CONFIG.totalQuarters;

  return `
  <div class="phase-section">
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Q${state.quarter} — Quarterly event</span>
        <span class="panel-sub">${GAME_CONFIG.totalQuarters - state.quarter} quarters remaining</span>
      </div>
      <div class="event-card">
        <div class="event-icon">${event.icon}</div>
        <div class="event-title">${event.title}</div>
        <div class="event-desc">${event.desc}</div>
        <div class="event-hint">${event.hint}</div>
      </div>
      ${state.quarter > 1 ? `
      <div class="alert alert-info" style="margin-bottom:0">
        Your network from last quarter carries forward. Review it before advancing.
      </div>` : ''}
      <div class="btn-row">
        <button class="btn btn-primary" onclick="game.goPhase('network')">Plan network →</button>
      </div>
    </div>
  </div>`;
}

// ── Phase 2: Network decisions ────────────────────────────────
export function renderNetworkPhase(state) {
  const event = getCurrentEvent(state);
  const effData = getEffectiveData(event);
  const { dcs, zones } = effData;
  const openCount = Object.values(state.openDCs).filter(Boolean).length;
  const errors = validateNetwork(state);

  // Calculate load per DC for capacity bars
  const dcLoads = {};
  dcs.forEach(dc => {
    const load = zones.filter(z => state.assignments[z.id] === dc.id)
                      .reduce((s, z) => s + z.demand, 0);
    dcLoads[dc.id] = load;
  });

  const dcCards = dcs.map(dc => {
    const isOpen = state.openDCs[dc.id];
    const atMax = !isOpen && openCount >= GAME_CONFIG.maxOpenDCs;
    const load = dcLoads[dc.id] || 0;
    const loadPct = Math.min(100, Math.round(load / dc.cap * 100));
    const over = load > dc.cap;
    const baseData = DCS.find(d => d.id === dc.id);

    return `
    <div class="dc-card ${isOpen ? 'open' : ''} ${atMax ? 'maxed' : ''}"
         onclick="${atMax ? '' : `game.toggleDC('${dc.id}')`}"
         title="${atMax ? 'Close another DC first (max 2 open)' : ''}">
      <div class="dc-badge">${isOpen ? 'OPEN' : 'CLOSED'}</div>
      <div class="dc-name">${dc.name}</div>
      <div class="dc-region">${dc.region}</div>
      <div class="dc-stats">
        <div class="dc-stat-row">
          <span>Fixed cost ${tooltip('fixedCost', 'left')}</span>
          <span class="dc-stat-val">${won(dc.fixed)}</span>
        </div>
        <div class="dc-stat-row">
          <span>Capacity ${tooltip('capacity')}</span>
          <span class="dc-stat-val">${dc.cap.toLocaleString()} u</span>
        </div>
        <div class="dc-stat-row">
          <span>Storage/unit ${tooltip('storageCost')}</span>
          <span class="dc-stat-val">₩${dc.storage.toFixed(2)}</span>
        </div>
        <div class="dc-stat-row">
          <span>Inbound/unit ${tooltip('inboundCost')}</span>
          <span class="dc-stat-val">₩${dc.inbound.toFixed(2)}</span>
        </div>
      </div>
      ${isOpen ? `
      <div class="cap-bar-wrap">
        <div class="cap-bar-label">
          <span>Assigned load</span>
          <span>${load.toLocaleString()} / ${dc.cap.toLocaleString()}</span>
        </div>
        <div class="cap-bar-bg">
          <div class="cap-bar-fill ${over ? 'over' : ''}" style="width:${loadPct}%"></div>
        </div>
      </div>` : ''}
      <div class="dc-tip">
        <strong>Strength:</strong> ${baseData.strength}<br>
        <em>Weakness:</em> ${baseData.weakness}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="phase-section">
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Facility decisions ${inlineTooltip('Max 2 DCs', 'Opening more facilities lowers transport cost but raises fixed cost, inventory overhead, and coordination complexity. This is the core Chapter 9 trade-off.', 'left')}</span>
        <span class="panel-sub">Max ${GAME_CONFIG.maxOpenDCs} open · Inv. penalty: ${won(GAME_CONFIG.invCostPerDC)}/DC</span>
      </div>
      <div class="dc-grid">${dcCards}</div>
      ${errors.length ? `<div class="alert alert-error" style="margin-top:10px">${errors.join(' ')}</div>` : ''}
      <div class="btn-row">
        <button class="btn" onclick="game.goPhase('event')">← Back</button>
        <button class="btn btn-primary" ${errors.length ? 'disabled' : ''} onclick="game.goPhase('assign')">Assign zones →</button>
      </div>
    </div>
  </div>`;
}

// ── Phase 3: Zone assignments ─────────────────────────────────
export function renderAssignPhase(state) {
  const event = getCurrentEvent(state);
  const effData = getEffectiveData(event);
  const { dcs, zones } = effData;
  const openDCs = dcs.filter(d => state.openDCs[d.id]);
  const { errors, warnings } = validateAssignments(state, effData);

  const rows = zones.map(z => {
    const assigned = state.assignments[z.id];
    const sla = getSLAStatus(assigned, z.id, z);
    let slaClass = 'sla-empty', slaText = '—';
    if (assigned) {
      slaClass = sla.ok ? 'sla-ok' : 'sla-fail';
      slaText = `${sla.days}d ${sla.ok ? '✓' : '✗ MISS'}`;
    }

    const opts = openDCs.map(dc =>
      `<option value="${dc.id}" ${assigned === dc.id ? 'selected' : ''}>${dc.name}</option>`
    ).join('');

    // Outbound cost comparison row
    const costHints = openDCs.map(dc =>
      `${dc.name.replace(' DC','')}: ₩${OUTBOUND[dc.id][z.id].toFixed(2)}/u (${TRANSIT[dc.id][z.id]}d)`
    ).join(' · ');

    return `
    <tr class="zone-row">
      <td class="zone-name-cell">
        ${z.name}
        ${inlineTooltip(`${z.name} details`,
          `Monthly demand: ${z.demand.toLocaleString()} units. SLA: ${z.sla} day(s). Outbound costs — ${costHints}`
        )}
      </td>
      <td class="zone-demand-cell">${z.demand.toLocaleString()} u</td>
      <td>
        <select class="zone-dc-select" onchange="game.assignZone('${z.id}', this.value)">
          ${opts}
        </select>
      </td>
      <td>
        <span class="sla-cell ${slaClass}">${slaText} ${inlineTooltip('Transit & SLA', TOOLTIPS.transitDays.body + ' ' + TOOLTIPS.sla.body)}</span>
      </td>
    </tr>`;
  }).join('');

  return `
  <div class="phase-section">
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Zone → DC assignments</span>
        <span class="panel-sub">Late penalty: ${won(GAME_CONFIG.latePenalty)}/unit ${tooltip('latePenalty', 'right')}</span>
      </div>
      <table class="zone-table">
        <thead>
          <tr>
            <th>Zone</th>
            <th>Demand</th>
            <th>Assigned DC ${tooltip('outboundCost')}</th>
            <th style="text-align:center">SLA status ${tooltip('sla','right')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${warnings.map(w => `<div class="alert alert-warn">${w}</div>`).join('')}
      ${errors.map(e => `<div class="alert alert-error">${e}</div>`).join('')}
      <div class="btn-row">
        <button class="btn" onclick="game.goPhase('network')">← Back</button>
        <button class="btn btn-primary" ${errors.length ? 'disabled' : ''} onclick="game.goPhase('results')">Calculate costs →</button>
      </div>
    </div>
  </div>`;
}

// ── Phase 4: Results (cost breakdown) ────────────────────────
export function renderResultsPhase(state) {
  if (!state.lastResult) return '';
  const { costs } = state.lastResult;
  const total = costs.total;

  const rows = [
    { label: 'Fixed DC costs',        value: costs.fixed,    key: 'fixedCost',    warn: false },
    { label: 'Inventory penalty',     value: costs.inv,      key: 'invPenalty',   warn: false },
    { label: 'Inbound transport',     value: costs.inbound,  key: 'inboundCost',  warn: false },
    { label: 'Storage costs',         value: costs.storage,  key: 'storageCost',  warn: false },
    { label: 'Outbound transport',    value: costs.outbound, key: 'outboundCost', warn: false },
    { label: 'Late delivery penalty', value: costs.late,     key: 'latePenalty',  warn: costs.late > 0 },
  ];

  const tableRows = rows.map(r => {
    const barPct = Math.round(r.value / total * 100);
    const isRed = r.warn || r.key === 'latePenalty' && r.value > 0;
    return `
    <tr ${r.warn ? 'class="cost-penalty"' : ''}>
      <td>
        <div class="cost-label-wrap">
          ${r.label} ${tooltip(r.key)}
          <div class="cost-bar-wrap">
            <div class="cost-bar-bg">
              <div class="cost-bar-fill ${isRed ? 'red' : r.value / total > 0.35 ? 'amber' : ''}"
                   style="width:${barPct}%"></div>
            </div>
          </div>
        </div>
      </td>
      <td>${won(r.value)}</td>
    </tr>`;
  }).join('');

  const pts = state.history.length > 0
    ? state.history[state.history.length - 1].pts : 0;

  return `
  <div class="phase-section">
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Cost breakdown ${tooltip('totalCost')}</span>
        <span class="panel-sub">Q${state.quarter} result</span>
      </div>
      <table class="cost-table">
        ${tableRows}
        <tr class="total-row">
          <td>Total logistics cost ${tooltip('totalCost','right')}</td>
          <td>${won(total)}</td>
        </tr>
      </table>
      <div class="alert alert-info" style="margin-top:12px">
        Points earned this quarter: <strong>+${pts.toLocaleString()}</strong>
        &nbsp;·&nbsp; Running score: <strong>${state.score.toLocaleString()}</strong>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="game.goPhase('explainer')">Review analysis →</button>
      </div>
    </div>
  </div>`;
}

// ── Phase 5: Explainer ────────────────────────────────────────
export function renderExplainerPhase(state) {
  if (!state.lastResult) return '';
  const { explainer, costs, quarter } = state.lastResult;
  const isLast = state.quarter >= GAME_CONFIG.totalQuarters;

  // Cost breakdown bars
  const breakdownBars = explainer.costBreakdown.map(el => {
    const isHighlight = el.key === explainer.biggestDriver.key;
    return `
    <div class="breakdown-row">
      <div class="breakdown-label">${el.label}</div>
      <div class="breakdown-track">
        <div class="breakdown-fill ${isHighlight ? 'highlight' : ''}" style="width:${el.pct}%"></div>
      </div>
      <div class="breakdown-pct">${el.pct}%</div>
    </div>`;
  }).join('');

  // SLA misses
  const missedHtml = explainer.missed.length === 0
    ? '<div style="font-size:0.825rem;color:var(--green)">✓ All zones met their SLA this quarter.</div>'
    : `<div class="missed-list">
        ${explainer.missed.map(m => `
        <div class="missed-item">
          <div>
            <div class="missed-zone">${m.zone}</div>
            <div class="missed-detail">Assigned to ${m.dc} · ${m.transit}d transit vs ${m.sla}d SLA</div>
          </div>
          <div class="missed-cost">−${won(m.penalty)}</div>
        </div>`).join('')}
      </div>`;

  // Suggestions
  const suggIcons = { service: '⚠', capacity: '📦', inventory: '🏭', outbound: '🚚' };
  const suggestionsHtml = explainer.suggestions.length === 0
    ? '<div style="font-size:0.825rem;color:var(--green)">✓ No major structural issues detected.</div>'
    : `<div class="suggestion-list">
        ${explainer.suggestions.map(s => `
        <div class="suggestion-item ${s.type}">
          <span class="suggestion-icon">${suggIcons[s.type] || '•'}</span>
          <span>${s.text}</span>
        </div>`).join('')}
      </div>`;

  // Quarter history sparkline
  const historyDots = Array.from({ length: GAME_CONFIG.totalQuarters }, (_, i) => {
    const done = i < state.history.length;
    const isCur = i === state.history.length - 1;
    return `<div class="spark-dot ${isCur ? 'active' : ''}" style="${done ? '' : 'background:var(--border)'}"></div>`;
  }).join('');

  return `
  <div class="phase-section">
    <div class="explainer-panel verdict-${explainer.scoreVerdict}">

      <div class="explainer-header">
        <div class="verdict-dot"></div>
        <div class="verdict-headline">${explainer.headline}</div>
        <div style="margin-left:auto;font-family:var(--mono);font-size:0.8rem;color:var(--text3)">
          Q${quarter} · ${won(costs.total)}
        </div>
      </div>

      <div class="explainer-section">
        <div class="explainer-section-title">Cost structure — where your money went</div>
        <div class="breakdown-bars">${breakdownBars}</div>
        <div class="breakdown-driver">
          Biggest driver: <strong>${explainer.biggestDriver.label}</strong>
          at ${explainer.biggestDriver.pct}% of total cost.
          ${getCostDriverInsight(explainer.biggestDriver.key, costs)}
        </div>
      </div>

      <div class="explainer-section">
        <div class="explainer-section-title">Service level compliance ${tooltip('sla')}</div>
        ${missedHtml}
      </div>

      <div class="explainer-section">
        <div class="explainer-section-title">Recommendations for next quarter</div>
        ${suggestionsHtml}
      </div>

      <div class="explainer-section">
        <div class="explainer-section-title">Chapter link</div>
        <div class="teaching-box">${explainer.teachingMoment}</div>
      </div>

    </div>

    ${renderHistory(state)}

    <div class="btn-row">
      ${isLast
        ? `<button class="btn btn-success" onclick="game.goPhase('gameover')">See final results →</button>`
        : `<button class="btn btn-primary" onclick="game.nextQuarter()">Next quarter →</button>`
      }
    </div>
  </div>`;
}

function getCostDriverInsight(key, costs) {
  const insights = {
    fixed: 'Consider whether both DCs are earning their keep — each open facility must save more in transport than it costs in fixed + inventory overhead.',
    inv: `Each open DC adds ₩${GAME_CONFIG.invCostPerDC.toLocaleString()} in inventory overhead. This is the hidden cost of decentralisation that Chapter 9 warns about.`,
    inbound: 'High inbound cost often means your DCs are far from the plant. Weigh this against the outbound savings they provide.',
    storage: 'Storage cost scales with volume. Routing more demand through a lower-storage DC can meaningfully reduce this element.',
    outbound: 'Outbound is typically the largest element. Ensure each zone is served by the closest available DC, not just the cheapest to open.',
    late: 'Late penalties are avoidable — they represent a pure loss. Reassigning the affected zone to a faster DC eliminates this cost entirely.',
  };
  return insights[key] || '';
}

// ── History table ─────────────────────────────────────────────
function renderHistory(state) {
  if (state.history.length === 0) return '';
  return `
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">Quarter history</span>
    </div>
    <table class="history-table">
      <thead>
        <tr>
          <th>Q</th>
          <th>Event</th>
          <th>Network</th>
          <th>Total cost</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        ${state.history.map(h => {
          const openNames = DCS
            .filter(d => h.openDCs[d.id])
            .map(d => d.name.replace(' DC',''))
            .join(' + ');
          return `<tr>
            <td>Q${h.quarter}</td>
            <td style="color:var(--text2);font-size:0.775rem">${h.event.title}</td>
            <td style="color:var(--text2);font-size:0.775rem">${openNames}</td>
            <td style="font-family:var(--mono);font-size:0.8rem">${won(h.costs.total)}</td>
            <td>+${h.pts.toLocaleString()}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

// ── Game over ─────────────────────────────────────────────────
export function renderGameOver(state) {
  const total = state.score;
  let rank, rankClass, verdict;
  if (total >= 800)      { rank = 'S'; rankClass = 'rank-S'; verdict = 'Logistics master. Near-optimal networks across all shocks.'; }
  else if (total >= 600) { rank = 'A'; rankClass = 'rank-A'; verdict = 'Strong performer. Minor inefficiencies, excellent adaptability.'; }
  else if (total >= 450) { rank = 'B'; rankClass = 'rank-B'; verdict = 'Solid foundations. Some quarters had avoidable cost spikes.'; }
  else if (total >= 300) { rank = 'C'; rankClass = 'rank-C'; verdict = 'Room to improve. Review the cost drivers in your worst quarters.'; }
  else                   { rank = 'D'; rankClass = 'rank-D'; verdict = 'High costs throughout. Revisit the Chapter 9 trade-off framework.'; }

  const bestQ = [...state.history].sort((a,b) => a.costs.total - b.costs.total)[0];
  const worstQ = [...state.history].sort((a,b) => b.costs.total - a.costs.total)[0];

  return `
  <div class="phase-section">
    <div class="panel">
      <div class="gameover">
        <div class="gameover-label">Final score — ${GAME_CONFIG.totalQuarters} quarters complete</div>
        <div class="gameover-score">${total.toLocaleString()}</div>
        <div class="gameover-subtitle">${verdict}</div>
        <div class="rank-band ${rankClass}">RANK ${rank}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:360px;margin:0 auto 2rem">
          <div style="background:var(--green-bg);border:1px solid var(--green);border-radius:var(--radius);padding:10px 14px;text-align:left">
            <div style="font-family:var(--mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--green);margin-bottom:4px">Best quarter</div>
            <div style="font-size:0.875rem;font-weight:500">Q${bestQ.quarter} — ${won(bestQ.costs.total)}</div>
            <div style="font-size:0.775rem;color:var(--text2)">${bestQ.event.title}</div>
          </div>
          <div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--radius);padding:10px 14px;text-align:left">
            <div style="font-family:var(--mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--red);margin-bottom:4px">Hardest quarter</div>
            <div style="font-size:0.875rem;font-weight:500">Q${worstQ.quarter} — ${won(worstQ.costs.total)}</div>
            <div style="font-size:0.775rem;color:var(--text2)">${worstQ.event.title}</div>
          </div>
        </div>
        <button class="btn btn-success" onclick="game.restart()">Play again ↺</button>
      </div>
    </div>
    ${renderHistory(state)}
  </div>`;
}
