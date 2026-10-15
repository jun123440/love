import { TAU, gauss, clamp } from './util.js?v=4';

// 形态 0 = 大筒木白眼（冷白，跟随手部）
// 形态 1~5 = 万花筒眼五态（红瞳，居中旋转）
// 眼睛是紧凑结构，弥散尘埃要比星云形态克制得多，否则整只眼会被雾淹没
export const SHAPES = {
  byakugan: { n: '0', glyph: '〇', name: '大筒木白眼', hue: 1.88, spin: .030, hf: .12, hs: 1.25 },
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

// ─────────── 出场手印 ───────────
// 几何不再手工拼凑：直接采样参考图实测分割出的剪影栅格（seal-mask.js）。
// 栅格由 extract 脚本从原图阈值分割 + 形态学闭运算得到，含真实的四指指缝、
// 拇指间隙和发丝遮挡，粒子落点直接贴着真实剪影。
import { GW, GH, SPAN_X, EYE, BITS_B64 } from './seal-mask.js?v=4';

const HUE_SKIN = .92;   // ramp 的肤色段（0~1 红瞳→肤色）
const HUE_RED  = .02;   // 虹膜
const HUE_COLD = 1.88;  // 巩膜/高光走冷白段

let SEAL_CELLS = null;   // inside 格的 shade(0~3)，展平后可均匀抽样
let SEAL_MAP = null;     // 实测包围盒 -> 居中 + 等比缩放

function decodeSeal() {
  if (SEAL_CELLS) return SEAL_CELLS;
  const bin = atob(BITS_B64);
  const bits = new Uint8Array(bin.length * 8);
  for (let i = 0; i < bin.length; i++)
    for (let k = 0; k < 8; k++)
      bits[i * 8 + k] = (bin.charCodeAt(i) >> (7 - k)) & 1;

  const out = [];
  for (let i = 0; i < GW * GH; i++) {
    const v = bits[i * 4] << 3 | bits[i * 4 + 1] << 2 | bits[i * 4 + 2] << 1 | bits[i * 4 + 3];
    if (v & 1) out.push(i, (v >> 1) & 3);   // 成对存：格索引 + 明度档
  }

  // 参考图里手印并不居中（原网格 x 只用到 0.81），直接映射会被画布上下裁掉指头。
  // 这里用 inside 格的真实包围盒求居中量 + 等比缩放，旋转后最大半展幅压到 0.94。
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let k = 0; k < out.length; k += 2) {
    const fx = (out[k] % GW) / GW, fy = ((out[k] / GW) | 0) / GH;
    if (fx < x0) x0 = fx;
    if (fx > x1) x1 = fx;
    if (fy < y0) y0 = fy;
    if (fy > y1) y1 = fy;
  }
  const bx = (x0 + x1) * .5, by = (y0 + y1) * .5;
  const hx = (x1 - x0) * SPAN_X, hy = y1 - y0;      // 归一化单位下的半展幅
  const cr = Math.abs(Math.cos(-.06)), sr = Math.abs(Math.sin(-.06));
  SEAL_MAP = { bx, by, fit: .94 / Math.max(hx * cr + hy * sr, hy * cr + hx * sr) };

  SEAL_CELLS = out;
  return out;
}

