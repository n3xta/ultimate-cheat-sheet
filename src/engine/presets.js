// Fonts, hands, pens, paper and page sizes. Units: font `scale` and `dy` are
// in em; page sizes and margins in mm.

// `scale` evens out the very different x-heights of handwriting fonts so a
// "5pt" sheet looks about the same size whichever hand is picked.
export const FONTS = {
  caveat: { family: 'Caveat', scale: 1.0 },
  nanum: { family: 'Nanum Pen Script', scale: 1.08 },
  reenie: { family: 'Reenie Beanie', scale: 1.14 },
  jah: { family: 'Just Another Hand', scale: 1.18 },
  gochi: { family: 'Gochi Hand', scale: 0.9 },
  grace: { family: 'Covered By Your Grace', scale: 0.98 },
  rocksalt: { family: 'Rock Salt', scale: 0.7 },
  zeyada: { family: 'Zeyada', scale: 1.1 },
  marker: { family: 'Permanent Marker', scale: 0.86 },
  longcang: { family: 'Long Cang', scale: 0.86, cjk: true, dy: 0.04 },
  zhimang: { family: 'Zhi Mang Xing', scale: 0.9, cjk: true, dy: 0.04 },
  liujian: { family: 'Liu Jian Mao Cao', scale: 0.92, cjk: true, dy: 0.04 },
  mashan: { family: 'Ma Shan Zheng', scale: 0.84, cjk: true, dy: 0.04 },
};

// A hand mixes a few similar fonts so the same letter never repeats exactly.
// `mix` are the odds of each latin font per word; `cjkMix` per character.
export const HANDS = {
  rush: {
    label: '考前狂写',
    latin: ['caveat', 'nanum', 'reenie'], mix: [0.62, 0.26, 0.12],
    cjk: ['longcang', 'zhimang'], cjkMix: [0.86, 0.14],
    head: 'marker', headCjk: 'zhimang',
    slant: 0.12, track: -0.012, space: 0.85,
  },
  squeeze: {
    label: '挤到极限',
    latin: ['jah', 'nanum'], mix: [0.7, 0.3],
    cjk: ['longcang'], cjkMix: [1],
    head: 'marker', headCjk: 'zhimang',
    slant: 0.08, track: -0.03, space: 0.7,
  },
  neat: {
    label: '工整笔记',
    latin: ['gochi', 'caveat'], mix: [0.8, 0.2],
    cjk: ['longcang', 'mashan'], cjkMix: [0.9, 0.1],
    head: 'grace', headCjk: 'mashan',
    slant: 0.04, track: 0, space: 0.9,
  },
  wild: {
    label: '狂草',
    latin: ['reenie', 'zeyada', 'rocksalt'], mix: [0.5, 0.32, 0.18],
    cjk: ['liujian', 'zhimang'], cjkMix: [0.6, 0.4],
    head: 'rocksalt', headCjk: 'liujian',
    slant: 0.2, track: 0, space: 1,
  },
};

// Ink behaviour after the glyphs are drawn (see ink.js):
// blur = bleed radius in em, lo/hi/crisp = how hard the bled edge is
// re-thresholded, flow = patchy density, skip = ballpoint dry spots,
// grain = pencil tooth, rough = edge displacement, alpha = overall opacity.
export const PENS = {
  gel: { label: '中性笔', blur: 0.04, lo: 0.1, hi: 0.55, crisp: 0.75, flow: 0.16, skip: 0, grain: 0, rough: 1, alpha: 1 },
  ballpoint: { label: '圆珠笔', blur: 0.035, lo: 0.15, hi: 0.7, crisp: 0.55, flow: 0.22, skip: 0.28, grain: 0, rough: 0.85, alpha: 0.95 },
  fountain: { label: '钢笔', blur: 0.05, lo: 0.06, hi: 0.5, crisp: 0.6, flow: 0.38, skip: 0, grain: 0, rough: 1.25, alpha: 1 },
  pencil: { label: '铅笔', blur: 0, lo: 0, hi: 1, crisp: 0, flow: 0.2, skip: 0, grain: 0.5, rough: 0.7, alpha: 0.95 },
};

export const INKS = {
  blueblack: { label: '蓝黑', rgb: [30, 40, 88] },
  black: { label: '黑', rgb: [24, 24, 28] },
  blue: { label: '蓝', rgb: [28, 62, 170] },
  green: { label: '墨绿', rgb: [24, 84, 62] },
};
export const GRAPHITE = [50, 50, 56];

export const ACCENTS = {
  red: { label: '红', rgb: [200, 32, 42] },
  blue: { label: '蓝', rgb: [32, 74, 200] },
  green: { label: '绿', rgb: [22, 128, 72] },
  same: { label: '同墨色', rgb: null },
};

export const MARKERS = {
  yellow: { label: '黄', rgb: [255, 232, 64] },
  green: { label: '绿', rgb: [150, 238, 110] },
  pink: { label: '粉', rgb: [255, 140, 196] },
  blue: { label: '蓝', rgb: [120, 204, 255] },
};

// rule: grid | lines | dots | none. Colours are drawn before the grain pass.
export const PAPERS = {
  grid: { label: '方格纸', base: '#fbfbf7', rule: 'grid', ink: 'rgba(84, 132, 200, 0.30)', step: 5 },
  lines: { label: '横线本', base: '#fcfbf6', rule: 'lines', ink: 'rgba(84, 132, 200, 0.40)', step: 6, margin: 'rgba(226, 70, 70, 0.45)' },
  dots: { label: '点阵', base: '#fbfaf6', rule: 'dots', ink: 'rgba(90, 92, 110, 0.45)', step: 5 },
  legal: { label: '黄拍纸', base: '#fbf2a4', rule: 'lines', ink: 'rgba(90, 140, 205, 0.5)', step: 7, margin: 'rgba(220, 70, 70, 0.55)' },
  kraft: { label: '牛皮纸', base: '#cfae7c', rule: 'none', fibers: true },
  blank: { label: '白纸', base: '#f9f8f3', rule: 'none' },
};

export const PAGES = {
  a5: { label: 'A5', w: 148, h: 210, margin: 4 },
  a4: { label: 'A4', w: 210, h: 297, margin: 5 },
  letter: { label: 'Letter', w: 215.9, h: 279.4, margin: 5 },
  card46: { label: '4×6 卡片', w: 152.4, h: 101.6, margin: 3 },
  card35: { label: '3×5 卡片', w: 127, h: 76.2, margin: 2.5 },
};
