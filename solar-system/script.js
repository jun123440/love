import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const TEX = 'https://www.solarsystemscope.com/textures/download/';
const THREE_TEX = 'https://threejs.org/examples/textures/planets/';

const PLANET_DATA = [
  { name:'\u6C34\u661F', nameEn:'Mercury', r:0.18, d:4.0, orbit:0.24, rot:58.6, tilt:0.03, color:0xbcbcbc,
    tex:TEX+'2k_mercury.jpg',
    desc:'\u592A\u9633\u7CFB\u6700\u5C0F\u884C\u661F\uFF0C\u76F4\u5F84\u4EC54878km\uFF0C\u8868\u9762\u6E29\u5DEE\u8D85\uFFE600\u00B0C\u3002',
    detail:'\u5BC6\u5EA6 5.43 g/cm\u00B3 | \u5F15\u529B 3.7 m/s\u00B2 | \u65E0\u5927\u6C14\u5C42' },
  { name:'\u91D1\u661F', nameEn:'Venus', r:0.32, d:5.8, orbit:0.615, rot:-243, tilt:177.4, color:0xe8c87a,
    tex:TEX+'2k_venus_surface.jpg', atmos:true,
    desc:'\u6700\u70ED\u884C\u661F\uFF0C\u8868\u9762\u6E29\u5EA6\u8FBE462\u00B0C\uFF0C\u81EA\u8F6C\u65B9\u5411\u4E0E\u5176\u4ED6\u884C\u661F\u76F8\u53CD\u3002',
    detail:'\u5BC6\u5EA6 5.24 g/cm\u00B3 | \u5927\u6C14\u538B 92\u500D\u5730\u7403 | CO\u2082 96.5%' },
  { name:'\u5730\u7403', nameEn:'Earth', r:0.34, d:7.6, orbit:1, rot:1, tilt:23.44, color:0x4488ff,
    tex:TEX+'2k_earth_daymap.jpg', normal:THREE_TEX+'earth_normal_2048.jpg',
    cloud:THREE_TEX+'earth_clouds_1024.png', atmos:true,
    desc:'\u6211\u4EEC\u7684\u5BB6\u56ED\uFF0C\u76F4\u5F8412742km\uFF0C70%\u8868\u9762\u88AB\u6D77\u6D0B\u8986\u76D6\u3002',
    detail:'\u5BC6\u5EA6 5.51 g/cm\u00B3 | \u536B\u661F 1\u9897 | \u5927\u6C14\u542B\u6C27 21%' },
  { name:'\u706B\u661F', nameEn:'Mars', r:0.22, d:10.0, orbit:1.88, rot:1.03, tilt:25.19, color:0xd4734a,
    tex:TEX+'2k_mars.jpg', atmos:true,
    desc:'\u7EA2\u8272\u884C\u661F\uFF0C\u62E5\u6709\u592A\u9633\u7CFB\u6700\u5927\u706B\u5C71\u5965\u6797\u5339\u65AF\u5C71\uFF08\u9AD821.9km\uFF09\u3002',
    detail:'\u5BC6\u5EA6 3.93 g/cm\u00B3 | \u536B\u661F 2\u9897 | CO\u2082\u5927\u6C14 95%' },
  { name:'\u6728\u661F', nameEn:'Jupiter', r:1.1, d:15.0, orbit:11.86, rot:0.41, tilt:3.13, color:0xd4a06a,
    tex:TEX+'2k_jupiter.jpg', atmos:true,
    desc:'\u6700\u5927\u884C\u661F\uFF0C\u76F4\u5F84139822km\uFF0C\u8D28\u91CF\u662F\u5176\u4ED6\u6240\u6709\u884C\u661F\u603B\u548C\u76842.5\u500D\u3002',
    detail:'\u5BC6\u5EA6 1.33 g/cm\u00B3 | \u536B\u661F 95\u9897 | \u5927\u7EA2\u724E\u98CE\u66B4' },
  { name:'\u571F\u661F', nameEn:'Saturn', r:0.95, d:19.5, orbit:29.46, rot:0.45, tilt:26.73, color:0xe8d5a0,
    tex:TEX+'2k_saturn.jpg', ring:TEX+'2k_saturn_ring_alpha.png', atmos:true,
    desc:'\u4EE5\u5D14\u7384\u5149\u73AF\u95FB\u540D\uFF0C\u5BC6\u5EA6\u4EC50.687 g/cm\u00B3\u6BD4\u6C34\u8FD8\u4F4E\u3002',
    detail:'\u5BC6\u5EA6 0.69 g/cm\u00B3 | \u536B\u661F 146\u9897 | \u5149\u73AF\u539A\u5EA610m' },
  { name:'\u5929\u738B\u661F', nameEn:'Uranus', r:0.5, d:25.0, orbit:84.01, rot:-0.72, tilt:97.77, color:0x7ec8e3,
    tex:TEX+'2k_uranus.jpg', atmos:true,
    desc:'\u5012\u7740\u8F6C\u7684\u884C\u661F\uFF0C\u8F74\u5411\u503E\u659C97.77\u00B0\uFF0C\u4E3A\u4F53\u7CFB\u6700\u51B7\u7684\u884C\u661F\u4E4B\u4E00\u3002',
    detail:'\u5BC6\u5EA6 1.27 g/cm\u00B3 | \u536B\u661F 27\u9897 | \u6C27\u6C2E\u5927\u6C14' },
  { name:'\u6D77\u738B\u661F', nameEn:'Neptune', r:0.45, d:29.0, orbit:164.8, rot:0.67, tilt:28.32, color:0x3355ff,
    tex:TEX+'2k_neptune.jpg', atmos:true,
    desc:'\u6700\u8FDC\u884C\u661F\uFF0C\u98CE\u901F\u53EF\u8FBE2100km/h\uFF0C\u9A6C\u8FBE\u7F57\u7EB9\u50CF\u5927\u9ED1\u6591\u3002',
    detail:'\u5BC6\u5EA6 1.64 g/cm\u00B3 | \u536B\u661F 16\u9897 | \u6700\u9AD8\u98CE\u901F\u8D852100km/h' },
];

