// packages/core/pathfinding.js
// Accept map size so A* works on any grid dimension.

export function astar(start, end, isBlocked, cols, rows) {
    const key = (x, y) => `${x},${y}`;
    const inBounds = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;

    // Min-heap for the open list, tracking nodes by coordinate key.
    const open = [];
    const nodeMap = new Map();
    const best = new Map(); best.set(key(start.x, start.y), 0);
    const H = (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    function swap(i, j) {
        const t = open[i];
        open[i] = open[j];
        open[j] = t;
        open[i].idx = i;
        open[j].idx = j;
    }
    function bubbleUp(i) {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (open[p].f <= open[i].f) break;
            swap(i, p);
            i = p;
        }
    }
    function bubbleDown(i) {
        const n = open.length;
        while (true) {
            let l = i * 2 + 1, r = l + 1, m = i;
            if (l < n && open[l].f < open[m].f) m = l;
            if (r < n && open[r].f < open[m].f) m = r;
            if (m === i) break;
            swap(i, m);
            i = m;
        }
    }
    function push(node) {
        node.idx = open.length;
        open.push(node);
        nodeMap.set(key(node.x, node.y), node);
        bubbleUp(node.idx);
    }
    function popMin() {
        if (!open.length) return null;
        const min = open[0];
        const last = open.pop();
        if (open.length) {
            open[0] = last;
            last.idx = 0;
            bubbleDown(0);
        }
        nodeMap.delete(key(min.x, min.y));
        return min;
    }
    function decreaseKey(node, newG, from) {
        node.g = newG;
        node.f = newG + node.h;
        node.from = from;
        bubbleUp(node.idx);
    }

    push({ x: start.x, y: start.y, g: 0, h: H(start.x, start.y), f: 0, from: null });

    while (open.length) {
        const cur = popMin();
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
                if (nodeMap.has(k)) {
                    decreaseKey(nodeMap.get(k), g, cur);
                } else {
                    const h = H(nx, ny);
                    push({ x: nx, y: ny, g, h, f: g + h, from: cur });
                }
            }
        }
    }
    return null;
}
