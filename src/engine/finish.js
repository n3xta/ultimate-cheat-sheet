// After the ink is down: wear and tear on the sheet, then how it's "captured"
// (flat scan, phone photo on a desk, or a cheap photocopy).

import { pixelHash } from './rng.js';

function crease(ctx, pts, mm, amount) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const p of pts.slice(1)) ctx.lineTo(...p);
  };
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'multiply';
  for (const [w, a] of [[3.2, 0.05], [1.6, 0.07], [0.5, 0.12]]) {
    ctx.strokeStyle = `rgba(90, 80, 68, ${a * amount})`;
    ctx.lineWidth = w * mm;
    path();
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * amount})`;
  ctx.lineWidth = 0.45 * mm;
  ctx.save();
  ctx.translate(0.6 * mm, 0.6 * mm);
  path();
  ctx.stroke();
  ctx.restore();
}

function foldLine(x1, y1, x2, y2, mm, rng) {
  const pts = [], n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([x1 + (x2 - x1) * t + rng.gauss() * mm * 0.25, y1 + (y2 - y1) * t + rng.gauss() * mm * 0.25]);
  }
  return pts;
}

export function age(ctx, W, H, amount, dpi, rng) {
  if (amount <= 0) return;
  const mm = dpi / 25.4;

  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.56);
  g.addColorStop(0, 'rgba(255, 255, 255, 0)');
  g.addColorStop(1, `rgba(200, 160, 96, ${0.4 * amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // folded in quarters to fit a pocket; in eighths when it's had a hard life
  if (amount > 0.12) {
    const fx = W / 2 + rng.gauss() * mm * 2, fy = H / 2 + rng.gauss() * mm * 2;
    crease(ctx, foldLine(fx, 0, fx + rng.gauss() * mm * 2, H, mm, rng), mm, amount);
    crease(ctx, foldLine(0, fy, W, fy + rng.gauss() * mm * 2, mm, rng), mm, amount);
    if (amount > 0.6) {
      const q = H / 4 + rng.gauss() * mm * 2;
      crease(ctx, foldLine(0, q, W, q + rng.gauss() * mm * 2, mm, rng), mm, amount * 0.7);
      crease(ctx, foldLine(0, H - q, W, H - q + rng.gauss() * mm * 2, mm, rng), mm, amount * 0.7);
    }
  }

  // coffee ring
  if (amount > 0.35 && rng() < 0.4 + amount * 0.6) {
    const cx = rng() < 0.5 ? W * rng.range(0.05, 0.3) : W * rng.range(0.7, 0.95);
    const cy = H * rng.range(0.1, 0.9);
    const R = mm * rng.range(30, 40);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(170, 120, 60, ${0.06 * amount})`;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      const p = rng() * 6.283, rr = R * (1 + rng.gauss() * 0.012);
      const a0 = rng() * 6.283, sweep = k < 2 ? 6.4 : rng.range(1.5, 4);
      ctx.strokeStyle = `rgba(130, 80, 32, ${rng.range(0.08, 0.22) * amount})`;
      ctx.lineWidth = mm * rng.range(0.3, 1.8);
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const a = a0 + (sweep * i) / 90;
        const r = rr * (1 + 0.008 * Math.sin(3 * a + p) + 0.004 * Math.sin(11 * a));
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }

  // foxing
  const spots = Math.round(amount * amount * 40);
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < spots; i++) {
    const x = rng() * W, y = rng() * H, r = mm * rng.range(0.3, 1.6);
    const s = ctx.createRadialGradient(x, y, 0, x, y, r);
    s.addColorStop(0, `rgba(160, 110, 50, ${0.35 * amount})`);
    s.addColorStop(1, 'rgba(160, 110, 50, 0)');
    ctx.fillStyle = s;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function finish(out, page, mode, rng) {
  const W = page.width, H = page.height;
  if (out.width !== W) out.width = W;
  if (out.height !== H) out.height = H;
  const ctx = out.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  if (mode === 'photo') {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#6a5d50');
    bg.addColorStop(1, '#3a322b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rng.gauss() * 0.014 + 0.004);
    ctx.scale(0.92, 0.92);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = W * 0.025;
    ctx.shadowOffsetY = W * 0.012;
    ctx.drawImage(page, -W / 2, -H / 2);
    ctx.restore();
    // lamp from the top left, warm phone white balance, soft vignette
    ctx.globalCompositeOperation = 'multiply';
    const light = ctx.createLinearGradient(W * rng.range(0, 0.3), 0, W, H);
    light.addColorStop(0, 'rgba(255, 252, 245, 1)');
    light.addColorStop(1, 'rgba(150, 138, 124, 1)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255, 238, 212, 1)';
    ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W * 0.42, H * 0.4, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    v.addColorStop(0, 'rgba(255, 255, 255, 1)');
    v.addColorStop(1, 'rgba(90, 80, 70, 1)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return;
  }

  if (mode === 'copy') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rng.gauss() * 0.008);
    ctx.drawImage(page, -W / 2, -H / 2);
    ctx.restore();
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const edge = W * rng.range(0.01, 0.03);
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i += 4) {
        const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
        let v = Math.min(1, Math.max(0, (lum - 0.3) / 0.52));
        v = v * v * (3 - 2 * v);
        const h = pixelHash(x, y, 5);
        if (h < 0.0006) v *= 0.2; // toner specks
        v = v * 0.94 + (h - 0.5) * 0.06;
        if (x < edge) v *= 0.55 + 0.45 * (x / edge);
        const c = Math.max(0, Math.min(255, v * 255));
        d[i] = d[i + 1] = d[i + 2] = c;
      }
    }
    ctx.putImageData(img, 0, 0);
    return;
  }

  ctx.drawImage(page, 0, 0);
}
