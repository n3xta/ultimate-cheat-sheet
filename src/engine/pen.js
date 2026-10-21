// Everything drawn with the pen that isn't a font glyph: underlines, circles,
// boxes, arrows, scribbled-out typos, highlighter, blots and smudges.
// All points go through `warp` so marks bend with the text they belong to.

import { baseAt } from './layout.js';

function stroke(ctx, pts, width) {
  if (pts.length < 2) return;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const l = pts[pts.length - 1];
  ctx.lineTo(l[0], l[1]);
  ctx.stroke();
}

function poly(ctx, pts, width) {
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

function dot(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 0.85, rot, 0, Math.PI * 2);
  ctx.fill();
}

// Points following a text line's baseline, offset by yOff, with a slow wobble
// and a slight tilt of its own (a ruler-less underline is never parallel).
function along(line, x1, x2, yOff, amp, rng, warp) {
  const len = Math.max(1, x2 - x1);
  const n = Math.max(3, Math.ceil(len / (line.size * 0.45)));
  const p1 = rng() * 6.283, p2 = rng() * 6.283;
  const f1 = (6.283 * rng.range(0.6, 1.4)) / (line.size * 3);
  const f2 = (6.283 * rng.range(1.6, 3)) / (line.size * 3);
  const tilt = rng.gauss() * 0.012;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = x1 + (len * i) / n;
    const y = baseAt(line, x) + yOff + amp * (0.7 * Math.sin(x * f1 + p1) + 0.3 * Math.sin(x * f2 + p2)) + (x - x1) * tilt;
    pts.push(warp(x, y));
  }
  return pts;
}

// A free-standing wobbly straight line with a slight bow.
function wob(x1, y1, x2, y2, amp, step, rng, warp) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const n = Math.max(3, Math.ceil(len / step));
  const p1 = rng() * 6.283, k1 = rng.range(1, 3), bow = rng.gauss() * amp * 1.5;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = amp * Math.sin(t * Math.PI * k1 + p1) + bow * Math.sin(t * Math.PI);
    pts.push(warp(x1 + dx * t + nx * off, y1 + dy * t + ny * off));
  }
  return pts;
}

function looseEllipse(cx, cy, rx, ry, rng, warp) {
  const a0 = rng() * 6.283, sweep = 6.283 + rng.range(0.3, 0.9), n = 56;
  const tilt = rng.gauss() * 0.05, grow = rng.range(0.05, 0.16), p = rng() * 6.283;
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + sweep * t;
    const r = 1 + grow * (t - 0.5) + 0.04 * Math.sin(3 * a + p);
    const x = rx * r * Math.cos(a), y = ry * r * Math.sin(a);
    pts.push(warp(cx + x * c - y * s, cy + x * s + y * c));
  }
  return pts;
}

function box(ctx, x1, y1, x2, y2, sz, rng, warp, width) {
  const o = () => sz * rng.range(0.05, 0.4);
  const amp = sz * 0.05, step = sz * 0.8;
  stroke(ctx, wob(x1 - o(), y1, x2 + o(), y1 + rng.gauss() * sz * 0.08, amp, step, rng, warp), width);
  stroke(ctx, wob(x2, y1 - o(), x2 + rng.gauss() * sz * 0.08, y2 + o(), amp, step, rng, warp), width);
  stroke(ctx, wob(x2 + o(), y2, x1 - o(), y2 + rng.gauss() * sz * 0.08, amp, step, rng, warp), width);
  stroke(ctx, wob(x1, y2 + o(), x1 + rng.gauss() * sz * 0.08, y1 - o(), amp, step, rng, warp), width);
}

