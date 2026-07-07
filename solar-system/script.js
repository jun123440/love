import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const TEX = 'https://www.solarsystemscope.com/textures/download/';

const PLANET_DATA = [
  { name:'\u6C34\u661F', nameEn:'Mercury', r:0.18, d:4.0, orbit:0.24, rot:58.6, tilt:0.03, color:0xbcbcbc,
    tex:TEX+'2k_mercury.jpg', desc:'\u592A\u9633\u7CFB\u6700\u5C0F\u6700\u5FEB\u7684\u884C\u661F\uFF0C\u8868\u9762\u6EE1\u5E03\u77F3\u574F\u3002' },
  { name:'\u91D1\u661F', nameEn:'Venus', r:0.32, d:5.8, orbit:0.615, rot:-243, tilt:177.4, color:0xe8c87a,
    tex:TEX+'2k_venus_surface.jpg', atmos:true, desc:'\u6700\u70ED\u7684\u884C\u661F\uFF0C\u6FC3\u5BC6\u5927\u6C14\u5C42\u9020\u6210\u9003\u9038\u6E29\u5BA4\u6548\u5E94\u3002' },
  { name:'\u5730\u7403', nameEn:'Earth', r:0.34, d:7.6, orbit:1, rot:1, tilt:23.44, color:0x4488ff,
    tex:TEX+'2k_earth_daymap.jpg', normal:TEX+'2k_earth_normal_map.jpg', spec:TEX+'2k_earth_specular_map.jpg', cloud:TEX+'2k_earth_cloud_map.jpg', night:TEX+'2k_earth_night_map.jpg', atmos:true,
    desc:'\u6211\u4EEC\u7684\u5BB6\u56ED\uFF0C\u76EE\u524D\u5DF2\u77E5\u552F\u4E00\u62E5\u6709\u751F\u547D\u7684\u884C\u661F\u3002' },
  { name:'\u706B\u661F', nameEn:'Mars', r:0.22, d:10.0, orbit:1.88, rot:1.03, tilt:25.19, color:0xd4734a,
    tex:TEX+'2k_mars.jpg', normal:TEX+'2k_mars_normal_map.jpg', atmos:true,
    desc:'\u7EA2\u8272\u884C\u661F\uFF0C\u4EBA\u7C7B\u63A2\u7D22\u7684\u4E0B\u4E00\u4E2A\u76EE\u6807\u3002' },
  { name:'\u6728\u661F', nameEn:'Jupiter', r:1.1, d:15.0, orbit:11.86, rot:0.41, tilt:3.13, color:0xd4a06a,
    tex:TEX+'2k_jupiter.jpg', atmos:true,
    desc:'\u6700\u5927\u7684\u884C\u661F\uFF0C\u8D28\u91CF\u662F\u5176\u4ED6\u6240\u6709\u884C\u661F\u603B\u548C\u7684 2.5 \u500D\u3002' },
  { name:'\u571F\u661F', nameEn:'Saturn', r:0.95, d:19.5, orbit:29.46, rot:0.45, tilt:26.73, color:0xe8d5a0,
    tex:TEX+'2k_saturn.jpg', ring:TEX+'2k_saturn_ring_alpha.png', atmos:true,
    desc:'\u4EE5\u5D14\u7384\u7684\u5149\u73AF\u95FB\u540D\uFF0C\u5BC6\u5EA6\u6BD4\u6C34\u8FD8\u4F4E\u3002' },
  { name:'\u5929\u738B\u661F', nameEn:'Uranus', r:0.5, d:25.0, orbit:84.01, rot:-0.72, tilt:97.77, color:0x7ec8e3,
    tex:TEX+'2k_uranus.jpg', atmos:true,
    desc:'\u5012\u7740\u8F6C\u7684\u884C\u661F\uFF0C\u8F74\u5411\u503E\u659C\u7EA6 98\u00B0\u3002' },
  { name:'\u6D77\u738B\u661F', nameEn:'Neptune', r:0.45, d:29.0, orbit:164.8, rot:0.67, tilt:28.32, color:0x3355ff,
    tex:TEX+'2k_neptune.jpg', atmos:true,
    desc:'\u6700\u8FDC\u7684\u884C\u661F\uFF0C\u98CE\u901F\u53EF\u8FBE 2100 km/h\u3002' },
];

