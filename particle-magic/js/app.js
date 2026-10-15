import { createRenderer } from './renderer.js?v=3';
import { SHAPES, GESTURE_MAP, buildShape, FOLLOW_KIND } from './shapes.js?v=3';
import { bootHands, LoadError } from './loader.js?v=3';
import { clamp, lerp, easeOutBack, easeOutCubic, easeInOutCubic, frameLoop } from './util.js?v=3';

const FORM_MS = 1900;
const RELEASE_MS = 1500;
const HOLD_MS = 2800;
const CONFIRM_FRAMES = 10;

// 出场：引擎就绪后先放一次手印，配一段同步语音，随后完全恢复常态
const INTRO_SHAPE = 'seal';
const INTRO_AUDIO = 'audio/intro.m4a';
const INTRO_HOLD_MS = 1420;      // 与音频时长一致（1.416s）
const INTRO_FORM_MS = 820;       // 出场成型比手势快，抢住音频开头
let introActive = false;
let introTimer = 0;
let introAudio = null;
let formMs = FORM_MS;

const SEAL_META = { glyph: '印', name: '手印', hue: .06, spin: 0 };

// 首次用户手势时把音频解锁，否则 play() 可能被自动播放策略拦下
function unlockIntroAudio() {
  try {
    if (!introAudio) {
      const a = document.createElement('audio');
      a.id = 'intro-audio';
      a.preload = 'auto';
      a.src = INTRO_AUDIO;
      a.hidden = true;
      document.body.appendChild(a);
      introAudio = a;
    }
    const a = introAudio;
    a.volume = 0;
    const p = a.play();
    if (p && p.then) p.then(() => { a.pause(); a.currentTime = 0; a.volume = 1; }).catch(() => { a.volume = 1; });
    else a.volume = 1;
  } catch { /* 无音频时静默降级，不影响出场动画 */ }
}

function playIntroAudio() {
  try {
    if (!introAudio) unlockIntroAudio();
    if (!introAudio) return;
    introAudio.currentTime = 0;
    const p = introAudio.play();
    if (p && p.catch) p.catch(() => {});
  } catch { /* 同上 */ }
}

function startIntro() {
  if (introActive) return;
  introActive = true;
  confirmed = -1;
  setShape(INTRO_SHAPE);
  clearTimeout(introTimer);
  introTimer = setTimeout(stopIntro, INTRO_HOLD_MS);
}

function stopIntro() {
  if (!introActive) return;
  introActive = false;
  clearTimeout(introTimer);
  introTimer = 0;
  try { if (introAudio) { introAudio.pause(); introAudio.currentTime = 0; } } catch {}
  release();
}
const FAIL_LIMIT = 30;
const STREAM_STALL_MS = 6000;

const $ = id => document.getElementById(id);
const el = {
  canvas: $('stage'), gate: $('gate'), enter: $('enter'),
  progress: $('progress'), barFill: $('bar-fill'), stageText: $('stage-text'), stagePct: $('stage-pct'),
  gateErr: $('gate-err'), legend: $('legend'),
  hud: $('hud'), readout: $('readout'), roGlyph: $('ro-glyph'), roName: $('ro-name'),
  status: $('status'), stDot: $('st-dot'), stText: $('st-text'),
  btnDebug: $('btn-debug'), btnCam: $('btn-cam'), btnStop: $('btn-stop'),
  stats: $('stats'), preview: $('preview'), video: $('video'), toast: $('toast'),
  enterDemo: $('enter-demo'),
};

function pickCount() {
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const dpr = window.devicePixelRatio || 1;
  let n = 155000;
  if (mobile) n = 60000;
  else if (cores <= 4) n = 80000;
  if (dpr > 2) n = Math.round(n * 0.72);
  return clamp(n, 18000, 220000);
}

/* ─────────────── 渲染器 ─────────────── */

let R;
try {
  R = createRenderer(el.canvas);
} catch (e) {
  el.enter.disabled = true;
  el.gateErr.hidden = false;
  el.gateErr.textContent = '⚠ ' + e.message + '　请使用最新版 Chrome / Edge，并确认已启用硬件加速。';
  throw e;
}

const S = R.S;
R.allocate(pickCount());

let phase = 'idle', phaseT = 0, fromEnergy = .22;
let currentKind = null, currentGesture = null;
let handSeen = false, handLostAt = 0;
let hand = { x: 0, y: 0, s: .12 };

