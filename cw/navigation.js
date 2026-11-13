import { CONFIG, tileKey } from './config.js';
class PathHeap {
  constructor() { this.nodes = []; }
  push(node) {
    const a = this.nodes; a.push(node); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= node.f) break; a[i] = a[p]; i = p; }
    a[i] = node;
  }
  pop() {
    const a = this.nodes, root = a[0], end = a.pop();
    if (a.length) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let c = i * 2 + 1;
        if (c + 1 < a.length && a[c + 1].f < a[c].f) c++;
        if (a[c].f >= end.f) break;
        a[i] = a[c]; i = c;
      }
      a[i] = end;
    }
    return root;
  }
}
const estimatePath = (a, b) => {
  const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
};
export function findPath(world, from, to, budget = CONFIG.navBudget) {
  const start = { x: Math.floor(from.x), y: Math.floor(from.y) };
  const goal = { x: Math.floor(to.x), y: Math.floor(to.y) };
  if (!world.walkerTile(start.x, start.y) || !world.walkerTile(goal.x, goal.y))
    return { path: [], found: false, exhausted: true, visited: 0 };
  const heap = new PathHeap(), costs = new Map(), closed = new Set();
  const first = { ...start, g: 0, f: estimatePath(start, goal), parent: null };
  heap.push(first); costs.set(tileKey(start.x, start.y), 0);
  let best = first, found = false, count = 0;
  while (heap.nodes.length && count < budget) {
    const node = heap.pop(), key = tileKey(node.x, node.y);
    if (closed.has(key)) continue;
    closed.add(key); count++;
    if (estimatePath(node, goal) < estimatePath(best, goal)) best = node;
    if (node.x === goal.x && node.y === goal.y) { best = node; found = true; break; }
    for (const n of world.neighbors(node.x, node.y)) {
      const nk = tileKey(n.x, n.y), g = node.g + Math.hypot(n.x - node.x, n.y - node.y);
      if (closed.has(nk) || (costs.has(nk) && costs.get(nk) <= g)) continue;
      costs.set(nk, g);
      heap.push({ ...n, g, f: g + estimatePath(n, goal), parent: node });
    }
  }
  // A capped search follows a legal frontier, even when the detour initially
  // goes away from the target. Budget exhaustion never means "unreachable".
  if (!found && count >= budget) {
    const frontier = heap.nodes.filter(n => !closed.has(tileKey(n.x, n.y)))
      .reduce((best, n) => !best || n.f < best.f ? n : best, null);
    if (frontier) best = frontier;
  }
  const path = [];
  for (let n = best; n && n.parent; n = n.parent) path.push({ x: n.x + 0.5, y: n.y + 0.5 });
  path.reverse();
  return { path, found, exhausted: !found && heap.nodes.length === 0, visited: count };
}