const MOON_DATA = [
  { parent:2, name:'\u6708\u4EAE', nameEn:'Moon', r:0.07, d:0.7, orbit:0.075, rot:27.3, color:0xcccccc, tex:TEX+'2k_moon.jpg' },
  { parent:3, name:'\u706B\u536B\u4E00', nameEn:'Phobos', r:0.025, d:0.45, orbit:0.02, rot:0.32, color:0x999988 },
  { parent:3, name:'\u706B\u536B\u4E8C', nameEn:'Deimos', r:0.018, d:0.65, orbit:0.04, rot:1.26, color:0x888877 },
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

let totalAssets = 0, loadedAssets = 0, showOrbits = true, showLabels = true, timeMult = 1;
let focusedPlanet = null, focusTarget = null;
let camState = 'overview'; // overview | focusing | focused

function assetLoaded() {
  loadedAssets++;
  if (progressFill) progressFill.style.width = Math.min((loadedAssets/totalAssets)*100,100)+'%';
  if (loadedAssets>=totalAssets&&totalAssets>0) setTimeout(()=>loading.classList.add('hidden'),500);
}

const texLoader = new THREE.TextureLoader();
function loadTex(url, cb) {
  totalAssets++;
  if (!url) { setTimeout(assetLoaded,10); return null; }
  return texLoader.load(url, (t)=>{ if (cb) cb(t); assetLoaded(); }, undefined, ()=>assetLoaded());
}

function resLabel() { labelCanvas.width=window.innerWidth; labelCanvas.height=window.innerHeight; }
resLabel(); window.addEventListener('resize', resLabel);

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
controls.minDistance = 0.3;
controls.maxDistance = 120;
controls.target.set(0,0,0);

const clock = new THREE.Clock();

// --- BACKGROUND NEBULA ---
const nebulaVS = ['varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'].join('\n');
const nebulaFS = ['uniform float uTime;varying vec3 vPos;',
'float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
'float n(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}',
'void main(){',
'vec3 p=vPos*0.003+uTime*0.0005;float a=n(p)*0.5;',
'a+=0.25*n(p*2.);a+=0.125*n(p*4.);a/=0.875;',
'float s=n(p*6.+100.)*0.3;',
'vec3 col=mix(vec3(.01,.005,.02),vec3(.06,.02,.08),a*smoothstep(.3,.7,a));',
'col+=mix(vec3(.1,.01,.02),vec3(.02,.03,.08),sin(a*10.+p.x)*.5+.5)*s*.15;',
'float star=smoothstep(.85,.95,s);',
'vec3 sc=vec3(.8,.7,.6)*star;',
'gl_FragColor=vec4(col+sc,1.);}',
].join('\n');
const nebulaMat = new THREE.ShaderMaterial({
  uniforms:{ uTime:{ value:0 } },
  vertexShader:nebulaVS, fragmentShader:nebulaFS, side:THREE.BackSide,
});
const nebulaMesh = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 64), nebulaMat);
scene.add(nebulaMesh);

