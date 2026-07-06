import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const EARTH_URL = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
const CLOUD_URL = 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png';
const BUMB_URL = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg';
const SPEC_URL = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.8;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;
controls.minDistance = 1.8;
controls.maxDistance = 6;
controls.enablePan = false;

const manager = new THREE.LoadingManager();
let loadedCount = 0;
const totalAssets = 5;
const texLoader = new THREE.TextureLoader(manager);

manager.onLoad = () => {
  document.getElementById('loading').classList.add('hidden');
};

const earthGroup = new THREE.Group();
scene.add(earthGroup);

texLoader.load(EARTH_URL, (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.SphereGeometry(1, 64, 64);
  const mat = new THREE.MeshPhongMaterial({
    map: tex,
    bumpMap: texLoader.load(BUMB_URL),
    bumpScale: 0.04,
    specularMap: texLoader.load(SPEC_URL),
    specular: new THREE.Color(0x333333),
    shininess: 10,
  });
  const earth = new THREE.Mesh(geo, mat);
  earthGroup.add(earth);
  checkLoad();
});

texLoader.load(CLOUD_URL, (tex) => {
  const geo = new THREE.SphereGeometry(1.008, 64, 64);
  const mat = new THREE.MeshPhongMaterial({
    map: tex,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const clouds = new THREE.Mesh(geo, mat);
  clouds.name = 'clouds';
  earthGroup.add(clouds);
  checkLoad();
});

function checkLoad() {
  loadedCount++;
  if (loadedCount >= totalAssets) {
    document.getElementById('loading').classList.add('hidden');
  }
}

checkLoad();
checkLoad();
checkLoad();

const starGeo = new THREE.BufferGeometry();
const starCount = 6000;
const starPos = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);

for (let i = 0; i < starCount; i++) {
  const r = 30 + Math.random() * 70;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  starPos[i*3+2] = r * Math.cos(phi);

  const c = 0.5 + Math.random() * 0.5;
  const tint = Math.random();
  if (tint < 0.3) {
    starColors[i*3] = c; starColors[i*3+1] = c*0.8; starColors[i*3+2] = c*0.6;
  } else if (tint < 0.6) {
    starColors[i*3] = c*0.7; starColors[i*3+1] = c*0.8; starColors[i*3+2] = c;
  } else {
    starColors[i*3] = c; starColors[i*3+1] = c; starColors[i*3+2] = c;
  }
  starSizes[i] = 0.5 + Math.random() * 1.5;
}

starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

const starMat = new THREE.PointsMaterial({
  size: 0.15,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  sizeAttenuation: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

const glowGeo = new THREE.SphereGeometry(1.15, 48, 48);
const glowMat = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPositionW;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vPositionW = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPositionW;
    uniform vec3 glowColor;
    uniform float intensity;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPositionW);
      float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
      rim = pow(rim, 3.0);
      gl_FragColor = vec4(glowColor, rim * intensity);
    }
  `,
  uniforms: {
    glowColor: { value: new THREE.Color(0x4facfe) },
    intensity: { value: 0.8 },
  },
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  depthWrite: false,
});
const glow = new THREE.Mesh(glowGeo, glowMat);
earthGroup.add(glow);

const light1 = new THREE.DirectionalLight(0xffffff, 2.0);
light1.position.set(5, 3, 5);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0x4facfe, 0.5);
light2.position.set(-5, -2, -3);
scene.add(light2);

const ambient = new THREE.AmbientLight(0x222244, 1.0);
scene.add(ambient);

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const clouds = earthGroup.getObjectByName('clouds');
  if (clouds) {
    clouds.rotation.y += 0.0003;
  }

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
