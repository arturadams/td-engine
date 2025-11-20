// packages/core/arc.js

export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function arcHeight(apex, progress) {
  const p = clamp01(progress ?? 0);
  return 4 * (apex ?? 0) * p * (1 - p);
}

