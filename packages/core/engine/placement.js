// packages/core/engine/placement.js

import { Elt, BLUEPRINT, COST, TILE, BASIC_TOWERS, REFUND_RATE } from '../content.js';
import { uuid } from '../rng.js';
import { cellCenterForMap } from '../map.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const gridKey = (gx, gy) => `${gx},${gy}`;

export function inBounds(state, gx, gy) {
    return gx >= 0 && gy >= 0 && gx < state.map.size.cols && gy < state.map.size.rows;
}

export function isBlocked(state, towerGrid, canBuildCell, gx, gy) {
    if (!inBounds(state, gx, gy)) return true;
    const { start, end } = state.map;
    if (gx === start.x && gy === start.y) return false;
    if (gx === end.x && gy === end.y) return false;
    if (!canBuildCell(gx, gy)) return true;
    return towerGrid.has(gridKey(gx, gy));
}

export function gatherNeighbors(state, towerGrid, gx, gy) {
    const range = 2;
    const out = new Set();
    for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
            if (dx === 0 && dy === 0) continue;
            const n = towerGrid.get(gridKey(gx + dx, gy + dy));
            if (n) out.add(n);
        }
    }
    return out;
}

export function neighborsSynergy(state, towerGrid, targetTowers = state.towers) {
    const r2 = (2 * TILE + 1) * (2 * TILE + 1);
    const range = 2; // in tiles
    for (const t of targetTowers) {
        if (!t) continue;
        const uniq = new Set();
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (dx === 0 && dy === 0) continue;
                const n = towerGrid.get(gridKey(t.gx + dx, t.gy + dy));
                if (!n) continue;
                const px = n.x - t.x, py = n.y - t.y;
                if (px * px + py * py <= r2) uniq.add(n.elt);
            }
        }
        t.synergy = 0.08 * uniq.size;
    }
}

export function canPlace(state, towerGrid, canBuildCell, gx, gy) {
    if (!inBounds(state, gx, gy)) return false;
    const { start, end } = state.map;
    if (gx === start.x && gy === start.y) return false;
    if (gx === end.x && gy === end.y) return false;
    if (!canBuildCell(gx, gy)) return false;
    if (towerGrid.has(gridKey(gx, gy))) return false;

    const dist = state.pathGrid?.dist;
    const px = cellCenterForMap(state.map, gx, gy);
    const onPath = state.path?.some(p => p.x === px.x && p.y === px.y);
    if (!dist || onPath) {
        const { cols, rows } = state.map.size;
        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        const q = [{ x: state.map.start.x, y: state.map.start.y }];
        let head = 0;
        visited[state.map.start.y][state.map.start.x] = true;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        while (head < q.length) {
            const cur = q[head++];
            if (cur.x === state.map.end.x && cur.y === state.map.end.y) return true;
            for (const [dx, dy] of dirs) {
                const nx = cur.x + dx, ny = cur.y + dy;
                if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                if (visited[ny][nx]) continue;
                if ((nx === gx && ny === gy) || isBlocked(state, towerGrid, canBuildCell, nx, ny)) continue;
                if (dist && dist[ny][nx] === Infinity) continue;
                visited[ny][nx] = true;
                q.push({ x: nx, y: ny });
            }
        }
        return false;
    }
    // tile not on cached path; existing path remains valid
    return true;
}

const normalizeElt = (e) => (e === 'CANNON' ? Elt.SIEGE : e);

