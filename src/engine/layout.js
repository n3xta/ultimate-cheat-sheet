// Text → positioned glyphs and pen marks.
//
// prepare() does everything that doesn't depend on font size (splitting,
// font choice, per-glyph jitter, planted mistakes), so fitLayout() can
// re-run layoutSheet() at many sizes cheaply while hunting for the largest
// size that still crams everything onto one page.

import { makeRng } from './rng.js';
import { FONTS } from './presets.js';

const IS_CJK = /[⺀-鿿豈-﫿︰-﹏＀-￯]/;
const IS_HAN = /[一-鿿]/;
const CJK_CLOSE = /^[，。、；：！？）》」』】〉]/;
const CJK_OPEN = /^[（《「『【〈]/;
const COMBINING = /^[̀-ͯ⃐-⃿]$/;
const OVERLAYS = { '̄': 'bar', '̅': 'bar', '̂': 'hat', '̃': 'tilde', '̇': 'dot', '⃗': 'vec' };
// Longest first. Arrows are drawn as pen strokes, not font glyphs.
const ARROWS = [
  ['<=>', 'lr', true], ['<->', 'lr', false], ['=>', 'r', true], ['->', 'r', false], ['<-', 'l', false],
  ['⇔', 'lr', true], ['↔', 'lr', false], ['⇒', 'r', true], ['→', 'r', false], ['⇐', 'l', true], ['←', 'l', false],
];
const NOSTYLE = {};
const SPAN_KINDS = ['hl', 'ul', 'red', 'strike', 'mistake', 'hd'];

export const baseAt = (line, x) =>
  line.base + (x - line.x0) * line.slope + line.waveA * Math.sin(x * line.waveF + line.phase);

function toGlyphs(runs) {
  const out = [];
  for (const run of runs) {
    const t = run.text;
    for (let i = 0; i < t.length; ) {
      const arrow = ARROWS.find(([s]) => t.startsWith(s, i));
      if (arrow) {
        out.push({ cls: 'arrow', dir: arrow[1], dbl: arrow[2], st: run.style });
        i += arrow[0].length;
        continue;
      }
      const ch = String.fromCodePoint(t.codePointAt(i));
      i += ch.length;
      if (COMBINING.test(ch)) {
        // x̄, θ̂ …: draw the accent ourselves so it sits right on any font.
        const prev = out[out.length - 1];
        if (prev && prev.ch) {
          if (OVERLAYS[ch]) prev.over = OVERLAYS[ch];
          else prev.ch += ch;
        }
        continue;
      }
      if (/\s/.test(ch)) out.push({ cls: 'space', ch: ' ', st: run.style });
      else out.push({ cls: IS_CJK.test(ch) ? 'cjk' : 'latin', ch, st: run.style });
    }
  }
  return out;
}

// Break opportunities: latin words stay whole, every CJK character can break,
// closing punctuation clings to what's before it, opening to what's after.
function toUnits(glyphs) {
  const units = [];
  let word = null;
  for (const g of glyphs) {
    const last = units[units.length - 1];
    if (last && last.open && g.cls !== 'space') {
      last.glyphs.push(g);
      last.open = false;
      if (g.cls === 'latin') {
        last.kind = 'word';
        word = last;
      } else word = null;
      continue;
    }
    if (g.cls === 'latin') {
      if (!word) units.push((word = { kind: 'word', glyphs: [] }));
      word.glyphs.push(g);
      continue;
    }
    word = null;
    if (g.cls === 'space') {
      units.push({ kind: 'space', glyphs: [g] });
      continue;
    }
    if (g.cls === 'cjk' && last && last.kind !== 'space' && CJK_CLOSE.test(g.ch)) {
      last.glyphs.push(g);
      continue;
    }
    const u = { kind: g.cls, glyphs: [g] };
    if (g.cls === 'cjk' && CJK_OPEN.test(g.ch)) u.open = true;
    units.push(u);
  }
  return units;
}

function pickMix(rng, keys, odds) {
  let r = rng();
  for (let i = 0; i < keys.length; i++) {
    r -= odds[i] ?? 0;
    if (r <= 0) return keys[i];
  }
  return keys[0];
}

// Typos the writer caught: a mangled start of the word, scribbled out,
// followed by the word written again properly.
function mangle(letters, rng) {
  const a = letters.slice();
  const i = 1 + Math.floor(rng() * (a.length - 1));
  const op = rng();
  if (op < 0.35 && a.length > 3) a.splice(i, 1);
  else if (op < 0.7) [a[i - 1], a[i]] = [a[i], a[i - 1]];
  else a.splice(i, 0, a[i]);
  if (rng() < 0.45) a.length = Math.max(2, Math.ceil(a.length * rng.range(0.4, 0.8)));
  return a;
}