// --- SUN ---
const sunGroup = new THREE.Group(); scene.add(sunGroup);
const sunVS = ['varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'].join('\n');
const sunFS = ['uniform float uTime;varying vec2 vUv;',
'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float n(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*n(p);p*=2.2;p+=vec2(1.7,9.2);a*=.5;}return v;}',
'void main(){',
'vec2 uv=vUv*12.;uv.x+=uTime*0.012;uv.y+=uTime*0.004;',
'float a=fbm(uv);float b=fbm(uv*0.5+50.);',
'float d=length(vUv-0.5)*2.;float l=1.-d*d*0.35+0.1*(1.-d*d);',
'vec3 c1=vec3(1.,.9,.4);vec3 c2=vec3(1.,.55,.05);vec3 c3=vec3(1.,.25,.02);',
'vec3 col=mix(c3,c2,a);col=mix(col,c1,b*.5+.5);col*=l;',
'float hf=smoothstep(.55,.9,a);col+=vec3(1.,.85,.3)*hf*.35;',
'float e=pow(d,5.);col+=vec3(1.,.4,.05)*e*.2;',
'gl_FragColor=vec4(col,1.);}',
].join('\n');
const sunMat = new THREE.ShaderMaterial({ uniforms:{ uTime:{ value:0 } }, vertexShader:sunVS, fragmentShader:sunFS });
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.8, 128, 128), sunMat);
sunGroup.add(sunMesh);

const coronaMat = new THREE.ShaderMaterial({
  vertexShader:['varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}'].join('\n'),
  fragmentShader:['uniform float uTime;varying vec3 vN;varying vec3 vW;void main(){vec3 vd=normalize(cameraPosition-vW);float r=1.-max(dot(vd,vN),0.);r=pow(r,5.);float f=sin(uTime*0.5+vW.x*5.+vW.y*7.)*.2+.8;gl_FragColor=vec4(vec3(1.,.5,.15)*f,r*.12);}'].join('\n'),
  uniforms:{ uTime:{ value:0 } },
  transparent:true, side:THREE.BackSide, depthWrite:false, blending:THREE.AdditiveBlending,
});
sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.95, 64, 64), coronaMat));

const chromoMat = new THREE.ShaderMaterial({
  vertexShader:['varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}'].join('\n'),
  fragmentShader:['uniform float uTime;varying vec3 vN;varying vec3 vW;void main(){vec3 vd=normalize(cameraPosition-vW);float r=1.-max(dot(vd,vN),0.);r=pow(r,8.);float f=sin(uTime*2.+vW.y*10.)*.15+.85;gl_FragColor=vec4(vec3(1.,.15,.02),r*.08*f);}'].join('\n'),
  uniforms:{ uTime:{ value:0 } },
  transparent:true, side:THREE.FrontSide, depthWrite:false, blending:THREE.AdditiveBlending,
});
sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.82, 64, 64), chromoMat));

