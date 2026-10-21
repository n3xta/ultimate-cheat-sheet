import './style.css';
import { renderSheet } from './engine/render.js';
import { HANDS, PENS, INKS, ACCENTS, MARKERS, PAPERS, PAGES } from './engine/presets.js';
import { SAMPLES } from './samples.js';
import { pagesToPdf } from './pdf.js';

const DEFAULTS = {
  hand: 'rush', pen: 'gel', ink: 'blueblack', accent: 'red', highlighter: true, marker: 'yellow', paper: 'grid', page: 'card46',
  cols: 3, pages: 1, maxPt: 6, fit: true, lineH: 1.08, cram: 0.12, zig: 40, colorHeads: true, divider: true,
  mess: 55, warp: 45, blots: 35, mistakes: 35, age: 20,
  finish: 'flat', dpi: 300, seed: 20261021,
};
const STORE = 'scrawl-sheet:v1';

const labels = (o) => Object.entries(o).map(([v, x]) => [v, x.label]);
const amount = { type: 'range', min: 0, max: 100, step: 1 };
const GROUPS = [
  {
    title: '笔与纸',
    items: [
      { id: 'hand', label: '笔迹', type: 'select', options: labels(HANDS) },
      { id: 'pen', label: '笔', type: 'select', options: labels(PENS) },
      { id: 'ink', label: '墨色', type: 'swatch', options: INKS },
      { id: 'accent', label: '重点色', type: 'swatch', options: ACCENTS },
      { id: 'highlighter', label: '用荧光笔（关掉后改画下划线）', type: 'check' },
      { id: 'marker', label: '荧光笔颜色', type: 'swatch', options: MARKERS },
      { id: 'paper', label: '纸', type: 'select', options: labels(PAPERS) },
      { id: 'page', label: '尺寸', type: 'select', options: labels(PAGES) },
    ],
  },
  {
    title: '排版',
    items: [
      { id: 'cols', label: '分栏', type: 'range', min: 1, max: 5, step: 1, fmt: (v) => `${v} 栏` },
      { id: 'pages', label: '页数', type: 'select', num: true, options: [[1, '1 页'], [2, '2 页（正反面）']] },
      { id: 'maxPt', label: '字号上限', type: 'range', min: 3, max: 14, step: 0.5, fmt: (v) => `${v} pt` },
      { id: 'lineH', label: '行距', type: 'range', min: 0.9, max: 1.6, step: 0.02, fmt: (v) => v.toFixed(2) },
      { id: 'cram', label: '越写越小', type: 'range', min: 0, max: 0.5, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
      { id: 'zig', label: '分栏错位', type: 'range', min: 0, max: 100, step: 1 },
      { id: 'fit', label: '自动缩小，全部塞进一页', type: 'check' },
      { id: 'colorHeads', label: '小节标题用重点色', type: 'check' },
      { id: 'divider', label: '手画分栏线', type: 'check' },
    ],
  },
  {
    title: '乱的程度',
    items: [
      { id: 'mess', label: '潦草', ...amount },
      { id: 'warp', label: '歪斜', ...amount },
      { id: 'blots', label: '墨渍与蹭花', ...amount },
      { id: 'mistakes', label: '写错涂掉', ...amount },
      { id: 'age', label: '折痕与做旧', ...amount },
    ],
  },
  {
    title: '输出',
    items: [
      { id: 'finish', label: '成品', type: 'select', options: [['flat', '平铺扫描'], ['photo', '手机拍照'], ['copy', '复印件']] },
      { id: 'dpi', label: '清晰度', type: 'select', num: true, options: [[200, '200 dpi'], [300, '300 dpi'], [400, '400 dpi']] },
      { id: 'seed', label: '随机种子', type: 'number' },
    ],
  },
];

const $ = (id) => document.getElementById(id);
const textEl = $('text'), sampleEl = $('sample'), sheet = $('sheet'), viewport = $('viewport');
const loupe = $('loupe'), busy = $('busy'), statusEl = $('status');

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && saved.state) return saved;
  } catch {}
  return null;
}
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ state, text: textEl.value, sample: sampleEl.value }));
  } catch {}
}

const saved = load();
const state = { ...DEFAULTS, ...(saved ? saved.state : {}) };
for (const [k, v] of Object.entries(DEFAULTS)) if (typeof state[k] !== typeof v) state[k] = v;

// ---------- controls ----------

const refs = {};
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  n.append(...kids);
  return n;
}
const rgbCss = (rgb) => `rgb(${rgb.join(',')})`;