export function placeTower(state, towerGrid, canBuildCell, gx, gy, rawElt, opts) {
    const { onGoldChange, recomputePathingForAll, gatherNeighborsFn = gatherNeighbors, neighborsSynergyFn = neighborsSynergy, onTowerPlace } = opts;
    const elt = normalizeElt(rawElt);
    if (!inBounds(state, gx, gy)) return { ok: false, reason: 'oob' };
    if (state.towers.some(t => t.gx === gx && t.gy === gy)) return { ok: false, reason: 'occupied' };
    const { start, end } = state.map;
    if (gx === start.x && gy === start.y) return { ok: false, reason: 'start' };
    if (gx === end.x && gy === end.y) return { ok: false, reason: 'end' };
    if (!canBuildCell(gx, gy)) return { ok: false, reason: 'not_buildable' };
    if (!canPlace(state, towerGrid, canBuildCell, gx, gy)) return { ok: false, reason: 'blocks_path' };

    for (const c of state.creeps) {
        if (!c.alive) continue;
        const cgx = Math.floor(c.x / TILE);
        const cgy = Math.floor(c.y / TILE);
        if (cgx === gx && cgy === gy) {
            return { ok: false, reason: 'occupied_by_creep' };
        }
    }

    const cost = COST[elt];
    const bp = BLUEPRINT[elt];
    if (cost == null || !bp) return { ok: false, reason: 'invalid_tower' };
    if (state.gold < cost) return { ok: false, reason: 'gold' };

    const t = {
        id: uuid(), gx, gy,
        x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2,
        elt, lvl: 1, xp: 0, tree: [],
        range: bp.range, firerate: bp.firerate, dmg: bp.dmg, type: bp.type, status: bp.status,
        cooldown: 0, spent: cost,
        mod: { dmg: 0, burn: 0, poison: 0, chill: 0, slowDur: 0, chainBounce: 0, chainRange: 0, stun: 0, aoe: 0, splash: 0,
            nova: false, resShred: 0, maxStacks: 1, pierce: 0 },
        synergy: 0, novaTimer: 0, kills: 0, freeTierPicks: 0,
        targeting: 'first', _cycleIndex: 0,
    };
    state.towers.push(t);
    towerGrid.set(gridKey(gx, gy), t);
    onGoldChange(-cost, 'place_tower');
    state.selectedTowerId = t.id;
    const affected = gatherNeighborsFn(state, towerGrid, gx, gy);
    affected.add(t);
    neighborsSynergyFn(state, towerGrid, affected);
    recomputePathingForAll(state, (x, y) => isBlocked(state, towerGrid, canBuildCell, x, y));
    if (onTowerPlace) onTowerPlace(t, cost);
    return { ok: true, tower: t };
}

export function sellTower(state, towerGrid, id, opts) {
    const { onGoldChange, recomputePathingForAll, gatherNeighborsFn = gatherNeighbors, neighborsSynergyFn = neighborsSynergy, onTowerSell, canBuildCell } = opts;
    const idx = state.towers.findIndex(t => t.id === id);
    if (idx < 0) return false;
    const t = state.towers[idx];
    const isBasic = BASIC_TOWERS.includes(t.elt);
    const rate = isBasic ? REFUND_RATE.basic : REFUND_RATE.elemental;
    const refund = Math.floor(t.spent * rate);
    state.towers.splice(idx, 1);
    towerGrid.delete(gridKey(t.gx, t.gy));
    if (state.selectedTowerId === id) state.selectedTowerId = null;

    const affected = gatherNeighborsFn(state, towerGrid, t.gx, t.gy);
    neighborsSynergyFn(state, towerGrid, affected);
    recomputePathingForAll(state, (x, y) => isBlocked(state, towerGrid, canBuildCell, x, y));

    onGoldChange(+refund, 'sell_tower');
    if (onTowerSell) onTowerSell(t, refund);
    return true;
}

export function setBuild(state, elt) {
    state.buildSel = normalizeElt(elt);
}

export function setHover(state, gx, gy, canPlaceFn) {
    state.hover.gx = gx; state.hover.gy = gy;
    state.hover.valid = canPlaceFn(state, gx, gy);
}

export function selectTowerAt(state, gx, gy) {
    const t = state.towers.find(tt => tt.gx === gx && tt.gy === gy);
    state.selectedTowerId = t ? t.id : null;
    return t || null;
}

