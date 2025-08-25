import { describe, it, expect, beforeEach, vi } from 'vitest';

function setupMockImage() {
  const instances = [];
  globalThis.Image = class {
    constructor() {
      instances.push(this);
    }
    set src(value) {
      this._src = value;
      setTimeout(() => {
        if (value.includes('fail')) this.onerror?.(new Error('fail'));
        else this.onload?.();
      }, 0);
    }
    get src() { return this._src; }
  };
  return instances;
}

describe('assets loader', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads images and caches them', async () => {
    setupMockImage();
    const { loadImages, getImage } = await import('./assets.js');
    const result = await loadImages({ hero: 'hero.png' });
    const img = result.hero;
    expect(img).toBeInstanceOf(Image);
    expect(getImage('hero')).toBe(img);
  });

  it('falls back to placeholder on failure and missing keys', async () => {
    setupMockImage();
    const { loadImages, getImage } = await import('./assets.js');
    const result = await loadImages({ bad: 'fail.png' });
    const placeholder = getImage('missing');
    expect(result.bad).toBe(placeholder);
    expect(placeholder.src.startsWith('data:image/png;base64,')).toBe(true);
  });
});
