// The pipeline: parse → load fonts → prepare → fit layout → paper,
// highlighter and ink layers → ink processing → composite → age → finish.

import { makeRng, makeNoise2D } from './rng.js';
import { parse } from './parse.js';
import { prepare, layoutSheet, fitLayout } from './layout.js';
import { drawPenMarks, drawHighlights, drawBlots, smudge } from './pen.js';
import { processInk } from './ink.js';
import { drawPaper } from './paper.js';
import { age, finish } from './finish.js';
import { FONTS, HANDS, PENS, INKS, GRAPHITE, ACCENTS, MARKERS, PAPERS, PAGES } from './presets.js';

const MAX_PIXELS = 14e6; // keep well under mobile canvas limits

const layers = {};
function layer(name, W, H) {
  const c = (layers[name] ||= document.createElement('canvas'));
  if (c.width !== W || c.height !== H) {
    c.width = W;
    c.height = H;
  }
  const ctx = c.getContext('2d', { willReadFrequently: name === 'ink' || name === 'paper' });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, W, H);
  return [c, ctx];
}

function stacksFor(hand) {
  const cjk = FONTS[hand.cjk[0]].family, latin = FONTS[hand.latin[0]].family;
  const out = {};
  for (const [key, F] of Object.entries(FONTS)) out[key] = `"${F.family}", "${F.cjk ? latin : cjk}", cursive`;
  return out;
}

async function loadFonts(hand, text) {
  if (!document.fonts || !document.fonts.load) return;
  const link = document.getElementById('hand-fonts');
  if (link && !link.sheet)
    await new Promise((r) => {
      link.addEventListener('load', r, { once: true });
      link.addEventListener('error', r, { once: true });
      setTimeout(r, 6000);
    });
  const keys = new Set([...hand.latin, ...hand.cjk, hand.head, hand.headCjk]);
  const chars = [...new Set(text.replace(/\s/g, ''))].join('') || 'a';
  const jobs = [...keys].map((k) => document.fonts.load(`40px "${FONTS[k].family}"`, chars).catch(() => null));
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 10000))]);
}

// Advance width and ink ascent per glyph, in em.
function makeMeasure() {
  const ctx = document.createElement('canvas').getContext('2d');
  const cache = new Map();
  let cur = '';
  return (stack, ch) => {
    let m = cache.get(stack);
    if (!m) cache.set(stack, (m = new Map()));
    let r = m.get(ch);
    if (r === undefined) {
      const f = '100px ' + stack;
      if (cur !== f) ctx.font = cur = f;
      const t = ctx.measureText(ch);
      r = { w: t.width / 100, asc: (t.actualBoundingBoxAscent || 70) / 100 };
      m.set(ch, r);
    }
    return r;
  };
}

function makePalette(inkRgb, accentRgb) {
  const cache = new Map();
  return (which, light) => {
    const l = Math.max(-3, Math.min(3, Math.round(light * 3)));
    const key = which + l;
    let s = cache.get(key);
    if (!s) {
      const base = which === 'accent' ? accentRgb : inkRgb;
      const f = 1 + l * 0.05;
      s = `rgb(${base.map((v) => Math.min(255, Math.round(v * f + l * 4))).join(',')})`;
      cache.set(key, s);
    }
    return s;
  };
}

