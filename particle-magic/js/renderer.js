import { clamp } from './util.js';

const VS_PARTICLE = `
precision highp float;
attribute vec2 aPos;
attribute vec2 aRel;
attribute vec4 aMeta;          // seed, size, colorT, hue

uniform vec2  uRes;
uniform float uTime;
uniform float uMorph;
uniform float uFree;
uniform float uEnergy;
uniform float uSpin;
uniform float uDpr;
uniform float uChurn;
uniform vec2  uFocus;    // 当前形状中心
uniform float uShapeR;   // 当前形状半径

varying vec3  vColor;
varying float vAlpha;

const float TAU = 6.28318530718;

vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(p.x*c - p.y*s, p.x*s + p.y*c); }

vec2 drift(vec2 p, float sd, float t){
  return vec2(
    sin(p.y*0.0031 + t*0.17 + sd*TAU) * 30.0 + sin(t*0.11 + sd*17.3) * 14.0,
    cos(p.x*0.0028 - t*0.14 + sd*TAU*1.5) * 30.0 + cos(t*0.085 + sd*23.7) * 14.0
  );
}

vec3 ramp(float t, float h){
  t = clamp(t, 0.0, 1.0);
  float m = clamp(h, 0.0, 1.0);
  float u = t/0.58;
  float w = (t-0.58)/0.42;
  // 标定自「Beneath The Seventh」实测均值：暗(66,6,7) 中(106,17,16) 亮(154,38,34)
  // 上限压到「亮」色附近：叠加混合会让密集区收敛到 ramp 顶端，直接用极亮值(182,94,67)会发橙
  vec3 d0 = vec3(0.190, 0.022, 0.026);
  vec3 d1 = vec3(0.420, 0.068, 0.063);
  vec3 d2 = vec3(0.640, 0.180, 0.140);
  vec3 w0 = vec3(0.150, 0.016, 0.020);
  vec3 w1 = vec3(0.330, 0.048, 0.048);
  vec3 w2 = vec3(0.560, 0.130, 0.110);
  vec3 pd = t < 0.58 ? mix(d0, d1, u) : mix(d1, d2, w);
  vec3 pw = t < 0.58 ? mix(w0, w1, u) : mix(w1, w2, w);
  return mix(pd, pw, m);
}

void main(){
  float sd   = aMeta.x;
  float k    = uMorph;
  float free = uFree;

  vec2 target = uFocus + rot(aRel, uSpin) * uShapeR;
  vec2 p = mix(aPos, target, k);
  p += drift(p, sd, uTime) * free;

  if(uChurn > 0.001){
    vec2 d = p - uFocus;
    p += normalize(d + vec2(0.0001)) * uChurn * (0.05 + 0.11*aMeta.z)
         * sin(uTime*1.05 + sd*TAU);
  }

  vec2 tang = vec2(-aRel.y, aRel.x);
  float tl = length(tang);
  if(tl > 0.0001){
    p += (tang/tl) * uShapeR * 0.050 * k
         * sin(uTime*0.85 + sd*TAU*3.0 + length(aRel)*6.5);
  }

  float rad = length(aRel);
  float core = exp(-rad*1.7);

  vec3 col = ramp(aMeta.z, aMeta.w);
  col += vec3(0.30, 0.11, 0.07) * core * 0.16;

  float sz = aMeta.y * uDpr * (uRes.y/820.0);
  sz *= (1.0 + free*0.55) * (0.62 + 0.62*uEnergy);

  vColor = col;
  vAlpha = (0.55 + 0.45*core) * mix(0.55, 1.0, uEnergy) * (0.35 + 0.65*k) * 0.88;

  gl_Position  = vec4(p.x/uRes.x*2.0-1.0, 1.0-p.y/uRes.y*2.0, 0.0, 1.0);
  gl_PointSize = clamp(sz, 1.3, 9.0);
}`;

const FS_PARTICLE = `
precision mediump float;
varying vec3  vColor;
varying float vAlpha;
void main(){
  vec2 uv = gl_PointCoord*2.0 - 1.0;
  float d = dot(uv, uv);
  if(d > 1.0) discard;
  float f = exp(-d*1.9);
  float a = f * vAlpha;
  gl_FragColor = vec4(vColor*a, a);
}`;

