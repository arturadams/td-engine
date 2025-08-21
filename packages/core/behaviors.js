// packages/core/behaviors.js
// Pluggable creep behaviors. Stateless entry points that mutate c.beh (per-creep state).

// Helper to ensure a per-creep behavior state bag exists
function ensureBeh(c) { return (c.beh ??= {}); }

// Behavior API:
//   fn(c, dt, ctx) -> { speedMul?: number, lateral?: {x:number, y:number} }
// ctx = { dirx, diry, segLen, rng }

export const mobBehaviors = {
  // Default: straight along the path
  linear(c, dt, ctx) {
    return { speedMul: 1 };
  },

  // Zigzag: lateral sine wave perpendicular to segment direction
  // Params (per-creep, with defaults):
  //   beh.amp: pixels amplitude (default 8)
  //   beh.freq: oscillations per second (default 3)
  zigzag(c, dt, ctx) {
    const beh = ensureBeh(c);
    const amp = beh.amp ??= 8;
    const freq = beh.freq ??= 3;
    beh.phase = (beh.phase ?? 0) + dt * freq * Math.PI * 2;

    // perpendicular to direction
    const px = -ctx.diry, py = ctx.dirx;
    const s = Math.sin(beh.phase) * amp;
    return { speedMul: 1, lateral: { x: px * s, y: py * s } };
  },

  // Dash: bursts of speed with cooldown
  // Params:
  //   beh.dashSpeed: multiplier (default 2.2)
  //   beh.dashDur: seconds (default 0.4)
  //   beh.cooldown: seconds (default 4)
  dash(c, dt, ctx) {
    const beh = ensureBeh(c);
    const dashSpeed = beh.dashSpeed ??= 2.2;
    const dashDur = beh.dashDur ??= 0.4;
    const cooldown = beh.cooldown ??= 4;

    beh.cd = Math.max(0, (beh.cd ?? 0) - dt);
    beh.remaining = Math.max(0, (beh.remaining ?? 0) - dt);

    if (beh.remaining <= 0 && beh.cd <= 0) {
      // kick off a new dash
      beh.remaining = dashDur;
      beh.cd = cooldown;
    }
    const mul = beh.remaining > 0 ? dashSpeed : 1;
    return { speedMul: mul };
  },

  // Split: linear movement, but on death spawn children (handled by engine via c.beh.split)
  // Params:
  //   beh.split: { childType, count, hpScale }
  split(c, dt, ctx) {
    const beh = ensureBeh(c);
    // Defaults if not set by archetype
    beh.split ??= { childType: c.type, count: 2, hpScale: 0.45 };
    return { speedMul: 1 };
  },
};