const MOON_DATA = [
  { parent:2, name:'\u6708\u4EAE', nameEn:'Moon', r:0.07, d:0.7, orbit:0.075, rot:27.3, color:0xcccccc,
    tex:TEX+'2k_moon.jpg' },
  { parent:3, name:'\u706B\u661F\u4E00', nameEn:'Phobos', r:0.03, d:0.45, orbit:0.02, rot:0.32, color:0x999988 },
  { parent:3, name:'\u706B\u661F\u4E8C', nameEn:'Deimos', r:0.02, d:0.65, orbit:0.04, rot:1.26, color:0x888877 },
  { parent:4, name:'\u6728\u536B\u4E00', nameEn:'Io', r:0.08, d:1.1, orbit:0.05, rot:1.77, color:0xeeddaa },
  { parent:4, name:'\u6728\u536B\u4E8C', nameEn:'Europa', r:0.07, d:1.5, orbit:0.1, rot:3.55, color:0xccddcc },
  { parent:4, name:'\u6728\u536B\u4E09', nameEn:'Ganymede', r:0.1, d:2.0, orbit:0.2, rot:7.15, color:0xccccbb },
  { parent:4, name:'\u6728\u536B\u56DB', nameEn:'Callisto', r:0.09, d:2.6, orbit:0.45, rot:16.7, color:0xbbbbaa },
  { parent:5, name:'\u571F\u536B\u516D', nameEn:'Titan', r:0.09, d:1.8, orbit:0.35, rot:15.9, color:0xddbb88, atmos:true },
];

const loading = document.getElementById('loading');
const progressFill = document.getElementById('progressFill');
const timeDisplay = document.getElementById('timeDisplay');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');
const planetPanel = document.getElementById('planet-panel');
const panelContent = document.getElementById('panel-content');
const panelClose = document.getElementById('panel-close');
const btnReset = document.getElementById('btn-reset');
const btnOrbit = document.getElementById('btn-toggle-orbit');
const btnLabels = document.getElementById('btn-toggle-labels');
const labelCanvas = document.getElementById('label-canvas');
const lctx = labelCanvas.getContext('2d');

let totalAssets = 0;
let loadedAssets = 0;
let showOrbits = true;
let showLabels = true;
let timeMult = 1;
let focusedPlanet = null;
let focusSmooth = null;

function assetLoaded() { loadedAssets++; if (progressFill) progressFill.style.width = Math.min((loadedAssets/totalAssets)*100,100)+'%'; if (loadedAssets>=totalAssets&&totalAssets>0) setTimeout(()=>loading.classList.add('hidden'),500); }

const texLoader = new THREE.TextureLoader();
function loadTex(url, cb) {
  totalAssets++;
  if (!url) { setTimeout(assetLoaded,10); return null; }
  return texLoader.load(url, (t)=>{ if (cb) cb(t); assetLoaded(); }, undefined, ()=>assetLoaded());
}

function resLabel() {
  labelCanvas.width = window.innerWidth;
  labelCanvas.height = window.innerHeight;
}
resLabel();
window.addEventListener('resize', resLabel);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.01, 5000);
camera.position.set(6, 8, 18);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.1, 0.05);
composer.addPass(bloomPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.5;
controls.maxDistance = 120;
controls.target.set(0,0,0);

const clock = new THREE.Clock();
const sunGroup = new THREE.Group();
scene.add(sunGroup);

const sunVS = ['varying vec2 vUv;','void main(){','vUv=uv;','gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);','}'].join('\n');
const sunFS = ['uniform float uTime;','varying vec2 vUv;',
'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float n(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
'void main(){',
'vec2 uv=vUv*10.;uv.x+=uTime*0.015;uv.y+=uTime*0.005;',
'float a=n(uv);a+=0.5*n(uv*2.+uTime*0.03);a+=0.25*n(uv*4.+uTime*0.06);a/=1.75;',
'float d=length(vUv-0.5)*2.;float l=1.-d*d*0.25;',
'vec3 col=mix(vec3(1.,.35,.02),vec3(1.,.8,.15),a*.5+.5);col*=l;',
'float hf=smoothstep(.6,.92,a);col+=vec3(1.,.9,.4)*hf*.25;',
'float e=pow(d,6.);col+=vec3(1.,.5,.1)*e*.15;',
'gl_FragColor=vec4(col,1.);}',
].join('\n');

const sunMat = new THREE.ShaderMaterial({
  uniforms:{ uTime:{ value:0 } },
  vertexShader: sunVS, fragmentShader: sunFS,
});
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.8, 128, 128), sunMat);
sunGroup.add(sunMesh);

