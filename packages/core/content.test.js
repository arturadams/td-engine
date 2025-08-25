import { describe, it, expect } from 'vitest';
import { UPG_COST, COST, BLUEPRINT, ELEMENTS, ResistProfiles } from './content.js';

describe('content', () => {
  it('defines cost and blueprint for each element', () => {
    for (const { key, type } of ELEMENTS) {
      expect(COST[key]).toBeTypeOf('number');
      const bp = BLUEPRINT[key];
      expect(bp).toBeTruthy();
      expect(bp.type).toBe(type);
    }
  });

  it('basic vs elemental upgrade costs scale differently', () => {
    const lvl = 2;
    const basicCost = UPG_COST(lvl, 'ARCHER');
    const elemCost = UPG_COST(lvl, 'FIRE');
    expect(basicCost).toBe(40 + lvl * 30);
    expect(elemCost).toBe(80 + lvl * 60);
    expect(basicCost).toBeLessThan(elemCost);
  });

  it('falls back to legacy upgrade formula when elt omitted', () => {
    expect(UPG_COST(3)).toBe(80 + 3 * 45);
  });

  it('legacy CANNON behaves like SIEGE', () => {
    expect(COST.CANNON).toBe(COST.SIEGE);
    expect(UPG_COST(1, 'CANNON')).toBe(UPG_COST(1, 'SIEGE'));
    expect(BLUEPRINT.CANNON).toEqual(BLUEPRINT.SIEGE);
  });

  it('ELEMENTS list contains unique canonical keys', () => {
    const keys = ELEMENTS.map(e => e.key);
    expect(keys).toContain('ARCHER');
    expect(keys).toContain('SIEGE');
    expect(keys).not.toContain('CANNON');
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('defines a sprite path for each element', () => {
    for (const { key, sprite } of ELEMENTS) {
      expect(typeof sprite).toBe('string');
      expect(sprite.startsWith('towers/')).toBe(true);
      expect(sprite.endsWith('.svg')).toBe(true);
    }
  });

  it('defines a sprite path for each creep profile', () => {
    const types = ['Grunt', 'Runner', 'Tank', 'Shield', 'Boss'];
    for (const type of types) {
      const sprite = ResistProfiles[type].sprite;
      expect(sprite.startsWith('creeps/')).toBe(true);
      expect(sprite.endsWith('.svg')).toBe(true);
    }
  });
});
