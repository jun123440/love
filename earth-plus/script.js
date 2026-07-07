import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const EARTH_MAP = 'https://clouds.matteason.co.uk/images/4096x2048/earth.jpg';
const EARTH_NORMAL = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg';
const EARTH_SPEC = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg';
const CLOUD_MAP = 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png';
const NIGHT_MAP = 'https://threejs.org/examples/textures/planets/earth_lights_2048.png';

const progressFill = document.getElementById('progressFill');
const loading = document.getElementById('loading');
const timeDisplay = document.getElementById('timeDisplay');
const sunAltDisplay = document.getElementById('sunAlt');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');

let loaded = 0;
const totalTextures = 5;

function updateProgress() {
  loaded++;
  if (progressFill) {
    progressFill.style.width = Math.min((loaded / totalTextures) * 100, 100) + '%';
  }
  if (loaded >= totalTextures) {
    setTimeout(() => loading.classList.add('hidden'), 300);
  }
}

const texLoader = new THREE.TextureLoader();

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0.2, 3.2);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.autoRotate = false;
controls.minDistance = 1.8;
controls.maxDistance = 8;
controls.enablePan = false;
controls.target.set(0, 0, 0);

const earthGroup = new THREE.Group();
scene.add(earthGroup);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const dayTex = texLoader.load(EARTH_MAP, (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso; updateProgress();
});
const normalTex = texLoader.load(EARTH_NORMAL, (tex) => {
  tex.anisotropy = maxAniso; updateProgress();
});
const specTex = texLoader.load(EARTH_SPEC, (tex) => {
  tex.anisotropy = maxAniso; updateProgress();
});
const cloudTex = texLoader.load(CLOUD_MAP, (tex) => {
  tex.anisotropy = maxAniso; updateProgress();
});
const nightTex = texLoader.load(NIGHT_MAP, (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso; updateProgress();
});

let sunDir = new THREE.Vector3(0, 0, -1);

const earthMat = new THREE.MeshPhongMaterial({
  map: dayTex,
  normalMap: normalTex,
  normalScale: new THREE.Vector2(1.8, 1.8),
  specularMap: specTex,
  specular: new THREE.Color(0x444444),
  shininess: 30,
});
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 512, 512), earthMat);
earthGroup.add(earth);

const nightMat = new THREE.ShaderMaterial({
  uniforms: { uNightTex: { value: nightTex }, uSunDir: { value: sunDir.clone() } },
  vertexShader: [
    'varying vec2 vUv;', 'varying vec3 vNormal;',
    'void main() {',
    '  vUv = uv;',
    '  vNormal = normalize(normalMatrix * normal);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}',
  ].join('\n'),
  fragmentShader: [
    'uniform sampler2D uNightTex;', 'uniform vec3 uSunDir;',
    'varying vec2 vUv;', 'varying vec3 vNormal;',
    'void main() {',
    '  vec3 c = texture2D(uNightTex, vUv).rgb;',
    '  float ndotl = dot(normalize(vNormal), normalize(uSunDir));',
    '  float nf = 1.0 - smoothstep(-0.15, 0.2, ndotl);',
    '  float a = length(c) * nf * 0.7;',
    '  gl_FragColor = vec4(c, a);',
    '}',
  ].join('\n'),
  transparent: true, side: THREE.FrontSide, depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const nightMesh = new THREE.Mesh(new THREE.SphereGeometry(1.001, 256, 256), nightMat);
earthGroup.add(nightMesh);

const cloudMat = new THREE.MeshPhongMaterial({
  map: cloudTex,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.NormalBlending,
});
const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008, 256, 256), cloudMat);
clouds.name = 'clouds';
earthGroup.add(clouds);

const atmoMat = new THREE.ShaderMaterial({
  uniforms: { uSunDir: { value: sunDir.clone() } },
  vertexShader: [
    'varying vec3 vNormal;', 'varying vec3 vWorldPos;',
    'void main() {',
    '  vNormal = normalize(normalMatrix * normal);',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  vWorldPos = wp.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}',
  ].join('\n'),
  fragmentShader: [
    'uniform vec3 uSunDir;',
    'varying vec3 vNormal;', 'varying vec3 vWorldPos;',
    'void main() {',
    '  vec3 vd = normalize(cameraPosition - vWorldPos);',
    '  vec3 ld = normalize(uSunDir);',
    '  float rim = 1.0 - max(dot(vd, vNormal), 0.0);',
    '  rim = pow(rim, 4.0);',
    '  float sf = max(dot(vNormal, ld), 0.0);',
    '  float s = rim * 0.5 + pow(sf, 3.0) * 0.15;',
    '  vec3 col = mix(vec3(0.35,0.55,0.85), vec3(0.5,0.7,1.0), s*1.5);',
    '  gl_FragColor = vec4(col, s * 0.4);',
    '}',
  ].join('\n'),
  transparent: true, side: THREE.FrontSide, depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.025, 64, 64), atmoMat);
earthGroup.add(atmo);

const glowMat = new THREE.ShaderMaterial({
  vertexShader: [
    'varying vec3 vNormal;', 'varying vec3 vWorldPos;',
    'void main() {',
    '  vNormal = normalize(normalMatrix * normal);',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  vWorldPos = wp.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}',
  ].join('\n'),
  fragmentShader: [
    'varying vec3 vNormal;', 'varying vec3 vWorldPos;',
    'void main() {',
    '  vec3 vd = normalize(cameraPosition - vWorldPos);',
    '  float rim = 1.0 - max(dot(vd, vNormal), 0.0);',
    '  rim = pow(rim, 6.0);',
    '  gl_FragColor = vec4(vec3(0.4,0.6,1.0), rim * 0.04);',
    '}',
  ].join('\n'),
  transparent: true, side: THREE.BackSide, depthWrite: false,
  blending: THREE.AdditiveBlending,
});
earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.04, 64, 64), glowMat));

