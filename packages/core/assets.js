// packages/core/assets.js
// Basic image loader with caching and placeholder fallback

const cache = new Map();

// 1x1 transparent PNG
const PLACEHOLDER_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
const placeholder = new Image();
placeholder.src = PLACEHOLDER_SRC;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load ' + src));
    img.src = src;
  });
}

export async function loadImages(record) {
  const entries = Object.entries(record);
  const tasks = entries.map(async ([key, src]) => {
    if (cache.has(key)) return cache.get(key);
    try {
      const img = await loadImage(src);
      cache.set(key, img);
    } catch {
      cache.set(key, placeholder);
    }
    return cache.get(key);
  });
  await Promise.all(tasks);
  const result = {};
  for (const [key] of entries) {
    result[key] = cache.get(key);
  }
  return result;
}

export function getImage(key) {
  return cache.get(key) || placeholder;
}
