import { CONFIG } from './config.js';

export class Player {
  constructor() { this.reset(); }

  reset() {
    const config = CONFIG.player;
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius;
    this.stamina = config.maxStamina;
    this.state = 'resting';
    this.exhausted = false;
    this.heading = -Math.PI / 2;
  }

  update(input, dt) {
    const config = CONFIG.player;
    let dx = input.x || 0, dy = input.y || 0;
    const magnitude = Math.hypot(dx, dy);
    if (!input.run) this.exhausted = false;
    if (magnitude === 0) {
      this.state = 'resting';
      this.stamina = Math.min(config.maxStamina, this.stamina + config.regenRest * dt);
      return 0;
    }

    dx /= magnitude;
    dy /= magnitude;
    this.heading = Math.atan2(dy, dx);
    let runTime = 0;
    if (input.run && !this.exhausted && this.stamina > 0) {
      runTime = Math.min(dt, this.stamina / config.staminaDrain);
      this.stamina = Math.max(0, this.stamina - runTime * config.staminaDrain);
      // Latch until sprint is released: no empty-stamina stutter.
      if (this.stamina <= 1e-9) {
        this.stamina = 0;
        this.exhausted = true;
      }
    }
    const walkTime = dt - runTime;
    this.stamina = Math.min(config.maxStamina, this.stamina + walkTime * config.regenWalk);
    const distance = runTime * config.speedRun + walkTime * config.speedWalk;
    this.x += dx * distance;
    this.y += dy * distance;
    this.state = runTime > 0 && walkTime < 1e-10 ? 'running' : 'walking';
    return distance;
  }
}
