import { CONFIG } from './config.js';
import { gapBetween, stationaryCatchTime } from './geometry.js';
import { BIOMES } from './world.js';

export function formatDuration(seconds) {
  const tenths = Math.floor(Math.max(0, seconds) * 10 + 1e-8);
  return String(Math.floor(tenths / 600)).padStart(2, '0') + ':'
    + String(Math.floor(tenths / 10) % 60).padStart(2, '0') + '.' + tenths % 10;
}

export class HUD {
  constructor(root) {
    this.nodes = {};
    for (const id of ['survivalTime', 'walkerGap', 'catchLabel', 'catchTime', 'catchNote',
      'playerState', 'paceNote', 'playerCoords', 'walkerCoords', 'staminaValue',
      'staminaMeter', 'staminaFill', 'biomeName', 'runStatus', 'runSummary', 'announcer']) {
      this.nodes[id] = root.querySelector('#' + id);
    }
    this.lastUpdate = -Infinity;
    this.lastBiome = '';
    this.lastStatus = '';
  }

  text(id, value) {
    if (this.nodes[id].textContent !== value) this.nodes[id].textContent = value;
  }

  update(game, world, now, force = false) {
    if (!force && now - this.lastUpdate < 75) return;
    this.lastUpdate = now;
    const p = game.player, w = game.walker;
    this.text('survivalTime', formatDuration(game.elapsed));
    // textContent avoids treating seeds or coordinates as markup.
    this.text('walkerGap', gapBetween(p, w).toFixed(1) + ' tiles');
    const moving = p.state !== 'resting';
    this.text('catchLabel', moving ? 'Catch if you stop' : 'Time to catch');
    this.text('catchTime', stationaryCatchTime(p, w).toFixed(1) + 's');
    this.text('catchNote', moving ? 'Assumes you stop now' : 'While you remain still');
    const labels = { walking: 'Walking', running: 'Sprinting', resting: 'Resting' };
    this.text('playerState', game.status === 'caught' ? 'Caught' : labels[p.state]);
    this.text('paceNote', p.exhausted ? 'Release sprint to use it again'
      : p.state === 'running' ? 'Stamina drains'
      : p.state === 'walking' ? 'Stamina recovers slowly' : 'Stamina recovers quickly');
    this.text('playerCoords', p.x.toFixed(1) + ', ' + p.y.toFixed(1));
    this.text('walkerCoords', w.x.toFixed(1) + ', ' + w.y.toFixed(1));
    const percent = Math.round(p.stamina / CONFIG.player.maxStamina * 100);
    this.text('staminaValue', percent + '%');
    this.nodes.staminaMeter.setAttribute('aria-valuenow', percent);
    this.nodes.staminaFill.style.height = percent + '%';
    this.nodes.staminaFill.style.backgroundColor = percent < 25 ? '#f1a18b' : '#f1e7bc';
    const tile = Math.floor(p.x) + ',' + Math.floor(p.y);
    if (tile !== this.lastBiome) {
      this.text('biomeName', BIOMES[world.getTileType(p.x, p.y)].name);
      this.lastBiome = tile;
    }
    if (game.status !== this.lastStatus) {
      this.lastStatus = game.status;
      this.text('runStatus', game.status === 'running' ? 'Pursuit active'
        : game.status === 'caught' ? 'Pursuit ended' : 'Awaiting departure');
      this.text('announcer', game.status === 'running' ? 'Run started. The walker is approaching.'
        : game.status === 'caught' ? 'The walker caught you. Walk again to restart.' : '');
      if (game.status === 'caught') {
        this.text('runSummary', 'You survived ' + formatDuration(game.elapsed) + ' and travelled '
          + game.travelled.toFixed(1) + ' tiles. The walker kept its pace.');
      }
    }
  }
}
