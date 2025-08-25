import { describe, it, expect } from 'vitest';
import { makeRng } from './rng.js';

describe('rng', () => {
  it('produces deterministic sequences for same seed', () => {
    const a = makeRng(123);
    const b = makeRng(123);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
});
