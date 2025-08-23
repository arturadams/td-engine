export function drawAquarelleBullet(ctx, { radius = 6, color = '#3b82f6' } = {}) {
  // Simple watercolor-style circle using a radial gradient that fades to transparent.
  const r = radius;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(59,130,246,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}
