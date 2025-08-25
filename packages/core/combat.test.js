import { describe, it, expect, vi, afterAll } from 'vitest';
import { takeDamage, applyStatus, tickStatusesAndCombos } from './combat.js';
import { Status, Elt } from './content.js';

vi.spyOn(Math, 'random').mockReturnValue(0.5);
afterAll(() => vi.restoreAllMocks());

describe('takeDamage', () => {
  it('accounts for resist, shred, brittle and exposed', () => {
    const creep = { hp: 100, resist: { [Elt.FIRE]: 0.25 }, status: {} };
    const dmg = takeDamage(creep, 100, Elt.FIRE);
    expect(dmg).toBeCloseTo(75);
    expect(creep.hp).toBeCloseTo(25);

    const shredCreep = { hp: 100, resist: { [Elt.FIRE]: 0.25 }, status: {} };
    const shredDmg = takeDamage(shredCreep, 100, Elt.FIRE, 0.1);
    expect(shredDmg).toBeCloseTo(85);

    const exposedCreep = { hp: 100, resist: { [Elt.FIRE]: 0.25 }, status: { [Status.EXPOSED]: { shred: 0.2 } } };
    const exposedDmg = takeDamage(exposedCreep, 100, Elt.FIRE, 0.1);
    expect(exposedDmg).toBeCloseTo(105);

    const brittleCreep = { hp: 100, resist: { [Elt.FIRE]: 0.25 }, status: { [Status.BRITTLE]: { amp: 0.25 } } };
    const brittleDmg = takeDamage(brittleCreep, 100, Elt.FIRE);
    expect(brittleDmg).toBeCloseTo(93.75);
  });
});

describe('applyStatus', () => {
  it('applies modifiers and stacks', () => {
    const creep = { hp: 100, status: {}, resist: {} };
    applyStatus(creep, Status.BURN, { mod: { burn: 0.5, resShred: 0.1 } });
    expect(creep.status[Status.BURN].t).toBeCloseTo(3.3);
    expect(creep.status[Status.BURN].dot).toBeCloseTo(7.5);
    expect(creep.status.resShred).toBe(0.1);

    applyStatus(creep, Status.POISON, { mod: { poison: 0.25, maxStacks: 2 } });
    applyStatus(creep, Status.POISON, { mod: { poison: 0.25, maxStacks: 2 } });
    applyStatus(creep, Status.POISON, { mod: { poison: 0.25, maxStacks: 2 } });
    expect(creep.status[Status.POISON].stacks).toBe(3);
    expect(creep.status[Status.POISON].dot).toBeCloseTo(15);
    expect(creep.status[Status.POISON].t).toBeCloseTo(4.375);

    applyStatus(creep, Status.CHILL, { mod: { slowDur: 0.5, chill: 0.4 } });
    expect(creep.status[Status.CHILL].t).toBeCloseTo(2.7);
    expect(creep.status[Status.CHILL].slow).toBeCloseTo(0.75);
  });

  describe('combos', () => {
    it('triggers acid burn', () => {
      const c = { hp: 100, status: {}, resist: {} };
      applyStatus(c, Status.BURN);
      const res = applyStatus(c, Status.POISON, { mod: { acidAmp: 0.5 } });
      expect(res).toBe('combo.acid');
      expect(c.status.combo_acid).toBeCloseTo(2.0);
      expect(c.status.acid.dot).toBe(42);
    });

    it('triggers shatter', () => {
      const c = { hp: 100, status: {}, resist: {} };
      applyStatus(c, Status.CHILL);
      const res = applyStatus(c, Status.SHOCK);
      expect(res).toBe('combo.shatter');
      expect(c.hp).toBeCloseTo(80);
    });

    it('triggers neuro', () => {
      const c = { hp: 100, status: {}, resist: {} };
      applyStatus(c, Status.POISON);
      const res = applyStatus(c, Status.SHOCK, { mod: { stun: 0.3 } });
      expect(res).toBe('combo.neuro');
      expect(c.status.stun).toBeCloseTo(0.8);
    });

    it('triggers glassfire', () => {
      const c = { hp: 100, status: {}, resist: {} };
      applyStatus(c, Status.BRITTLE);
      const res = applyStatus(c, Status.BURN);
      expect(res).toBe('combo.glassfire');
      expect(c.hp).toBeCloseTo(85);
    });

    it('triggers fanned flames', () => {
      const c = { hp: 100, status: {}, resist: {} };
      applyStatus(c, Status.EXPOSED);
      const res = applyStatus(c, Status.BURN);
      expect(res).toBe('combo.fanned');
      expect(c.status[Status.BURN].dot).toBeCloseTo(7.5);
    });

    it('triggers overload', () => {
      const c = { hp: 100, status: {}, resist: {} };
      applyStatus(c, Status.MANA_BURN);
      const res = applyStatus(c, Status.SHOCK, { mod: { lightDot: 5 } });
      expect(res).toBe('combo.overload');
      expect(c.status.lightDot).toEqual({ dot: 25, t: 1.5 });
    });
  });
});

describe('tickStatusesAndCombos', () => {
  it('ticks burn, poison and acid combo for full duration', () => {
    const c = { hp: 100, status: {}, resist: {} };
    applyStatus(c, Status.BURN);
    applyStatus(c, Status.POISON);
    for (let i = 0; i < 50; i++) tickStatusesAndCombos(c, 0.1);
    expect(c.hp).toBeCloseTo(51, 5);
    expect(c.status[Status.BURN]).toBeUndefined();
    expect(c.status[Status.POISON]).toBeUndefined();
    expect(c.status.combo_acid).toBeUndefined();
  });

  it('ticks mana burn and overload light dot', () => {
    const c = { hp: 100, status: {}, resist: {} };
    applyStatus(c, Status.MANA_BURN);
    applyStatus(c, Status.SHOCK, { mod: { lightDot: 5 } });
    for (let i = 0; i < 20; i++) tickStatusesAndCombos(c, 0.1);
    expect(c.hp).toBeCloseTo(45, 5);
    expect(c.status[Status.MANA_BURN]).toBeUndefined();
    expect(c.status.lightDot).toBeUndefined();
  });
});