const VS_QUAD = `
attribute vec2 aQ;
varying vec2 vUv;
void main(){ vUv = aQ*0.5 + 0.5; gl_Position = vec4(aQ, 0.0, 1.0); }`;

const FS_BG = `
precision mediump float;
varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uFocus;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ s += a*vnoise(p); p = p*2.03 + 19.7; a *= 0.5; }
  return s;
}
void main(){
  float ar = uRes.x/uRes.y;
  vec2 p = (vUv - 0.5) * vec2(ar, 1.0);
  float t = uTime*0.011;
  vec2 q = p*1.55;
  float n1 = fbm(q + vec2(t, -t*0.62));
  float n2 = fbm(q*1.85 - vec2(t*0.74, t*0.9) + 5.3);
  float n = n1*0.66 + n2*0.34;

  vec2 fp = (uFocus/uRes - 0.5) * vec2(ar, 1.0) * -1.0;
  float glow = exp(-length(p - fp)*1.65);

  float ridge = pow(n, 2.4);
  float fine  = pow(n, 5.5);

  // 逆向自「Beneath The Seventh」：92% 画面为纯黑，背景只留极淡的血色雾
  vec3 deep = vec3(0.0000, 0.0000, 0.0000);
  vec3 mid  = vec3(0.0110, 0.0016, 0.0018);
  vec3 hi   = vec3(0.0330, 0.0062, 0.0060);
  vec3 col = deep + mid*ridge*0.70 + hi*fine*0.85;
  col += vec3(0.0180, 0.0030, 0.0030)*glow*0.55;
  gl_FragColor = vec4(col, 1.0);
}`;

const FS_BLUR = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform vec2 uDir;
uniform float uThresh;
void main(){
  vec2 o = uDir * uTexel;
  vec3 s = vec3(0.0);
  s += texture2D(uTex, vUv).rgb               * 0.2270270;
  s += texture2D(uTex, vUv + o*1.3846).rgb     * 0.1945946 * 2.0;
  s += texture2D(uTex, vUv - o*1.3846).rgb     * 0.1945946 * 2.0;
  s += texture2D(uTex, vUv + o*3.2308).rgb     * 0.1216216 * 2.0;
  s += texture2D(uTex, vUv - o*3.2308).rgb     * 0.1216216 * 2.0;
  s += texture2D(uTex, vUv + o*5.1764).rgb     * 0.0540541 * 2.0;
  s += texture2D(uTex, vUv - o*5.1764).rgb     * 0.0540541 * 2.0;
  s += texture2D(uTex, vUv + o*7.1080).rgb     * 0.0162162 * 2.0;
  s += texture2D(uTex, vUv - o*7.1080).rgb     * 0.0162162 * 2.0;
  if(uThresh < 0.0){
    gl_FragColor = vec4(s, 1.0);
  } else {
    float l = dot(s, vec3(0.2126,0.7152,0.0722));
    gl_FragColor = vec4(s * smoothstep(uThresh, uThresh+0.30, l), 1.0);
  }
}`;

const FS_COMPOSITE = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uBg;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2  uRes;
uniform float uTime;
uniform float uBloomAmt;
void main(){
  vec3 col = texture2D(uBg, vUv).rgb
           + texture2D(uScene, vUv).rgb
           + texture2D(uBloom, vUv).rgb * uBloomAmt;

  vec2 p = vUv - 0.5;
  p.x *= uRes.x/uRes.y;
  col *= mix(0.70, 1.0, smoothstep(1.10, 0.24, length(p)));

  // 软压高光；不做 gamma 提亮，保持纯黑底
  col = col / (col + vec3(1.0)) * 1.70;
  col = min(col, vec3(1.0));
  col = pow(max(col, 0.0), vec3(1.06));

  float g = fract(sin(dot(vUv*uRes + fract(uTime), vec2(12.9898,78.233)))*43758.5453);
  col += (g - 0.5)*0.012;

  gl_FragColor = vec4(col, 1.0);
}`;

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('着色器编译失败: ' + log);
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('着色器链接失败: ' + gl.getProgramInfoLog(p));
  }
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name);
  }
  const a = {};
  const an = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < an; i++) {
    const info = gl.getActiveAttrib(p, i);
    a[info.name] = gl.getAttribLocation(p, info.name);
  }
  return { p, u, a };
}