function arrow(ctx, m, rng, warp) {
  const sz = m.size, yOff = -0.3 * sz, w = sz * 0.065;
  const a = m.x1 + sz * 0.12, b = m.x2 - sz * 0.12;
  if (m.dbl) {
    stroke(ctx, along(m.line, a, b - sz * 0.05, yOff - sz * 0.08, sz * 0.025, rng, warp), w * 0.85);
    stroke(ctx, along(m.line, a, b - sz * 0.05, yOff + sz * 0.08, sz * 0.025, rng, warp), w * 0.85);
  } else stroke(ctx, along(m.line, a, b, yOff, sz * 0.03, rng, warp), w);
  const head = (x, dir) => {
    const y = baseAt(m.line, x) + yOff;
    const len = sz * rng.range(0.26, 0.36) * (m.dbl ? 1.3 : 1), ang = rng.range(0.42, 0.68);
    const tip = [x + dir * sz * 0.04, y];
    const up = [tip[0] - dir * len * Math.cos(ang), tip[1] - len * Math.sin(ang)];
    const dn = [tip[0] - dir * len * Math.cos(ang) * rng.range(0.8, 1.15), tip[1] + len * Math.sin(ang)];
    poly(ctx, [warp(...up), warp(...tip), warp(...dn)], w);
  };
  if (m.dir !== 'l') head(b, 1);
  if (m.dir !== 'r') head(a, -1);
}

function scribble(ctx, m, rng, warp) {
  const { line, x1, x2, size: sz } = m;
  if (m.style === 'strike') {
    stroke(ctx, along(line, x1 - sz * 0.05, x2 + sz * 0.05, -0.32 * sz, sz * 0.04, rng, warp), sz * 0.07);
    if (rng() < 0.5) stroke(ctx, along(line, x1, x2 + sz * 0.1, -0.22 * sz, sz * 0.04, rng, warp), sz * 0.06);
    return;
  }
  const pass = (from, to, dirSign, width) => {
    const pts = [];
    let up = rng() < 0.5;
    for (let x = from; dirSign > 0 ? x <= to : x >= to; x += dirSign * sz * rng.range(0.09, 0.18)) {
      const yb = baseAt(line, x);
      pts.push(warp(x, yb + (up ? -0.75 : 0.1) * sz + rng.gauss() * 0.07 * sz));
      up = !up;
    }
    stroke(ctx, pts, width);
  };
  pass(x1 - sz * 0.05, x2 + sz * 0.08, 1, sz * 0.08);
  pass(x2 + sz * 0.05, x1 - sz * 0.05, -1, sz * 0.06);
}

