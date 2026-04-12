// ============================================================
// LOGISTICS NETWORK GAME — MAIN CONTROLLER
// Wires engine + UI, exposes global `game` object
// ============================================================

import {
  createInitialState, getCurrentEvent, getEffectiveData,
  toggleDC, assignZone, validateNetwork, validateAssignments,
  finaliseQuarter, advanceQuarter,
  GAME_CONFIG,
} from './engine.js';

import {
  renderStepper, renderHUD,
  renderEventPhase, renderNetworkPhase,
  renderAssignPhase, renderResultsPhase,
  renderExplainerPhase, renderGameOver,
} from './ui.js';

// ── State ─────────────────────────────────────────────────────
let state = createInitialState();

// ── DOM references ────────────────────────────────────────────
const $stepper = document.getElementById('stepper');
const $hud     = document.getElementById('hud');
const $main    = document.getElementById('main');

// ── Render ────────────────────────────────────────────────────
function render() {
  $stepper.innerHTML = renderStepper(state.phase);
  $hud.innerHTML     = renderHUD(state);

  switch (state.phase) {
    case 'event':     $main.innerHTML = renderEventPhase(state);     break;
    case 'network':   $main.innerHTML = renderNetworkPhase(state);   break;
    case 'assign':    $main.innerHTML = renderAssignPhase(state);    break;
    case 'results':   $main.innerHTML = renderResultsPhase(state);   break;
    case 'explainer': $main.innerHTML = renderExplainerPhase(state); break;
    case 'gameover':  $main.innerHTML = renderGameOver(state);       break;
  }
}

// ── Game API (called from inline onclick handlers) ────────────
window.game = {
  goPhase(phase) {
    // Validate before advancing
    if (phase === 'network') {
      const event = getCurrentEvent(state);
      const effData = getEffectiveData(event);
      // ensure assignments to closed DCs get cleared
    }
    if (phase === 'assign') {
      const errors = validateNetwork(state);
      if (errors.length) return;
    }
    if (phase === 'results') {
      const event = getCurrentEvent(state);
      const effData = getEffectiveData(event);
      const { errors } = validateAssignments(state, effData);
      if (errors.length) return;
      // Finalise quarter — calculates costs, score, explainer, stores in history
      state = finaliseQuarter(state);
      // finaliseQuarter sets phase to 'explainer', but we want to show costs first
      state = { ...state, phase: 'results' };
      render();
      return;
    }
    if (phase === 'explainer') {
      state = { ...state, phase: 'explainer' };
      render();
      return;
    }
    if (phase === 'gameover') {
      state = { ...state, phase: 'gameover' };
      render();
      return;
    }
    state = { ...state, phase };
    render();
  },

  toggleDC(dcId) {
    state = toggleDC(state, dcId);
    render();
  },

  assignZone(zoneId, dcId) {
    state = assignZone(state, zoneId, dcId);
    render();
  },

  nextQuarter() {
    state = advanceQuarter(state);
    render();
  },

  restart() {
    state = createInitialState();
    render();
  },
};

// ── Initial render ────────────────────────────────────────────
render();
