import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const EARTH_MAP = 'https://clouds.matteason.co.uk/images/4096x2048/earth.jpg';
const EARTH_NORMAL = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg';
const EARTH_SPEC = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg';
const CLOUD_MAP = 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png';
const NIGHT_MAP = 'https://threejs.org/examples/textures/planets/earth_lights_2048.png';

const progressFill = document.getElementById('progressFill');
const loading = document.getElementById('loading');

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
controls.maxDistance = 10;
controls.enablePan = false;
controls.target.set(0, 0, 0);

const earthGroup = new THREE.Group();
scene.add(earthGroup);

const maxAniso = renderer.capabilities.getMaxAnisotropy();

const dayTex = texLoader.load(EARTH_MAP, (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  updateProgress();
});
const normalTex = texLoader.load(EARTH_NORMAL, (tex) => {
  tex.anisotropy = maxAniso;
  updateProgress();
});
const specTex = texLoader.load(EARTH_SPEC, (tex) => {
  tex.anisotropy = maxAniso;
  updateProgress();
});
const nightTex = texLoader.load(NIGHT_MAP, (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  updateProgress();
});
const cloudTex = texLoader.load(CLOUD_MAP, (tex) => {
  tex.anisotropy = maxAniso;
  updateProgress();
});

const sunDir = new THREE.Vector3(0.6, 0.3, 0.8).normalize();
const earthMat = new THREE.ShaderMaterial({
  uniforms: {
    uDayTex: { value: dayTex },
    uNightTex: { value: nightTex },
    uNormalTex: { value: normalTex },
    uSpecTex: { value: specTex },
    uSunDir: { value: sunDir.clone() },
    uGlowIntensity: { value: 0.0 },
    uTime: { value: 0 },
  },
  vertexShader: 
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying vec3 vWorldNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewPos = mvPos.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * mvPos;
    }
  ,
  fragmentShader: 
    uniform sampler2D uDayTex;
    uniform sampler2D uNightTex;
    uniform sampler2D uNormalTex;
    uniform sampler2D uSpecTex;
    uniform vec3 uSunDir;
    uniform float uGlowIntensity;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying vec3 vWorldNormal;

    void main() {
      vec3 dayColor = texture2D(uDayTex, vUv).rgb;
      vec3 nightColor = texture2D(uNightTex, vUv).rgb;
      vec3 normal = texture2D(uNormalTex, vUv).rgb * 2.0 - 1.0;
      normal = normalize(normal * vec3(1.2, 1.2, 1.0));
      mat3 TBN = mat3(1.0);
      vec3 perturbedNormal = normalize(TBN * normal);

      vec3 lightDir = normalize(uSunDir);
      float NdotL = dot(perturbedNormal, lightDir);

      float dayFactor = smoothstep(-0.05, 0.25, NdotL);
      vec3 baseColor = mix(nightColor, dayColor, dayFactor);

      vec3 viewDir = normalize(-vViewPos);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(perturbedNormal, halfDir), 0.0), 64.0);
      float specMask = texture2D(uSpecTex, vUv).r;
      vec3 specular = vec3(1.0, 0.95, 0.85) * spec * 0.6 * specMask;

      float rim = 1.0 - max(0.0, dot(perturbedNormal, viewDir));
      rim = pow(rim, 4.0);
      vec3 rimColor = vec3(0.4, 0.6, 1.0) * rim * 0.25;

      float cityGlow = 1.0 - smoothstep(-0.2, 0.05, NdotL);
      vec3 cityLight = nightColor * 0.5 * cityGlow;

      vec3 finalColor = baseColor;
      finalColor += specular * clamp(dayFactor * 2.0, 0.0, 1.0);
      finalColor += rimColor;
      finalColor += cityLight;
      finalColor += nightColor * 0.08;
      finalColor *= 1.0 + uGlowIntensity * 0.3;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  ,
});

const earthGeo = new THREE.SphereGeometry(1, 1024, 1024);
const earth = new THREE.Mesh(earthGeo, earthMat);
earthGroup.add(earth);

