import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CDN = 'https://cdn.jsdelivr.net/gh/Devashyasahu/solarsystem@main/assets/';

const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = function () {
    const loaderDiv = document.getElementById('loader');
    if (loaderDiv) {
        loaderDiv.style.opacity = '0';
        setTimeout(() => loaderDiv.style.display = 'none', 700);
    }
};

const textureLoader = new THREE.TextureLoader(loadingManager);
const loadTex = (name) => textureLoader.load(CDN + name);

const scene = new THREE.Scene();
scene.background = loadTex('_stars_milky_way.jpg');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('solarSystemCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxDistance = 2500;
controls.minDistance = 10;
controls.enablePan = true;
controls.enableZoom = true;
camera.position.set(0, 200, 400);
controls.update();

scene.add(new THREE.AmbientLight(0x333333, 0.2));
const sunLight = new THREE.PointLight(0xffffff, 3.5, 0);
sunLight.position.set(0, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
scene.add(sunLight);
scene.add(new THREE.HemisphereLight(0xaaaaaa, 0x000000, 0.5));

const planetsData = [
    { name: "Mercury", size: 3, distance: 50, orbitalPeriod: 0.24, rotationPeriod: 58.6, axialTilt: 0.03, texture: loadTex('mercury.jpg'), color: 0xAAAAAA },
    { name: "Venus", size: 4.8, distance: 80, orbitalPeriod: 0.62, rotationPeriod: -243, axialTilt: 177.3, texture: loadTex('venus.jpg'), cloudsTexture: loadTex('venus%20atmosphere.jpg'), color: 0xFFAAAA },
    { name: "Earth", size: 5, distance: 120, orbitalPeriod: 1, rotationPeriod: 1, axialTilt: 23.5, texture: loadTex('earth-day.jpg'), cloudsTexture: loadTex('earth%20clouds.jpg'), nightTexture: loadTex('earth%20night.jpg'), color: 0x0000FF },
    { name: "Mars", size: 3.5, distance: 180, orbitalPeriod: 1.88, rotationPeriod: 1.03, axialTilt: 25.2, texture: loadTex('mars.jpg'), color: 0xFF0000 },
    { name: "Jupiter", size: 25, distance: 300, orbitalPeriod: 11.86, rotationPeriod: 0.41, axialTilt: 3.1, texture: loadTex('jupiter.jpg'), color: 0xFFA500 },
    { name: "Saturn", size: 20, distance: 450, orbitalPeriod: 29.46, rotationPeriod: 0.44, axialTilt: 26.7, texture: loadTex('saturn.jpg'), ringTexture: loadTex('saturn%20ring.png'), ringInnerRadius: 25, ringOuterRadius: 40, color: 0xFFD700 },
    { name: "Uranus", size: 18, distance: 600, orbitalPeriod: 84.01, rotationPeriod: -0.72, axialTilt: 97.8, texture: loadTex('uranus.jpg'), color: 0xADD8E6 },
    { name: "Neptune", size: 17, distance: 750, orbitalPeriod: 164.79, rotationPeriod: 0.67, axialTilt: 28.3, texture: loadTex('naptune.jpg'), color: 0x00008B },
    { name: "Pluto", size: 1.5, distance: 850, orbitalPeriod: 248, rotationPeriod: 6.39, axialTilt: 119.6, texture: loadTex('pluto.jpg'), color: 0xc8d1ff }
];

function createCoronaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,200,100,0.6)');
    g.addColorStop(0.3, 'rgba(255,150,50,0.3)');
    g.addColorStop(0.6, 'rgba(255,100,0,0.1)');
    g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

const sunGeometry = new THREE.SphereGeometry(20, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({ map: loadTex('sun.jpg') });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);
const sunGlowLight = new THREE.PointLight(0xffaa00, 3, 0);
sun.add(sunGlowLight);
const coronaMaterial = new THREE.SpriteMaterial({ map: createCoronaTexture(), color: 0xFFD700, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.38 });
const corona = new THREE.Sprite(coronaMaterial);
corona.scale.set(50, 50, 1);
sun.add(corona);

const planets = [];
planetsData.forEach(data => {
    const planetOrbit = new THREE.Group();
    scene.add(planetOrbit);
    const planetGeometry = new THREE.SphereGeometry(data.size, 64, 64);
    const planetMaterial = new THREE.MeshStandardMaterial({ map: data.texture, roughness: 0.7, metalness: 0.1 });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.position.x = data.distance;
    planet.receiveShadow = planet.castShadow = true;
    planetOrbit.add(planet);
    if (data.cloudsTexture) {
        const cloudsGeometry = new THREE.SphereGeometry(data.size * 1.02, 64, 64);
        const cloudsMaterial = new THREE.MeshStandardMaterial({ map: data.cloudsTexture, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
        const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        planet.add(clouds);
        data.cloudsMesh = clouds;
    }
    if (data.nightTexture) {
        const nightGeo = new THREE.SphereGeometry(data.size * 1.01, 64, 64);
        const nightMat = new THREE.MeshBasicMaterial({ map: data.nightTexture, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8 });
        const nightLights = new THREE.Mesh(nightGeo, nightMat);
        planet.add(nightLights);
        data.nightLightsMesh = nightLights;
    }
    if (data.name === "Saturn" && data.ringTexture) {
        const ringGeometry = new THREE.RingGeometry(data.ringInnerRadius, data.ringOuterRadius, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({ map: data.ringTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2;
        planet.add(rings);
    }
    if (data.name === "Earth") {
        const moonOrbit = new THREE.Group();
        planet.add(moonOrbit);
        const moonGeometry = new THREE.SphereGeometry(1.5, 32, 32);
        const moonMaterial = new THREE.MeshStandardMaterial({ map: loadTex('moon.jpg'), roughness: 0.9, metalness: 0.1 });
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        moon.position.x = 15;
        moon.receiveShadow = moon.castShadow = true;
        moonOrbit.add(moon);
        data.moon = { mesh: moon, orbitGroup: moonOrbit };
    }
    planets.push({ mesh: planet, orbitGroup: planetOrbit, data });
});

const createOrbitPath = (radius, color = 0x444444) => {
    const points = [];
    for (let i = 0; i <= 128; i++) {
        const angle = (i / 128) * Math.PI * 2;
        points.push(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18 });
    return new THREE.LineLoop(geometry, material);
};
planetsData.forEach(data => {
    scene.add(createOrbitPath(data.distance, data.color));
    if (data.name === "Earth") {
        planets.find(p => p.data.name === "Earth").mesh.add(createOrbitPath(15, 0xcccccc));
    }
});

const starsCount = 50000;
const starsVertices = [];
const starsSizes = [];
const starsColors = [];
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ size: 0.8, vertexColors: true, transparent: true, opacity: 0.8 });
for (let i = 0; i < starsCount; i++) {
    const x = (Math.random() - 0.5) * 4000;
    const y = (Math.random() - 0.5) * 4000;
    const z = (Math.random() - 0.5) * 4000;
    starsVertices.push(x, y, z);
    starsSizes.push(Math.random() * 2 + 0.5);
    const color = new THREE.Color();
    color.setHSL(Math.random() * 0.1 + 0.5, 0.5, Math.random() * 0.5 + 0.5);
    starsColors.push(color.r, color.g, color.b);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
starGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(starsSizes, 1));
starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    sun.rotation.y += 0.0005;
    planets.forEach(p => {
        const { mesh, orbitGroup, data } = p;
        mesh.rotation.x = data.axialTilt * Math.PI / 180;
        if (data.cloudsMesh) data.cloudsMesh.rotation.x = mesh.rotation.x;
        if (data.nightLightsMesh) data.nightLightsMesh.rotation.x = mesh.rotation.x;
        orbitGroup.rotation.y += (0.005 / data.orbitalPeriod);
        mesh.rotation.y += (0.05 / data.rotationPeriod);
        if (data.cloudsMesh) {
            data.cloudsMesh.rotation.y += (0.05 / data.rotationPeriod) * 0.9;
        }
        if (data.name === "Earth" && data.moon) {
            data.moon.orbitGroup.rotation.y += 0.02;
            data.moon.mesh.rotation.y += 0.005;
        }
    });
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
