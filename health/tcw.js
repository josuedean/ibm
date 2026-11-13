import { CONFIG } from './config.js';

export class TCW {
  constructor() { this.reset(); }
  get speed() { return CONFIG.walker.speed; }

  reset() {
    this.x = CONFIG.walker.x;
    this.y = CONFIG.walker.y;
    this.radius = CONFIG.walker.radius;
  }

  update(playerX, playerY, dt) {
    const dx = playerX - this.x, dy = playerY - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) {
      const travel = Math.min(distance, this.speed * dt);
      this.x += dx / distance * travel;
      this.y += dy / distance * travel;
    }
    return Math.hypot(playerX - this.x, playerY - this.y);
  }
}