export function drawPenMarks(ctx, marks, env) {
  const { rng, warp, palette } = env;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const m of marks) {
    const sz = m.size;
    if (m.type === 'hl' || (m.type === 'hd' && m.deco === 'hl')) continue; // marker layer
    const color = palette(m.ink || 'ink', rng.gauss() * 0.3);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92;
    switch (m.type) {
      case 'ul':
        stroke(ctx, along(m.line, m.x1 - sz * 0.08, m.x2 + sz * 0.12, sz * 0.17, sz * 0.035, rng, warp), sz * 0.065);
        break;
      case 'strike':
        stroke(ctx, along(m.line, m.x1 - sz * 0.05, m.x2 + sz * 0.05, -0.3 * sz, sz * 0.03, rng, warp), sz * 0.065);
        break;
      case 'mistake':
        scribble(ctx, m, rng, warp);
        break;
      case 'red': {
        const cx = (m.x1 + m.x2) / 2;
        const cy = baseAt(m.line, cx) - 0.32 * sz;
        stroke(ctx, looseEllipse(cx, cy, (m.x2 - m.x1) / 2 + sz * 0.38, sz * rng.range(0.62, 0.78), rng, warp), sz * 0.07);
        break;
      }
      case 'hd': {
        if (m.deco === 'box') {
          const yb = baseAt(m.line, m.x1);
          box(ctx, m.x1 - sz * 0.25, yb - sz * 0.92, m.x2 + sz * 0.25, yb + sz * 0.3, sz, rng, warp, sz * 0.055);
        } else {
          stroke(ctx, along(m.line, m.x1 - sz * 0.1, m.x2 + sz * 0.2, sz * 0.2, sz * 0.04, rng, warp), sz * 0.075);
          if (m.deco === 'dbl') stroke(ctx, along(m.line, m.x1, m.x2 + sz * 0.1, sz * 0.36, sz * 0.04, rng, warp), sz * 0.06);
        }
        break;
      }
      case 'arrow':
        arrow(ctx, m, rng, warp);
        break;
      case 'bullet': {
        const { line, x } = m;
        if (m.style === 'dash') stroke(ctx, along(line, x - sz * 0.18, x + sz * 0.18, -0.3 * sz, sz * 0.02, rng, warp), sz * 0.07);
        else if (m.style === 'arrow') arrow(ctx, { line, x1: x - sz * 0.38, x2: x + sz * 0.3, size: sz * 0.85, dir: 'r' }, rng, warp);
        else {
          const [wx, wy] = warp(x, baseAt(line, x) - 0.3 * sz);
          dot(ctx, wx, wy, sz * rng.range(0.07, 0.1), rng() * 3);
        }
        break;
      }
      case 'box':
        box(ctx, m.x1, m.y1, m.x2, m.y2, sz, rng, warp, sz * 0.055);
        break;
      case 'hr': {
        if (rng() < 0.5) {
          const pts = [], lam = sz * rng.range(0.5, 0.8), p = rng() * 6.283;
          for (let x = m.x1; x <= m.x2; x += sz * 0.12) pts.push(warp(x, m.y + Math.sin((x / lam) * 6.283 + p) * sz * 0.1));
          stroke(ctx, pts, sz * 0.06);
        } else {
          stroke(ctx, wob(m.x1, m.y, m.x2, m.y + rng.gauss() * sz * 0.1, sz * 0.05, sz, rng, warp), sz * 0.065);
          stroke(ctx, wob(m.x1 + (m.x2 - m.x1) * rng.range(0.3, 0.6), m.y + sz * 0.05, m.x2, m.y, sz * 0.05, sz, rng, warp), sz * 0.05);
        }
        break;
      }
      case 'vline':
        ctx.globalAlpha = 0.7;
        stroke(ctx, wob(m.x, m.y1, m.x + rng.gauss() * sz * 0.6, m.y2, sz * 0.2, sz * 4, rng, warp), sz * 0.055);
        break;
    }
  }
  ctx.globalAlpha = 1;
}

// Chisel-tip highlighter strokes; one or two passes, slanted ends.
export function drawHighlights(ctx, marks, env) {
  const { rng, warp, marker } = env;
  ctx.fillStyle = `rgba(${marker[0]}, ${marker[1]}, ${marker[2]}, 0.4)`;
  for (const m of marks) {
    if (!(m.type === 'hl' || (m.type === 'hd' && m.deco === 'hl'))) continue;
    const sz = m.size, passes = rng() < 0.45 ? 2 : 1;
    for (let p = 0; p < passes; p++) {
      const span = m.x2 - m.x1;
      const a = m.x1 - sz * 0.15 + (p ? span * rng.range(0, 0.3) : 0);
      const b = m.x2 + sz * 0.15 - (p ? span * rng.range(0, 0.3) : 0);
      const h = sz * rng.range(0.78, 0.98);
      const mid = -0.32 * sz + rng.gauss() * 0.05 * sz + (p ? rng.gauss() * 0.15 * sz : 0);
      const n = Math.max(2, Math.ceil((b - a) / (sz * 0.6)));
      const slant = sz * 0.18;
      const topPts = [], botPts = [];
      for (let i = 0; i <= n; i++) {
        const x = a + ((b - a) * i) / n;
        const yb = baseAt(m.line, x) + mid;
        topPts.push(warp(x + slant, yb - h / 2 + rng.gauss() * sz * 0.03));
        botPts.push(warp(x - slant * 0.3, yb + h / 2 + rng.gauss() * sz * 0.03));
      }
      ctx.beginPath();
      ctx.moveTo(...topPts[0]);
      for (const q of topPts.slice(1)) ctx.lineTo(...q);
      for (const q of botPts.reverse()) ctx.lineTo(...q);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function blob(ctx, cx, cy, r, rng) {
  const n = 16, p = rng() * 6.283, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    const rr = r * (0.72 + 0.4 * rng() + 0.12 * Math.sin(3 * a + p));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.85]);
  }
  const mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  ctx.beginPath();
  ctx.moveTo(...mid(pts[n - 1], pts[0]));
  for (let i = 0; i < n; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], ...mid(pts[i], pts[(i + 1) % n]));
  ctx.closePath();
  ctx.fill();
}

