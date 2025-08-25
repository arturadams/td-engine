import { describe, it, expect } from 'vitest';
import { applyStatus } from './combat.js';
import { Status } from './content.js';

describe('combos', () => {
  it('triggers acid burn combo from burn and poison', () => {
    const creep = { hp: 100, status: {}, resist: {} };
    applyStatus(creep, Status.BURN);
    const result = applyStatus(creep, Status.POISON);
    expect(result).toBe('combo.acid');
  });
});