function control(it) {
  const id = 'c-' + it.id;
  const set = (v) => {
    state[it.id] = v;
    changed(it.id);
  };
  if (it.type === 'select') {
    const s = el('select', { id, onchange: () => set(it.num ? Number(s.value) : s.value) });
    for (const [v, t] of it.options) s.append(el('option', { value: v }, t));
    s.value = String(state[it.id]);
    refs[it.id] = s;
    return el('div', { class: 'ctl' }, el('label', { for: id }, it.label), s);
  }
  if (it.type === 'range') {
    const fmt = it.fmt || ((v) => String(v));
    const out = el('output', { for: id }, fmt(state[it.id]));
    const r = el('input', { id, type: 'range', min: it.min, max: it.max, step: it.step });
    r.value = state[it.id];
    r.addEventListener('input', () => {
      out.textContent = fmt(Number(r.value));
      set(Number(r.value));
    });
    return el('div', { class: 'ctl' }, el('label', { for: id }, el('span', {}, it.label), out), r);
  }
  if (it.type === 'check') {
    const c = el('input', { id, type: 'checkbox', onchange: () => set(c.checked) });
    c.checked = !!state[it.id];
    return el('div', { class: 'ctl check wide' }, c, el('label', { for: id }, it.label));
  }
  if (it.type === 'number') {
    const n = el('input', { id, type: 'number', min: 0, step: 1, inputmode: 'numeric' });
    n.value = state[it.id];
    n.addEventListener('change', () => set(Math.abs(Math.floor(Number(n.value))) || 0));
    refs[it.id] = n;
    return el('div', { class: 'ctl' }, el('label', { for: id }, it.label), n);
  }
  // swatches: a radio group of colour chips
  const group = el('div', { class: 'swatches', role: 'radiogroup', 'aria-label': it.label });
  const chips = [];
  for (const [key, opt] of Object.entries(it.options)) {
    const color = opt.rgb || INKS[state.ink].rgb;
    const b = el('button', { type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(state[it.id] === key) }, el('i'), opt.label);
    b.firstChild.style.background = rgbCss(color);
    b.addEventListener('click', () => {
      for (const c of chips) c.setAttribute('aria-checked', String(c === b));
      set(key);
    });
    chips.push(b);
  }
  group.append(...chips);
  refs[it.id] = group;
  return el('div', { class: 'ctl wide' }, el('span', { class: 'lbl' }, it.label), group);
}

function syncLocks() {
  const pencil = state.pen === 'pencil';
  for (const b of refs.ink.children) {
    b.disabled = pencil;
    b.title = pencil ? '铅笔固定是石墨色' : '';
  }
  for (const b of refs.marker.children) b.disabled = !state.highlighter;
}

const controls = $('controls');
for (const g of GROUPS) {
  const fs = el('fieldset', {}, el('legend', {}, g.title));
  for (const it of g.items) fs.append(control(it));
  controls.append(fs);
}
syncLocks();

for (const [k, s] of Object.entries(SAMPLES)) sampleEl.append(el('option', { value: k }, '示例：' + s.label));
sampleEl.append(el('option', { value: 'custom' }, '我自己的内容'));
sampleEl.value = saved && saved.sample in SAMPLES ? saved.sample : saved && saved.sample === 'custom' ? 'custom' : 'prob';
textEl.value = saved && typeof saved.text === 'string' ? saved.text : (SAMPLES[sampleEl.value] || SAMPLES.prob).text;

function changed(id) {
  if (id === 'pen' || id === 'highlighter') syncLocks();
  if (id === 'ink') {
    // the "same as ink" accent chip shows the ink colour
    const same = [...refs.accent.children].find((c) => c.textContent.includes(ACCENTS.same.label));
    if (same) same.firstChild.style.background = rgbCss(INKS[state.ink].rgb);
  }
  schedule(id === 'seed' ? 0 : 250);
}

sampleEl.addEventListener('change', () => {
  const s = SAMPLES[sampleEl.value];
  if (s) {
    textEl.value = s.text;
    schedule(0);
  }
});
textEl.addEventListener('input', () => {
  if (sampleEl.value !== 'custom') sampleEl.value = 'custom';
  schedule(700);
});

$('reroll').addEventListener('click', () => {
  state.seed = Math.floor(Math.random() * 1e9);
  refs.seed.value = state.seed;
  schedule(0);
});

// ---------- rendering ----------

let timer = 0, rendering = false, again = false, last = null;
function schedule(delay) {
  clearTimeout(timer);
  timer = setTimeout(run, delay);
}
async function run() {
  if (rendering) {
    again = true;
    return;
  }
  rendering = true;
  busy.hidden = false;
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  try {
    last = await renderSheet(sheet, textEl.value, state);
    showStatus(last);
    if (!viewport.classList.contains('fit')) sheet.style.width = sheet.width / (window.devicePixelRatio || 1) + 'px';
  } catch (e) {
    console.error(e);
    statusEl.textContent = '生成失败：' + (e && e.message ? e.message : e);
  }
  rendering = false;
  busy.hidden = true;
  save();
  if (again) {
    again = false;
    run();
  }
}

