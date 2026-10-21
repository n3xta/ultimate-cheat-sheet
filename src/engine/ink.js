// Turns crisp font rendering into ink on paper, in three pixel passes over
// the ink layer:
//   1. displace: two noise fields push pixels around. A medium one (about
//      half an em) bends strokes so repeated letters never match; a fine one
//      (a few px) chews up the edges.
//   2. bleed: box-blur the premultiplied ink, the way it wicks into fibres.
//   3. re-ink: push the blurred alpha back through a soft threshold (pooling
//      at the stroke cores), then modulate by flow, ballpoint skips or pencil
//      grain.

import { noiseTile, pixelHash } from './rng.js';

const smoothstep = (a, b, t) => {
  if (b <= a) return t >= b ? 1 : 0;
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

function boxBlur(buf, W, H, r) {
  if (r < 1) return;
  const div = 2 * r + 1;
  const row = new Float32Array(W * 4);
  // horizontal, in place, one row at a time
  for (let y = 0; y < H; y++) {
    const o = y * W * 4;
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += buf[o + Math.min(W - 1, Math.max(0, k)) * 4 + c];
      for (let x = 0; x < W; x++) {
        row[x * 4 + c] = sum / div;
        sum += buf[o + Math.min(W - 1, x + r + 1) * 4 + c] - buf[o + Math.max(0, x - r) * 4 + c];
      }
    }
    for (let i = 0; i < W * 4; i++) buf[o + i] = row[i];
  }
  // vertical, with running column sums so memory is walked row by row
  const sums = new Float32Array(W * 4);
  const src = buf.slice();
  const rowAt = (y) => Math.min(H - 1, Math.max(0, y)) * W * 4;
  for (let k = -r; k <= r; k++) {
    const o = rowAt(k);
    for (let i = 0; i < W * 4; i++) sums[i] += src[o + i];
  }
  for (let y = 0; y < H; y++) {
    const o = y * W * 4, add = rowAt(y + r + 1), sub = rowAt(y - r);
    for (let i = 0; i < W * 4; i++) {
      buf[o + i] = sums[i] / div;
      sums[i] += src[add + i] - src[sub + i];
    }
  }
}

export function processInk(ctx, W, H, p) {
  const { pen, em, mess, rng } = p;
  const img = ctx.getImageData(0, 0, W, H);
  const src = img.data;
  const buf = new Uint8ClampedArray(src.length);

  const M = noiseTile(rng, em * 0.5, 320), Mx = M.data, My = noiseTile(rng, em * 0.5, 320).data;
  const F = noiseTile(rng, Math.max(2, em * 0.09), 160), Fx = F.data, Fy = noiseTile(rng, Math.max(2, em * 0.09), 160).data;
  const ampM = em * 0.04 * (0.35 + mess);
  const ampF = Math.max(0.4, em * 0.035) * pen.rough;
  const sM = M.size, sF = F.size;

  // 1. displace (nearest-neighbour; the blur below smooths the steps)
  for (let y = 0, i = 0; y < H; y++) {
    const rM = (y % sM) * sM, rF = (y % sF) * sF;
    let xm = 0, xf = 0;
    for (let x = 0; x < W; x++, i += 4) {
      const dx = ampM * Mx[rM + xm] + ampF * Fx[rF + xf];
      const dy = ampM * My[rM + xm] + ampF * Fy[rF + xf];
      if (++xm === sM) xm = 0;
      if (++xf === sF) xf = 0;
      let sx = Math.round(x + dx), sy = Math.round(y + dy);
      if (sx < 0) sx = 0; else if (sx >= W) sx = W - 1;
      if (sy < 0) sy = 0; else if (sy >= H) sy = H - 1;
      const si = (sy * W + sx) << 2;
      const a = src[si + 3];
      if (!a) continue;
      buf[i] = (src[si] * a) / 255;
      buf[i + 1] = (src[si + 1] * a) / 255;
      buf[i + 2] = (src[si + 2] * a) / 255;
      buf[i + 3] = a;
    }
  }

  // 2. bleed
  boxBlur(buf, W, H, pen.blur ? Math.max(1, Math.round(pen.blur * em)) : 0);

  // 3. re-ink
  const flow = noiseTile(rng, em * 2.2, 384), flowD = flow.data, sFl = flow.size;
  const skip = noiseTile(rng, Math.max(1.5, em * 0.07), 128), skipD = skip.data, sSk = skip.size;
  const { lo, hi, crisp } = pen;
  for (let y = 0, i = 0; y < H; y++) {
    const rFl = (y % sFl) * sFl, rSk = (y % sSk) * sSk;
    let xfl = 0, xsk = 0;
    for (let x = 0; x < W; x++, i += 4) {
      const a8 = buf[i + 3];
      const cfl = flowD[rFl + xfl], csk = skipD[rSk + xsk];
      if (++xfl === sFl) xfl = 0;
      if (++xsk === sSk) xsk = 0;
      if (!a8) {
        src[i + 3] = 0;
        continue;
      }
      const t = a8 / 255;
      let a = t + (smoothstep(lo, hi, t) - t) * crisp;
      a *= 1 - pen.flow * (0.5 + 0.5 * cfl);
      if (pen.skip) a *= 1 - pen.skip * smoothstep(0.3, 0.8, csk);
      if (pen.grain) a *= 1 - pen.grain + pen.grain * Math.pow(pixelHash(x, y, 77) * 0.6 + (csk * 0.5 + 0.5) * 0.4, 0.8);
      src[i] = (buf[i] * 255) / a8;
      src[i + 1] = (buf[i + 1] * 255) / a8;
      src[i + 2] = (buf[i + 2] * 255) / a8;
      src[i + 3] = a * 255 * pen.alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
}