function shapeRadius(kind) {
  const { w, h } = R.size;
  if (kind === INTRO_SHAPE) return Math.min(w, h) * .52;   // 手印要撑满构图
  const base = Math.min(w, h) * (kind === FOLLOW_KIND ? .40 : .34);
  return kind === FOLLOW_KIND ? clamp(hand.s * w * 1.15, base * .35, base * 1.8) : base;
}

/* ─────────────── 手势 ─────────────── */

function countFingers(lm) {
  const w = lm[0];
  const scale = Math.hypot(lm[9].x - w.x, lm[9].y - w.y) || 1e-6;
  const tips = [8, 12, 16, 20], pips = [6, 10, 14, 18];
  let c = 0;
  for (let i = 0; i < 4; i++) {
    const t = tips[i], p = pips[i];
    const dt = Math.hypot(lm[t].x - w.x, lm[t].y - w.y);
    const dp = Math.hypot(lm[p].x - w.x, lm[p].y - w.y);
    if (dt > dp * 1.15) c++;
  }
  const tm = Math.hypot(lm[4].x - lm[5].x, lm[4].y - lm[5].y) / scale;
  const tp = Math.hypot(lm[4].x - lm[17].x, lm[4].y - lm[17].y) / scale;
  if (tm > 0.58 || tp > 0.82) c++;
  return Math.min(5, c);
}

let votes = {}, confirmed = null, rawCount = -1, lastResult = 0;

function onResults(results) {
  lastResult = performance.now();
  const lms = results.multiHandLandmarks;
  if (!lms || !lms.length) {
    handSeen = false;
    rawCount = -1;
    for (const k in votes) votes[k] = Math.max(0, votes[k] - 1);
    const top = Math.max(0, ...Object.values(votes));
    if (top < 2) {
      votes = {};
      if (confirmed !== null) {
        confirmed = null;
        currentGesture = null;
        if (phase === 'formed') { handLostAt = performance.now(); setStatus('保持', ''); }
      }
    }
    paintStats();
    return;
  }

  const lm = lms[0];
  const { w, h } = R.size;
  const tx = (1 - lm[9].x) * w, ty = lm[9].y * h;
  hand.x = lerp(hand.x || tx, tx, .30);
  hand.y = lerp(hand.y || ty, ty, .30);
  hand.s = lerp(hand.s || .12, Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y), .25);

  if (!handSeen) { handSeen = true; setStatus('追踪中', ''); }
  handLostAt = 0;

  const fc = countFingers(lm);
  rawCount = fc;
  votes[fc] = (votes[fc] || 0) + 1;
  for (const k in votes) if (+k !== fc) votes[k] = Math.max(0, votes[k] - 1);

  for (const k in votes) {
    if (votes[k] >= CONFIRM_FRAMES && +k !== confirmed) {
      confirmed = +k;
      currentGesture = +k;
      const kind = GESTURE_MAP[+k];
      if (introActive) { votes = {}; break; }   // 出场期间不抢占
      if (kind !== currentKind) setShape(kind);
      else if (kind === FOLLOW_KIND) { /* 由 update 负责跟随 */ }
      votes = {};
      break;
    }
  }
  if (Math.max(0, ...Object.values(votes)) > 80) votes = {};
  paintStats();
}

function setShape(kind) {
  const meta = SHAPES[kind] || SEAL_META;
  const { w, h } = R.size;
  const built = buildShape(kind, R.count);
  fromEnergy = S.energy;
  const ctr = kind === FOLLOW_KIND ? [hand.x, hand.y] : [w * .5, h * .5];
  const hue = built.hue != null ? built.hue : meta.hue;
  R.setShape(built.rel, built.size, built.ct, hue, ctr[0], ctr[1], shapeRadius(kind), kind === FOLLOW_KIND ? 1 : 0);
  S.spin = 0;
  phase = 'forming';
  phaseT = 0;
  formMs = kind === INTRO_SHAPE ? INTRO_FORM_MS : FORM_MS;
  el.roGlyph.textContent = meta.glyph;
  el.roName.textContent = meta.name;
  el.readout.classList.add('on');
  setStatus('成型', 'busy');
  if (kind === INTRO_SHAPE) playIntroAudio();
}

function release() {
  if (phase !== 'formed' && phase !== 'forming') return;
  fromEnergy = S.energy;
  phase = 'releasing';
  phaseT = 0;
  el.readout.classList.remove('on');
  setStatus(handSeen ? '追踪中' : '待机', '');
}

/* ─────────────── 时间线 ─────────────── */