const cloudGeo = new THREE.SphereGeometry(1.008, 512, 512);
const cloudMat = new THREE.ShaderMaterial({
  uniforms: {
    uCloudTex: { value: cloudTex },
    uSunDir: { value: sunDir.clone() },
  },
  vertexShader: 
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewPos = mvPos.xyz;
      gl_Position = projectionMatrix * mvPos;
    }
  ,
  fragmentShader: 
    uniform sampler2D uCloudTex;
    uniform vec3 uSunDir;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    void main() {
      vec4 cloud = texture2D(uCloudTex, vUv);
      float alpha = cloud.r * 0.5;
      float NdotL = dot(normalize(vNormal), normalize(uSunDir));
      float light = 0.3 + 0.7 * clamp(NdotL * 1.5 + 0.2, 0.0, 1.0);
      vec3 col = cloud.rgb * light * vec3(1.0, 0.98, 0.95);
      gl_FragColor = vec4(col, alpha);
    }
  ,
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const clouds = new THREE.Mesh(cloudGeo, cloudMat);
clouds.name = 'clouds';
earthGroup.add(clouds);

function makeGlow(radius, color, intensity, powFactor) {
  const geo = new THREE.SphereGeometry(radius, 128, 128);
  const mat = new THREE.ShaderMaterial({
    vertexShader: 
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    ,
    fragmentShader: 
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
    ,
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

earthGroup.add(makeGlow(1.035, 0xffffff, 0.04, 8.0));
earthGroup.add(makeGlow(1.06, 0x88ddff, 0.08, 5.0));
earthGroup.add(makeGlow(1.12, 0x6688cc, 0.03, 3.0));

const starCount = 60000;
const starPos = new Float32Array(starCount * 3);
const starCol = new Float32Array(starCount * 3);
const starSize = new Float32Array(starCount);
const starPhase = new Float32Array(starCount);

for (let i = 0; i < starCount; i++) {
  const r = 30 + Math.random() * 150;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  starPos[i*3+2] = r * Math.cos(phi);

  const b = 0.4 + Math.random() * 0.6;
  const t = Math.random();
  if (t < 0.1) {
    starCol[i*3] = b * 0.5; starCol[i*3+1] = b * 0.6; starCol[i*3+2] = b;
  } else if (t < 0.2) {
    starCol[i*3] = b; starCol[i*3+1] = b * 0.7; starCol[i*3+2] = b * 0.5;
  } else if (t < 0.3) {
    starCol[i*3] = b; starCol[i*3+1] = b * 0.5; starCol[i*3+2] = b * 0.4;
  } else {
    starCol[i*3] = b; starCol[i*3+1] = b; starCol[i*3+2] = b;
  }

  starSize[i] = 0.2 + Math.random() * 2.0;
  starPhase[i] = Math.random() * Math.PI * 2;
}

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('customColor', new THREE.BufferAttribute(starCol, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSize, 1));
starGeo.setAttribute('phase', new THREE.BufferAttribute(starPhase, 1));

const starMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: 
    attribute float size;
    attribute vec3 customColor;
    attribute float phase;
    varying vec3 vColor;
    uniform float uTime;
    void main() {
      vColor = customColor;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      float twinkle = 0.55 + 0.45 * sin(uTime * 1.2 + phase + position.x * 6.0 + position.y * 5.0);
      gl_PointSize = size * (150.0 / -mvPos.z) * twinkle;
      gl_Position = projectionMatrix * mvPos;
    }
  ,
  fragmentShader: 
    varying vec3 vColor;
    void main() {
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if (d > 0.5) discard;
      float a = 1.0 - smoothstep(0.0, 0.5, d);
      a = pow(a, 1.5);
      gl_FragColor = vec4(vColor, a * 0.85);
    }
  ,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

const sunGroup = new THREE.Group();
const sunGeo = new THREE.SphereGeometry(0.08, 16, 16);
const sunMat = new THREE.ShaderMaterial({
  vertexShader: 
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  ,
  fragmentShader: 
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
      rim = pow(rim, 3.0);
      vec3 col = mix(vec3(1.0, 0.9, 0.6), vec3(1.0, 0.7, 0.2), rim);
      float glow = pow(rim, 2.0);
      gl_FragColor = vec4(col, 1.0);
    }
  ,
});
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunGroup.add(sunMesh);

const sunGlowGeo = new THREE.SpriteGeometry(0.5, 0.5);
const sunGlowMat = new THREE.SpriteMaterial({
  map: (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,220,150,1)');
    grad.addColorStop(0.2, 'rgba(255,200,100,0.6)');
    grad.addColorStop(0.5, 'rgba(255,180,50,0.15)');
    grad.addColorStop(1, 'rgba(255,150,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })(),
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
});
const sunGlow = new THREE.Sprite(sunGlowMat);
sunGlow.scale.set(4, 4, 1);
sunGroup.add(sunGlow);
scene.add(sunGroup);

const sunLight = new THREE.DirectionalLight(0xffeedd, 2.0);
scene.add(sunLight);
sunLight.position.copy(sunDir.clone().multiplyScalar(8));

const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
fillLight.position.set(-3, -1, -4);
scene.add(fillLight);

const ambient = new THREE.AmbientLight(0x111122, 0.4);
scene.add(ambient);

const SUN_DIST = 6;
let sunAngle = Math.PI * 0.5;
let speedMult = 1;
const baseSpeed = 0.1 / 60;

const timeDisplay = document.getElementById('timeDisplay');
const sunAltDisplay = document.getElementById('sunAlt');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');

speedSlider.addEventListener('input', () => {
  speedMult = parseFloat(speedSlider.value);
  speedLabel.textContent = speedMult.toFixed(1) + '\u00D7';
});

function updateSun(angle) {
  const x = SUN_DIST * Math.cos(angle);
  const z = SUN_DIST * Math.sin(angle);
  const y = 0.3 * Math.sin(angle * 2);
  const pos = new THREE.Vector3(x, y, z);
  sunGroup.position.copy(pos);
  sunLight.position.copy(pos);
  const dir = pos.clone().negate().normalize();
  earthMat.uniforms.uSunDir.value.copy(dir);
  cloudMat.uniforms.uSunDir.value.copy(dir);

  const hours = ((angle / (Math.PI * 2)) * 24 + 24) % 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  timeDisplay.textContent = '\u5F53\u5730\u65F6\u95F4 ' + h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');

  const altDeg = Math.round(Math.asin(Math.min(1, Math.max(-1, y / SUN_DIST))) * 180 / Math.PI);
  sunAltDisplay.textContent = altDeg + '\u00B0';
}

setTimeout(() => loading.classList.add('hidden'), 15000);

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  sunAngle += baseSpeed * speedMult;
  updateSun(sunAngle);

  const cloudObj = earthGroup.getObjectByName('clouds');
  if (cloudObj) cloudObj.rotation.y += 0.0002;

  starMat.uniforms.uTime.value += 0.004;

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});