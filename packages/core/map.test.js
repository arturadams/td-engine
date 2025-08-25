import { describe, it, expect } from 'vitest';
import { validateMap, makeBuildableChecker, createDefaultMap } from './map.js';

describe('map utilities', () => {
  it('validates default map', () => {
    const map = createDefaultMap();
    expect(validateMap(map)).toBe(true);
  });

  it('detects buildable cells', () => {
    const map = createDefaultMap();
    const canBuild = makeBuildableChecker(map);
    expect(canBuild(1, 1)).toBe(true);
    expect(canBuild(map.start.x, map.start.y)).toBe(false);
  });
});
