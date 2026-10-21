// Paper: base colour, printed ruling, then grain and mottling in one pixel pass.

import { noiseTile, pixelHash } from './rng.js';

export function drawPaper(ctx, W, H, P, dpi, rng) {
  const mm = dpi / 25.4;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = P.base;
  ctx.fillRect(0, 0, W, H);

  if (P.fibers) {
    // kraft: short light and dark fibres
    const n = Math.round((W * H) / (mm * mm * 2.5));
    for (let i = 0; i < n; i++) {
      const x = rng() * W, y = rng() * H, len = mm * rng.range(0.4, 2.5), a = rng() * Math.PI;
      ctx.strokeStyle = rng() < 0.5 ? 'rgba(255, 240, 210, 0.22)' : 'rgba(110, 80, 40, 0.16)';
      ctx.lineWidth = mm * rng.range(0.05, 0.15);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + rng.gauss() * mm * 0.2, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
  }

  const step = (P.step || 5) * mm;
  ctx.strokeStyle = P.ink;
  ctx.fillStyle = P.ink;
  ctx.lineWidth = Math.max(1, mm * 0.12);
  if (P.rule === 'grid') {
    const ox = ((W % step) / 2) | 0, oy = ((H % step) / 2) | 0;
    ctx.beginPath();
    for (let x = ox; x <= W; x += step) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = oy; y <= H; y += step) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();
  } else if (P.rule === 'lines') {
    ctx.beginPath();
    for (let y = Math.min(16 * mm, H * 0.08); y <= H; y += step) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();
    if (P.margin) {
      ctx.strokeStyle = P.margin;
      const x = Math.min(20 * mm, W * 0.12);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.moveTo(x + mm * 0.8, 0);
      ctx.lineTo(x + mm * 0.8, H);
      ctx.stroke();
    }
  } else if (P.rule === 'dots') {
    const r = mm * 0.22, ox = (W % step) / 2, oy = (H % step) / 2;
    for (let y = oy; y <= H; y += step)
      for (let x = ox; x <= W; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
  }

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const mott = noiseTile(rng, mm * 14, 512), md = mott.data, ms = mott.size;
  const grain = P.fibers ? 14 : 9, mottle = P.fibers ? 9 : 5;
  for (let y = 0, i = 0; y < H; y++) {
    const r = (y % ms) * ms;
    let xm = 0;
    for (let x = 0; x < W; x++, i += 4) {
      const n = (pixelHash(x, y, 13) - 0.5) * grain + md[r + xm] * mottle;
      if (++xm === ms) xm = 0;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n * 1.15;
    }
  }
  ctx.putImageData(img, 0, 0);
}
