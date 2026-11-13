export function worldToScreen(x, y, cameraX, cameraY, width, height, tileSize) {
  return { x: (x - cameraX) * tileSize + width / 2,
    y: (y - cameraY) * tileSize + height / 2 };
}

export function screenToWorld(x, y, cameraX, cameraY, width, height, tileSize) {
  return { x: (x - width / 2) / tileSize + cameraX,
    y: (y - height / 2) / tileSize + cameraY };
}

export function gapBetween(player, walker) {
  return Math.max(0, Math.hypot(player.x - walker.x, player.y - walker.y)
    - player.radius - walker.radius);
}

// Exact only for a stationary player in the current unobstructed world.
export function stationaryCatchTime(player, walker) {
  return gapBetween(player, walker) / walker.speed;
}

// Earliest circle contact along two movement segments, including tangency.
export function sweptContact(p0, p1, w0, w1, combinedRadius) {
  const x = p0.x - w0.x, y = p0.y - w0.y;
  const dx = (p1.x - p0.x) - (w1.x - w0.x);
  const dy = (p1.y - p0.y) - (w1.y - w0.y);
  const c = x * x + y * y - combinedRadius * combinedRadius;
  if (c <= 1e-12) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (x * dx + y * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < -1e-12) return null;
  const t = (-b - Math.sqrt(Math.max(0, discriminant))) / (2 * a);
  return t >= -1e-12 && t <= 1 + 1e-12 ? Math.max(0, Math.min(1, t)) : null;
}

// Intersect a center-to-target ray with an inset rectangle. No slope division.
export function edgeIndicator(dx, dy, width, height, padding = 30) {
  if (dx === 0 && dy === 0) return null;
  const insetX = typeof padding === 'number' ? padding : dx < 0 ? padding.left : padding.right;
  const insetY = typeof padding === 'number' ? padding : dy < 0 ? padding.top : padding.bottom;
  const halfX = Math.max(0, width / 2 - insetX);
  const halfY = Math.max(0, height / 2 - insetY);
  const t = Math.min(dx === 0 ? Infinity : halfX / Math.abs(dx),
    dy === 0 ? Infinity : halfY / Math.abs(dy));
  return { x: width / 2 + dx * t, y: height / 2 + dy * t,
    angle: Math.atan2(dy, dx) };
}
