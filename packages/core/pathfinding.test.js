import assert from 'node:assert';
import { astar } from './pathfinding.js';

function runTest(cols, rows) {
    const isBlocked = () => false;
    const path = astar({ x: 0, y: 0 }, { x: cols - 1, y: rows - 1 }, isBlocked, cols, rows);
    assert.ok(path, 'path should exist');
    const expectedLength = cols + rows - 1;
    assert.strictEqual(path.length, expectedLength);
}

function runObstacleTest() {
    const blocked = new Set(['1,1']);
    const isBlocked = (x, y) => blocked.has(`${x},${y}`);
    const path = astar({ x: 0, y: 0 }, { x: 2, y: 2 }, isBlocked, 3, 3);
    assert.ok(path, 'path should exist around obstacle');
    assert.ok(!path.some(p => p.x === 1 && p.y === 1));
    assert.strictEqual(path.length, 5);
}

runTest(5, 5);
runTest(20, 20);
runTest(50, 50);
runObstacleTest();

console.log('pathfinding tests passed');