function showStatus(r) {
  const parts = [
    `${PAGES[state.page].label} · ${r.W}×${r.H} px (${r.dpi} dpi)`,
    `${r.pages.length} 页 × ${state.cols} 栏`,
    `字号 ${r.pt.toFixed(1)} pt`,
    `${r.placed.toLocaleString()} 字`,
    `${(r.ms / 1000).toFixed(1)} 秒`,
  ];
  statusEl.textContent = parts.join(' · ');
  if (r.overflow) {
    const left = Math.max(0, r.total - r.placed).toLocaleString();
    const msg = state.fit
      ? `缩到最小也放不下，还有 ${left} 字没写上。试试多分一栏、换大一号的纸，或调小行距。`
      : `超出一页，还有 ${left} 字没写上。打开“自动缩小”或调小字号。`;
    statusEl.append(' · ', el('span', { class: 'warn' }, msg));
  }
}

// ---------- viewing ----------

const zoomBtn = $('zoom');
function setFit(fit, focus) {
  viewport.classList.toggle('fit', fit);
  zoomBtn.setAttribute('aria-pressed', String(!fit));
  zoomBtn.textContent = fit ? '原尺寸查看' : '适应窗口';
  loupe.hidden = true;
  sheet.style.width = fit ? '' : sheet.width / (window.devicePixelRatio || 1) + 'px';
  if (!fit && focus) {
    const w = sheet.getBoundingClientRect().width, h = sheet.getBoundingClientRect().height;
    viewport.scrollLeft = focus[0] * w - viewport.clientWidth / 2;
    viewport.scrollTop = focus[1] * h - viewport.clientHeight / 2;
  }
}
zoomBtn.addEventListener('click', () => setFit(!viewport.classList.contains('fit')));
sheet.addEventListener('click', (e) => {
  if (!viewport.classList.contains('fit')) return;
  const r = sheet.getBoundingClientRect();
  setFit(false, [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]);
});

const LOUPE = 240;
sheet.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !viewport.classList.contains('fit')) return;
  const r = sheet.getBoundingClientRect(), vr = viewport.getBoundingClientRect();
  const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return;
  const dpr = window.devicePixelRatio || 1;
  if (loupe.width !== LOUPE * dpr) loupe.width = loupe.height = LOUPE * dpr;
  // at least 1 sheet pixel per CSS pixel, and always clearly bigger than the fitted view
  const scale = Math.max(1, (r.width / sheet.width) * 2.2);
  const side = LOUPE / scale;
  const ctx = loupe.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#888';
  ctx.fillRect(0, 0, loupe.width, loupe.height);
  ctx.drawImage(sheet, u * sheet.width - side / 2, v * sheet.height - side / 2, side, side, 0, 0, loupe.width, loupe.height);
  loupe.style.left = e.clientX - vr.left + viewport.scrollLeft - LOUPE / 2 + 'px';
  loupe.style.top = e.clientY - vr.top + viewport.scrollTop - LOUPE / 2 + 'px';
  loupe.hidden = false;
});
sheet.addEventListener('pointerleave', () => (loupe.hidden = true));

// ---------- saving ----------

// Inside a claude.ai artifact, files go through the viewer's downloads
// capability; on a normal page a plain download link works.
const inViewer = !!(window.claude && window.claude.use);
const downloadsP = inViewer ? window.claude.use('downloads').catch(() => null) : Promise.resolve(undefined);
const dlButtons = [$('dl-png'), $('dl-jpg'), $('dl-pdf')];
downloadsP.then((d) => {
  if (d === null) for (const b of dlButtons) b.hidden = true;
});

// Returns false when the viewer declined or saving failed, to stop a batch.
async function saveFile(name, blob) {
  const d = await downloadsP;
  if (d) {
    try {
      await d.save({ filename: name, data: blob });
    } catch (e) {
      if (e && e.code !== 'declined') statusEl.textContent = '没能保存：' + (e.message || e.code);
      return false;
    }
    return true;
  }
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return true;
}

// Images save one file per page; the PDF holds every page at real paper size.
async function download(type) {
  const pages = last ? last.pages : [sheet];
  const base = `cheatsheet-${state.seed}`;
  if (type === 'application/pdf') {
    const [w, h] = last ? last.sizeMm : [PAGES[state.page].w, PAGES[state.page].h];
    await saveFile(`${base}.pdf`, await pagesToPdf(pages, w, h));
    return;
  }
  const ext = type === 'image/png' ? 'png' : 'jpg';
  for (let i = 0; i < pages.length; i++) {
    const blob = await new Promise((r) => pages[i].toBlob(r, type, 0.92));
    if (!blob || !(await saveFile(`${base}${pages.length > 1 ? '-p' + (i + 1) : ''}.${ext}`, blob))) return;
  }
}
$('dl-png').addEventListener('click', () => download('image/png'));
$('dl-jpg').addEventListener('click', () => download('image/jpeg'));
$('dl-pdf').addEventListener('click', () => download('application/pdf'));

schedule(0);