function makeTarget(gl, w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, w, h };
}

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  if (!gl) throw new Error('当前浏览器不支持 WebGL');

  const pP = program(gl, VS_PARTICLE, FS_PARTICLE);
  const pB = program(gl, VS_QUAD, FS_BG);
  const pL = program(gl, VS_QUAD, FS_BLUR);
  const pC = program(gl, VS_QUAD, FS_COMPOSITE);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  const buf = { pos: gl.createBuffer(), rel: gl.createBuffer(), meta: gl.createBuffer() };

  let count = 0;
  let aPos = new Float32Array(0);
  let aRel = new Float32Array(0);
  let aMeta = new Float32Array(0);

  const S = {
    morph: 0,
    free: 1, energy: .22,
    cx: 0, cy: 0, r: 1, spin: 0,
    churn: 0, bound: false,
  };

  let W = 1, H = 1, DPR = 1;
  let scene = null, bA = null, bB = null, bgT = null;
  const BG_DIV = 4, BLOOM_DIV = 4;

function allocate(n) {
    count = n;
    aPos   = new Float32Array(n * 2);
    aRel   = new Float32Array(n * 2);
    aMeta  = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      aPos[i * 2]     = Math.random() * W;
      aPos[i * 2 + 1] = Math.random() * H;
      aRel[i * 2]     = (Math.random() - .5) * .4;
      aRel[i * 2 + 1] = (Math.random() - .5) * .4;
      aMeta[i * 4]     = Math.random();
      aMeta[i * 4 + 1] = 0.8 + Math.random() * 2.2;
      aMeta[i * 4 + 2] = Math.random();
      aMeta[i * 4 + 3] = 0;
    }
    uploadAll();
  }

// 仅替换形状数据，不重置 morph / uniforms —— 降档时原地换粒子，避免整帧闪断
function pushShapeData(rel, size, ct, newHue) {
    if (!count) return;
    const n = count;
    aRel.set(rel.subarray(0, n * 2));
    for (let i = 0; i < n; i++) {
      aMeta[i * 4]     = Math.random();
      aMeta[i * 4 + 1] = size[i];
      aMeta[i * 4 + 2] = ct[i];
      aMeta[i * 4 + 3] = newHue;
    }
    uploadAll();
  }

function uploadAll() {
    const mk = (b, arr) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
    };
    mk(buf.pos, aPos);
    mk(buf.rel, aRel);
    mk(buf.meta, aMeta);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(window.innerWidth * DPR));
    const h = Math.max(1, Math.round(window.innerHeight * DPR));
    if (w === W && h === H) return;
    const ow = W, oh = H;
    W = canvas.width = w;
    H = canvas.height = h;

    if (count && !S.bound && ow > 1 && oh > 1) {
      const sx = W / ow, sy = H / oh;
      for (let i = 0; i < count; i++) { aPos[i * 2] *= sx; aPos[i * 2 + 1] *= sy; }
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos);
      gl.bufferData(gl.ARRAY_BUFFER, aPos, gl.DYNAMIC_DRAW);
    }

    for (const t of [scene, bA, bB, bgT]) {
      if (!t) continue;
      gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo);
    }
    scene = makeTarget(gl, W, H);
    const bw = Math.max(1, Math.round(W / BLOOM_DIV)), bh = Math.max(1, Math.round(H / BLOOM_DIV));
    bA = makeTarget(gl, bw, bh);
    bB = makeTarget(gl, bw, bh);
    bgT = makeTarget(gl, Math.max(1, Math.round(W / BG_DIV)), Math.max(1, Math.round(H / BG_DIV)));
  }

function bindQuad(pr) {
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(pr.a.aQ);
    gl.vertexAttribPointer(pr.a.aQ, 2, gl.FLOAT, false, 0, 0);
  }

