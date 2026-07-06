import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const EARTH_MAP = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
const EARTH_NORMAL = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg';
const EARTH_SPEC = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg';
const CLOUD_MAP = 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png';

function makeProceduralEarth() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 1024; x++) {
      const u = x / 1024, v = y / 512;
      const n = Math.sin(u * 20 + v * 10) * 0.5 + Math.sin(u * 8 - v * 15 + 2) * 0.3 + Math.sin(u * 35 + v * 25 + 4) * 0.2;
      const lat = (v - 0.5) * Math.PI;
      const polar = Math.abs(lat) > 1.2 ? 1 : 0;
      if (polar) { ctx.fillStyle = '#e8e8f0'; }
      else if (n > 0.15) { ctx.fillStyle = `rgb(${80+Math.random()*40|0},${120+Math.random()*50|0},${40+Math.random()*30|0})`; }
      else { ctx.fillStyle = `rgb(${30+Math.random()*30|0},${70+Math.random()*40|0},${120+Math.random()*40|0})`; }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = maxAniso;
  return t;
}

const progressFill = document.getElementById('progressFill');
const loading = document.getElementById('loading');

let loaded = 0;

function updateProgress() {
  loaded++;
  if (progressFill) {
    progressFill.style.width = Math.min((loaded / 4) * 100, 100) + '%';
  }
  if (loaded >= 4) {
    setTimeout(() => loading.classList.add('hidden'), 200);
  }
}

setTimeout(() => loading.classList.add('hidden'), 3000);

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
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.minDistance = 1.5;
controls.maxDistance = 8;
controls.enablePan = false;
controls.target.set(0, 0, 0);

const earthGroup = new THREE.Group();
scene.add(earthGroup);

const maxAniso = renderer.capabilities.getMaxAnisotropy();

const earthGeo = new THREE.SphereGeometry(1, 2048, 2048);
const earthMat = new THREE.MeshPhongMaterial({
  shininess: 8,
  specular: new THREE.Color(0x555555),
  map: makeProceduralEarth(),
});

texLoader.load(EARTH_MAP, (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  earthMat.map = tex;
  earthMat.needsUpdate = true;
  updateProgress();
}, undefined, () => { updateProgress(); });

texLoader.load(EARTH_NORMAL, (tex) => {
  tex.anisotropy = maxAniso;
  earthMat.normalMap = tex;
  earthMat.normalScale = new THREE.Vector2(1.2, 1.2);
  earthMat.needsUpdate = true;
  updateProgress();
}, undefined, () => { updateProgress(); });

texLoader.load(EARTH_SPEC, (tex) => {
  tex.anisotropy = maxAniso;
  earthMat.specularMap = tex;
  earthMat.needsUpdate = true;
  updateProgress();
}, undefined, () => { updateProgress(); });

const earth = new THREE.Mesh(earthGeo, earthMat);
earthGroup.add(earth);

texLoader.load(CLOUD_MAP, (tex) => {
  tex.anisotropy = maxAniso;
  const cloudGeo = new THREE.SphereGeometry(1.008, 1024, 1024);
  const cloudMat = new THREE.MeshPhongMaterial({
    map: tex,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const clouds = new THREE.Mesh(cloudGeo, cloudMat);
  clouds.name = 'clouds';
  earthGroup.add(clouds);
  updateProgress();
}, undefined, () => { updateProgress(); });

function makeGlow(radius, color, intensity, powFactor) {
  const geo = new THREE.SphereGeometry(radius, 512, 512);
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPow;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
        rim = pow(rim, uPow);
        gl_FragColor = vec4(uColor, rim * uIntensity);
      }
    `,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uPow: { value: powFactor },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

earthGroup.add(makeGlow(1.035, 0xffffff, 0.06, 8.0));
earthGroup.add(makeGlow(1.06, 0x88ddff, 0.10, 5.0));
earthGroup.add(makeGlow(1.12, 0x6688cc, 0.04, 3.0));

const starCount = 80000;
const starPos = new Float32Array(starCount * 3);
const starCol = new Float32Array(starCount * 3);
const starSize = new Float32Array(starCount);
const starPhase = new Float32Array(starCount);

for (let i = 0; i < starCount; i++) {
  const r = 30 + Math.random() * 120;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  starPos[i*3+2] = r * Math.cos(phi);

  const b = 0.5 + Math.random() * 0.5;
  const t = Math.random();
  if (t < 0.15) {
    starCol[i*3] = b * 0.6; starCol[i*3+1] = b * 0.7; starCol[i*3+2] = b;
  } else if (t < 0.3) {
    starCol[i*3] = b; starCol[i*3+1] = b * 0.8; starCol[i*3+2] = b * 0.6;
  } else if (t < 0.4) {
    starCol[i*3] = b; starCol[i*3+1] = b * 0.6; starCol[i*3+2] = b * 0.5;
  } else {
    starCol[i*3] = b; starCol[i*3+1] = b; starCol[i*3+2] = b;
  }

  starSize[i] = 0.3 + Math.random() * 1.8;
  starPhase[i] = Math.random() * Math.PI * 2;
}

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('customColor', new THREE.BufferAttribute(starCol, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSize, 1));
starGeo.setAttribute('phase', new THREE.BufferAttribute(starPhase, 1));

const starMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    attribute float size;
    attribute vec3 customColor;
    attribute float phase;
    varying vec3 vColor;
    uniform float uTime;
    void main() {
      vColor = customColor;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      float twinkle = 0.55 + 0.45 * sin(uTime * 1.2 + phase + position.x * 6.0 + position.y * 5.0);
      gl_PointSize = size * (180.0 / -mvPos.z) * twinkle;
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if (d > 0.5) discard;
      float a = 1.0 - smoothstep(0.0, 0.5, d);
      a = pow(a, 1.5);
      gl_FragColor = vec4(vColor, a * 0.9);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

const keyLight = new THREE.DirectionalLight(0xffeedd, 2.5);
keyLight.position.set(5, 3, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x4488ff, 0.6);
fillLight.position.set(-4, -1, -3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x88ccff, 0.3);
rimLight.position.set(0, -5, 0);
scene.add(rimLight);

const ambient = new THREE.AmbientLight(0x222244, 0.8);
scene.add(ambient);

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const clouds = earthGroup.getObjectByName('clouds');
  if (clouds) clouds.rotation.y += 0.0003;

  starMat.uniforms.uTime.value += 0.005;

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
