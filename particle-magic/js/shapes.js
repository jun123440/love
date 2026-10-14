import { TAU, gauss, clamp } from './util.js';

export const SHAPES = {
  axis:    { n: '1', glyph: '一', name: '光轴',   hue: 0.00, spin: 0.00 },
  vesica:  { n: '2', glyph: '二', name: '双弧',   hue: 0.45, spin: 0.00 },
  rings:   { n: '3', glyph: '三', name: '三重环', hue: 0.85, spin: 0.05 },
  star:    { n: '4', glyph: '四', name: '四芒',   hue: 0.20, spin: 0.09 },
  rosette: { n: '5', glyph: '五', name: '五瓣莲', hue: 0.62, spin: 0.00 },
  spiral:  { n: '0', glyph: '〇', name: '星云旋', hue: 0.15, spin: 0.34 },
};

export const GESTURE_MAP = ['spiral', 'axis', 'vesica', 'rings', 'star', 'rosette'];

function emit(rel, size, ct, i, x, y, s, c) {
  rel[i * 2]     = x;
  rel[i * 2 + 1] = y;
  size[i]        = s;
  ct[i]          = c;
}

const BUILDERS = {

  axis(n, rel, size, ct) {
    for (let i = 0; i < n; i++) {
      const halo = Math.random() < .22;
      const u = (i + .5) / n;
      let y = (u - .5) * 1.92;
      if (halo) y = (Math.random() - .5) * 1.5;
      const spread = halo ? .30 : .045;
      const x = gauss() * spread;
      const core = clamp(1 - Math.abs(y) / .96, 0, 1);
      emit(rel, size, ct, i, x, y,
        (halo ? .50 : .72) + core * 1.35 + Math.random() * .48,
        halo ? .18 + Math.random() * .22 : .30 + core * .70);
    }
  },

  vesica(n, rel, size, ct) {
    const w = 1.0, d = .52;
    const R = Math.hypot(w, d);
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      let x, y, glow;
      if (r < .72) {
        const t = Math.random() * 2 - 1;
        x = t * w;
        y = (Math.sqrt(Math.max(0, R * R - x * x)) - d);
        glow = .30 + .70 * Math.pow(Math.abs(t), 3);
      } else if (r < .93) {
        const t = Math.random() * 2 - 1;
        x = t * w;
        const base = Math.sqrt(Math.max(0, R * R - x * x)) - d;
        y = (Math.random() < .5 ? -1 : 1) * Math.sqrt(Math.random()) * base;
        glow = .26 + .34 * Math.pow(Math.abs(t), 3);
      } else {
        const a = Math.random() * TAU;
        x = Math.cos(a) * .055; y = Math.sin(a) * .040;
        glow = 1;
      }
      emit(rel, size, ct, i, x, y,
        .58 + glow * 1.30 + Math.random() * .44, .18 + glow * .76);
    }
  },

  rings(n, rel, size, ct) {
    const radii = [.34, .68, 1.0];
    const share = [.22, .28, .50];
    const PHI = 2.399963;
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      let ring = 2;
      if (r < share[0]) ring = 0; else if (r < share[0] + share[1]) ring = 1;
      const R = radii[ring];
      const a = i * PHI + ring * 1.7;
      const t = R + gauss() * .026;
      emit(rel, size, ct, i, Math.cos(a) * t, Math.sin(a) * t,
        .58 + ring * .50 + Math.random() * .40, .28 + ring * .24 + Math.random() * .18);
    }
  },

  star(n, rel, size, ct) {
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      let x, y, glow;
      if (r < .42) {
        const d = Math.pow(Math.random(), .55) * .99;
        x = (Math.random() < .5 ? -d : d); y = gauss() * .034;
        glow = 1 - d;
      } else if (r < .84) {
        const d = Math.pow(Math.random(), .55) * .99;
        y = (Math.random() < .5 ? -d : d); x = gauss() * .034;
        glow = 1 - d;
      } else {
        const a = Math.random() * TAU, d = Math.pow(Math.random(), 1.6) * .20;
        x = Math.cos(a) * d; y = Math.sin(a) * d;
        glow = 1 - d * 4;
      }
      emit(rel, size, ct, i, x, y,
        .54 + glow * 1.50 + Math.random() * .44, .18 + glow * .80);
    }
  },

  rosette(n, rel, size, ct) {
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU * 7;
      const petal = Math.pow(Math.abs(Math.cos(2.5 * th)), .55);
      let r = .28 + .72 * petal;
      const fill = Math.random();
      if (fill < .12) r = .24 + Math.random() * .07;
      else if (fill < .20) r = 1.0 + Math.random() * .06;
      r += gauss() * .028;
      const x = Math.cos(th) * r, y = Math.sin(th) * r;
      emit(rel, size, ct, i, x, y,
        .54 + petal * 1.25 + Math.random() * .44, .20 + petal * .78);
    }
  },

  spiral(n, rel, size, ct) {
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n;
      let x, y, glow, s;
      if (Math.random() < .085) {
        const a = Math.random() * TAU, d = Math.pow(Math.random(), .60) * .22;
        x = Math.cos(a) * d; y = Math.sin(a) * d;
        glow = .82; s = 1.35 + Math.random() * 1.00;
      } else {
        const arm = i & 1;
        const th = u * TAU * 3.15 + arm * Math.PI;
        const r = Math.pow(u, .80);
        const turb = gauss() * .026;
        const rr = r + turb;
        x = Math.cos(th) * rr;
        y = Math.sin(th) * rr * .90;
        glow = 1 - r;
        s = .58 + glow * 1.30 + Math.random() * .44;
      }
      emit(rel, size, ct, i, x, y, s, .16 + glow * .84);
    }
  },
};

// 逆向自「Beneath The Seventh」：密集主体之外还有一大片弥散尘埃（约占画面 8%）。
// 取末尾 frac 比例的粒子沿径向外推到 1~1+spread 倍，半径越小推得越远。
function addHalo(rel, size, ct, n, frac, spread, dim) {
  const cnt = Math.min(n, Math.floor(n * frac));
  for (let k = 0; k < cnt; k++) {
    const i = n - 1 - k;
    const x = rel[i * 2], y = rel[i * 2 + 1];
    const r = Math.hypot(x, y);
    if (r < 1e-5) { rel[i * 2] = (Math.random() - .5) * .1; rel[i * 2 + 1] = (Math.random() - .5) * .1; continue; }
    const nr = r * (1 + Math.pow(Math.random(), 1.25) * spread);
    rel[i * 2]     = (x / r) * nr;
    rel[i * 2 + 1] = (y / r) * nr;
    size[i] = size[i] * .74;
    ct[i]   = ct[i] * dim;
  }
}

export function buildShape(kind, n) {
  const rel = new Float32Array(n * 2);
  const size = new Float32Array(n);
  const ct = new Float32Array(n);
  (BUILDERS[kind] || BUILDERS.rings)(n, rel, size, ct);
  addHalo(rel, size, ct, n, .46, 2.85, 1.0);
  return { rel, size, ct };
}