function update(dt, time) {
  phaseT += dt * 1000;

  if (phase === 'forming') {
    const p = Math.min(1, phaseT / formMs);
    S.morph = easeOutBack(p);
    S.free = lerp(1, .06, easeOutCubic(p));
    S.energy = lerp(fromEnergy, 1, easeOutCubic(p));
    if (p >= 1) {
      phase = 'formed';
      phaseT = 0;
      setStatus(handSeen ? '已成型' : '保持', '');
    }
  } else if (phase === 'formed') {
    S.morph = 1;
    S.free = .06;
    S.energy = .92 + Math.sin(time * .8) * .08;
    const meta = SHAPES[currentKind];
    if (meta && meta.spin) S.spin += dt * meta.spin;
    if (currentKind === FOLLOW_KIND && handSeen) {
      R.setFocus(hand.x, hand.y);
      R.setRadius(shapeRadius(FOLLOW_KIND) * (1 + Math.sin(time * 1.15) * .045));
    }
    if (!handSeen && handLostAt && performance.now() - handLostAt > HOLD_MS) release();
  } else if (phase === 'releasing') {
    const p = Math.min(1, phaseT / RELEASE_MS);
    S.morph = 1 - easeInOutCubic(p);
    S.free = lerp(.06, 1, p);
    S.energy = lerp(fromEnergy, .22, p);
    if (p >= 1) { phase = 'idle'; phaseT = 0; R.release(); currentKind = null; }
  } else {
    S.morph = 0;
    S.free = 1;
    S.energy = .22;
  }
}

/* ─────────────── UI ─────────────── */

let toastTimer = 0;
function toast(msg, bad) {
  el.toast.textContent = msg;
  el.toast.className = 'toast' + (bad ? ' bad' : '');
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 3200);
}
function setStatus(text, kind) {
  el.stText.textContent = text;
  el.status.className = 'status' + (kind ? ' ' + kind : '');
}

let fps = 60, frames = 0, fpsMark = performance.now(), statsOpen = false;
let probeStart = 0, probeFrames = 0, probeDone = false;
function paintStats() {
  if (!statsOpen) return;
  el.stats.textContent =
    'FPS        ' + fps.toFixed(0) + '\n' +
    '粒子       ' + R.count.toLocaleString() + '\n' +
    '画布       ' + R.size.w + '×' + R.size.h + ' @' + R.size.dpr.toFixed(1) + 'x\n' +
    '阶段       ' + phase + '\n' +
    '形状       ' + (currentKind ? SHAPES[currentKind].name : '—') + '\n' +
    '原始手指数 ' + (rawCount < 0 ? '—' : rawCount) + '\n' +
    '确认手势   ' + (confirmed === null ? '—' : confirmed) + '\n' +
    '推理耗时   ' + (inferMs ? inferMs.toFixed(1) : '—') + ' ms\n' +
    '模型       ' + (loadInfo ? loadInfo.mb + 'MB · ' + (loadInfo.fromCache ? '缓存' : loadInfo.ms + 'ms') : '—') + '\n' +
    '显卡       ' + (gpuName || '—');
}

const gpuName = (() => { try { return R.info(); } catch { return ''; } })();

/* ─────────────── 摄像头 + 推理 ─────────────── */

let hands = null, stream = null, inferLoopId = 0;
let inferBusy = false, lastVT = -1, lastFrameAt = 0, inferMs = 0, sendFails = 0;
let running = false;

function startCamera() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
    audio: false,
  });
}

function pumpInference() {
  inferLoopId = requestAnimationFrame(pumpInference);
  const v = el.video;
  if (!v.videoWidth || v.readyState < 2) return;
  if (v.currentTime === lastVT) return;
  if (inferBusy) return;
  lastVT = v.currentTime;
  lastFrameAt = performance.now();
  inferBusy = true;
  const t0 = performance.now();
  hands.send({ image: v })
    .then(() => { inferMs = inferMs * .8 + (performance.now() - t0) * .2; sendFails = 0; })
    .catch(e => {
      if (++sendFails > FAIL_LIMIT) {
        shutdown();
        toast('推理已中断：' + ((e && e.message) || '未知错误'), true);
        setStatus('已中断', 'bad');
      }
    })
    .finally(() => { inferBusy = false; });
}

function shutdown() {
  running = false;
  introActive = false;
  clearTimeout(introTimer); introTimer = 0;
  try { if (introAudio) { introAudio.pause(); introAudio.currentTime = 0; } } catch {}
  cancelAnimationFrame(inferLoopId);
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  el.video.srcObject = null;
  if (hands) { try { hands.close(); } catch {} hands = null; }
  activeAbort?.abort();
}