function plantMistakes(units, rate, rng, hanPool) {
  if (rate <= 0) return units;
  const out = [];
  for (const u of units) {
    if (u.kind === 'word') {
      let n = 0;
      while (n < u.glyphs.length && /[A-Za-z]/.test(u.glyphs[n].ch)) n++;
      if (n >= 4 && rng() < rate) {
        const bad = mangle(u.glyphs.slice(0, n), rng).map((g) => ({ ...g, st: { ...g.st, mistake: true } }));
        out.push({ kind: 'word', glyphs: bad }, { kind: 'space', glyphs: [{ cls: 'space', ch: ' ', st: NOSTYLE }] });
      }
    } else if (u.kind === 'cjk' && hanPool.length && IS_HAN.test(u.glyphs[0].ch) && rng() < rate * 0.5) {
      const ch = rng.pick(hanPool);
      out.push({ kind: 'cjk', glyphs: [{ cls: 'cjk', ch, st: { ...u.glyphs[0].st, mistake: true } }] });
    }
    out.push(u);
  }
  return out;
}

function prepareUnits(units, role, P, rng) {
  const { hand, mess, measure, stacks } = P;
  for (const u of units) {
    const latinKey = role === 'body' ? pickMix(rng, hand.latin, hand.mix) : hand.head;
    const slant = hand.slant + rng.gauss() * 0.04 * (0.3 + mess);
    u.wordDy = rng.gauss() * 0.035 * mess;
    u.em = 0;
    for (const g of u.glyphs) {
      if (g.cls === 'space') {
        const F = FONTS[latinKey];
        g.p = { adv: measure(stacks[latinKey], ' ').w * F.scale * hand.space * (0.7 + 0.6 * rng()) };
      } else if (g.cls === 'arrow') {
        g.p = { adv: 1.1 + 0.35 * rng() };
      } else {
        const key = g.cls === 'cjk' ? (role === 'body' ? pickMix(rng, hand.cjk, hand.cjkMix) : hand.headCjk) : latinKey;
        const F = FONTS[key];
        const { w: raw, asc } = measure(stacks[key], g.ch);
        const sc = 1 + rng.gauss() * (0.025 + 0.06 * mess);
        const w = raw * F.scale * sc;
        g.p = {
          key, raw, asc, sc,
          adv: w * (1 + rng.gauss() * 0.05 * (0.4 + mess)) + hand.track,
          rot: rng.gauss() * (0.02 + 0.075 * mess),
          dy: rng.gauss() * (0.012 + 0.045 * mess),
          skew: (g.cls === 'cjk' ? 0.35 : 1) * (slant + rng.gauss() * 0.03 * mess),
          alpha: 0.8 + 0.2 * rng(),
          light: rng.gauss() * 0.5,
          dbl: rng() < 0.1 + 0.25 * mess ? [rng.gauss() * 0.03, rng.gauss() * 0.03] : null,
        };
      }
      u.em += g.p.adv;
    }
  }
  return units;
}

const HEAD_DECOS = ['ul', 'ul', 'ul', 'box', 'hl', 'hl', 'dbl', 'none'];

export function prepare(blocks, P) {
  const rng = makeRng(P.seed ^ 0x5bd1e995);
  const mrng = makeRng(P.seed ^ 0x27d4eb2f);
  const rate = P.mistakes * 0.03;
  const hanPool = [];
  let total = 0;
  for (const b of blocks)
    for (const runs of b.lines || (b.runs ? [b.runs] : []))
      for (const r of runs) for (const ch of r.text) if (IS_HAN.test(ch)) hanPool.push(ch);

  const units = (runs, role, mistakes = role === 'body') => {
    let u = toUnits(toGlyphs(runs));
    for (const x of u) for (const g of x.glyphs) if (g.cls !== 'space') total++;
    if (mistakes) u = plantMistakes(u, rate, mrng, hanPool);
    return prepareUnits(u, role, P, rng);
  };

  const prep = blocks.map((b) => {
    if (b.type === 'gap' || b.type === 'hr') return b;
    if (b.type === 'note') return { ...b, k: 1, lines: b.lines.map((r) => units(r, 'body')) };
    const role = b.type === 'title' ? 'title' : b.type === 'h' ? 'head' : 'body';
    const out = { ...b, units: units(b.runs, role) };
    if (role === 'title') {
      out.k = 1.9;
      out.deco = 'dbl';
    } else if (role === 'head') {
      out.k = 1.26 + rng.gauss() * 0.04;
      out.deco = rng.pick(HEAD_DECOS);
    } else out.k = 1;
    if (b.marker) {
      const mu = units([{ text: b.marker, style: NOSTYLE }], 'body', false);
      total -= b.marker.length;
      mu.push({ kind: 'space', em: 0.3, glyphs: [{ cls: 'space', p: { adv: 0.3 }, st: NOSTYLE }] });
      out.markerUnits = mu;
    }
    return out;
  });
  prep.totalChars = total;
  return prep;
}

