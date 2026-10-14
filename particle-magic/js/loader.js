const CACHE_NAME = 'particle-field-models-v3';

const ASSETS = [
  { f: 'hands_solution_packed_assets.data',     w: 7, mime: 'application/octet-stream' },
  { f: 'hands_solution_simd_wasm_bin.wasm',      w: 7, mime: 'application/wasm' },
  { f: 'hands_solution_simd_wasm_bin.js',        w: 1, mime: 'text/javascript' },
  { f: 'hands_solution_packed_assets_loader.js', w: 1, mime: 'text/javascript' },
  { f: 'hands.binarypb',                         w: 1, mime: 'application/octet-stream' },
  { f: 'hand_landmark_lite.tflite',              w: 6, mime: 'application/octet-stream' },
];

const TOTAL_WEIGHT = ASSETS.reduce((s, a) => s + a.w, 0);

export class LoadError extends Error {
  constructor(stage, message, hint) { super(message); this.stage = stage; this.hint = hint; }
}

async function loadScript(src) {
  await new Promise((res, rej) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = res;
    el.onerror = () => rej(new Error('脚本加载失败: ' + src));
    document.head.appendChild(el);
  });
}

async function fetchWithProgress(url, onBytes, signal) {
  const res = await fetch(url, { signal, cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const len = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !res.body.getReader) {
    const buf = await res.arrayBuffer();
    onBytes(buf.byteLength, len || buf.byteLength);
    return buf;
  }
  const reader = res.body.getReader();
  const parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.byteLength;
    onBytes(got, len);
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.byteLength; }
  return out.buffer;
}

async function probeSize(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    if (!r.ok) return 0;
    return Number(r.headers.get('content-length')) || 0;
  } catch { return 0; }
}

async function prepareModels(report, signal) {
  const urls = ASSETS.map(a => new URL('../models/' + a.f, import.meta.url).href);
  let cache = null;
  try { cache = await caches.open(CACHE_NAME); } catch { cache = null; }

  let doneWeight = 0, doneBytes = 0;
  const sizes = await Promise.all(urls.map(probeSize));
  const known = sizes.filter(s => s > 0).length === sizes.length;
  const totalBytes = known ? sizes.reduce((a, b) => a + b, 0) : 0;
  const tb = () => totalBytes;
  report(0, tb(), 0, totalBytes ? '' : '检查本地缓存');

  const urlsByName = new Map();
  let cacheHits = 0, realTotal = 0;

  for (let i = 0; i < urls.length; i++) {
    signal.throwIfAborted();
    const { f, mime, w } = ASSETS[i];
    const url = urls[i];
    const size = sizes[i] || 0;

    let blob = null;
    if (cache) {
      const hit = await cache.match(url);
      if (hit) { blob = await hit.blob(); cacheHits++; }
    }

    if (!blob) {
      try {
        const buf = await fetchWithProgress(url, (got) => {
          doneBytes += got - (ASSETS[i].done || 0);
          ASSETS[i].done = got;
          const part = size ? ASSETS[i].w * (got / size) : ASSETS[i].w;
          report(doneBytes, tb(), (doneWeight + Math.min(part, w)) / TOTAL_WEIGHT, '');
        }, signal);
        blob = new Blob([buf], { type: mime });
        if (cache) { try { await cache.put(url, new Response(buf, { headers: { 'content-type': mime } })); } catch {} }
      } catch (e) {
        throw new LoadError('download', `模型文件下载失败：${f}`, '请检查网络连接后重试。该文件来自本站服务器，不依赖任何外部 CDN。');
      }
    } else {
      doneBytes += blob.size;
    }

    realTotal += blob.size;
    ASSETS[i].done = 0;
    urlsByName.set(f, URL.createObjectURL(blob));
    doneWeight += w;
    report(doneBytes, tb(), doneWeight / TOTAL_WEIGHT, '');
  }

  return { urlsByName, cacheHits, fromCache: cacheHits === ASSETS.length, totalBytes: realTotal };
}

export async function bootHands({ report, signal }) {
  const t0 = performance.now();

  report(0, 0, 0, '加载识别引擎');
  await loadScript(new URL('../models/hands.js', import.meta.url).href);
  if (!window.Hands) throw new LoadError('engine', '识别引擎脚本已下载但未注册', '请刷新页面，或用无痕模式重试以排除扩展干扰。');

  const models = await prepareModels(report, signal);
  const locateFile = (f) => models.urlsByName.get(f) || ('models/' + f);

  report(1, 1, 1, '编译推理图');
  await new Promise(r => setTimeout(r, 16));

  const hands = new window.Hands({ locateFile });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    selfieMode: false,
  });

  try {
    if (typeof hands.initialize === 'function') await hands.initialize();
  } catch (e) {
    throw new LoadError('graph', '推理图初始化失败', (e && e.message) || 'WASM 运行时可能无法在当前浏览器中启动。');
  }

  report(1, 1, 1, '预热模型');
  const warm = document.createElement('canvas');
  warm.width = warm.height = 256;
  warm.getContext('2d').fillStyle = '#000';
  warm.getContext('2d').fillRect(0, 0, 256, 256);
  try {
    await hands.send({ image: warm });
  } catch (e) {
    throw new LoadError('warmup', '模型预热失败', (e && e.message) || '请更换最新版浏览器后重试。');
  }

  return {
    hands,
    stats: {
      fromCache: models.fromCache,
      files: ASSETS.length,
      mb: +(models.totalBytes / 1048576).toFixed(1),
      ms: Math.round(performance.now() - t0),
    },
  };
}