function bindParticles() {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos);
    gl.enableVertexAttribArray(pP.a.aPos);  gl.vertexAttribPointer(pP.a.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.rel);
    gl.enableVertexAttribArray(pP.a.aRel);  gl.vertexAttribPointer(pP.a.aRel, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.meta);
    gl.enableVertexAttribArray(pP.a.aMeta); gl.vertexAttribPointer(pP.a.aMeta, 4, gl.FLOAT, false, 0, 0);
  }

  function setShape(rel, size, ct, newHue, cx, cy, radius, churn) {
    if (!count) return;
    const n = count;
    const cos = Math.cos(S.spin), sin = Math.sin(S.spin);
    if (S.bound && S.morph > .5) {
      for (let i = 0; i < n; i++) {
        const rx = aRel[i * 2], ry = aRel[i * 2 + 1];
        aPos[i * 2]     = S.cx + (rx * cos - ry * sin) * S.r;
        aPos[i * 2 + 1] = S.cy + (rx * sin + ry * cos) * S.r;
      }
    }
    aRel.set(rel.subarray(0, n * 2));
    for (let i = 0; i < n; i++) {
      aMeta[i * 4 + 1] = size[i];
      aMeta[i * 4 + 2] = ct[i];
      aMeta[i * 4 + 3] = newHue;
    }
    S.cx = cx; S.cy = cy; S.r = radius; S.spin = 0; S.churn = churn || 0; S.bound = true;
    S.morph = 0;
    uploadAll();
  }

  function release() {
    S.bound = false;
    S.morph = 0;
  }

  function render(time) {
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, bgT.fbo);
    gl.viewport(0, 0, bgT.w, bgT.h);
    gl.useProgram(pB.p);
    bindQuad(pB);
    gl.uniform2f(pB.u.uRes, W, H);
    gl.uniform1f(pB.u.uTime, time);
    gl.uniform2f(pB.u.uFocus, S.cx, S.cy);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(pP.p);
    bindParticles();
    gl.uniform2f(pP.u.uRes, W, H);
    gl.uniform1f(pP.u.uTime, time);
    gl.uniform1f(pP.u.uMorph, S.morph);
    gl.uniform1f(pP.u.uFree, S.free);
    gl.uniform1f(pP.u.uEnergy, S.energy);
    gl.uniform1f(pP.u.uSpin, S.spin);
    gl.uniform1f(pP.u.uDpr, DPR);
    gl.uniform1f(pP.u.uChurn, S.churn);
    gl.uniform2f(pP.u.uFocus, S.cx, S.cy);
    gl.uniform1f(pP.u.uShapeR, S.r);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, bA.fbo);
    gl.viewport(0, 0, bA.w, bA.h);
    gl.useProgram(pL.p);
    bindQuad(pL);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.uniform1i(pL.u.uTex, 0);
    gl.uniform2f(pL.u.uTexel, 1 / W, 1 / H);
    gl.uniform2f(pL.u.uDir, 1, 0);
    gl.uniform1f(pL.u.uThresh, 0.45);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, bB.fbo);
    gl.viewport(0, 0, bB.w, bB.h);
    gl.bindTexture(gl.TEXTURE_2D, bA.tex);
    gl.uniform2f(pL.u.uDir, 0, 1);
    gl.uniform1f(pL.u.uThresh, -1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(pC.p);
    bindQuad(pC);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bgT.tex);    gl.uniform1i(pC.u.uBg, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, scene.tex);  gl.uniform1i(pC.u.uScene, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, bB.tex);     gl.uniform1i(pC.u.uBloom, 2);
    gl.uniform2f(pC.u.uRes, W, H);
    gl.uniform1f(pC.u.uTime, time);
    gl.uniform1f(pC.u.uBloomAmt, 0.12);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.activeTexture(gl.TEXTURE0);
  }

  resize();

  return {
    gl, resize, render,
    allocate,
    pushShapeData,
    get count() { return count; },
    get size() { return { w: W, h: H, dpr: DPR }; },
    setShape, release,
    S,
    setFocus(x, y) { S.cx = x; S.cy = y; },
    setRadius(r) { S.r = r; },
    advanceSpin(dt, speed) { S.spin += dt * speed; },
    setIdle(rx, ry) {
      if (!count) return;
      for (let i = 0; i < count; i++) {
        aPos[i * 2]     = rx + (Math.random() - .5) * W;
        aPos[i * 2 + 1] = ry + (Math.random() - .5) * H;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos);
      gl.bufferData(gl.ARRAY_BUFFER, aPos, gl.DYNAMIC_DRAW);
    },
    info() {
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    },
    clamp,
  };
}