/* ─────────────── 启动流程 ─────────────── */

const fmtMB = b => (b / 1048576).toFixed(1);

function paintProgress(doneBytes, totalBytes, p, note) {
  const pct = clamp(p, 0, 1);
  el.barFill.style.width = (pct * 100).toFixed(1) + '%';
  el.stagePct.textContent = Math.round(pct * 100) + '%';
  if (note) el.stageText.textContent = note;
  else if (totalBytes > 500000) {
    el.stageText.textContent = '下载模型 ' + fmtMB(doneBytes) + ' / ' + fmtMB(totalBytes) + ' MB';
  } else {
    el.stageText.textContent = '下载模型 ' + Math.round(pct * 100) + '%';
  }
}

async function start() {
  if (running) return;
  el.enter.disabled = true;
  el.gateErr.hidden = true;
  el.progress.hidden = false;
  el.stageText.textContent = '请求摄像头权限';
  el.stagePct.textContent = '0%';
  setStatus('启动中', 'busy');

  const ac = new AbortController();
  activeAbort = ac;

  try {
    stream = await startCamera();
    if (ac.signal.aborted) return stopStreamOnly();

    el.video.srcObject = stream;
    await el.video.play();
    if (ac.signal.aborted) return stopStreamOnly();
    setStatus('加载模型', 'busy');

    const result = await bootHands({ signal: ac.signal, report: paintProgress });
    if (ac.signal.aborted) { result.hands.close?.(); return stopStreamOnly(); }
    hands = result.hands;

    lastVT = -1; lastFrameAt = performance.now(); sendFails = 0; inferMs = 0;
    probeDone = false; probeStart = 0;
    hands.onResults(onResults);
    running = true;

    el.gate.classList.add('leaving');
    el.hud.hidden = false;
    el.preview.hidden = false;
    el.btnCam.classList.add('active');
    setStatus('等待手入镜', 'busy');
    setTimeout(() => { el.gate.style.display = 'none'; }, 520);

    loadInfo = result.stats;
    paintStats();
    pumpInference();
    startIntro();          // 引擎就绪 → 出手印 + 同步语音，约 3 秒后自行恢复常态
  } catch (e) {
    running = false;
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    el.video.srcObject = null;
    el.enter.disabled = false;
    el.legend.hidden = false;
    const msg = e instanceof LoadError
      ? `⚠ ${e.message}${e.hint ? '\n' + e.hint : ''}`
      : cameraError(e);
    el.gateErr.textContent = msg;
    el.gateErr.hidden = false;
    el.stageText.textContent = '未完成';
    el.stagePct.textContent = '—';
    if (ac.signal.aborted) return;
    console.warn('[particle-field] start failed:', e);
  }
}

function stopStreamOnly() {
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
  el.video.srcObject = null;
  el.enter.disabled = false;
}

function cameraError(e) {
  const m = (e && e.name) || '';
  if (m === 'NotAllowedError' || m === 'SecurityError')
    return '⚠ 摄像头权限被拒绝。\n请点击地址栏左侧的锁形图标允许摄像头，然后重新点击按钮。';
  if (m === 'NotFoundError' || m === 'OverconstrainedError')
    return '⚠ 没有找到可用的摄像头设备。';
  if (m === 'NotReadableError')
    return '⚠ 摄像头被其他程序占用，请关闭其它使用摄像头的应用后重试。';
  if (location.protocol !== 'https:' && location.hostname !== 'localhost')
    return '⚠ 摄像头需要 HTTPS 环境才能访问。\n当前地址不是安全连接。';
  return '⚠ 启动失败：' + ((e && e.message) || String(e));
}

/* ─────────────── 演示模式（无摄像头时） ─────────────── */

const DEMO_ORDER = ['byakugan', 'moh1', 'moh5', 'moh4', 'moh2', 'moh3'];
let demoTimer = 0;

function startDemo(kind) {
  const { w, h } = R.size;
  hand.x = w * .5; hand.y = h * .5; hand.s = .22;
  handSeen = true; handLostAt = 0;
  running = true;
  el.hud.hidden = false;
  el.gate.classList.add('leaving');
  setTimeout(() => { el.gate.style.display = 'none'; }, 520);

  const show = k => { currentKind = null; setShape(k); };

  // 不在轮播表里的形态（例如出场手印）只展示一次，便于单独调试
  const i = DEMO_ORDER.indexOf(kind);
  if (i < 0) {
    show(kind);
    setStatus('演示中', 'busy');
    return;
  }

  show(DEMO_ORDER[i]);
  setStatus('演示中', 'busy');

  clearInterval(demoTimer);
  demoTimer = setInterval(() => {
    const j = (DEMO_ORDER.indexOf(kind) + 1) % DEMO_ORDER.length;
    show(DEMO_ORDER[j]);
  }, 5600);
}

