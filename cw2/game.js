import { CONFIG } from './config.js';
import { Player } from './player.js';
import { TCW } from './tcw.js';
import { stationaryCatchTime, sweptContact } from './geometry.js';

const REST = Object.freeze({ x: 0, y: 0, run: false });

// Pure simulation: no DOM, drawing, terrain loading or animation-loop ownership.
export class Game {
  constructor() {
    this.player = new Player();
    this.walker = new TCW();
    this.reset();
  }

  reset(start = false) {
    this.player.reset();
    this.walker.reset();
    this.elapsed = 0;
    this.travelled = 0;
    this.accumulator = 0;
    this.status = start ? 'running' : 'ready';
  }

  advance(dt, input = REST) {
    if (this.status !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
    if (dt > CONFIG.awayThreshold) {
      // RAF is suspended in hidden tabs. Account for the whole gap in O(1),
      // treating absent input as rest, rather than pausing pursuit.
      this.advanceResting(dt + this.accumulator);
      this.accumulator = 0;
      return;
    }
    this.accumulator += dt;
    while (this.accumulator + 1e-12 >= CONFIG.fixedStep && this.status === 'running') {
      this.step(CONFIG.fixedStep, input);
      this.accumulator = Math.max(0, this.accumulator - CONFIG.fixedStep);
    }
    if (this.status === 'caught') this.accumulator = 0;
  }

  step(dt, input) {
    const p = this.player, w = this.walker;
    const p0 = { x: p.x, y: p.y }, w0 = { x: w.x, y: w.y };
    const stamina0 = p.stamina;
    const distance = p.update(input, dt);
    w.update(p.x, p.y, dt);
    const hit = sweptContact(p0, p, w0, w, p.radius + w.radius);
    const fraction = hit === null ? 1 : hit;
    if (hit !== null) {
      p.x = p0.x + (p.x - p0.x) * fraction;
      p.y = p0.y + (p.y - p0.y) * fraction;
      w.x = w0.x + (w.x - w0.x) * fraction;
      w.y = w0.y + (w.y - w0.y) * fraction;
      p.stamina = stamina0 + (p.stamina - stamina0) * fraction;
      this.status = 'caught';
    }
    this.elapsed += dt * fraction;
    this.travelled += distance * fraction;
  }

  advanceResting(seconds) {
    const timeToCatch = stationaryCatchTime(this.player, this.walker);
    const duration = Math.min(seconds, timeToCatch);
    this.player.update(REST, duration);
    this.walker.update(this.player.x, this.player.y, duration);
    this.elapsed += duration;
    if (seconds >= timeToCatch) this.status = 'caught';
  }
}
