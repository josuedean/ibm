// ============================================================
// LOGISTICS NETWORK GAME — ENGINE MODULE
// State management, cost calculation, phase logic
// ============================================================

import {
  DCS, ZONES, OUTBOUND, TRANSIT, EVENTS,
  GAME_CONFIG, generateExplainer
} from './data.js';

// ── Initial state factory ─────────────────────────────────────
export function createInitialState() {
  return {
    quarter: 1,
    phase: 'event',       // event | network | assign | results | explainer | gameover
    openDCs: { busan: true, daejeon: false, gwangju: false },
    assignments: { seoul: 'busan', central: 'busan', southwest: 'gwangju', southeast: 'busan' },
    score: 0,
    history: [],
    lastResult: null,
  };
}

// ── Get event for current quarter ─────────────────────────────
export function getCurrentEvent(state) {
  return EVENTS[(state.quarter - 1) % EVENTS.length];
}

// ── Apply event modifiers to base data ────────────────────────
export function getEffectiveData(event) {
  const m = event ? event.mod : {};
  const dcs = DCS.map(d => ({
    ...d,
    fixed: (m.fixed && m.fixed[d.id] !== undefined) ? m.fixed[d.id] : d.fixed,
    cap:   (m.cap   && m.cap[d.id]   !== undefined) ? m.cap[d.id]   : d.cap,
  }));
  const zones = ZONES.map(z => ({
    ...z,
    demand: (m.demand && m.demand[z.id] !== undefined) ? m.demand[z.id] : z.demand,
    sla:    (m.sla    && m.sla[z.id]    !== undefined) ? m.sla[z.id]    : z.sla,
  }));
  const outboundMult = m.outbound_mult || 1;
  return { dcs, zones, outboundMult };
}

// ── Cost calculation ──────────────────────────────────────────
export function calcCosts(state, effectiveData) {
  const { dcs, zones, outboundMult } = effectiveData;
  let fixed = 0, inv = 0, inbound = 0, storage = 0, outbound = 0, late = 0;

  const openDCs = dcs.filter(d => state.openDCs[d.id]);
  openDCs.forEach(dc => { fixed += dc.fixed; });
  inv = openDCs.length * GAME_CONFIG.invCostPerDC;

  zones.forEach(z => {
    const dcId = state.assignments[z.id];
    const dc = dcs.find(d => d.id === dcId);
    if (!dc || !state.openDCs[dc.id]) return;
    inbound  += z.demand * dc.inbound;
    storage  += z.demand * dc.storage;
    outbound += z.demand * OUTBOUND[dc.id][z.id] * outboundMult;
    const td = TRANSIT[dc.id][z.id];
    if (td > z.sla) late += z.demand * GAME_CONFIG.latePenalty;
  });

  const total = fixed + inv + inbound + storage + outbound + late;
  return { fixed, inv, inbound, storage, outbound, late, total };
}

// ── Validation helpers ────────────────────────────────────────
export function validateNetwork(state) {
  const openCount = Object.values(state.openDCs).filter(Boolean).length;
  const errors = [];
  if (openCount === 0) errors.push('Open at least one DC to continue.');
  if (openCount > GAME_CONFIG.maxOpenDCs) errors.push(`Maximum ${GAME_CONFIG.maxOpenDCs} DCs allowed.`);
  return errors;
}

export function validateAssignments(state, effectiveData) {
  const { dcs, zones } = effectiveData;
  const errors = [];
  const warnings = [];

  zones.forEach(z => {
    const dcId = state.assignments[z.id];
    if (!dcId || !state.openDCs[dcId]) {
      errors.push(`${z.name} must be assigned to an open DC.`);
    }
  });

  dcs.forEach(dc => {
    if (!state.openDCs[dc.id]) return;
    const assigned = zones.filter(z => state.assignments[z.id] === dc.id);
    const total = assigned.reduce((s, z) => s + z.demand, 0);
    if (total > dc.cap) {
      warnings.push(`${dc.name} is over capacity (${total.toLocaleString()} / ${dc.cap.toLocaleString()} units).`);
    }
  });

  return { errors, warnings };
}

export function getSLAStatus(dcId, zoneId, effectiveZone) {
  if (!dcId) return { days: null, ok: null };
  const days = TRANSIT[dcId][zoneId];
  return { days, ok: days <= effectiveZone.sla };
}

// ── Scoring ───────────────────────────────────────────────────
export function calcScore(totalCost) {
  return Math.max(0, Math.round(GAME_CONFIG.scoreBase / totalCost * 100));
}

// ── Finalise a quarter ────────────────────────────────────────
export function finaliseQuarter(state) {
  const event = getCurrentEvent(state);
  const effectiveData = getEffectiveData(event);
  const costs = calcCosts(state, effectiveData);
  const pts = calcScore(costs.total);

  const quarterResult = {
    quarter: state.quarter,
    event,
    costs,
    openDCs: { ...state.openDCs },
    assignments: { ...state.assignments },
    effectiveData,
    pts,
  };

  const explainer = generateExplainer(quarterResult);

  const newHistory = [...state.history, {
    ...quarterResult,
    explainer,
    runningScore: state.score + pts,
  }];

  return {
    ...state,
    score: state.score + pts,
    history: newHistory,
    lastResult: { ...quarterResult, explainer },
    phase: 'results',
  };
}

// ── Advance quarter ───────────────────────────────────────────
export function advanceQuarter(state) {
  if (state.quarter >= GAME_CONFIG.totalQuarters) {
    return { ...state, phase: 'gameover' };
  }
  return { ...state, quarter: state.quarter + 1, phase: 'event' };
}

// ── DC toggle ─────────────────────────────────────────────────
export function toggleDC(state, dcId) {
  const isOpen = state.openDCs[dcId];
  const openCount = Object.values(state.openDCs).filter(Boolean).length;
  if (!isOpen && openCount >= GAME_CONFIG.maxOpenDCs) return state;

  const newOpenDCs = { ...state.openDCs, [dcId]: !isOpen };
  let newAssignments = { ...state.assignments };

  if (isOpen) {
    Object.keys(newAssignments).forEach(z => {
      if (newAssignments[z] === dcId) {
        const fallback = Object.keys(newOpenDCs).find(k => newOpenDCs[k] && k !== dcId);
        newAssignments[z] = fallback || '';
      }
    });
  }

  return { ...state, openDCs: newOpenDCs, assignments: newAssignments };
}

// ── Zone assignment ───────────────────────────────────────────
export function assignZone(state, zoneId, dcId) {
  return { ...state, assignments: { ...state.assignments, [zoneId]: dcId } };
}

export { DCS, ZONES, OUTBOUND, TRANSIT, GAME_CONFIG, getCurrentEvent, getEffectiveData as getEffective };