const flareCount = 400;
const flarePos = new Float32Array(flareCount*3);
const flareSize = new Float32Array(flareCount);
const flarePhase = new Float32Array(flareCount);
for (let i=0; i<flareCount; i++) {
  const theta = Math.random()*Math.PI*2;
  const phi = Math.acos(2*Math.random()-1);
  const r = 1.85 + Math.random()*0.3;
  flarePos[i*3]=r*Math.sin(phi)*Math.cos(theta);
  flarePos[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
  flarePos[i*3+2]=r*Math.cos(phi);
  flareSize[i]=0.01+Math.random()*0.04;
  flarePhase[i]=Math.random()*Math.PI*2;
}
const flareGeo = new THREE.BufferGeometry();
flareGeo.setAttribute('position', new THREE.BufferAttribute(flarePos,3));
flareGeo.setAttribute('size', new THREE.BufferAttribute(flareSize,1));
flareGeo.setAttribute('phase', new THREE.BufferAttribute(flarePhase,1));
const flareMat = new THREE.ShaderMaterial({
  uniforms:{ uTime:{ value:0 } },
  vertexShader:['attribute float size;attribute float phase;uniform float uTime;varying float vA;void main(){vec4 mvPos=modelViewMatrix*vec4(position,1.0);float tw=0.5+0.5*sin(uTime*3.+phase*6.28+position.x*20.+position.y*15.);gl_PointSize=size*(80./-mvPos.z)*tw;vA=tw;gl_Position=projectionMatrix*mvPos;}'].join('\n'),
  fragmentShader:['varying float vA;void main(){vec2 c=gl_PointCoord-vec2(.5);float d=length(c);if(d>.5)discard;float a=(1.-smoothstep(0.,.5,d))*vA*.8;gl_FragColor=vec4(1.,.8,.4,a);}'].join('\n'),
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
});
sunGroup.add(new THREE.Points(flareGeo, flareMat));

const sunGlowC = document.createElement('canvas');
sunGlowC.width=128; sunGlowC.height=128;
const sgctx=sunGlowC.getContext('2d');
const sgg=sgctx.createRadialGradient(64,64,0,64,64,64);
sgg.addColorStop(0,'rgba(255,220,150,1)');sgg.addColorStop(0.08,'rgba(255,200,100,0.5)');
sgg.addColorStop(0.25,'rgba(255,180,60,0.12)');sgg.addColorStop(0.5,'rgba(255,140,20,0.03)');
sgg.addColorStop(1,'rgba(255,80,0,0)');sgctx.fillStyle=sgg;sgctx.fillRect(0,0,128,128);
const sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({
  map:new THREE.CanvasTexture(sunGlowC),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,
}));
sunGlow.scale.set(20,20,1);sunGroup.add(sunGlow);

const sunLight=new THREE.PointLight(0xffeecc,3,200);
sunLight.castShadow=true;sunLight.shadow.mapSize.width=1024;sunLight.shadow.mapSize.height=1024;
sunGroup.add(sunLight);
scene.add(new THREE.AmbientLight(0x111133,0.15));

// --- PLANETS ---
const planets=[];const orbitLines=[];

