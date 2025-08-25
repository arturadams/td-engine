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

  it('triggers shatter combo from chill and shock', () => {
    const creep = { hp: 100, status: {}, resist: {} };
    applyStatus(creep, Status.CHILL);
    const result = applyStatus(creep, Status.SHOCK);
    expect(result).toBe('combo.shatter');
  });

  it('triggers neuroshock combo from poison and shock', () => {
    const creep = { hp: 100, status: {}, resist: {} };
    applyStatus(creep, Status.POISON);
    const result = applyStatus(creep, Status.SHOCK);
    expect(result).toBe('combo.neuro');
  });

  it('triggers glassfire combo from brittle and burn', () => {
    const creep = { hp: 100, status: {}, resist: {} };
    applyStatus(creep, Status.BRITTLE);
    const result = applyStatus(creep, Status.BURN);
    expect(result).toBe('combo.glassfire');
  });

  it('triggers fanned flames combo from exposed and burn', () => {
    const creep = { hp: 100, status: {}, resist: {} };
    applyStatus(creep, Status.EXPOSED);
    const result = applyStatus(creep, Status.BURN);
    expect(result).toBe('combo.fanned');
  });

  it('triggers overload combo from mana burn and shock', () => {
    const creep = { hp: 100, status: {}, resist: {} };
    applyStatus(creep, Status.MANA_BURN);
    const result = applyStatus(creep, Status.SHOCK);
    expect(result).toBe('combo.overload');
  });
});