// Pen-down beads on a few glyphs, plus a couple of real blots with splatter.
export function drawBlots(ctx, glyphs, env) {
  const { rng, warp, palette, amount } = env;
  if (amount <= 0 || !glyphs.length) return;
  ctx.fillStyle = palette('ink', 0);
  ctx.globalAlpha = 0.95;
  for (const g of glyphs) {
    if (rng() < 0.014 * amount) {
      const [x, y] = warp(g.x + g.size * 0.08, g.y - g.size * rng.range(0.1, 0.5));
      dot(ctx, x, y, g.size * rng.range(0.035, 0.08), rng() * 3);
    }
  }
  const n = Math.floor(amount * 2.5 + rng() * amount * 2.5);
  for (let i = 0; i < n; i++) {
    const g = rng.pick(glyphs);
    const [cx, cy] = warp(g.x, g.y - g.size * 0.3);
    const r = g.size * rng.range(0.15, 0.45) * (0.6 + amount);
    blob(ctx, cx, cy, r, rng);
    const k = 3 + Math.floor(rng() * 10 * amount);
    for (let j = 0; j < k; j++) {
      const a = rng() * 6.283, d = r * rng.range(1.3, 4);
      dot(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * rng.range(0.04, 0.15));
    }
  }
  ctx.globalAlpha = 1;
}

// A hand dragged across wet ink: a blurred, faded, shifted copy of a patch.
export function smudge(canvas, glyphs, env) {
  const { rng, amount } = env;
  const n = Math.round(amount * 4 * rng.range(0.5, 1.2));
  if (!n || !glyphs.length) return;
  const ctx = canvas.getContext('2d');
  const tmp = document.createElement('canvas');
  const t = tmp.getContext('2d');
  for (let i = 0; i < n; i++) {
    const g = rng.pick(glyphs), sz = g.size;
    const w = Math.min(canvas.width, sz * rng.range(5, 12)), h = Math.min(canvas.height, sz * rng.range(2, 4));
    const sx = Math.max(0, Math.min(canvas.width - w, g.x - w / 2));
    const sy = Math.max(0, Math.min(canvas.height - h, g.y - h / 2));
    const tw = Math.max(4, Math.round(w / 5)), th = Math.max(4, Math.round(h / 5));
    tmp.width = tw;
    tmp.height = th;
    t.globalCompositeOperation = 'source-over';
    t.drawImage(canvas, sx, sy, w, h, 0, 0, tw, th);
    t.globalCompositeOperation = 'destination-in';
    t.setTransform(1, 0, 0, th / tw, 0, 0);
    const grad = t.createRadialGradient(tw / 2, tw / 2, 0, tw / 2, tw / 2, tw / 2);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    t.fillStyle = grad;
    t.fillRect(0, 0, tw, tw);
    t.setTransform(1, 0, 0, 1, 0, 0);
    const ang = rng.gauss() * 0.4 + (rng() < 0.5 ? 0 : Math.PI), d = sz * rng.range(0.5, 1.6);
    ctx.globalAlpha = rng.range(0.15, 0.3);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tmp, 0, 0, tw, th, sx + Math.cos(ang) * d, sy + Math.sin(ang) * d * 0.3, w * 1.08, h);
  }
  ctx.globalAlpha = 1;
}