function createPlanet(pd,idx){
  const group=new THREE.Group();scene.add(group);
  const geo=new THREE.SphereGeometry(pd.r,96,96);
  const mat=new THREE.MeshStandardMaterial({roughness:.6,metalness:.05});
  if(pd.tex){const t=loadTex(pd.tex,(t)=>{t.colorSpace=THREE.SRGBColorSpace;mat.map=t;mat.needsUpdate=true});}
  else mat.color.setHex(pd.color);
  if(pd.normal){loadTex(pd.normal,(t)=>{mat.normalMap=t;mat.normalScale=new THREE.Vector2(1.2,1.2);mat.needsUpdate=true})}
  const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.rotation.z=pd.tilt*Math.PI/180;group.add(mesh);
  const obj={group,mesh,pd,angle:Math.random()*Math.PI*2,clouds:null,moons:[],atmoMat:null};
  if(pd.cloud){
    const ct=loadTex(pd.cloud);
    const cmat=new THREE.MeshPhongMaterial({map:ct,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending});
    const cm=new THREE.Mesh(new THREE.SphereGeometry(pd.r*1.006,48,48),cmat);cm.name='clouds';group.add(cm);obj.clouds=cm;
  }
  if(pd.atmos){
    const amat=new THREE.ShaderMaterial({
      uniforms:{uSunDir:{value:new THREE.Vector3(0,0,-1)}},
      vertexShader:['varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}'].join('\n'),
      fragmentShader:['uniform vec3 uSunDir;varying vec3 vN;varying vec3 vW;void main(){vec3 vd=normalize(cameraPosition-vW);vec3 ld=normalize(uSunDir);float r=1.-max(dot(vd,vN),0.);r=pow(r,5.);float sf=max(dot(vN,ld),0.);float s=r*.6+pow(sf,3.)*.15;vec3 col=mix(vec3(.3,.5,.8),vec3(.5,.7,1.),s);gl_FragColor=vec4(col,s*.35);}'].join('\n'),
      transparent:true,side:THREE.FrontSide,depthWrite:false,blending:THREE.AdditiveBlending,
    });
    const aMesh=new THREE.Mesh(new THREE.SphereGeometry(pd.r*1.025,48,48),amat);group.add(aMesh);obj.atmoMat=amat;
  }
  if(pd.ring){
    const rt=loadTex(pd.ring,(t)=>{rmat.alphaMap=t;rmat.needsUpdate=true});
    const rmat=new THREE.MeshStandardMaterial({color:0xd4c8a0,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false,roughness:.7,metalness:.05});
    if(rt)rmat.alphaMap=rt;
    const r1=new THREE.Mesh(new THREE.RingGeometry(pd.r*1.2,pd.r*2.4,128),rmat);
    r1.rotation.x=Math.PI*0.35;group.add(r1);
    const rmat2=new THREE.MeshStandardMaterial({color:0xb0a888,side:THREE.DoubleSide,transparent:true,opacity:.4,depthWrite:false,roughness:.8});
    const r2=new THREE.Mesh(new THREE.RingGeometry(pd.r*2.45,pd.r*2.7,128),rmat2);
    r2.rotation.x=Math.PI*0.35;group.add(r2);
    const rmat3=new THREE.MeshStandardMaterial({color:0xc8b898,side:THREE.DoubleSide,transparent:true,opacity:.3,depthWrite:false,roughness:.8});
    const r3=new THREE.Mesh(new THREE.RingGeometry(pd.r*0.8,pd.r*1.15,128),rmat3);
    r3.rotation.x=Math.PI*0.35;group.add(r3);
  }
  planets.push(obj);

  const pts=[];for(let j=0;j<=256;j++){const a=j/256*Math.PI*2;pts.push(new THREE.Vector3(pd.d*Math.cos(a),0,pd.d*Math.sin(a)));}
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.06}));
  scene.add(line);orbitLines.push(line);
}

PLANET_DATA.forEach((pd,i)=>createPlanet(pd,i));

// --- MOONS ---
MOON_DATA.forEach((md)=>{
  const p=planets[md.parent];if(!p)return;
  const g=new THREE.Group();const geo=new THREE.SphereGeometry(md.r,24,24);
  const mat=new THREE.MeshStandardMaterial({roughness:.8,metalness:.05});
  if(md.tex){loadTex(md.tex,(t)=>{t.colorSpace=THREE.SRGBColorSpace;mat.map=t;mat.needsUpdate=true})}else mat.color.setHex(md.color);
  const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;g.add(mesh);
  p.group.add(g);p.moons.push({group:g,mesh,md,angle:Math.random()*Math.PI*2});
});

