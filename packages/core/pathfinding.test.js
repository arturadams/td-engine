import { describe, it, expect } from 'vitest';
import { astar, buildFlowField } from './pathfinding.js';

describe('pathfinding', () => {
  function runTest(cols, rows) {
    const isBlocked = () => false;
    const path = astar({ x: 0, y: 0 }, { x: cols - 1, y: rows - 1 }, isBlocked, cols, rows);
    expect(path).toBeTruthy();
    const expectedLength = cols + rows - 1;
    expect(path.length).toBe(expectedLength);
  }

  function runObstacleTest() {
    const blocked = new Set(['1,1']);
    const isBlocked = (x, y) => blocked.has(`${x},${y}`);
    const path = astar({ x: 0, y: 0 }, { x: 2, y: 2 }, isBlocked, 3, 3);
    expect(path).toBeTruthy();
    expect(path.some(p => p.x === 1 && p.y === 1)).toBe(false);
    expect(path.length).toBe(5);
  }

  it('finds path on various grid sizes', () => {
    runTest(5, 5);
    runTest(20, 20);
    runTest(50, 50);
  });

  it('navigates around obstacles', () => {
    runObstacleTest();
  });

  it('builds a flow field that points toward the goal', () => {
    const blocked = new Set(['1,1']);
    const isBlocked = (x, y) => blocked.has(`${x},${y}`);
    const { dist, flow } = buildFlowField({ x: 2, y: 2 }, isBlocked, 3, 3);
    expect(dist[0][0]).toBe(4);
    expect(flow[0][0]?.next).toEqual({ x: 1, y: 0 });
    expect(flow[2][1]?.next).toEqual({ x: 2, y: 2 });
  });
});
