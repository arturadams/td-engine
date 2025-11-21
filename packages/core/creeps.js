// packages/core/creeps.js
// Use map.start/end and map.size for pathing

import { cellCenterForMap } from './map.js';
import { tickStatusesAndCombos } from './combat.js';
import { getDeathFx } from './deaths/index.js';
import { arcHeight, clamp01 } from './arc.js';
import { TILE } from './content.js';
import { buildFlowField, reconstructPath, astar, buildDistanceGrid } from './pathfinding.js';

export function recomputePathingForAll(state, isBlocked, opts = {}) {
  const { start, end, size } = state.map;
  const { useFlowField = true, useAstar = !useFlowField } = opts;

  const distData = useFlowField ? buildFlowField(end, isBlocked, size.cols, size.rows) : buildDistanceGrid(end, isBlocked, size.cols, size.rows);
  const { dist, prev } = distData;
  const flow = useFlowField ? distData.flow : null;

  const astarPathCells = useAstar ? astar(start, end, isBlocked, size.cols, size.rows) : null;
  const mainPathCells = astarPathCells || reconstructPath(start, dist, prev, size);
  const newPath = mainPathCells ? mainPathCells.map(n => cellCenterForMap(state.map, n.x, n.y)) : [];

  state.pathGrid = { dist, prev, flow, mode: useFlowField ? 'flow' : 'astar' };
  state.pathMode = state.pathGrid.mode;

  const oldPath = state.path || [];
  const same =
    oldPath.length === newPath.length &&
    oldPath.every((p, i) => p.x === newPath[i].x && p.y === newPath[i].y);

  if (!same) {
    state.path = newPath;
  }

  for (const c of state.creeps) {
    const startCell = toCell(state, c.x, c.y);
    const npcCells = useAstar
      ? astar({ x: startCell.gx, y: startCell.gy }, end, isBlocked, size.cols, size.rows)
      : reconstructPath({ x: startCell.gx, y: startCell.gy }, dist, prev, size);
    if (npcCells) {
      const path = npcCells.map(n => cellCenterForMap(state.map, n.x, n.y));
      path[0] = { x: c.x, y: c.y };
      c.path = path;
    }
    c.seg = 0; c.t = 0; c._seg = -1; c._flowTarget = null;
  }
}

export function advanceCreep(state, c, onLeak) {
  if (!c.alive) return;

  tickStatusesAndCombos(c, state.dt);

  if (c.status.stun && c.status.stun > 0) { c.status.stun -= state.dt; return; }

  let slowMul = 1; if (c.status.CHILL) slowMul = 1 - c.status.CHILL.slow;

  const speed = c.speed * slowMul;
  const usedFlow = state.pathMode === 'flow' && state.pathGrid?.flow;
  if (usedFlow) {
    moveUsingFlowField(state, c, onLeak, speed);
  } else {
    moveAlongPath(state, c, onLeak, speed);
  }

  updateCreepArc(state, c);
}

function moveUsingFlowField(state, c, onLeak, speed) {
  const flowGrid = state.pathGrid?.flow;
  if (!flowGrid) { moveAlongPath(state, c, onLeak, speed); return; }

  const { gx, gy } = toCell(state, c.x, c.y);
  if (gx === state.map.end.x && gy === state.map.end.y) { c.alive = false; onLeak(); return; }

  const dir = flowGrid[gy]?.[gx];
  if (!dir || !dir.next) { moveAlongPath(state, c, onLeak, speed); return; }
  const target = cellCenterForMap(state.map, dir.next.x, dir.next.y);

  if (!c._flowTarget || c._flowTarget.x !== dir.next.x || c._flowTarget.y !== dir.next.y) {
    const vx = target.x - c.x, vy = target.y - c.y;
    const d = Math.hypot(vx, vy) || 1;
    c._dirx = vx / d; c._diry = vy / d; c._len = d; c._seg = c.seg; c._flowTarget = dir.next;
  }

  c.x += c._dirx * speed * state.dt; c.y += c._diry * speed * state.dt; c.t += speed * state.dt;
  if (c.t >= c._len) {
    c.seg++; c.t = 0; c.x = target.x; c.y = target.y; c._flowTarget = null; c._seg = c.seg - 1;
    if (dir.next.x === state.map.end.x && dir.next.y === state.map.end.y) { c.alive = false; onLeak(); }
  }
}

function moveAlongPath(state, c, onLeak, speed) {
  const path = c.path || [];
  let A = path[c.seg], B = path[c.seg + 1];
  if (!A || !B) { c.alive = false; onLeak(); return; }

  if (c._seg !== c.seg) {
    const vx = B.x - A.x, vy = B.y - A.y;
    const d = Math.sqrt(vx * vx + vy * vy) || 1;
    c._dirx = vx / d; c._diry = vy / d; c._len = d; c._seg = c.seg;
  }
  c.x += c._dirx * speed * state.dt; c.y += c._diry * speed * state.dt; c.t += speed * state.dt;
  if (c.t >= c._len) {
    c.seg++; c.t = 0; c.x = path[c.seg].x; c.y = path[c.seg].y; c._seg = c.seg - 1;
    if (c.seg >= path.length - 1) { c.alive = false; onLeak(); }
  }
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
