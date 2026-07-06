import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PLANETS = [
  { name:'太阳', nameEn:'Sun',        r:2.40, orbit:0,  speed:0,     rot:0.0008, tilt:0,    color1:'#ffcc33', color2:'#cc4400', info:'恒星 · 直径 1,392,700 km', isSun:true },
  { name:'水星', nameEn:'Mercury',    r:0.22, orbit:5,  speed:4.15,  rot:0.004,  tilt:0.03, color1:'#b0b0b0', color2:'#707070', info:'最小行星 · 直径 4,879 km' },
  { name:'金星', nameEn:'Venus',      r:0.45, orbit:8,  speed:1.62,  rot:-0.002, tilt:2.64, color1:'#e8cda0', color2:'#b8944a', info:'最热行星 · 直径 12,104 km' },
  { name:'地球', nameEn:'Earth',      r:0.52, orbit:11, speed:1.0,   rot:0.02,   tilt:0.41, useEarth:true,     info:'生命家园 · 直径 12,742 km' },
  { name:'火星', nameEn:'Mars',       r:0.32, orbit:14, speed:0.53,  rot:0.019,  tilt:0.44, color1:'#d4785c', color2:'#8b3a2a', info:'红色行星 · 直径 6,779 km' },
  { name:'木星', nameEn:'Jupiter',    r:1.20, orbit:19, speed:0.084, rot:0.04,   tilt:0.05, color1:'#d4a06a', color2:'#c4884a', info='最大行星 · 直径 139,820 km' },
  { name:'土星', nameEn:'Saturn',     r:0.95, orbit:24, speed:0.034, rot:0.038,  tilt:0.47, color1:'#d4c090', color2:'#a08050', info='环系统 · 直径 116,460 km', hasRing:true },
  { name:'天王星', nameEn:'Uranus',   r:0.62, orbit:30, speed:0.012, rot:-0.03,  tilt:1.71, color1:'#7ec8c8', color2:'#4a9e9e', info='冰巨星 · 直径 50,724 km' },
  { name:'海王星', nameEn:'Neptune',  r:0.58, orbit:35, speed:0.006, rot:0.032,  tilt:0.49, color1:'#3355ff', color2:'#1a2eaa', info='最远行星 · 直径 49,244 km' },
];

const SUN_COLORS = ['#fff8e0','#ffdd44','#ff8800','#cc4400','#661100'];
const EARTH_MAP = 'https://clouds.matteason.co.uk/images/4096x2048/earth.jpg';
const EARTH_NORMAL = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg';

const progressFill = document.getElementById('progressFill');
const loading = document.getElementById('loading');
const planetPanel = document.getElementById('planetPanel');
const planetIcon = document.getElementById('planetIcon');
const planetName = document.getElementById('planetName');
const planetNameEn = document.getElementById('planetNameEn');
const planetInfo = document.getElementById('planetInfo');
const btnBack = document.getElementById('btnBack');

let loadedCount = 0;
const totalAssets = PLANETS.filter(p => !p.isSun).length;

function tickLoad() {
  loadedCount++;
  if (progressFill) progressFill.style.width = Math.min(loadedCount / totalAssets * 100, 100) + '%';
  if (loadedCount >= totalAssets) {
    setTimeout(() => loading.classList.add('hidden'), 200);
  }
}

setTimeout(() => loading.classList.add('hidden'), 3000);

const W = window.innerWidth;
const H = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 3000);
camera.position.set(5, 10, 28);

const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.4;
controls.minDistance = 1;
controls.maxDistance = 80;
controls.target.set(0, 0, 0);

const maxAniso = renderer.capabilities.getMaxAnisotropy();

// ============ TEXTURE GENERATORS ============

function makeCanvas(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = maxAniso;
  return tex;
}

