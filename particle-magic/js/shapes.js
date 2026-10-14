import { TAU, gauss } from './util.js';

// 形态 0 = 大筒木白眼（冷白，跟随手部）
// 形态 1~5 = 万花筒眼五态（红瞳，居中旋转）
// 眼睛是紧凑结构，弥散尘埃要比星云形态克制得多，否则整只眼会被雾淹没
export const SHAPES = {
  byakugan: { n: '0', glyph: '〇', name: '大筒木白眼', hue: .96, spin: .030, hf: .12, hs: 1.25 },
  moh1:     { n: '1', glyph: '一', name: '三勾玉',     hue: .08, spin: .000, hf: .14, hs: 1.45 },
  moh2:     { n: '2', glyph: '二', name: '万花筒',     hue: .15, spin: .045, hf: .14, hs: 1.45 },
  moh3:     { n: '3', glyph: '三', name: '四叶瞳',     hue: .21, spin: .070, hf: .14, hs: 1.45 },
  moh4:     { n: '4', glyph: '四', name: '螺旋瞳',     hue: .12, spin: .110, hf: .15, hs: 1.55 },
  moh5:     { n: '5', glyph: '五', name: '终焉瞳',     hue: .17, spin: .060, hf: .15, hs: 1.55 },
};

export const GESTURE_MAP = ['byakugan', 'moh1', 'moh2', 'moh3', 'moh4', 'moh5'];

// 唯一跟随手部位置的形态（原 spiral 的角色）
export const FOLLOW_KIND = 'byakugan';

function emit(rel, size, ct, i, x, y, s, c) {
  rel[i * 2]     = x;
  rel[i * 2 + 1] = y;
  size[i]        = s;
  ct[i]          = c;
}

// 万花筒眼：瞳孔 + 虹膜(含离散环) + N 枚巴纹旋涡 + 外缘环
// 五个变体共用同一生成器，只改巴纹数量/卷曲度/环数/瞳孔大小
function eye(n, rel, size, ct, P) {
  const nPupil = Math.round(n * P.pupil);
  const nIris  = Math.round(n * P.iris);
  const nRim   = Math.round(n * P.halo);
  const nTomoe = Math.max(0, n - nPupil - nIris - nRim);

  let i = 0;
  const put = (x, y, s, c) => { if (i < n) emit(rel, size, ct, i++, x, y, s, c); };

  for (let k = 0; k < nPupil; k++) {
    const r = P.pr * Math.pow(Math.random(), .60);
    const a = Math.random() * TAU;
    put(Math.cos(a) * r, Math.sin(a) * r,
        P.pSize * (1.18 - r / (P.pr * 1.55)) + Math.random() * .26, P.pBright);
  }

  for (let k = 0; k < nIris; k++) {
    let r;
    if (P.rings > 1) {
      // 多环时按环分带，避免中间塌成实心饼
      r = P.irA + (P.irB - P.irA) * (0.08 + 0.84 * Math.floor(Math.random() * P.rings) / (P.rings - 1));
    } else {
      r = P.irA + Math.sqrt(Math.random()) * (P.irB - P.irA);
    }
    const a = Math.random() * TAU;
    const rr = r + gauss() * P.irJit;
    put(Math.cos(a) * rr, Math.sin(a) * rr,
        P.iSize * (.80 + Math.random() * .40), .46 + Math.random() * .34);
  }

  // 巴纹：沿半径展开时角度同步旋转，宽度中段最厚 —— 形成逗号状旋涡
  const per = Math.max(1, Math.ceil(nTomoe / P.tomoes));
  for (let k = 0; k < nTomoe; k++) {
    const idx = Math.floor(k / per) % P.tomoes;
    const u = ((k % per) + Math.random()) / per;
    const ang = idx / P.tomoes * TAU + P.dir * P.curl * Math.pow(u, 1.25);
    const rad = P.trA + (P.trB - P.trA) * u;
    const hw  = P.tw * (.30 + .70 * Math.sin(Math.PI * Math.pow(u, .78)));
    const a = ang + (Math.random() - .5) * 2 * hw;
    const r = rad + gauss() * P.tj;
    put(Math.cos(a) * r, Math.sin(a) * r,
        P.tSize * (1.16 - .52 * u) + Math.random() * .30, .72 + Math.random() * .28);
  }

  for (let k = 0; k < nRim; k++) {
    const a = Math.random() * TAU;
    const rr = P.hr + gauss() * P.hj;
    put(Math.cos(a) * rr, Math.sin(a) * rr,
        P.hSize * (.62 + Math.random() * .90), .16 + Math.random() * .28);
  }
}

