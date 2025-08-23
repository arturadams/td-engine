// packages/core/spatial.js
// Simple spatial grid for efficient creep queries shared between systems.

const CELL = 40; // size of each grid cell in pixels

// Rebuild the grid for all alive creeps. Call once per tick after movement.
export function rebuildCreepGrid(state) {
    state.creepCellSize = CELL;
    let grid = state.creepGrid;
    if (!grid) {
        grid = state.creepGrid = new Map();
    }
    const pool = state.creepCellPool || (state.creepCellPool = []);
    for (const cell of grid.values()) {
        cell.length = 0;
        pool.push(cell);
    }
    grid.clear();
    for (const c of state.creeps) {
        if (!c.alive) continue;
        const gx = Math.floor(c.x / CELL);
        const gy = Math.floor(c.y / CELL);
        const key = gx + ',' + gy;
        let cell = grid.get(key);
        if (!cell) {
            cell = pool.pop() || [];
            grid.set(key, cell);
        }
        cell.push(c);
    }
}

// Return all creeps within radius r of point (x, y) using the grid.
export function queryCreeps(state, x, y, r) {
    const grid = state.creepGrid;
    const cellSize = state.creepCellSize || CELL;
    if (!grid) return state.creeps;
    const minGx = Math.floor((x - r) / cellSize);
    const maxGx = Math.floor((x + r) / cellSize);
    const minGy = Math.floor((y - r) / cellSize);
    const maxGy = Math.floor((y + r) / cellSize);
    const result = [];
    for (let gx = minGx; gx <= maxGx; gx++) {
        for (let gy = minGy; gy <= maxGy; gy++) {
            const cell = grid.get(gx + ',' + gy);
            if (cell) result.push(...cell);
        }
    }
    return result;
}