function drawSun(ctx, w, h) {
  const grd = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
  SUN_COLORS.forEach((c, i) => grd.addColorStop(i / (SUN_COLORS.length-1), c));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    const s = 2 + Math.random() * 30;
    const a = Math.random() * 0.12;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,${150+Math.random()*80},0,${a})`;
    ctx.fill();
  }
}

function drawRocky(c1, c2, w, h) {
  const grad = ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    return g;
  };
  return makeCanvas(w, h, (ctx, w, h) => {
    ctx.fillStyle = grad(ctx); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const s = 1 + Math.random() * 8;
      const a = Math.random() * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fill();
    }
  });
}

function drawGasGiant(colors, w, h) {
  return makeCanvas(w, h, (ctx, w, h) => {
    const bandH = h / colors.length;
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * bandH, w, bandH + 1);
    });
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const s = 2 + Math.random() * 40;
      const a = (Math.random() * 0.15) * (Math.random() > 0.5 ? 1 : -1);
      const blur = ctx.createRadialGradient(x, y, 0, x, y, s);
      blur.addColorStop(0, `rgba(255,255,255,${Math.max(0,a)})`);
      blur.addColorStop(1, `rgba(0,0,0,${Math.max(0,-a)})`);
      ctx.fillStyle = blur;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
  });
}

function drawIcePlanet(c1, c2, w, h) {
  return makeCanvas(w, h, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const s = 5 + Math.random() * 30;
      const a = (Math.random() - 0.5) * 0.08;
      const blur = ctx.createRadialGradient(x, y, 0, x, y, s);
      blur.addColorStop(0, `rgba(255,255,255,${Math.max(0,a)})`);
      blur.addColorStop(1, `rgba(0,0,0,${Math.max(0,-a)})`);
      ctx.fillStyle = blur;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
  });
}

// ============ STARS ============

function createStarTexture() {
  const c = document.createElement('canvas');
  c.width = 4096; c.height = 2048;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 4096, 2048);
  for (let i = 0; i < 25000; i++) {
    const x = Math.random() * 4096, y = Math.random() * 2048;
    const s = 0.5 + Math.random() * 2.5;
    const b = 128 + Math.floor(Math.random() * 128);
    const t = Math.random();
    let r = b, g = b, bl = b;
    if (t < 0.1) { r = b*0.6; g = b*0.7; bl = b; }
    else if (t < 0.2) { r = b; g = b*0.8; bl = b*0.6; }
    else if (t < 0.3) { r = b; g = b*0.6; bl = b*0.5; }
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${r|0},${g|0},${bl|0})`;
    ctx.fill();
    if (s > 1.5 && Math.random() > 0.7) {
      ctx.beginPath();
      ctx.arc(x, y, s * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r|0},${g|0},${bl|0},0.06)`;
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = maxAniso;
  return tex;
}

const starSphere = new THREE.Mesh(
  new THREE.SphereGeometry(900, 32, 32),
  new THREE.MeshBasicMaterial({ map: createStarTexture(), side: THREE.BackSide })
);
scene.add(starSphere);

// ============ SUN ============

const sunGroup = new THREE.Group();
scene.add(sunGroup);

const sunTex = makeCanvas(2048, 1024, drawSun);
const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(PLANETS[0].r, 128, 128), sunMat);
sunGroup.add(sunMesh);

function makeSunGlow(r, color, intensity, powV) {
  const g = new THREE.SphereGeometry(r, 64, 64);
  const m = new THREE.ShaderMaterial({
    vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`varying vec3 vN;varying vec3 vW;uniform vec3 uC;uniform float uI;uniform float uP;void main(){vec3 v=normalize(cameraPosition-vW);float r=1.0-max(0.0,dot(v,vN));r=pow(r,uP);gl_FragColor=vec4(uC,r*uI);}`,
    uniforms:{uC:{value:new THREE.Color(color)},uI:{value:intensity},uP:{value:powV}},
    transparent:true,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false
  });
  return new THREE.Mesh(g, m);
}

sunGroup.add(makeSunGlow(PLANETS[0].r * 1.08, 0xff8800, 0.5, 5));
sunGroup.add(makeSunGlow(PLANETS[0].r * 1.2, 0xff4400, 0.2, 3));
sunGroup.add(makeSunGlow(PLANETS[0].r * 1.5, 0xff2200, 0.06, 2));

// ============ LIGHTING ============

const sunLight = new THREE.PointLight(0xffeedd, 2.5, 200);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const ambLight = new THREE.AmbientLight(0x222244, 0.15);
scene.add(ambLight);

// ============ PLANETS ============

const planetMeshes = [];
const orbitLines = [];

function createOrbitLine(radius) {
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x445566, transparent: true, opacity: 0.15 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  return line;
}

PLANETS.forEach((p, idx) => {
  if (p.isSun) return;
  orbitLines.push(createOrbitLine(p.orbit));
});

const texLoader = new THREE.TextureLoader();

PLANETS.forEach((p, idx) => {
  if (p.isSun) return;

  const group = new THREE.Group();
  let tex;

  if (p.useEarth) {
    texLoader.load(EARTH_MAP, t => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      if (planetMeshes[idx]) {
        planetMeshes[idx].material.map = t;
        planetMeshes[idx].material.needsUpdate = true;
      }
    }, undefined, () => {});
    tex = makeCanvas(512, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0,0,0,h);
      g.addColorStop(0,'#4488bb'); g.addColorStop(0.5,'#66aa77'); g.addColorStop(1,'#4488bb');
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
      for (let i=0;i<200;i++) {
        const x=Math.random()*w,y=Math.random()*h,s=2+Math.random()*6,a=Math.random()*0.2;
        ctx.beginPath(); ctx.arc(x,y,s,0,Math.PI*2);
        ctx.fillStyle=`rgba(0,80,0,${a})`; ctx.fill();
      }
    });
  } else if (p.hasRing) {
    tex = drawGasGiant(['#d4c090','#c8b080','#d0b888','#b89860'], 1024, 512);
  } else if (p.name === '木星') {
    tex = drawGasGiant(['#d4a06a','#c4884a','#e8c080','#b87840','#d8b080','#c09050'], 1024, 512);
  } else if (p.name === '火星') {
    tex = drawRocky(p.color1, p.color2, 1024, 512);
  } else if (p.name === '水星') {
    tex = drawRocky(p.color1, p.color2, 1024, 512);
  } else if (p.name === '金星') {
    tex = drawRocky(p.color1, p.color2, 1024, 512);
  } else if (p.name === '天王星') {
    tex = drawIcePlanet(p.color1, p.color2, 1024, 512);
  } else if (p.name === '海王星') {
    tex = drawIcePlanet(p.color1, p.color2, 1024, 512);
  }

  const mat = new THREE.MeshPhongMaterial({
    map: tex,
    shininess: 5,
    specular: new THREE.Color(0x222244),
  });

  if (p.normalMap) {
    texLoader.load(p.normalMap, t => {
      t.anisotropy = maxAniso;
      mat.normalMap = t;
      mat.normalScale = new THREE.Vector2(0.6, 0.6);
      mat.needsUpdate = true;
    });
  }

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 96, 96), mat);
  mesh.userData.planetIndex = idx;
  group.add(mesh);

  if (p.useEarth) {
    texLoader.load(EARTH_NORMAL, t => {
      t.anisotropy = maxAniso;
      mat.normalMap = t;
      mat.normalScale = new THREE.Vector2(0.8, 0.8);
      mat.needsUpdate = true;
    }, undefined, () => {});
  }

  if (p.hasRing) {
    const ringTex = makeCanvas(1024, 64, (ctx, w, h) => {
      for (let x = 0; x < w; x++) {
        const t = x / w;
        const bright = 0.2 + 0.3 * Math.sin(t * 40) + 0.15 * Math.sin(t * 70 + 1) + 0.1 * Math.sin(t * 120 + 2);
        const alpha = (t > 0.1 && t < 0.95) ? bright * 0.7 : 0;
        ctx.fillStyle = `rgba(200,185,150,${alpha})`;
        ctx.fillRect(x, 0, 1, h);
      }
    });
    const ringGeo = new THREE.RingGeometry(p.r * 1.3, p.r * 2.4, 128);
    const ringMat = new THREE.MeshPhongMaterial({
      map: ringTex,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.5;
    group.add(ringMesh);
  }

  const initAngle = Math.random() * Math.PI * 2;
  mesh.position.x = p.orbit * Math.cos(initAngle);
  mesh.position.z = p.orbit * Math.sin(initAngle);
  mesh.rotation.z = p.tilt || 0;

  scene.add(group);
  planetMeshes[idx] = mesh;
  p._group = group;
  p._mesh = mesh;
  p._angle = initAngle;

  tickLoad();
});

// ============ CLICK & ZOOM ============

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let zoomState = 'overview';
let zoomTargetIdx = null;
let zoomProgress = 0;
let zoomStartCam = new THREE.Vector3();
let zoomStartTarget = new THREE.Vector3();
let zoomEndCam = new THREE.Vector3();
let zoomEndTarget = new THREE.Vector3();

const HOME_CAM = new THREE.Vector3(5, 10, 28);
const HOME_TARGET = new THREE.Vector3(0, 0, 0);

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function zoomToPlanet(idx) {
  const p = PLANETS[idx];
  const pos = p._mesh.position.clone();
  zoomTargetIdx = idx;
  zoomState = 'zooming-in';
  zoomProgress = 0;
  zoomStartCam.copy(camera.position);
  zoomStartTarget.copy(controls.target);
  const dist = Math.max(p.r * 5, 2.5);
  zoomEndTarget.copy(pos);
  zoomEndCam.copy(pos.clone().add(new THREE.Vector3(0, p.r * 2, dist)));
  planetPanel.classList.remove('hidden');
  planetIcon.style.background = `radial-gradient(circle at 35% 35%, ${p.color1 || '#fff'}, ${p.color2 || p.color1 || '#888'})`;
  planetName.textContent = p.name;
  planetNameEn.textContent = p.nameEn;
  planetInfo.textContent = p.info || '';
  document.getElementById('info').style.opacity = '0';
}

function zoomOut() {
  zoomState = 'zooming-out';
  zoomProgress = 0;
  zoomStartCam.copy(camera.position);
  zoomStartTarget.copy(controls.target);
  zoomEndCam.copy(HOME_CAM);
  zoomEndTarget.copy(HOME_TARGET);
  planetPanel.classList.add('hidden');
  zoomTargetIdx = null;
  document.getElementById('info').style.opacity = '1';
}

renderer.domElement.addEventListener('click', (e) => {
  if (zoomState === 'zooming-in' || zoomState === 'zooming-out') return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = planetMeshes.filter(m => m);
  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0) {
    const idx = hits[0].object.userData.planetIndex;
    if (idx !== undefined && zoomState === 'overview') zoomToPlanet(idx);
  } else if (zoomState === 'zoomed') {
    zoomOut();
  }
});

btnBack.addEventListener('click', zoomOut);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && zoomState === 'zoomed') zoomOut();
});

// ============ ANIMATION ============

let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.005;

  sunGroup.rotation.y += 0.0005;

  PLANETS.forEach((p, i) => {
    if (p.isSun) return;
    p._angle += p.speed * 0.003;
    p._mesh.position.x = p.orbit * Math.cos(p._angle);
    p._mesh.position.z = p.orbit * Math.sin(p._angle);
    p._mesh.rotation.y += p.rot;
  });

  if (zoomState === 'zooming-in') {
    zoomProgress += 0.025;
    if (zoomProgress >= 1) { zoomProgress = 1; zoomState = 'zoomed'; }
    const t = easeInOutCubic(zoomProgress);
    camera.position.lerpVectors(zoomStartCam, zoomEndCam, t);
    controls.target.lerpVectors(zoomStartTarget, zoomEndTarget, t);
  } else if (zoomState === 'zooming-out') {
    zoomProgress += 0.025;
    if (zoomProgress >= 1) { zoomProgress = 1; zoomState = 'overview'; }
    const t = easeInOutCubic(zoomProgress);
    camera.position.lerpVectors(zoomStartCam, zoomEndCam, t);
    controls.target.lerpVectors(zoomStartTarget, zoomEndTarget, t);
  } else if (zoomState === 'zoomed' && zoomTargetIdx !== null) {
    const pos = PLANETS[zoomTargetIdx]._mesh.position.clone();
    const offset = camera.position.clone().sub(controls.target);
    controls.target.copy(pos);
    camera.position.copy(pos.clone().add(offset));
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
