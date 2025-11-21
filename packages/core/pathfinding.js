// packages/core/pathfinding.js
// Accept map size so A* works on any grid dimension.

import { MinHeap } from './minheap.js';

export function astar(start, end, isBlocked, cols, rows) {
    const key = (x, y) => `${x},${y}`;
    const inBounds = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;

    const open = new MinHeap((a, b) => a.f - b.f);
    open.push({ x: start.x, y: start.y, g: 0, h: 0, f: 0, from: null });
    const best = new Map(); best.set(key(start.x, start.y), 0);
    const H = (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (open.size()) {
        const cur = open.pop();
        if (cur.x === end.x && cur.y === end.y) {
            const path = []; let n = cur; while (n) { path.push({ x: n.x, y: n.y }); n = n.from; }
            path.reverse(); return path;
        }
        for (const [dx, dy] of dirs) {
            const nx = cur.x + dx, ny = cur.y + dy;
            if (!inBounds(nx, ny) || isBlocked(nx, ny)) continue;
            const g = cur.g + 1; const k = key(nx, ny);
            if (!best.has(k) || g < best.get(k)) {
                best.set(k, g);
                const h = H(nx, ny); const f = g + h;
                open.push({ x: nx, y: ny, g, h, f, from: cur });
            }
        }
    }
    return null;
}

export function buildDistanceGrid(end, isBlocked, cols, rows) {
    const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
    const q = [{ x: end.x, y: end.y }];
    let head = 0;
    dist[end.y][end.x] = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < q.length) {
        const cur = q[head++];
        const d = dist[cur.y][cur.x] + 1;
        for (const [dx, dy] of dirs) {
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

export function reconstructPath(start, dist, prev, size) {
    const { cols, rows } = size;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
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

export function buildFlowField(end, isBlocked, cols, rows) {
    const { dist, prev } = buildDistanceGrid(end, isBlocked, cols, rows);
    const flow = Array.from({ length: rows }, () => Array(cols).fill(null));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const d = dist[y][x];
            if (!isFinite(d)) continue;
            if (d === 0) { flow[y][x] = { dx: 0, dy: 0, next: null }; continue; }
            let best = null; let bestD = d;
            for (const [dx, dy] of dirs) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                const nd = dist[ny][nx];
                if (nd < bestD) { bestD = nd; best = { nx, ny }; }
            }
            if (best) {
                const vx = best.nx - x; const vy = best.ny - y;
                const len = Math.hypot(vx, vy) || 1;
                flow[y][x] = { dx: vx / len, dy: vy / len, next: { x: best.nx, y: best.ny } };
            }
        }
    }

    return { dist, prev, flow };
}
