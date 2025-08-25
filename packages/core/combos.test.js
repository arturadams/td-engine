import { describe, it, expect } from 'vitest';
import { applyStatus } from './combat.js';
import { Status } from './content.js';
import { combos } from './combos.js';

describe('combos', () => {
  it('defines the expected status interactions', () => {
    expect(combos).toHaveLength(6);
    expect(combos).toContainEqual({ when: ['BURN', 'POISON'], effect: 'ACID_BURN' });
    expect(combos).toContainEqual({ when: ['CHILL', 'SHOCK'], effect: 'SHATTER' });
  });

  it('triggers acid burn combo from burn and poison', () => {
    const creep = { hp: 100, status: {}, resist: {} };
    applyStatus(creep, Status.BURN);
    const result = applyStatus(creep, Status.POISON);
    expect(result).toBe('combo.acid');
  });

  it('triggers shatter combo from chill and shock', () => {
    const creep = { hp: 200, status: {}, resist: {} };
    applyStatus(creep, Status.CHILL);
    const result = applyStatus(creep, Status.SHOCK);
    expect(result).toBe('combo.shatter');
  });
});
