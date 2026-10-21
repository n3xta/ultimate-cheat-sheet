// Seeded randomness and cheap value noise. Every visual decision is driven
// from one seed, so the same text + settings + seed redraws the same sheet.

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32, plus a few helpers hung off the function.
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  // Sum of four uniforms, rescaled to unit variance: close enough to normal.
  next.gauss = () => (next() + next() + next() + next() - 2) * 1.732;
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

const smooth = (t) => t * t * (3 - 2 * t);

// Periodic value-noise tile with values in [-1, 1]. `cell` is the feature
// size in pixels; the tile is a whole number of cells so it wraps cleanly.
export function noiseTile(rng, cell, minSize = 256) {
  cell = Math.max(1, Math.round(cell));
  const g = Math.max(2, Math.round(minSize / cell));
  const size = g * cell;
  const grid = new Float32Array(g * g);
  for (let i = 0; i < grid.length; i++) grid[i] = rng() * 2 - 1;
  const i0 = new Int32Array(size), i1 = new Int32Array(size), w = new Float32Array(size);
  for (let x = 0; x < size; x++) {
    const gx = x / cell, x0 = Math.floor(gx);
    i0[x] = x0 % g;
    i1[x] = (x0 + 1) % g;
    w[x] = smooth(gx - x0);
  }
  const data = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const r0 = i0[y] * g, r1 = i1[y] * g, fy = w[y];
    for (let x = 0; x < size; x++) {
      const a = grid[r0 + i0[x]], b = grid[r0 + i1[x]];
      const c = grid[r1 + i0[x]], d = grid[r1 + i1[x]];
      const top = a + (b - a) * w[x], bot = c + (d - c) * w[x];
      data[y * size + x] = top + (bot - top) * fy;
    }
  }
  return { data, size };
}

// Unbounded smooth 2D noise in [-1, 1] for layout-scale warping.
export function makeNoise2D(seed) {
  const s = seed | 0;
  const lattice = (ix, iy) => {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ s;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 2147483647.5 - 1;
  };
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = lattice(x0, y0), b = lattice(x0 + 1, y0);
    const c = lattice(x0, y0 + 1), d = lattice(x0 + 1, y0 + 1);
    const top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  };
}

// Per-pixel white noise in [0, 1).
export function pixelHash(x, y, salt = 0) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ salt;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
