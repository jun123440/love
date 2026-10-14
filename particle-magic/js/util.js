export const TAU = Math.PI * 2;

export const clamp  = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp   = (a, b, t) => a + (b - a) * t;
export const rand   = (a, b) => a + Math.random() * (b - a);

export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function easeOutBack(t) {
  const c1 = 1.34, c3 = c1 + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

let _g = null;
export function gauss() {
  if (_g !== null) { const v = _g; _g = null; return v; }
  let u = 0, v = 0, s = 0;
  do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
  const m = Math.sqrt(-2 * Math.log(s) / s);
  _g = v * m;
  return u * m;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function frameLoop(fn) {
  let id = 0, last = performance.now(), alive = true;
  const tick = (now) => {
    if (!alive) return;
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    fn(dt, now / 1000);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => { alive = false; cancelAnimationFrame(id); };
}