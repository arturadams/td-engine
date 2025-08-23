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