/* ─────────────── 交互 ─────────────── */

let activeAbort = null;
let loadInfo = null;

el.enter.addEventListener('click', () => { unlockIntroAudio(); start(); });
el.enterDemo.addEventListener('click', () => {
  const p = new URLSearchParams(location.search).get('demo');
  const k = /^\d+$/.test(p || '') ? GESTURE_MAP[Number(p)] : (p || 'byakugan');
  startDemo(k);
});

el.btnDebug.addEventListener('click', () => {
  statsOpen = !statsOpen;
  el.stats.hidden = !statsOpen;
  el.btnDebug.classList.toggle('active', statsOpen);
  paintStats();
});

el.btnCam.addEventListener('click', () => {
  el.preview.hidden = !el.preview.hidden;
  el.btnCam.classList.toggle('active', !el.preview.hidden);
});

el.btnStop.addEventListener('click', () => stop());

function stop() {
  clearInterval(demoTimer);
  shutdown();
  activeAbort?.abort();
  activeAbort = null;
  release();
  el.hud.classList.add('dim');
  setStatus('已停止', '');
  toast('摄像头已关闭');
  setTimeout(() => { location.reload(); }, 1200);
}

window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'd') el.btnDebug.click();
  else if (k === 'c') el.btnCam.click();
  else if (k === 'h') el.hud.classList.toggle('dim');
  else if (k === 'r') { release(); }
  else if (k === 'escape' && running) stop();
});

window.addEventListener('resize', () => {
  const prev = R.size;
  R.resize();
  const now = R.size;
  if (prev.w === now.w && prev.h === now.h) return;
  hand.x *= now.w / prev.w;
  hand.y *= now.h / prev.h;
  if (currentKind && phase !== 'idle' && phase !== 'releasing') {
    if (currentKind === FOLLOW_KIND) { R.setFocus(hand.x, hand.y); }
    else R.setFocus(now.w * .5, now.h * .5);
    R.setRadius(shapeRadius(currentKind));
  }
});
window.addEventListener('beforeunload', shutdown);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) setStatus('已暂停', '');
  else if (!document.hidden && running) setStatus(handSeen ? '追踪中' : '等待手入镜', handSeen ? '' : 'busy');
});

/* ─────────────── 自适应画质 ─────────────── */

function autoTune(now) {
  if (probeDone || !running || !hands) return;
  if (!probeStart) { probeStart = now; return; }
  if (now - probeStart < 1500) return;
  probeFrames++;
  const dt = now - probeStart - 1500;
  if (dt < 2500) return;
  probeDone = true;
  const avg = probeFrames * 1000 / dt;
  if (avg >= 32) return;
  const next = Math.max(14000, Math.round(R.count * (avg >= 18 ? 0.42 : 0.22)));
  if (next >= R.count) return;
  const kind = currentKind;
  R.allocate(next);
  if (kind) {
    const d = buildShape(kind, R.count);
    R.pushShapeData(d.rel, d.size, d.ct, SHAPES[kind].hue);
  }
  toast('检测到设备性能有限，粒子数已降至 ' + next.toLocaleString());
}

/* ─────────────── 主循环 ─────────────── */

frameLoop((dt, time) => {
  update(dt, time);
  R.render(time);

  frames++;
  const now = performance.now();
  if (now - fpsMark >= 500) {
    fps = frames * 1000 / (now - fpsMark);
    frames = 0; fpsMark = now;
    if (statsOpen) paintStats();
  }
  autoTune(now);

  if (running && hands) {
    if (now - lastFrameAt > STREAM_STALL_MS && phase !== 'formed') {
      toast('摄像头画面没有更新，请检查设备是否被占用', true);
      lastFrameAt = now;
    }
    if (now - lastResult > 9000 && now - lastFrameAt > 2500) {
      lastFrameAt = now;
      toast('手势识别长时间无响应，可按 R 重新成型', true);
    }
  }
});

el.stageText.textContent = '准备就绪';

if (new URLSearchParams(location.search).has('demo')) el.enterDemo.click();

console.log('%c粒子场 · 就绪', 'color:#e0503f;', '\nGPU:', gpuName, '\n粒子:', R.count.toLocaleString());