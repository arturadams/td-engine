// packages/core/creeps.js
// Use map.start/end and map.size for pathing

import { cellCenterForMap } from './map.js';
import { astar } from './pathfinding.js';
import { tickStatusesAndCombos } from './combat.js';
import { getDeathFx } from './deaths/index.js';

export function recomputePathingForAll(state, isBlocked) {
  const { start, end, size } = state.map;
  const p = astar(start, end, isBlocked, size.cols, size.rows);
  state.path = p ? p.map(n => cellCenterForMap(state.map, n.x, n.y)) : [];
  for (const c of state.creeps) {
    const startCell = toCell(state, c.x, c.y);
    const blocker = (gx, gy) => (gx === startCell.gx && gy === startCell.gy) ? false : isBlocked(gx, gy);
    const npcPath = astar({ x: startCell.gx, y: startCell.gy }, end, blocker, size.cols, size.rows);
    if (npcPath) { c.path = npcPath.map(n => cellCenterForMap(state.map, n.x, n.y)); c.seg = 0; c.t = 0; }
  }
}

export function advanceCreep(state, c, onLeak) {
  if (!c.alive) return;

  tickStatusesAndCombos(c, state.dt);

  if (c.status.stun && c.status.stun > 0) { c.status.stun -= state.dt; return; }

  let slowMul = 1; if (c.status.CHILL) slowMul = 1 - c.status.CHILL.slow;

  const speed = c.speed * slowMul;
  let A = c.path[c.seg], B = c.path[c.seg + 1];
  if (!B) { c.alive = false; state.lives--; onLeak(); return; }

  if (c._seg !== c.seg) {
    const vx = B.x - A.x, vy = B.y - A.y;
    const d = Math.sqrt(vx * vx + vy * vy);
    c._dirx = vx / d; c._diry = vy / d; c._len = d; c._seg = c.seg;
  }
  c.x += c._dirx * speed * state.dt; c.y += c._diry * speed * state.dt; c.t += speed * state.dt;
  if (c.t >= c._len) { c.seg++; c.t = 0; c.x = c.path[c.seg].x; c.y = c.path[c.seg].y; c._seg = c.seg - 1; }
}

export function cullDead(state, { onKill }) {
  for (let i = state.creeps.length - 1; i >= 0; i--) {
    const c = state.creeps[i];
    if (!c.alive || c.hp <= 0) {
      if (c.hp <= 0) {
        state.gold += c.gold;
        state.score += 3;
        getDeathFx(c.type).die(state, c);
        onKill?.(c);
      }
      state.creeps.splice(i, 1);
    }
  }
}

// helpers
function toCell(state, x, y) {
  const { cols, rows } = state.map.size;
  const TILE = 32;
  const gx = Math.max(0, Math.min(cols - 1, Math.floor(x / TILE)));
  const gy = Math.max(0, Math.min(rows - 1, Math.floor(y / TILE)));
  return { gx, gy };
}