const coronaMat = new THREE.ShaderMaterial({
  vertexShader: ['varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}'].join('\n'),
  fragmentShader: ['varying vec3 vN;varying vec3 vW;void main(){vec3 vd=normalize(cameraPosition-vW);float r=1.-max(dot(vd,vN),0.);r=pow(r,6.);gl_FragColor=vec4(vec3(1.,.6,.2),r*.15);}'].join('\n'),
  transparent:true, side:THREE.BackSide, depthWrite:false, blending:THREE.AdditiveBlending,
});
sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.95, 64, 64), coronaMat));

const sunGlowC = document.createElement('canvas');
sunGlowC.width=128; sunGlowC.height=128;
const sgctx = sunGlowC.getContext('2d');
const sgg = sgctx.createRadialGradient(64,64,0,64,64,64);
sgg.addColorStop(0,'rgba(255,220,150,1)'); sgg.addColorStop(0.08,'rgba(255,200,100,0.6)');
sgg.addColorStop(0.25,'rgba(255,180,60,0.15)'); sgg.addColorStop(0.5,'rgba(255,140,20,0.04)');
sgg.addColorStop(1,'rgba(255,80,0,0)'); sgctx.fillStyle=sgg; sgctx.fillRect(0,0,128,128);
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map:new THREE.CanvasTexture(sunGlowC), blending:THREE.AdditiveBlending, depthWrite:false, transparent:true,
}));
sunGlow.scale.set(18,18,1);
sunGroup.add(sunGlow);

const sunLight = new THREE.PointLight(0xffeecc, 2.5, 200);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunGroup.add(sunLight);

scene.add(new THREE.AmbientLight(0x111133, 0.15));

const planets = [];
const orbitLines = [];
const labelData = [];