function handSeal(n, rel, size, ct, hue) {
  decodeSeal();
  const cells = SEAL_CELLS;
  const pairs = cells.length >> 1;
  const share = { hand: .58, eye: .22, flare: .05, dust: .15 };
  let i = 0;

  // 注意：渲染器 gl_Position.y = 1.0 - p.y/H*2.0，形状空间 +y 落到屏幕下方。
  // 下面按「数学朝向」书写，写入前取负。
  const ROT = -0.06, CR = Math.cos(ROT), SR = Math.sin(ROT);
  const put = (x, y, s, c, h) => {
    if (i >= n) return;
    emit(rel, size, ct, i, x * CR - y * SR, -(x * SR + y * CR), s, c);
    hue[i] = h;
    i++;
  };

  // 栅格坐标 -> 形状坐标（与 extract 脚本一致，再按包围盒居中等比缩放）
  const { bx, by, fit } = SEAL_MAP;
  const cellX = (g, f) => ((((g % GW) + f) / GW) - bx) * 2 * SPAN_X * fit;
  const cellY = (g, f) => (by - ((g / GW | 0) + f) / GH) * 2 * fit;

  // 眼睛位置/长短轴全部取自实测虹膜包围盒
  const ex = (EYE.cx - bx) * 2 * SPAN_X * fit;
  const ey = (by - EYE.cy) * 2 * fit;
  const erx = EYE.rx * fit, ery = EYE.ry * fit;
  // 原图里眼睛周围是巩膜和头发，不是掌心；让出手部粒子，三勾玉才不会被肤色冲掉
  const HOLE_X = erx * 1.34, HOLE_Y = ery * 1.34;

  // 手：按 inside 格均匀抽样，格内明度档决定亮度 —— 阴影处暗、受光处亮
  // 手占画面约 70% 宽，粒子必须够大才叠得住，否则摊成一层灰雾
  const nHand = Math.round(n * share.hand);
  for (let k = 0; k < nHand; k++) {
    const p = ((Math.random() * pairs) | 0) << 1;
    const g = cells[p], shade = cells[p + 1];
    const cx = cellX(g, 0), cy = cellY(g, 0);
    const hx = (cx - ex) / HOLE_X, hy = (cy - ey) / HOLE_Y;
    if (hx * hx + hy * hy < 1) continue;
    put(cx + gauss() * .005, cy + gauss() * .005,
        (1.90 + Math.random() * .95) * .86, .26 + (shade / 3) * .62 + Math.random() * .08,
        HUE_SKIN + Math.random() * .06);
  }

  // 红眼：巩膜 → 三勾玉虹膜 → 暗瞳心
  const nEye = Math.round(n * share.eye);

  // 巩膜：虹膜外一圈窄白边（原图是被血丝染红的白，不能发成光晕）
  const nScl = Math.round(nEye * .15);
  for (let k = 0; k < nScl; k++) {
    const a = Math.random() * TAU;
    const r = 1.00 + Math.random() * .13;
    put(ex + Math.cos(a) * erx * r, ey + Math.sin(a) * ery * r,
        .90 + Math.random() * .30, .30 + Math.random() * .22, HUE_COLD);
  }

  const THIRD = TAU / 3;
  for (let k = nScl; k < nEye; k++) {
    const a = Math.random() * TAU;
    const t = Math.pow(Math.random(), .40);
    const px = ex + Math.cos(a) * erx * t;
    const py = ey + Math.sin(a) * ery * t;
    if (t < .17) {                                   // 瞳心
      put(px, py, 1.30 + Math.random() * .45, .05 + Math.random() * .07, HUE_RED);
    } else if (t > .93) {                            // 暗角膜缘
      put(px, py, 1.40 + Math.random() * .45, .26 + Math.random() * .16, HUE_RED);
    } else {
      // 三勾玉：三条自瞳心向外旋的暗纹，近心端收细、外端圆厚
      let blade = 0, edge = 0;
      const w = .42 + .26 * (1 - t);
      for (let q = 0; q < 3; q++) {
        let d = (a + t * 2.30 - q * THIRD) % THIRD;
        if (d < 0) d += THIRD; else if (d > THIRD) d -= THIRD;
        d = Math.abs(d);
        if (d < w) { blade = 1; if (d > w - .06 || d < .06) edge = 1; break; }
      }
      // 底色压暗，并让三勾玉的暗纹「真的少粒子」而不是画暗粒子 ——
      // 辉光是累加的，只有密度缺口才能在 bloom 之后仍然看得见。
      if (blade) {
        if (Math.random() > .18) continue;              // 挖出暗纹
        put(px, py, 1.45 + Math.random() * .50,
            edge ? .88 + Math.random() * .12 : .10 + Math.random() * .12, HUE_RED);
      } else {
        put(px, py, 1.55 + Math.random() * .55, .34 + Math.random() * .16, HUE_RED);
      }
    }
  }

  // 横向炫光：贯穿画面的水平亮带（原图里从虹膜上三分之一横穿而过）
  const nFl = Math.round(n * share.flare);
  for (let k = 0; k < nFl; k++) {
    const u = Math.random() * 2 - 1;
    const w = Math.pow(Math.abs(u), 1.35);
    put(ex + u * erx * 9.0, ey + ery * .30 + gauss() * (.005 + .022 * w),
        1.25 + Math.random() * .60, .72 - w * .58,
        Math.abs(u) < .18 ? HUE_COLD : HUE_RED);
  }

  // 周围弥散：贴着剪影外缘，不糊满画布
  for (; i < n; i++) {
    const a = Math.random() * TAU;
    const r = Math.pow(Math.random(), .55) * 1.05 * fit;
    put(Math.cos(a) * r * SPAN_X * .72, Math.sin(a) * r,
        1.10 + Math.random() * .60, .07 + Math.random() * .13, HUE_SKIN - .35 + Math.random() * .25);
  }
}

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
  if (kind === 'seal') {
    const hue = new Float32Array(n);
    handSeal(n, rel, size, ct, hue);
    return { rel, size, ct, hue };   // 逐粒子色相；自身管理弥散，不用 addHalo
  }
  const meta = SHAPES[kind] || SHAPES.moh3;
  (BUILDERS[kind] || BUILDERS.moh3)(n, rel, size, ct);
  addHalo(rel, size, ct, n, meta.hf, meta.hs, 1.0);
  return { rel, size, ct };
}