function drawGlyphs(ctx, glyphs, stacks, warp, palette) {
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  let cur = '';
  for (const g of glyphs) {
    const fpx = Math.max(4, Math.round(g.size));
    const font = fpx + 'px ' + stacks[g.key];
    if (font !== cur) ctx.font = cur = font;
    const [wx, wy] = warp(g.x, g.y);
    const s = g.sc * (g.size / fpx), sx = s * g.sx, sy = s;
    const c = Math.cos(g.rot), sn = Math.sin(g.rot), k = -g.skew;
    ctx.setTransform(c * sx, sn * sx, c * k * sy - sn * sy, sn * k * sy + c * sy, wx, wy);
    const color = palette(g.ink, g.light);
    ctx.fillStyle = color;
    ctx.globalAlpha = g.alpha;
    ctx.fillText(g.ch, 0, 0);
    if (g.bold) {
      ctx.strokeStyle = color;
      ctx.lineWidth = fpx * 0.05;
      ctx.strokeText(g.ch, 0, 0);
    }
    if (g.dbl) {
      ctx.globalAlpha = g.alpha * 0.4;
      ctx.fillText(g.ch, g.dbl[0] * fpx, g.dbl[1] * fpx);
    }
    if (g.over) {
      // hand-drawn accents for x̄, θ̂ and friends
      const w = g.raw * fpx, h = (g.asc + 0.14) * fpx;
      ctx.globalAlpha = g.alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = fpx * 0.06;
      ctx.beginPath();
      if (g.over === 'hat') {
        ctx.moveTo(w * 0.15, -h + fpx * 0.03);
        ctx.lineTo(w * 0.5, -h - fpx * 0.12);
        ctx.lineTo(w * 0.85, -h + fpx * 0.03);
      } else if (g.over === 'tilde') {
        ctx.moveTo(w * 0.1, -h);
        ctx.bezierCurveTo(w * 0.35, -h - fpx * 0.12, w * 0.6, -h + fpx * 0.1, w * 0.9, -h - fpx * 0.04);
      } else if (g.over === 'dot') {
        ctx.arc(w * 0.5, -h, fpx * 0.045, 0, Math.PI * 2);
      } else {
        ctx.moveTo(w * 0.02, -h + fpx * 0.02);
        ctx.lineTo(w * 1.0, -h - fpx * 0.03);
        if (g.over === 'vec') {
          ctx.moveTo(w * 0.8, -h - fpx * 0.12);
          ctx.lineTo(w * 1.0, -h - fpx * 0.03);
          ctx.lineTo(w * 0.82, -h + fpx * 0.07);
        }
      }
      if (g.over === 'dot') ctx.fill();
      else ctx.stroke();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
}

// Lay the finished pages out for the preview: portrait pages side by side,
// landscape ones stacked, each with a soft shadow. Downloads use the pages.
function compose(out, pages) {
  const W = pages[0].width, H = pages[0].height;
  const pad = Math.round(Math.max(W, H) * 0.02), gap = pad * 2, n = pages.length;
  const across = n > 1 && W < H;
  out.width = (across ? W * n + gap * (n - 1) : W) + pad * 2;
  out.height = (across || n === 1 ? H : H * n + gap * (n - 1)) + pad * 2;
  const ctx = out.getContext('2d');
  ctx.clearRect(0, 0, out.width, out.height);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = pad * 0.8;
  ctx.shadowOffsetY = pad * 0.2;
  pages.forEach((pg, i) => ctx.drawImage(pg, pad + (across ? i * (W + gap) : 0), pad + (across ? 0 : i * (H + gap))));
  ctx.shadowColor = 'transparent';
}

export async function renderSheet(out, text, s) {
  const t0 = performance.now();
  const page = PAGES[s.page];
  const hand = HANDS[s.hand];
  const pen = PENS[s.pen];
  const pages = s.pages === 2 ? 2 : 1;
  let dpi = s.dpi;
  const px = (d) => Math.round((page.w * d) / 25.4) * Math.round((page.h * d) / 25.4) * pages;
  while (px(dpi) > MAX_PIXELS && dpi > 100) dpi -= 25;
  const mm = dpi / 25.4;
  const W = Math.round(page.w * mm), H = Math.round(page.h * mm);
  const pt = dpi / 72;

  const mess = s.mess / 100, warpAmt = s.warp / 100, inkAmt = s.blots / 100;
  await loadFonts(hand, text);
  const tFonts = performance.now();

  const stacks = stacksFor(hand);
  const blocks = parse(text);
  const prep = prepare(blocks, { hand, mess, mistakes: s.mistakes / 100, seed: s.seed, measure: makeMeasure(), stacks });
  const lo = {
    W, H, margin: page.margin * mm, gap: 2.4 * mm, cols: s.cols, pages, lineH: s.lineH, cram: s.cram, zig: s.zig / 100,
    warp: warpAmt, mess, seed: s.seed, divider: s.divider, colorHeads: s.colorHeads && s.accent !== 'same',
  };
  const minPx = 2.5 * pt, maxPx = s.maxPt * pt;
  const L = s.fit ? fitLayout(prep, lo, minPx, maxPx) : layoutSheet(prep, { ...lo, basePx: maxPx });
  const em = L.basePx;

  const rng = makeRng(s.seed ^ 0x9e3779b9);
  const nx = makeNoise2D(s.seed ^ 0x51), ny = makeNoise2D(s.seed ^ 0x77);
  const wA = warpAmt * em * 0.6, wP = em * 22;
  const warpFor = (p) => (x, y) => {
    const u = (x + p * W * 1.7) / wP, v = y / wP;
    return [x + wA * nx(u, v), y + wA * ny(u, v)];
  };
  const inkRgb = s.pen === 'pencil' ? GRAPHITE : INKS[s.ink].rgb;
  const palette = makePalette(inkRgb, ACCENTS[s.accent].rgb || inkRgb);
  // Without a highlighter the writer underlines instead.
  const marks = s.highlighter
    ? L.marks
    : L.marks.map((m) => (m.type === 'hl' ? { ...m, type: 'ul' } : m.type === 'hd' && m.deco === 'hl' ? { ...m, deco: 'ul' } : m));
  const pageOf = (m) => m.page ?? (m.line ? m.line.page : 0);

  const finished = [];
  for (let p = 0; p < pages; p++) {
    const warp = warpFor(p);
    const env = { rng, warp, palette, marker: MARKERS[s.marker].rgb, amount: inkAmt };
    const pageGlyphs = L.glyphs.filter((g) => g.page === p);
    const pageMarks = marks.filter((m) => pageOf(m) === p);

    const [paper, pctx] = layer('paper', W, H);
    drawPaper(pctx, W, H, PAPERS[s.paper], dpi, rng);
    const [marker, mctx] = layer('marker', W, H);
    drawHighlights(mctx, pageMarks, env);
    const [ink, ictx] = layer('ink', W, H);
    drawGlyphs(ictx, pageGlyphs, stacks, warp, palette);
    drawPenMarks(ictx, pageMarks, env);
    drawBlots(ictx, pageGlyphs, env);
    processInk(ictx, W, H, { pen, em, mess, rng });
    smudge(ink, pageGlyphs, env);

    pctx.globalCompositeOperation = 'multiply';
    pctx.drawImage(marker, 0, 0);
    pctx.drawImage(ink, 0, 0);
    pctx.globalCompositeOperation = 'source-over';
    age(pctx, W, H, s.age / 100, dpi, rng);
    const [fin] = layer('fin' + p, W, H);
    finish(fin, paper, s.finish, rng);
    finished.push(fin);
  }
  compose(out, finished);

  return {
    W, H, dpi, pages: finished,
    pt: em / pt,
    overflow: L.overflow,
    placed: L.placed,
    total: L.total,
    ms: Math.round(performance.now() - tFonts),
    fontMs: Math.round(tFonts - t0),
  };
}