function createPlanet(pData, idx) {
  const group = new THREE.Group();
  scene.add(group);

  const geo = new THREE.SphereGeometry(pData.r, 64, 64);
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.7, metalness: 0.1,
  });

  if (pData.tex) {
    const tex = loadTex(pData.tex, (t)=>{ t.colorSpace=THREE.SRGBColorSpace; mat.map=t; mat.needsUpdate=true; });
  } else {
    mat.color.setHex(pData.color);
  }
  if (pData.normal) {
    loadTex(pData.normal, (t)=>{ mat.normalMap=t; mat.normalScale=new THREE.Vector2(1,1); mat.needsUpdate=true; });
  }
  if (pData.spec) {
    loadTex(pData.spec, (t)=>{ mat.roughnessMap=t; mat.roughness=1; mat.needsUpdate=true; });
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.z = pData.tilt * Math.PI / 180;
  group.add(mesh);

  if (pData.cloud) {
    const cloudTex = loadTex(pData.cloud);
    const cmat = new THREE.MeshPhongMaterial({
      map:cloudTex, transparent:true, opacity:0.3, depthWrite:false,
      side:THREE.DoubleSide, blending:THREE.NormalBlending,
    });
    const cmesh = new THREE.Mesh(new THREE.SphereGeometry(pData.r*1.006, 48, 48), cmat);
    cmesh.name='clouds';
    group.add(cmesh);
  }

  if (pData.atmos) {
    const amat = new THREE.ShaderMaterial({
      vertexShader: ['varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}'].join('\n'),
      fragmentShader: ['varying vec3 vN;varying vec3 vW;void main(){vec3 vd=normalize(cameraPosition-vW);float r=1.-max(dot(vd,vN),0.);r=pow(r,5.);gl_FragColor=vec4(vec3(.4,.6,1.),r*.3);}'].join('\n'),
      transparent:true, side:THREE.FrontSide, depthWrite:false, blending:THREE.AdditiveBlending,
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(pData.r*1.025, 48, 48), amat));
  }

  if (pData.ring) {
    const rtex = loadTex(pData.ring, (t)=>{ rmat.alphaMap=t; rmat.needsUpdate=true; });
    const rmat = new THREE.MeshStandardMaterial({
      color:0xd4c8a0, side:THREE.DoubleSide, transparent:true,
      opacity:0.8, depthWrite:false, roughness:0.8, metalness:0.1,
    });
    if (rtex) { rmat.alphaMap=rtex; }
    const rgeo = new THREE.RingGeometry(pData.r*1.2, pData.r*2.2, 128);
    const rmesh = new THREE.Mesh(rgeo, rmat);
    rmesh.rotation.x = Math.PI * 0.4;
    group.add(rmesh);
  }

  const angle = Math.random() * Math.PI * 2;
  const obj = {
    group, mesh, pData, angle,
    clouds: pData.cloud ? group.getObjectByName('clouds') : null,
    moons: [],
  };

  if (pData.atmos) {
    const aMatCustom = new THREE.ShaderMaterial({
      uniforms:{ uSunDir:{ value:new THREE.Vector3(0,0,-1) } },
      vertexShader: ['varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}'].join('\n'),
      fragmentShader: ['uniform vec3 uSunDir;varying vec3 vN;varying vec3 vW;void main(){vec3 vd=normalize(cameraPosition-vW);vec3 ld=normalize(uSunDir);float r=1.-max(dot(vd,vN),0.);r=pow(r,5.);float sf=max(dot(vN,ld),0.);float s=r*.6+pow(sf,3.)*.15;vec3 col=mix(vec3(.3,.5,.8),vec3(.5,.7,1.),s);gl_FragColor=vec4(col,s*.35);}'].join('\n'),
      transparent:true, side:THREE.FrontSide, depthWrite:false, blending:THREE.AdditiveBlending,
    });
    const oldAtmo = group.children.find(c=>c.material&&c.material.type==='ShaderMaterial');
    if (oldAtmo) group.remove(oldAtmo);
    const aMesh = new THREE.Mesh(new THREE.SphereGeometry(pData.r*1.025, 48, 48), aMatCustom);
    group.add(aMesh);
    obj.atmoMat = aMatCustom;
  }

  planets.push(obj);
  return obj;
}

PLANET_DATA.forEach((pd, i)=>createPlanet(pd, i));

MOON_DATA.forEach((md)=>{
  const parent = planets[md.parent];
  if (!parent) return;
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(md.r, 24, 24);
  const mat = new THREE.MeshStandardMaterial({ roughness:0.8, metalness:0.05 });
  if (md.tex) {
    loadTex(md.tex, (t)=>{ t.colorSpace=THREE.SRGBColorSpace; mat.map=t; mat.needsUpdate=true; });
  } else {
    mat.color.setHex(md.color);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  g.add(mesh);
  parent.group.add(g);
  parent.moons.push({ group:g, mesh, md, angle:Math.random()*Math.PI*2 });
});

PLANET_DATA.forEach((pd, i)=>{
  const points = [];
  const segments = 256;
  for (let j=0; j<=segments; j++) {
    const a = (j/segments)*Math.PI*2;
    points.push(new THREE.Vector3(pd.d*Math.cos(a), 0, pd.d*Math.sin(a)));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.06 }));
  scene.add(line);
  orbitLines.push(line);
});

const astCount = 5000;
const astPos = new Float32Array(astCount*3);
const astSizes = new Float32Array(astCount);
for (let i=0; i<astCount; i++) {
  const a = Math.random()*Math.PI*2;
  const r = 11 + Math.random()*4;
  const y = (Math.random()-0.5)*0.8;
  astPos[i*3] = r*Math.cos(a);
  astPos[i*3+1] = y;
  astPos[i*3+2] = r*Math.sin(a);
  astSizes[i] = 0.3+Math.random()*0.8;
}
const astGeo = new THREE.BufferGeometry();
astGeo.setAttribute('position', new THREE.BufferAttribute(astPos, 3));
astGeo.setAttribute('size', new THREE.BufferAttribute(astSizes, 1));
const astMat = new THREE.PointsMaterial({
  color:0x888877, size:0.04, transparent:true, opacity:0.5,
  sizeAttenuation:true,
});
const astField = new THREE.Points(astGeo, astMat);
scene.add(astField);

