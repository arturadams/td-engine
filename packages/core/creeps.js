// packages/core/creeps.js
// Use map.start/end and map.size for pathing

import { cellCenterForMap } from './map.js';
import { tickStatusesAndCombos } from './combat.js';
import { getDeathFx } from './deaths/index.js';
import { arcHeight, clamp01 } from './arc.js';

export function recomputePathingForAll(state, isBlocked) {
  const { start, end, size } = state.map;
  const { dist, prev } = buildPredecessorGrid(end, isBlocked, size.cols, size.rows);
  const mainPathCells = reconstructPath(start, dist, prev, size);
  const newPath = mainPathCells ? mainPathCells.map(n => cellCenterForMap(state.map, n.x, n.y)) : [];

  // always update pathGrid
  state.pathGrid = { dist, prev };

  const oldPath = state.path || [];
  const same =
    oldPath.length === newPath.length &&
    oldPath.every((p, i) => p.x === newPath[i].x && p.y === newPath[i].y);

  if (same) return;

  state.path = newPath;

  for (const c of state.creeps) {
    const startCell = toCell(state, c.x, c.y);
    const npcCells = reconstructPath({ x: startCell.gx, y: startCell.gy }, dist, prev, size);
    if (npcCells) {
      const path = npcCells.map(n => cellCenterForMap(state.map, n.x, n.y));
      path[0] = { x: c.x, y: c.y };
      c.path = path;
      c.seg = 0; c.t = 0;
      c._seg = -1;
    }
  }
}

function buildPredecessorGrid(end, isBlocked, cols, rows) {
  const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
  const q = [{ x: end.x, y: end.y }];
  let head = 0;
  dist[end.y][end.x] = 0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while (head < q.length) {
    const cur = q[head++];
    const d = dist[cur.y][cur.x] + 1;
    for (const [dx,dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (isBlocked(nx, ny)) continue;
      if (dist[ny][nx] !== Infinity) continue;
      dist[ny][nx] = d;
      prev[ny][nx] = cur;
      q.push({ x: nx, y: ny });
    }
  }
  return { dist, prev };
}

function reconstructPath(start, dist, prev, size) {
  const { cols, rows } = size;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  let x = start.x, y = start.y;
  const path = [{ x, y }];

  if (x < 0 || y < 0 || x >= cols || y >= rows) return null;

  if (dist[y][x] === Infinity) {
    let best = null, bestD = Infinity;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (dist[ny][nx] < bestD) { bestD = dist[ny][nx]; best = { x: nx, y: ny }; }
    }
    if (!best || bestD === Infinity) return null;
    x = best.x; y = best.y;
    path.push({ x, y });
  }

  while (prev[y][x]) {
    const p = prev[y][x];
    x = p.x; y = p.y;
    path.push({ x, y });
  }

  return path;
}

export function advanceCreep(state, c, onLeak) {
  if (!c.alive) return;

  tickStatusesAndCombos(c, state.dt);

  if (c.status.stun && c.status.stun > 0) { c.status.stun -= state.dt; return; }

  let slowMul = 1; if (c.status.CHILL) slowMul = 1 - c.status.CHILL.slow;

  const speed = c.speed * slowMul;
  let A = c.path[c.seg], B = c.path[c.seg + 1];
  if (!B) { c.alive = false; onLeak(); return; }

  if (c._seg !== c.seg) {
    const vx = B.x - A.x, vy = B.y - A.y;
    const d = Math.sqrt(vx * vx + vy * vy);
    c._dirx = vx / d; c._diry = vy / d; c._len = d; c._seg = c.seg;
  }
  c.x += c._dirx * speed * state.dt; c.y += c._diry * speed * state.dt; c.t += speed * state.dt;
  if (c.t >= c._len) { c.seg++; c.t = 0; c.x = c.path[c.seg].x; c.y = c.path[c.seg].y; c._seg = c.seg - 1; }

  updateCreepArc(state, c);
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

function updateCreepArc(state, c) {
  const baseZ = c.baseZ ?? c.z ?? 0;
  if (c.baseZ == null) c.baseZ = baseZ;
  if (!c.arc) { if (c.z == null) c.z = baseZ; return; }

  const flight = c.arc.flightTime || 0;
  c.arcTimer = (c.arcTimer ?? 0) + state.dt;
  const progress = flight > 0 ? clamp01(c.arcTimer / flight) : 1;
  c.arcProgress = progress;
  c.z = baseZ + arcHeight(c.arc.apex ?? 0, progress);
}