// 大筒木白眼：无瞳孔，整体低对比，靠叠加出层次；细密血脉自瞳心向外分叉
// 发射顺序按半径递增：addHalo 只动末尾粒子，所以瞳心必须排在最前，否则会被甩飞
function byakugan(n, rel, size, ct) {
  const SPOKES = 44;
  const nMid  = Math.round(n * .12);
  const nVein = Math.round(n * .44);
  const nFill = Math.round(n * .32);
  const nRim  = n - nMid - nVein - nFill;

  let i = 0;
  const put = (x, y, s, c) => { if (i < n) emit(rel, size, ct, i++, x, y, s, c); };

  // 瞳心：一枚极小暗核 —— 白眼的特征
  for (let k = 0; k < nMid; k++) {
    const r = .12 * Math.pow(Math.random(), .5);
    const a = Math.random() * TAU;
    put(Math.cos(a) * r, Math.sin(a) * r,
        .46 + Math.random() * .30, .02 + Math.random() * .10);
  }

  // 血脉：自瞳心向外分叉的细密放射，越外越细
  for (let k = 0; k < nVein; k++) {
    const sp = k % SPOKES;
    const base = sp / SPOKES * TAU + Math.sin(sp * 12.9898) * .05;
    const u = Math.pow(Math.random(), .80);
    const r = .14 + u * .80;
    const a = base + Math.sin(u * 3.4 + sp) * .07 * u;
    const rr = r + gauss() * .013;
    put(Math.cos(a) * rr, Math.sin(a) * rr,
        .88 + Math.random() * .46, .80 + Math.random() * .20);
  }

  // 眼体：近乎无对比的冷白填充，密度靠叠加而非亮度堆出来
  for (let k = 0; k < nFill; k++) {
    const r = Math.sqrt(Math.random()) * .95;
    const a = Math.random() * TAU;
    put(Math.cos(a) * r, Math.sin(a) * r,
        .78 + Math.random() * .44, .62 + Math.random() * .26);
  }

  for (let k = 0; k < nRim; k++) {
    const a = Math.random() * TAU;
    const rr = .99 + gauss() * .018;
    put(Math.cos(a) * rr, Math.sin(a) * rr,
        .84 + Math.random() * .82, .72 + Math.random() * .28);
  }
}

const EYES = {
  moh1: { pupil:.10, iris:.34, halo:.16, pr:.20, pSize:1.30, pBright:1,
          irA:.14, irB:.97, rings:1, irJit:.026, iSize:1.00,
          tomoes:3, trA:.38, trB:.86, curl:.62, dir: 1, tw:.23, tj:.024, tSize:1.15,
          hr:1.00, hj:.024, hSize:.82 },
  moh2: { pupil:.09, iris:.35, halo:.16, pr:.26, pSize:1.38, pBright:1,
          irA:.12, irB:.98, rings:2, irJit:.022, iSize:1.00,
          tomoes:3, trA:.34, trB:.90, curl:.78, dir: 1, tw:.25, tj:.022, tSize:1.20,
          hr:1.02, hj:.026, hSize:.86 },
  moh3: { pupil:.08, iris:.34, halo:.16, pr:.23, pSize:1.32, pBright:1,
          irA:.12, irB:.98, rings:2, irJit:.022, iSize:1.00,
          tomoes:4, trA:.32, trB:.90, curl:.54, dir: 1, tw:.21, tj:.022, tSize:1.15,
          hr:1.02, hj:.024, hSize:.84 },
  moh4: { pupil:.08, iris:.33, halo:.17, pr:.22, pSize:1.34, pBright:1,
          irA:.12, irB:.98, rings:3, irJit:.020, iSize:.96,
          tomoes:3, trA:.20, trB:.95, curl:1.40, dir: 1, tw:.19, tj:.020, tSize:1.22,
          hr:1.03, hj:.026, hSize:.86 },
  moh5: { pupil:.07, iris:.35, halo:.18, pr:.29, pSize:1.45, pBright:1,
          irA:.10, irB:.99, rings:3, irJit:.020, iSize:1.00,
          tomoes:6, trA:.28, trB:.93, curl:.44, dir: 1, tw:.17, tj:.020, tSize:1.10,
          hr:1.04, hj:.028, hSize:.88 },
};

const BUILDERS = {
  byakugan,
  moh1: (n, r, s, c) => eye(n, r, s, c, EYES.moh1),
  moh2: (n, r, s, c) => eye(n, r, s, c, EYES.moh2),
  moh3: (n, r, s, c) => eye(n, r, s, c, EYES.moh3),
  moh4: (n, r, s, c) => eye(n, r, s, c, EYES.moh4),
  moh5: (n, r, s, c) => eye(n, r, s, c, EYES.moh5),
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
  const meta = SHAPES[kind] || SHAPES.moh3;
  (BUILDERS[kind] || BUILDERS.moh3)(n, rel, size, ct);
  addHalo(rel, size, ct, n, meta.hf, meta.hs, 1.0);
  return { rel, size, ct };
}