const starCount = 100000;
const sPos = new Float32Array(starCount*3);
const sCol = new Float32Array(starCount*3);
const sSize = new Float32Array(starCount);
for (let i=0; i<starCount; i++) {
  const r = 200+Math.random()*800;
  const theta = Math.random()*Math.PI*2;
  const phi = Math.acos(2*Math.random()-1);
  sPos[i*3]=r*Math.sin(phi)*Math.cos(theta);
  sPos[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
  sPos[i*3+2]=r*Math.cos(phi);
  const b = 0.3+Math.random()*0.7;
  const t = Math.random();
  if (t<0.05) { sCol[i*3]=b*0.3; sCol[i*3+1]=b*0.4; sCol[i*3+2]=b; }
  else if (t<0.1) { sCol[i*3]=b; sCol[i*3+1]=b*0.5; sCol[i*3+2]=b*0.3; }
  else { sCol[i*3]=b; sCol[i*3+1]=b; sCol[i*3+2]=b; }
  sSize[i]=0.5+Math.random()*3;
}
const sGeo = new THREE.BufferGeometry();
sGeo.setAttribute('position', new THREE.BufferAttribute(sPos,3));
sGeo.setAttribute('customColor', new THREE.BufferAttribute(sCol,3));
sGeo.setAttribute('size', new THREE.BufferAttribute(sSize,1));
const sMat = new THREE.PointsMaterial({
  size:0.5, vertexColors:true, transparent:true, opacity:0.9,
  sizeAttenuation:true,
});
scene.add(new THREE.Points(sGeo, sMat));

if (totalAssets===0) { setTimeout(()=>loading.classList.add('hidden'), 800); }

function updatePlanetPositions(dt) {
  planets.forEach((p, i)=>{
    p.angle += (dt * 0.5 / p.pData.orbit) * timeMult;
    const x = p.pData.d * Math.cos(p.angle);
    const z = p.pData.d * Math.sin(p.angle);
    p.group.position.set(x, 0, z);
    p.mesh.rotation.y += dt * (2*Math.PI / p.pData.rot) * timeMult;
    if (p.clouds) p.clouds.rotation.y += dt * (2*Math.PI / p.pData.rot) * 1.2 * timeMult;
  });
}

function updateMoonPositions(dt) {
  planets.forEach((p)=>{
    p.moons.forEach((m)=>{
      m.angle += dt * 0.3 * timeMult;
      const x = m.md.d * Math.cos(m.angle);
      const z = m.md.d * Math.sin(m.angle);
      m.group.position.set(x, 0, z);
      m.mesh.rotation.y += dt * timeMult;
    });
  });
}

function drawLabels() {
  lctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  if (!showLabels) return;

  const all = [];
  planets.forEach((p)=>{
    const pos = new THREE.Vector3();
    p.group.getWorldPosition(pos);
    pos.y += p.pData.r + 0.2;
    all.push({ pos, name: p.pData.name, color: '#'+p.pData.color.toString(16).padStart(6,'0') });
    p.moons.forEach((m)=>{
      const mp = new THREE.Vector3();
      m.group.getWorldPosition(mp);
      mp.y += m.md.r + 0.1;
      all.push({ pos:mp, name:m.md.name, color:'#888888', small:true });
    });
  });

  all.push({ pos:new THREE.Vector3(0,2.2,0), name:'\u592A\u9633', color:'#ffcc44' });

  all.forEach((item)=>{
    const v = item.pos.clone().project(camera);
    if (v.z > 1) return;
    const x = (v.x*0.5+0.5)*labelCanvas.width;
    const y = (-v.y*0.5+0.5)*labelCanvas.height;
    if (x<0||x>labelCanvas.width||y<0||y>labelCanvas.height) return;

    lctx.font = item.small ? '11px sans-serif' : '13px sans-serif';
    lctx.textAlign = 'center';
    lctx.fillStyle = item.color;
    lctx.globalAlpha = 0.7;
    lctx.fillText(item.name, x, y);
    lctx.globalAlpha = 1;
  });
}

function showPlanetInfo(p) {
  const d = p.pData;
  panelContent.innerHTML = [
    '<h2>'+d.name+'</h2>',
    '<div class="name-en">'+d.nameEn+'</div>',
    '<div class="stat"><span class="label">\u76F4\u5F84</span><span class="value">'+(d.r*2*6371*1.5).toFixed(0)+' km</span></div>',
    '<div class="stat"><span class="label">\u516C\u8F6C\u5468\u671F</span><span class="value">'+d.orbit+' \u5E74</span></div>',
    '<div class="stat"><span class="label">\u81EA\u8F6C\u5468\u671F</span><span class="value">'+Math.abs(d.rot)+' \u5929</span></div>',
    '<div class="stat"><span class="label">\u8F74\u5411\u503E\u659C</span><span class="value">'+d.tilt+'\u00B0</span></div>',
    '<div class="stat"><span class="label">\u8DDD\u79BB\u592A\u9633</span><span class="value">'+(d.d*0.2).toFixed(1)+' AU</span></div>',
    d.desc ? '<div class="desc">'+d.desc+'</div>' : '',
  ].join('');
  planetPanel.classList.add('visible');
}

panelClose.addEventListener('click', ()=>{ planetPanel.classList.remove('visible'); focusedPlanet=null; });

btnReset.addEventListener('click', ()=>{
  focusedPlanet=null;
  controls.target.set(0,0,0);
  camera.position.set(6,8,18);
  controls.update();
});

btnOrbit.addEventListener('click', ()=>{
  showOrbits=!showOrbits;
  orbitLines.forEach(l=>l.visible=showOrbits);
  btnOrbit.style.opacity=showOrbits?'1':'0.3';
});

btnLabels.addEventListener('click', ()=>{
  showLabels=!showLabels;
  btnLabels.style.opacity=showLabels?'1':'0.3';
});

speedSlider.addEventListener('input', ()=>{
  timeMult = Math.pow(2, parseFloat(speedSlider.value));
  speedLabel.textContent = (timeMult>=1?timeMult.toFixed(1):'/'+(1/timeMult).toFixed(1))+'×';
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredPlanet = null;

renderer.domElement.addEventListener('pointerdown', (e)=>{
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = planets.map(p=>p.mesh);
  const intersects = raycaster.intersectObjects(meshes);
  if (intersects.length>0) {
    const hit = intersects[0].object;
    const p = planets.find(pp=>pp.mesh===hit);
    if (p) {
      focusedPlanet = p;
      showPlanetInfo(p);
    }
  }
});

renderer.domElement.addEventListener('pointermove', (e)=>{
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = planets.map(p=>p.mesh);
  const intersects = raycaster.intersectObjects(meshes);
  if (intersects.length>0) {
    renderer.domElement.style.cursor = 'pointer';
    const hit = intersects[0].object;
    const p = planets.find(pp=>pp.mesh===hit);
    if (p && p!==hoveredPlanet) {
      if (hoveredPlanet) hoveredPlanet.mesh.material.emissive.setHex(0x000000);
      hoveredPlanet = p;
      hoveredPlanet.mesh.material.emissive.setHex(0x444444);
    }
  } else {
    renderer.domElement.style.cursor = 'default';
    if (hoveredPlanet) { hoveredPlanet.mesh.material.emissive.setHex(0x000000); hoveredPlanet=null; }
  }
});

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  sunMat.uniforms.uTime.value += dt;

  if (focusedPlanet) {
    const target = new THREE.Vector3();
    focusedPlanet.group.getWorldPosition(target);
    controls.target.lerp(target, 0.05);
  }

  updatePlanetPositions(dt);
  updateMoonPositions(dt);
  controls.update();
  composer.render();
  drawLabels();

  const hours = Math.floor((Date.now()%86400000)/3600000);
  const mins = Math.floor((Date.now()%3600000)/60000);
  timeDisplay.textContent = '\u65F6\u95F4\u52A0\u901F '+(timeMult>=1?timeMult.toFixed(1)+'\u00D7':'/'+(1/timeMult).toFixed(1)+'\u00D7');
}

animate();

window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  resLabel();
});