// --- ASTEROID BELT ---
const ac=6000;const ap=new Float32Array(ac*3);const asz=new Float32Array(ac);
for(let i=0;i<ac;i++){const a=Math.random()*Math.PI*2;const r=11+Math.random()*4.5;const y=(Math.random()-.5)*.8;ap[i*3]=r*Math.cos(a);ap[i*3+1]=y;ap[i*3+2]=r*Math.sin(a);asz[i]=.3+Math.random()*.8;}
const aGeo=new THREE.BufferGeometry();aGeo.setAttribute('position',new THREE.BufferAttribute(ap,3));
const aMat2=new THREE.PointsMaterial({color:0x888877,size:.035,transparent:true,opacity:.4,sizeAttenuation:true});
scene.add(new THREE.Points(aGeo,aMat2));

// --- STARFIELD ---
const sc2=120000;const sp=new Float32Array(sc2*3);const sCol=new Float32Array(sc2*3);const sz=new Float32Array(sc2);
for(let i=0;i<sc2;i++){
  const r=200+Math.random()*1800;const t=Math.random()*Math.PI*2;const p=Math.acos(2*Math.random()-1);
  sp[i*3]=r*Math.sin(p)*Math.cos(t);sp[i*3+1]=r*Math.sin(p)*Math.sin(t);sp[i*3+2]=r*Math.cos(p);
  const b=.3+Math.random()*.7;const tc=Math.random();
  if(tc<.05){sCol[i*3]=b*.3;sCol[i*3+1]=b*.4;sCol[i*3+2]=b;}
  else if(tc<.1){sCol[i*3]=b;sCol[i*3+1]=b*.5;sCol[i*3+2]=b*.3;}
  else{sCol[i*3]=b;sCol[i*3+1]=b;sCol[i*3+2]=b;}
  sz[i]=.5+Math.random()*3;
}
const sGeo2=new THREE.BufferGeometry();
sGeo2.setAttribute('position',new THREE.BufferAttribute(sp,3));sGeo2.setAttribute('customColor',new THREE.BufferAttribute(sCol,3));sGeo2.setAttribute('size',new THREE.BufferAttribute(sz,3));
scene.add(new THREE.Points(sGeo2,new THREE.PointsMaterial({size:.6,vertexColors:true,transparent:true,opacity:.9,sizeAttenuation:true})));

if(totalAssets===0)setTimeout(()=>loading.classList.add('hidden'),800);

function updatePlanetPositions(dt){
  planets.forEach((p,i)=>{
    p.angle+=dt*0.5/p.pd.orbit*timeMult;
    p.group.position.set(p.pd.d*Math.cos(p.angle),0,p.pd.d*Math.sin(p.angle));
    p.mesh.rotation.y+=dt*2*Math.PI/p.pd.rot*timeMult;
    if(p.clouds)p.clouds.rotation.y+=dt*2*Math.PI/p.pd.rot*1.2*timeMult;
  });
}
function updateMoonPositions(dt){
  planets.forEach(p=>{p.moons.forEach(m=>{
    m.angle+=dt*0.3*timeMult;m.group.position.set(m.md.d*Math.cos(m.angle),0,m.md.d*Math.sin(m.angle));
    m.mesh.rotation.y+=dt*timeMult;
  })});
}