export function layoutSheet(prep, o) {
  const rng = makeRng(o.seed ^ 0x1b873593);
  const glyphs = [], marks = [], lines = [], spans = [];
  const contentW = o.W - 2 * o.margin;
  const colW = (contentW - (o.cols - 1) * o.gap) / o.cols;
  const top = o.margin, bottom = o.H - o.margin;
  const totalCols = o.cols * o.pages;
  // `col` counts columns across pages; page 2 picks up where page 1 ends.
  const local = (c) => c % o.cols;
  const pageOf = (c) => Math.floor(c / o.cols);
  const colX = (c) => o.margin + local(c) * (colW + o.gap);
  let col = 0, y = top, titleBottom = top, overflow = false, placed = 0;
  let open = {};
  const topOf = (c) => (pageOf(c) === 0 ? titleBottom : top);
  const pageSlope = rng.gauss() * 0.004 * o.warp;
  const bulletStyle = rng.pick(['dot', 'dot', 'dash', 'arrow']);

  const progress = () => Math.min(1, (col + (y - topOf(col)) / Math.max(1, bottom - topOf(col))) / totalCols);
  const sizeAt = (k) => o.basePx * k * (1 - o.cram * progress());
  const bodyLH = () => sizeAt(1) * o.lineH;

  // Zigzag gutters: every chunk of text (a section, a box, a paragraph after
  // a blank line) nudges its column's right edge one way or the other, and
  // the next column's left edge follows it, so the split between columns
  // steps back and forth with the content instead of running straight.
  const gutters = new Map(); // left column -> [{ y0, dx }]
  const hasGutter = (c) => local(c) < o.cols - 1;
  let zigSign = rng() < 0.5 ? 1 : -1;
  function newChunk() {
    if (!hasGutter(col)) return;
    const maxShift = colW * 0.1 * o.zig;
    zigSign = rng() < 0.75 ? -zigSign : zigSign;
    const dx = zigSign * maxShift * rng.range(0.3, 1);
    const segs = gutters.get(col) || [];
    if (segs.length && segs[segs.length - 1].y0 >= y - 0.5) segs[segs.length - 1].dx = dx;
    else segs.push({ y0: y, dx });
    gutters.set(col, segs);
  }
  // The neighbouring column's shift over [y0, y1]; the larger one wins so text never collides.
  function shiftOver(c, y0, y1) {
    const segs = gutters.get(c);
    if (!segs) return 0;
    let best = -Infinity;
    for (let i = 0; i < segs.length; i++) {
      const a = segs[i].y0, b = i + 1 < segs.length ? segs[i + 1].y0 : Infinity;
      if (a < y1 && b > y0) best = Math.max(best, segs[i].dx);
    }
    return best === -Infinity ? 0 : best;
  }
  function edges(y0, y1) {
    const left = colX(col) + (local(col) > 0 ? shiftOver(col - 1, y0, y1) : 0);
    const segs = hasGutter(col) && gutters.get(col);
    const right = colX(col) + colW + (segs ? segs[segs.length - 1].dx : 0);
    return [left, right];
  }

  function nextColumn() {
    col++;
    if (col >= totalCols) {
      overflow = true;
      return false;
    }
    y = topOf(col);
    newChunk();
    return true;
  }

  function openLine(L) {
    let size = sizeAt(L.k), lh = size * o.lineH;
    if (y + lh > bottom) {
      if (L.full || !nextColumn()) {
        overflow = true;
        return null;
      }
      size = sizeAt(L.k);
      lh = size * o.lineH;
    }
    const [left, right] = L.full ? [o.margin, o.margin + contentW] : edges(y, y + lh);
    const indent = (L.count === 0 ? L.first : L.indent) * size;
    const line = {
      x0: left + indent + rng.gauss() * size * 0.1 * o.mess,
      xEnd: right - L.rindent * size,
      left, right,
      yTop: y, base: y + size * 0.8, size, lh, col, page: pageOf(col),
      slope: pageSlope + rng.gauss() * 0.007 * o.warp,
      waveA: size * 0.06 * o.warp * rng(),
      waveF: (2 * Math.PI) / (size * rng.range(5, 16)),
      phase: rng() * 6.283,
    };
    y += lh;
    L.count++;
    lines.push(line);
    return line;
  }

  function track(kind, on, line, x1, x2, skip, L) {
    if (!on) {
      open[kind] = null;
      return;
    }
    if (skip) return;
    const s = open[kind];
    if (s && s.line === line && x1 - s.x2 < line.size * 0.9) {
      s.x2 = x2;
      return;
    }
    const ns = { kind, line, x1, x2, size: line.size };
    if (kind === 'hd') ns.deco = L.deco;
    if (kind === 'mistake') ns.style = rng() < 0.7 ? 'scribble' : 'strike';
    spans.push(ns);
    open[kind] = ns;
  }

  function placeUnit(u, line, x, squeeze, L) {
    const size = line.size;
    for (const g of u.glyphs) {
      const p = g.p, adv = p.adv * size * squeeze;
      const st = g.st || NOSTYLE;
      const isSpace = g.cls === 'space';
      const ink = st.red ? 'accent' : L.ink;
      if (g.cls === 'arrow') {
        marks.push({ type: 'arrow', line, x1: x, x2: x + adv, size, dir: g.dir, dbl: g.dbl, ink });
      } else if (!isSpace) {
        const F = FONTS[p.key];
        glyphs.push({
          ch: g.ch, key: p.key, size: size * F.scale, sc: p.sc, sx: squeeze, raw: p.raw, page: line.page,
          x, y: baseAt(line, x) + (u.wordDy + p.dy + (F.dy || 0)) * size,
          rot: p.rot, skew: p.skew, alpha: p.alpha, light: p.light, dbl: p.dbl,
          bold: !!(st.bold || L.bold), ink, over: g.over, asc: p.asc,
        });
        if (!st.mistake) placed++;
      }
      for (const k of SPAN_KINDS) {
        const on = k === 'hd' ? !!L.deco && L.deco !== 'none' : !!st[k];
        track(k, on, line, x, x + adv, isSpace, L);
      }
      x += adv;
    }
    return x;
  }

  function flow(units, L) {
    let line = openLine(L);
    if (!line) return null;
    if (L.onFirstLine) L.onFirstLine(line);
    let x = line.x0;
    for (const u of units) {
      if (u.kind === 'space' && x <= line.x0 + 0.01) continue;
      let w = u.em * line.size;
      const room = line.xEnd - x;
      let squeeze = 1;
      if (w > room) {
        if (u.kind === 'space') {
          if (!(line = openLine(L))) return null;
          x = line.x0;
          continue;
        }
        if (u.kind === 'word' && x > line.x0 && w - room < w * 0.3 && room > line.size * 1.2) {
          // Running out of line: squash the last word instead of wrapping it.
          squeeze = room / w;
        } else if (x > line.x0) {
          if (!(line = openLine(L))) return null;
          x = line.x0;
          w = u.em * line.size;
          if (w > line.xEnd - x) squeeze = Math.max(0.5, (line.xEnd - x) / w);
        } else squeeze = Math.max(0.5, room / w);
      }
      x = placeUnit(u, line, x, squeeze, L);
    }
    open = {};
    return line;
  }

  const ctxFor = (b, extra) => ({
    k: b.k || 1, full: false, first: 0, indent: 0, rindent: 0, count: 0,
    ink: (b.type === 'h' || b.type === 'title') && o.colorHeads ? 'accent' : 'ink',
    bold: b.type === 'h' || b.type === 'title',
    deco: b.deco || null,
    ...extra,
  });

  newChunk();
  for (let bi = 0; bi < prep.length && !overflow; bi++) {
    const b = prep[bi];
    const atTop = y <= topOf(col) + 0.5;
    if (b.type === 'gap') {
      if (!atTop) y += bodyLH() * 0.3;
      newChunk();
    } else if (b.type === 'hr') {
      if (y + bodyLH() * 0.6 > bottom && !nextColumn()) break;
      newChunk();
      const sz = sizeAt(1);
      const [left, right] = edges(y, y + bodyLH() * 0.6);
      marks.push({ type: 'hr', page: pageOf(col), x1: left + sz * 0.2, x2: right - sz * 0.2, y: y + sz * 0.3, size: sz });
      y += bodyLH() * 0.6;
    } else if (b.type === 'title' && bi === 0) {
      const L = ctxFor(b, { full: true });
      const est = b.units.reduce((s, u) => s + u.em, 0) * sizeAt(b.k);
      if (est < contentW) L.first = L.indent = ((contentW - est) * rng.range(0.12, 0.5)) / sizeAt(b.k);
      flow(b.units, L);
      y += bodyLH() * 0.45;
      titleBottom = y;
      newChunk();
    } else if (b.type === 'h' || b.type === 'title') {
      if (!atTop) y += bodyLH() * 0.25;
      // Don't leave a heading orphaned at the bottom of a column.
      if (y + sizeAt(b.k) * o.lineH + bodyLH() * 1.5 > bottom && !nextColumn()) break;
      newChunk();
      flow(b.units, ctxFor(b, {}));
      y += bodyLH() * 0.1;
    } else if (b.type === 'p') {
      flow(b.units, ctxFor(b, {}));
    } else if (b.type === 'li') {
      const lv = b.level * 0.9;
      if (b.markerUnits) {
        const mw = b.markerUnits.reduce((s, u) => s + u.em, 0);
        flow([...b.markerUnits, ...b.units], ctxFor(b, { first: lv, indent: lv + mw }));
      } else {
        const L = ctxFor(b, { first: lv + 0.8, indent: lv + 0.8 });
        const style = rng() < 0.85 ? bulletStyle : rng.pick(['dot', 'dash', 'arrow']);
        L.onFirstLine = (line) => marks.push({ type: 'bullet', style, x: line.x0 - line.size * 0.55, line, size: line.size, ink: 'ink' });
        flow(b.units, L);
      }
    } else if (b.type === 'note') {
      if (!atTop) y += bodyLH() * 0.3;
      newChunk();
      const L = ctxFor(b, { first: 0.45, indent: 0.45, rindent: 0.35 });
      const start = lines.length;
      for (const u of b.lines) {
        L.count = 0;
        if (!flow(u, L)) break;
      }
      const byCol = new Map();
      for (const ln of lines.slice(start)) {
        const g = byCol.get(ln.col) || { y1: Infinity, y2: -Infinity, x1: Infinity, x2: -Infinity, size: ln.size, page: ln.page };
        g.y1 = Math.min(g.y1, ln.yTop);
        g.y2 = Math.max(g.y2, ln.yTop + ln.lh);
        g.x1 = Math.min(g.x1, ln.left);
        g.x2 = Math.max(g.x2, ln.right);
        byCol.set(ln.col, g);
      }
      for (const g of byCol.values())
        marks.push({ type: 'box', page: g.page, x1: g.x1 + g.size * 0.08, x2: g.x2 - g.size * 0.05, y1: g.y1 - g.size * 0.08, y2: g.y2 + g.size * 0.08, size: g.size, ink: 'ink' });
      y += bodyLH() * 0.35;
      newChunk();
    }
  }

  for (const s of spans) {
    if (s.kind === 'hd') marks.push({ ...s, type: 'hd', ink: o.colorHeads ? 'accent' : 'ink' });
    else marks.push({ ...s, type: s.kind, ink: s.kind === 'red' ? 'accent' : 'ink' });
  }
  if (o.divider) {
    // One divider per gutter whose right-hand column got any text; it steps
    // with the gutter's chunks, slanting across each change.
    const last = Math.min(col, totalCols - 1);
    for (let c = 0; c < last; c++) {
      if (!hasGutter(c)) continue;
      const xb = colX(c) + colW + o.gap / 2, sz = o.basePx;
      const y0 = topOf(c) + sz * 0.2, y1 = bottom - sz * 0.3;
      const segs = gutters.get(c) || [{ y0, dx: 0 }];
      const pts = [];
      const tr = sz * 0.5;
      segs.forEach((g, i) => {
        const a = Math.max(y0, g.y0), b = i + 1 < segs.length ? segs[i + 1].y0 : y1;
        if (b <= a) return;
        const from = i ? Math.min(b, a + tr) : a, to = i + 1 < segs.length ? Math.max(from, b - tr) : b;
        for (let yy = from; yy < to; yy += sz * 3) pts.push([xb + g.dx + rng.gauss() * sz * 0.08, yy]);
        pts.push([xb + g.dx, to]);
      });
      if (pts.length > 1) marks.push({ type: 'vline', page: pageOf(c), pts, size: sz, ink: 'ink' });
    }
  }

  return { glyphs, marks, lines, overflow, placed, total: prep.totalChars, basePx: o.basePx };
}

export function fitLayout(prep, o, minPx, maxPx) {
  const first = layoutSheet(prep, { ...o, basePx: maxPx });
  if (!first.overflow) return first;
  let lo = minPx, hi = maxPx, best = null;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    const r = layoutSheet(prep, { ...o, basePx: mid });
    if (r.overflow) hi = mid;
    else {
      lo = mid;
      best = r;
    }
  }
  return best || layoutSheet(prep, { ...o, basePx: minPx });
}
