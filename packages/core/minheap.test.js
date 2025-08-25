import { describe, it, expect } from 'vitest';
import { MinHeap } from './minheap.js';

describe('MinHeap', () => {
  it('orders numbers in ascending order', () => {
    const heap = new MinHeap();
    const values = [5, 3, 8, 1];
    values.forEach(v => heap.push(v));
    const result = values.map(() => heap.pop());
    expect(result).toEqual([1, 3, 5, 8]);
  });

  it('supports custom compare functions', () => {
    const heap = new MinHeap((a, b) => a.priority - b.priority);
    const items = [
      { priority: 5 },
      { priority: 1 },
      { priority: 3 },
    ];
    items.forEach(item => heap.push(item));
    const result = items.map(() => heap.pop().priority);
    expect(result).toEqual([1, 3, 5]);
  });

  it('returns undefined when popping from an empty heap', () => {
    const heap = new MinHeap();
    expect(heap.pop()).toBeUndefined();
    heap.push(42);
    expect(heap.pop()).toBe(42);
    expect(heap.pop()).toBeUndefined();
  });
});