const starCount = 80000;
const starPos = new Float32Array(starCount * 3);
const starCol = new Float32Array(starCount * 3);
const starSize = new Float32Array(starCount);
const starPhase = new Float32Array(starCount);

for (let i = 0; i < starCount; i++) {
  const r = 20 + Math.random() * 200;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  starPos[i*3+2] = r * Math.cos(phi);

  const b = 0.3 + Math.random() * 0.7;
  const t = Math.random();
  if (t < 0.08) {
    starCol[i*3] = b * 0.4; starCol[i*3+1] = b * 0.5; starCol[i*3+2] = b;
  } else if (t < 0.16) {
    starCol[i*3] = b; starCol[i*3+1] = b * 0.6; starCol[i*3+2] = b * 0.4;
  } else { starCol[i*3] = b; starCol[i*3+1] = b; starCol[i*3+2] = b; }
  starSize[i] = 0.1 + Math.random() * 2.5;
  starPhase[i] = Math.random() * Math.PI * 2;
}

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('customColor', new THREE.BufferAttribute(starCol, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSize, 1));
starGeo.setAttribute('phase', new THREE.BufferAttribute(starPhase, 1));

const starMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: [
    'attribute float size;', 'attribute vec3 customColor;', 'attribute float phase;',
    'varying vec3 vColor;', 'uniform float uTime;',
    'void main() {',
    '  vColor = customColor;',
    '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
    '  float tw = 0.6 + 0.4 * sin(uTime*1.5 + phase + position.x*4.0 + position.y*3.0);',
    '  gl_PointSize = size * (120.0 / -mvPos.z) * tw;',
    '  gl_Position = projectionMatrix * mvPos;',
    '}',
  ].join('\n'),
  fragmentShader: [
    'varying vec3 vColor;',
    'void main() {',
    '  vec2 c = gl_PointCoord - vec2(0.5);',
    '  float d = length(c); if (d > 0.5) discard;',
    '  float a = 1.0 - smoothstep(0.0, 0.5, d);',
    '  gl_FragColor = vec4(vColor, pow(a, 1.5) * 0.9);',
    '}',
  ].join('\n'),
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
scene.add(new THREE.Points(starGeo, starMat));

const sunGroup = new THREE.Group();
scene.add(sunGroup);
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.06, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xffdd77 })
);
sunGroup.add(sunMesh);

const sc = document.createElement('canvas');
sc.width = 128; sc.height = 128;
const sctx = sc.getContext('2d');
const sg = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
sg.addColorStop(0, 'rgba(255,230,180,1)');
sg.addColorStop(0.1, 'rgba(255,210,130,0.5)');
sg.addColorStop(0.35, 'rgba(255,190,80,0.15)');
sg.addColorStop(0.7, 'rgba(255,160,40,0.03)');
sg.addColorStop(1, 'rgba(255,120,0,0)');
sctx.fillStyle = sg; sctx.fillRect(0, 0, 128, 128);

const sunGlowMat = new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(sc),
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
const sunGlow2 = new THREE.Sprite(sunGlowMat);
sunGlow2.scale.set(5, 5, 1);
sunGroup.add(sunGlow2);

const sunLight2 = new THREE.DirectionalLight(0xffeecc, 2.5);
scene.add(sunLight2);
const fillLight2 = new THREE.DirectionalLight(0x4488ff, 0.2);
fillLight2.position.set(-2, -1, -3);
scene.add(fillLight2);
scene.add(new THREE.AmbientLight(0x222244, 0.3));

const SUN_DIST = 4.5;
const baseSpeed = 0.05 / 60;
let sunAngle = Math.PI * -0.3;
let speedMult = 1;

speedSlider.addEventListener('input', () => {
  speedMult = parseFloat(speedSlider.value);
  speedLabel.textContent = speedMult.toFixed(1) + '\u00D7';
});

function updateSun(angle) {
  const x = SUN_DIST * Math.cos(angle);
  const z = SUN_DIST * Math.sin(angle);
  const y = 0.4 * Math.sin(angle * 2);
  const pos = new THREE.Vector3(x, y, z);

  sunGroup.position.copy(pos);
  sunLight2.position.copy(pos);

  sunDir = pos.clone().negate().normalize();
  nightMat.uniforms.uSunDir.value.copy(sunDir);
  atmoMat.uniforms.uSunDir.value.copy(sunDir);

  const hours = ((angle / (Math.PI * 2)) * 24 + 24) % 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  timeDisplay.textContent = '\u5F53\u5730\u65F6\u95F4 ' + h.toString().padStart(2,'0') + ':' + m.toString().padStart(2,'0');

  const altDeg = Math.round(Math.asin(Math.min(1, Math.max(-1, y / SUN_DIST))) * 180 / Math.PI);
  sunAltDisplay.textContent = '\u592A\u9633 ' + altDeg + '\u00B0';
}

updateSun(sunAngle);
setTimeout(() => loading.classList.add('hidden'), 15000);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  sunAngle += baseSpeed * speedMult;
  updateSun(sunAngle);
  const c2 = earthGroup.getObjectByName('clouds');
  if (c2) c2.rotation.y += 0.00015;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});