function drawLabels(){
  lctx.clearRect(0,0,labelCanvas.width,labelCanvas.height);if(!showLabels)return;
  const all=[];
  planets.forEach(p=>{
    const pos=new THREE.Vector3();p.group.getWorldPosition(pos);pos.y+=p.pd.r+.2;
    all.push({pos,name:p.pd.name,color:'#'+p.pd.color.toString(16).padStart(6,'0')});
    p.moons.forEach(m=>{const mp=new THREE.Vector3();m.group.getWorldPosition(mp);mp.y+=m.md.r+.1;all.push({pos:mp,name:m.md.name,color:'#888888',small:true})});
  });
  all.push({pos:new THREE.Vector3(0,2.2,0),name:'\u592A\u9633',color:'#ffcc44'});
  all.forEach(item=>{
    const v=item.pos.clone().project(camera);if(v.z>1)return;
    const x=(v.x*.5+.5)*labelCanvas.width;const y=(-v.y*.5+.5)*labelCanvas.height;
    if(x<0||x>labelCanvas.width||y<0||y>labelCanvas.height)return;
    lctx.font=item.small?'11px sans-serif':'13px sans-serif';lctx.textAlign='center';lctx.fillStyle=item.color;
    lctx.globalAlpha=.7;lctx.fillText(item.name,x,y);lctx.globalAlpha=1;
  });
}

// --- FOCUS CAMERA ---
let focusProgress=0;let focusFromPos=new THREE.Vector3();let focusToPos=new THREE.Vector3();
let focusFromTarget=new THREE.Vector3();let focusToTarget=new THREE.Vector3();
let focusDuration=1.5;let focusTimer=0;let prevCamTarget=new THREE.Vector3();

function startFocus(p){
  focusedPlanet=p;camState='focusing';focusProgress=0;focusTimer=0;
  focusFromPos.copy(camera.position);
  focusFromTarget.copy(controls.target);
  const wp=new THREE.Vector3();p.group.getWorldPosition(wp);
  focusToTarget.copy(wp);
  const dist=Math.max(p.pd.r*5,0.8);const angle=0.3;
  focusToPos.set(wp.x+dist*Math.cos(angle),wp.y+dist*0.3,wp.z+dist*Math.sin(angle));
  showPlanetInfo(p);
}
function endFocus(){
  focusedPlanet=null;camState='overview';planetPanel.classList.remove('visible');
}

function updateFocusCamera(dt){
  if(camState!=='focusing')return;
  focusTimer+=dt;focusProgress=Math.min(focusTimer/focusDuration,1);
  const t=focusProgress*focusProgress*(3-2*focusProgress);
  controls.target.lerpVectors(focusFromTarget,focusToTarget,t);
  camera.position.lerpVectors(focusFromPos,focusToPos,t);
  if(focusProgress>=1){camState='focused';controls.minDistance=0.1;controls.maxDistance=Math.max(focusedPlanet.pd.r*15,3);}
}

// --- UI ---
function showPlanetInfo(p){
  const d=p.pd;
  panelContent.innerHTML=[
    '<h2>'+d.name+' <span style="font-size:12px;color:rgba(255,255,255,0.3);font-weight:400">'+d.nameEn+'</span></h2>',
    '<div class="desc" style="margin-top:8px">'+d.desc+'</div>',
    '<div style="margin-top:10px">',
    '<div class="stat"><span class="label">\u76F4\u5F84</span><span class="value">'+(d.r*2*6371*1.5).toFixed(0)+' km</span></div>',
    '<div class="stat"><span class="label">\u516C\u8F6C\u5468\u671F</span><span class="value">'+d.orbit+' \u5E74</span></div>',
    '<div class="stat"><span class="label">\u81EA\u8F6C\u5468\u671F</span><span class="value">'+Math.abs(d.rot)+' \u5929</span></div>',
    '<div class="stat"><span class="label">\u8F74\u5411\u503E\u659C</span><span class="value">'+d.tilt+'\u00B0</span></div>',
    '<div class="stat"><span class="label">\u65E5\u8DDD</span><span class="value">'+(d.d*.25).toFixed(2)+' AU</span></div>',
    '<div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.3)">'+d.detail+'</div>',
    '</div>',
    '<div style="margin-top:10px;display:flex;gap:8px"><button id="btn-unfocus" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 14px;color:rgba(255,255,255,0.6);font-size:12px;cursor:pointer">\u8FD4\u56DE\u592A\u7CFB\u89C6\u56FE</button></div>',
  ].join('');
  planetPanel.classList.add('visible');
  setTimeout(()=>{
    const btn=document.getElementById('btn-unfocus');
    if(btn)btn.addEventListener('click',()=>{endFocus();controls.minDistance=0.3;controls.maxDistance=120;});
  },0);
}

