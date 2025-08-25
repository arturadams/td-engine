import { describe, it, expect } from 'vitest';
import { elements } from './elements.js';
import { Status } from './content.js';

describe('elements', () => {
  it('maps element keys to color and status', () => {
    expect(elements.FIRE).toEqual({ color: '#ef4444', status: Status.BURN });
    expect(elements.WIND).toEqual({ color: '#60a5fa', status: Status.EXPOSED });
  });

  it('omits status for basic towers', () => {
    expect(elements.ARCHER).toEqual({ color: '#9ca3af', status: undefined });
  });
});