panelClose.addEventListener('click',()=>{endFocus();controls.minDistance=0.3;controls.maxDistance=120;});
btnReset.addEventListener('click',()=>{endFocus();controls.target.set(0,0,0);camera.position.set(6,8,18);controls.minDistance=0.3;controls.maxDistance=120;controls.update();});
btnOrbit.addEventListener('click',()=>{showOrbits=!showOrbits;orbitLines.forEach(l=>l.visible=showOrbits);btnOrbit.style.opacity=showOrbits?'1':'.3';});
btnLabels.addEventListener('click',()=>{showLabels=!showLabels;btnLabels.style.opacity=showLabels?'1':'.3';});
speedSlider.addEventListener('input',()=>{timeMult=Math.pow(2,parseFloat(speedSlider.value));speedLabel.textContent=(timeMult>=1?timeMult.toFixed(1):'/'+(1/timeMult).toFixed(1))+'\u00D7';});

// --- RAYCASTER ---
const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
let hoveredPlanet=null;
renderer.domElement.addEventListener('pointerdown',(e)=>{
  if(camState==='focusing')return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const meshes=planets.map(p=>p.mesh);
  const intersects=raycaster.intersectObjects(meshes);
  if(intersects.length>0){
    const hit=intersects[0].object;const p=planets.find(pp=>pp.mesh===hit);
    if(p){if(focusedPlanet===p){endFocus();return;}startFocus(p);}
  } else if(camState==='focused'){endFocus();controls.minDistance=0.3;controls.maxDistance=120;}
});
renderer.domElement.addEventListener('pointermove',(e)=>{
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const meshes=planets.map(p=>p.mesh);
  const intersects=raycaster.intersectObjects(meshes);
  if(intersects.length>0){
    renderer.domElement.style.cursor='pointer';
    const hit=intersects[0].object;const p=planets.find(pp=>pp.mesh===hit);
    if(p&&p!==hoveredPlanet){
      if(hoveredPlanet)hoveredPlanet.mesh.material.emissive.setHex(0);
      hoveredPlanet=p;hoveredPlanet.mesh.material.emissive=new THREE.Color(0x444444);
    }
  }else{
    renderer.domElement.style.cursor='default';
    if(hoveredPlanet){hoveredPlanet.mesh.material.emissive.setHex(0);hoveredPlanet=null;}
  }
});

// --- ANIMATE ---
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  sunMat.uniforms.uTime.value+=dt;coronaMat.uniforms.uTime.value+=dt;
  chromoMat.uniforms.uTime.value+=dt;flareMat.uniforms.uTime.value+=dt;
  nebulaMat.uniforms.uTime.value+=dt*0.3;

  if(camState==='focusing')updateFocusCamera(dt);
  else if(camState==='focused'&&focusedPlanet){
    const wp=new THREE.Vector3();focusedPlanet.group.getWorldPosition(wp);
    controls.target.lerp(wp,.08);
  }

  updatePlanetPositions(dt);updateMoonPositions(dt);
  controls.update();composer.render();drawLabels();
  const h=Math.floor((Date.now()%86400000)/3600000);const m=Math.floor((Date.now()%3600000)/60000);
  timeDisplay.textContent='\u65F6\u95F4\u52A0\u901F '+(timeMult>=1?timeMult.toFixed(1)+'\u00D7':'/'+(1/timeMult).toFixed(1)+'\u00D7');
}
animate();

window.addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);composer.setSize(window.innerWidth,window.innerHeight);
  resLabel();
});