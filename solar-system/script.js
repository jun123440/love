import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// ─── Planet Data ─────────────────────────────────────────

const DATA = [
  { n:'太阳',en:'Sun',     r:2.8, orbit:0,  sp:0,    rot:0.0004, tilt:0.1,  gen:texSun,     i:'恒星 · Ø1,392,700km · 5,500°C' },
  { n:'水星',en:'Mercury', r:0.20,orbit:5.5,sp:4.15, rot:0.005,  tilt:0.03, gen:texMercury, i:'最小 · Ø4,879km · 88天',       rgh:0.9,met:0.1 },
  { n:'金星',en:'Venus',   r:0.42,orbit:8.5,sp:1.62, rot:-0.002, tilt:2.64, gen:texVenus,   i:'最热 · Ø12,104km · 225天',     rgh:0.7,met:0 },
  { n:'地球',en:'Earth',   r:0.50,orbit:11.5,sp:1,  rot:0.02,   tilt:0.41, gen:texEarth,   i:'家园 · Ø12,742km · 365天',     rgh:0.55,met:0, earth:1 },
  { n:'火星',en:'Mars',    r:0.30,orbit:15, sp:0.53, rot:0.019,  tilt:0.44, gen:texMars,    i:'红色 · Ø6,779km · 687天',      rgh:0.85,met:0.15 },
  { n:'木星',en:'Jupiter', r:1.10,orbit:20, sp:0.084,rot:0.04,   tilt:0.05, gen:texJupiter, i:'最大 · Ø139,820km · 11.86年',  rgh:0.45,met:0 },
  { n:'土星',en:'Saturn',  r:0.85,orbit:25, sp:0.034,rot:0.038,  tilt:0.47, gen:texSaturn,  i:'环系统 · Ø116,460km · 29.46年',rgh:0.5,met:0, ring:1 },
  { n:'天王星',en:'Uranus',r:0.55,orbit:31, sp:0.012,rot:-0.03,  tilt:1.71, gen:texUranus,  i:'冰巨星 · Ø50,724km · 84年',    rgh:0.25,met:0 },
  { n:'海王星',en:'Neptune',r:0.50,orbit:37,sp:0.006,rot:0.032,  tilt:0.49, gen:texNeptune, i:'最远 · Ø49,244km · 165年',     rgh:0.3,met:0 },
]

// ─── Perlin Noise (improved) ─────────────────────────────

const p256=new Uint8Array(512)
for(let i=0;i<256;i++)p256[i]=i
for(let i=255;i>0;i--){const j=Math.random()*i|0;[p256[i],p256[j]]=[p256[j],p256[i]]}
for(let i=0;i<256;i++)p256[i+256]=p256[i]

function f(t){return t*t*t*(t*(t*6-15)+10)}
function l(a,b,t){return a+t*(b-a)}

function n2(x,y){
  const X=x|0,Y=y|0,fx=x-X,fy=y-Y,u=f(fx),v=f(fy)
  const g=(h,dx,dy)=>{const t=h&1?dx:-dx,yy=h&2?(-dy):dy;return (h&4?-yy:yy)+(h&1?t:(h&2?-dx:dx))}
  const aa=p256[p256[X]+Y],ab=p256[p256[X]+Y+1],ba=p256[p256[X+1]+Y],bb=p256[p256[X+1]+Y+1]
  return l(l(g(aa,fx,fy),g(ba,fx-1,fy),u),l(g(ab,fx,fy-1),g(bb,fx-1,fy-1),u),v)
}
function fbm(x,y,o){let v=0,a=0.5,f=1;for(let i=0;i<o;i++){v+=a*n2(x*f,y*f);f*=2.2;a*=0.45}return v}
function wfbm(x,y,o,amt){const q=fbm(x,y,o);return fbm(x+q*amt+1.7,y+q*amt+9.2,o)}
function ridg(x,y,o){let v=0,a=0.5,f=1;for(let i=0;i<o;i++){v+=a*(1-Math.abs(n2(x*f,y*f)));f*=2.5;a*=0.4}return v}

// ─── Texture Pipeline ────────────────────────────────────

const TW=1024,TH=512
function mkCanvas(fn){const c=document.createElement('canvas');c.width=TW;c.height=TH;fn(c.getContext('2d'),TH);return c}
function mkTex(c){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
function pix2d(w,h,fn){const d=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;const o=fn(x/w,y/h);d[i]=o[0];d[i+1]=o[1];d[i+2]=o[2];d[i+3]=o[3]??255}return new ImageData(d,w,h)}

function normFrom(can){
  const w=can.width,h=can.height,d=can.getContext('2d').getImageData(0,0,w,h).data
  const nc=document.createElement('canvas');nc.width=w;nc.height=h
  const nd=nc.getContext('2d').createImageData(w,h),dd=nd.data
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=(y*w+x)*4
    const gx=(d[(y+1)*w*4+(x-1)*4]+2*d[y*w*4+(x-1)*4]+d[(y-1)*w*4+(x-1)*4]-d[(y+1)*w*4+(x+1)*4]-2*d[y*w*4+(x+1)*4]-d[(y-1)*w*4+(x+1)*4])/512
    const gy=(d[(y-1)*w*4+(x+1)*4]+2*d[(y-1)*w*4+x]+d[(y-1)*w*4+(x-1)*4]-d[(y+1)*w*4+(x+1)*4]-2*d[(y+1)*w*4+x]-d[(y+1)*w*4+(x-1)*4])/512
    const l=Math.sqrt(gx*gx+gy*gy+1)
    dd[i]=((gx/l*0.5+0.5)*255)|0;dd[i+1]=((gy/l*0.5+0.5)*255)|0;dd[i+2]=128;dd[i+3]=255
  }
  nc.getContext('2d').putImageData(nd,0,0)
  return nc
}

const _cache={}
function cached(name,fn){if(!_cache[name])_cache[name]=mkCanvas(fn);return _cache[name]}

// ─── Texture Generators ──────────────────────────────────

function texSun(c,h){
  const w=TW
  const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2)
  g.addColorStop(0,'#fff8e0');g.addColorStop(0.15,'#ffe864');g.addColorStop(0.4,'#ff8800')
  g.addColorStop(0.7,'#cc4400');g.addColorStop(1,'#331100')
  c.fillStyle=g;c.fillRect(0,0,w,h)
  for(let i=0;i<1200;i++){
    const x=Math.random()*w,y=Math.random()*h,s=1+Math.random()**2*60,a=Math.random()*0.08
    c.beginPath();c.arc(x,y,s,0,Math.PI*2)
    c.fillStyle=`rgba(255,${150+Math.random()*80},0,${a})`;c.fill()
  }
}

function texMercury(c,h){
  const w=TW
  c.putImageData(pix2d(w,h,(u,v)=>{
    const n=wfbm(u*10+3,v*10+1,6,1.5),cr=ridg(u*12+5,v*12+7,5)*30
    return [105+n*85-cr,100+n*80-cr-5,95+n*75-cr-10]
  }),0,0)
  for(let i=0;i<200;i++){
    const x=Math.random()*w,y=Math.random()*h,s=1+Math.random()**1.5*16
    c.beginPath();c.arc(x,y,s,0,Math.PI*2)
    c.fillStyle=`rgba(0,0,0,${0.05+Math.random()*0.2})`;c.fill()
    c.beginPath();c.arc(x+s*0.25,y-s*0.2,s*0.5,0,Math.PI*2)
    c.fillStyle=`rgba(190,185,170,${0.04+Math.random()*0.08})`;c.fill()
  }
}

function texVenus(c,h){
  c.putImageData(pix2d(TW,h,(u,v)=>{
    const n=wfbm(u*5+v*2.5,v*5-u*2.5,6,1.2)
    return [Math.min(255,210+n*55),Math.min(255,185+n*50),Math.min(255,130+n*40)]
  }),0,0)
}

function texEarth(c,h){
  c.putImageData(pix2d(TW,h,(u,v)=>{
    const lat=(v-0.5)*Math.PI,lon=u*Math.PI*2
    const nx=Math.cos(lat)*Math.cos(lon),nz=Math.sin(lat)
    const n=wfbm(nx*2.5+0.5,nz*2.5+0.5,6,0.8)
    const t=wfbm(nx*5+2,nz*5+2,4,0.5)
    if(n>0.42+t*0.1){
      const e=wfbm(nx*7+3,nz*7+3,5,0.6)
      const h2=wfbm(nx*10+5,nz*10+5,4,0.4)
      return h2>0.6?[220+h2*35,220+h2*35,220+h2*35]:[40+e*90,100+e*70,20+e*30]
    }else{
      const d=wfbm(nx*6+1,nz*6+1,4,0.5)
      return [10+d*25,40+d*65,100+d*100]
    }
  }),0,0)
}

function texMars(c,h){
  c.putImageData(pix2d(TW,h,(u,v)=>{
    const lat=(v-0.5)*Math.PI,n=wfbm(u*7+1,v*7+3,6,1.3)
    const pole=Math.abs(lat)>1.05?1:0
    if(pole){const pn=wfbm(u*5+2,v*5+2,4,0.5);return[200+pn*40,175+pn*30,145+pn*30]}
    const d=ridg(u*8+4,v*8+6,4)*30
    return[Math.min(255,160+n*80-d),Math.min(255,85+n*45-d),Math.min(255,45+n*25-d)]
  }),0,0)
}

function texJupiter(c,h){
  c.putImageData(pix2d(TW,h,(u,v)=>{
    const turb=wfbm(u*10,v*16,5,0.5),band=Math.sin((v+turb)*Math.PI*18+2)*0.5+0.5
    const n=wfbm(u*8+1,v*8+3,4,0.3)*0.2
    const spot=Math.exp(-((u-0.6)**2+(v-0.45)**2)*1200)
    return[Math.min(255,180+band*70+n*40+spot*100),Math.min(255,150+band*45+n*25+spot*25),Math.min(255,95+band*35+n*15)]
  }),0,0)
}

function texSaturn(c,h){
  c.putImageData(pix2d(TW,h,(u,v)=>{
    const turb=wfbm(u*8,v*14,5,0.4),band=Math.sin((v+turb)*Math.PI*14+1)*0.5+0.5
    return[Math.min(255,200+band*60),Math.min(255,180+band*45),Math.min(255,135+band*35)]
  }),0,0)
}

function texUranus(c,h){
  c.putImageData(pix2d(TW,h,(u,v)=>{
    const n=wfbm(u*5+2,v*5+1,4,0.6)
    return[Math.min(255,125+n*25),Math.min(255,195+n*20),Math.min(255,205+n*15)]
  }),0,0)
}

function texNeptune(c,h){
  c.putImageData(pix2d(TW,h,(u,v)=>{
    const n=wfbm(u*6+3,v*6+1,5,0.7)
    const spot=Math.exp(-((u-0.65)**2+(v-0.55)**2)*1000)
    return[Math.min(255,35+n*35+spot*25),Math.min(255,55+n*45+spot*35),Math.min(255,160+n*55+spot*65)]
  }),0,0)
}

// ─── Earth CDN Textures ──────────────────────────────────

const EARTH_TEX = {
  map:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
  normal:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_normal_2048.jpg',
  spec:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_specular_2048.jpg',
  clouds:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_clouds_1024.png',
}

// ─── Loading ─────────────────────────────────────────────

let ld=0,ttl=DATA.length
const LOAD=document.getElementById('loading'),PROG=document.getElementById('progressFill'),LTXT=document.getElementById('loaderText')
function tick(n){ld++;const p=Math.min(ld/ttl*100,100);if(PROG)PROG.style.width=p+'%';if(LTXT)LTXT.textContent=n||`生成 ${Math.round(p)}%`;if(ld>=ttl)setTimeout(()=>{if(LOAD)LOAD.classList.add('hidden')},600)}
setTimeout(()=>{if(LOAD)LOAD.classList.add('hidden')},8000)

// ─── Scene ───────────────────────────────────────────────

const W=innerWidth,H=innerHeight
const SCENE=new THREE.Scene()
const CAM=new THREE.PerspectiveCamera(40,W/H,0.1,5000);CAM.position.set(4,7,28)
const REN=new THREE.WebGLRenderer({antialias:1,powerPreference:'high-performance'})
REN.setSize(W,H);REN.setPixelRatio(Math.min(devicePixelRatio,2))
REN.toneMapping=THREE.ACESFilmicToneMapping;REN.toneMappingExposure=1.0;REN.outputColorSpace=THREE.SRGBColorSpace
document.body.prepend(REN.domElement)

// ─── Post-Processing ─────────────────────────────────────

const CMP=new EffectComposer(REN);CMP.addPass(new RenderPass(SCENE,CAM))
const BLOOM=new UnrealBloomPass(new THREE.Vector2(W,H),0.6,0.2,0.7);CMP.addPass(BLOOM)

// ─── Controls ────────────────────────────────────────────

const CTRL=new OrbitControls(CAM,REN.domElement)
CTRL.enableDamping=1;CTRL.dampingFactor=0.05;CTRL.rotateSpeed=0.3;CTRL.minDistance=1.5;CTRL.maxDistance=100;CTRL.target.set(0,0,0);CTRL.autoRotate=1;CTRL.autoRotateSpeed=0.3

// ─── Stars ───────────────────────────────────────────────

;(()=>{
  const n=18000,p=new Float32Array(n*3),c=new Float32Array(n*3)
  for(let i=0;i<n;i++){
    const t=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=500+Math.random()*600
    p[i*3]=r*Math.sin(ph)*Math.cos(t);p[i*3+1]=r*Math.cos(ph);p[i*3+2]=r*Math.sin(ph)*Math.sin(t)
    const L=Math.random()
    if(L<0.03){c[i*3]=1;c[i*3+1]=0.4;c[i*3+2]=0.1}
    else if(L<0.07){c[i*3]=0.4;c[i*3+1]=0.5;c[i*3+2]=1}
    else if(L<0.12){c[i*3]=1;c[i*3+1]=0.7;c[i*3+2]=0.4}
    else{const b=0.7+Math.random()*0.3;c[i*3]=b;c[i*3+1]=b;c[i*3+2]=b}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3))
  SCENE.add(new THREE.Points(g,new THREE.PointsMaterial({size:1.0,vertexColors:1,transparent:1,opacity:0.9,sizeAttenuation:1,blending:THREE.AdditiveBlending,depthWrite:0})))
})();

// ─── Nebula ──────────────────────────────────────────────

;(()=>{
  const c=document.createElement('canvas');c.width=1024;c.height=1024
  const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,1024,1024)
  for(let i=0;i<250;i++){
    const px=100+Math.random()*824,py=100+Math.random()*824,s=15+Math.random()*250
    const hue=250+Math.random()*90
    const g=x.createRadialGradient(px,py,0,px,py,s)
    g.addColorStop(0,`hsla(${hue},80%,45%,${0.015+Math.random()*0.05})`);g.addColorStop(1,`hsla(${hue},80%,45%,0)`)
    x.fillStyle=g;x.fillRect(px-s,py-s,s*2,s*2)
  }
  const m=new THREE.Mesh(new THREE.SphereGeometry(1200,32,32),new THREE.MeshBasicMaterial({map:mkTex(c),side:THREE.BackSide,transparent:1,opacity:0.5,depthWrite:0}))
  SCENE.add(m)
})();

// ─── Sun ─────────────────────────────────────────────────

const SUN_G=new THREE.Group();SCENE.add(SUN_G)
SUN_G.add(new THREE.Mesh(new THREE.SphereGeometry(DATA[0].r,80,80),new THREE.MeshBasicMaterial({map:mkTex(cached('sun',texSun))})))

function glow(r,c,i,p){
  return new THREE.Mesh(new THREE.SphereGeometry(r,48,48),new THREE.ShaderMaterial({
    vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`varying vec3 vN;varying vec3 vW;uniform vec3 uC;uniform float uI;uniform float uP;void main(){vec3 v=normalize(cameraPosition-vW);float r=1.0-max(0.0,dot(v,vN));r=pow(r,uP);gl_FragColor=vec4(uC,r*uI);}`,
    uniforms:{uC:{value:new THREE.Color(c)},uI:{value:i},uP:{value:p}},
    transparent:1,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:0
  }))
}
for(const g of[glow(DATA[0].r*1.06,'#ffcc44',0.7,4),glow(DATA[0].r*1.2,'#ff6600',0.3,3),glow(DATA[0].r*1.6,'#ff3300',0.1,2),glow(DATA[0].r*2.5,'#ff2200',0.03,1.5)])SUN_G.add(g)

// Corona
const CP=new Float32Array(3000*3)
for(let i=0;i<3000;i++){const t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1),r=DATA[0].r*(1.04+Math.random()**1.5*1.5);CP[i*3]=r*Math.sin(p)*Math.cos(t);CP[i*3+1]=r*Math.cos(p);CP[i*3+2]=r*Math.sin(p)*Math.sin(t)}
const CG=new THREE.BufferGeometry();CG.setAttribute('position',new THREE.BufferAttribute(CP,3))
const CM=new THREE.PointsMaterial({color:0xff8800,size:0.08,transparent:1,opacity:0.2,blending:THREE.AdditiveBlending,depthWrite:0})
SUN_G.add(new THREE.Points(CG,CM))

// ─── Lighting ────────────────────────────────────────────

SCENE.add(new THREE.PointLight(0xffeedd,3.5,400))
SCENE.add(new THREE.AmbientLight(0x222244,0.12))
SCENE.add(new THREE.DirectionalLight(0xffffff,0.25))

// ─── Planets ─────────────────────────────────────────────

const MSH=[],LBL=[],ANM=[]
let EARTH_ATMOS=null,EARTH_CLOUD=null

DATA.forEach((p,idx)=>{
  if(idx===0)return

  const G=new THREE.Group();SCENE.add(G)

  // Orbit
  const oa=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;oa.push(Math.cos(a)*p.orbit,0,Math.sin(a)*p.orbit)}
  const og=new THREE.BufferGeometry();og.setAttribute('position',new THREE.Float32BufferAttribute(oa,3))
  SCENE.add(new THREE.Line(og,new THREE.LineBasicMaterial({color:0x556688,transparent:1,opacity:0.05})))

  // Material
  let tex,normalTex=null
  const LD=new THREE.TextureLoader()
  if(p.earth){
    LD.load(EARTH_TEX.map,t=>{t.colorSpace=THREE.SRGBColorSpace;tex=t;if(MSH[idx-1]){MSH[idx-1].material.map=t;MSH[idx-1].material.needsUpdate=1}},void 0,()=>{tex=mkTex(cached('e_fb',texEarth))})
    LD.load(EARTH_TEX.normal,t=>{t.anisotropy=16;normalTex=t;if(MSH[idx-1]){MSH[idx-1].material.normalMap=t;MSH[idx-1].material.needsUpdate=1}})
    tex=mkTex(cached('e_fb',texEarth))
  }else tex=mkTex(cached(p.en+'_tex',p.gen))

  const mat=new THREE.MeshPhysicalMaterial({map:tex,roughness:p.rgh||0.6,metalness:p.met||0,normalMap:normalTex,normalScale:normalTex?new THREE.Vector2(1,1):null})
  const seg=p.n==='木星'||p.n==='土星'?80:56
  const msh=new THREE.Mesh(new THREE.SphereGeometry(p.r,seg,Math.floor(seg*0.7)),mat)
  msh.rotation.z=p.tilt||0;msh.userData.idx=idx;G.add(msh);MSH.push(msh)

  // Saturn rings
  if(p.ring){
    const rc=document.createElement('canvas');rc.width=1024;rc.height=128
    const rx=rc.getContext('2d')
    for(let x=0;x<1024;x++){
      const t=x/1024,br=0.15+0.4*Math.sin(t*45)+0.12*Math.sin(t*75+1)+0.08*Math.sin(t*130+2)
      const gap=t>0.35&&t<0.42||t>0.55&&t<0.6?0:1-Math.abs(t-0.5)*1.1
      const al=Math.min(1,br*Math.max(0,gap))*(t>0.05&&t<0.95?0.85:0)
      rx.fillStyle=`rgba(${200+60*br|0},${180+50*br|0},${145+40*br|0},${al})`
      rx.fillRect(x,0,1,32);rx.fillRect(x,64,1,64)
    }
    const rt=new THREE.CanvasTexture(rc);rt.anisotropy=16
    const rm=new THREE.Mesh(new THREE.RingGeometry(p.r*1.2,p.r*2.5,128),new THREE.MeshPhysicalMaterial({map:rt,transparent:1,opacity:0.8,side:THREE.DoubleSide,depthWrite:0,roughness:0.7,metalness:0}))
    rm.rotation.x=Math.PI/2.5;G.add(rm)
  }

  // Position
  const a0=Math.random()*Math.PI*2
  msh.position.x=p.orbit*Math.cos(a0);msh.position.z=p.orbit*Math.sin(a0)
  ANM.push({a:a0,sp:p.sp*0.003,rt:p.rot,msh,data:p,grp:G})

  // Label
  const lc=document.createElement('canvas');lc.width=512;lc.height=100
  const lx=lc.getContext('2d');lx.shadowColor='rgba(0,0,0,0.9)';lx.shadowBlur=12
  lx.fillStyle='#fff';lx.font='bold 36px Inter,Arial,sans-serif'
  lx.textAlign='center';lx.textBaseline='middle';lx.fillText(p.en,256,42)
  lx.shadowBlur=0;lx.fillStyle='rgba(255,255,255,0.2)';lx.font='14px Inter,Arial,sans-serif'
  lx.fillText(p.n,256,78)
  const lt=new THREE.CanvasTexture(lc);lt.anisotropy=16
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:lt,transparent:1,depthWrite:0,opacity:0.55,sizeAttenuation:1}))
  sp.scale.set(2.2,0.5,1);sp.userData.idx=idx;SCENE.add(sp);LBL.push(sp)

  tick(p.n)
})
tick('太阳 ☀')

// ─── Earth Atmo & Clouds ─────────────────────────────────

;(()=>{
  const ei=DATA.findIndex(d=>d.earth)
  if(ei<0)return
  const er=DATA[ei].r

  EARTH_ATMOS=new THREE.Mesh(new THREE.SphereGeometry(er*1.04,48,36),new THREE.ShaderMaterial({
    vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`varying vec3 vN;varying vec3 vW;uniform vec3 uC;uniform float uI;uniform float uP;void main(){vec3 v=normalize(cameraPosition-vW);float r=1.0-max(0.0,dot(v,vN));r=pow(r,uP);gl_FragColor=vec4(uC,r*uI);}`,
    uniforms:{uC:{value:new THREE.Color(0x3355ff)},uI:{value:0.5},uP:{value:4}},
    transparent:1,blending:THREE.AdditiveBlending,side:THREE.FrontSide,depthWrite:0
  }))

  // Cloud texture
  const cc=document.createElement('canvas');cc.width=512;cc.height=256
  const cd=pix2d(512,256,(u,v)=>{const n=wfbm(u*10+3,v*10+1,5,0.6);const a=n>0.45?(n-0.45)*1.8*0.7:0;return[255,255,255,Math.round(a*255)]})
  cc.getContext('2d').putImageData(cd,0,0)
  const ct=new THREE.CanvasTexture(cc);ct.wrapS=ct.wrapT=THREE.RepeatWrapping
  EARTH_CLOUD=new THREE.Mesh(new THREE.SphereGeometry(er*1.015,48,36),new THREE.MeshPhysicalMaterial({map:ct,transparent:1,opacity:0.35,depthWrite:0,roughness:0,metalness:0}))
})()

// ─── Asteroid Belt ───────────────────────────────────────

;(()=>{
  const n=4000,p=new Float32Array(n*3)
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=16+Math.random()*3.5,y=(Math.random()-0.5)*1.2;p[i*3]=r*Math.cos(a);p[i*3+1]=y;p[i*3+2]=r*Math.sin(a)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3))
  SCENE.add(new THREE.Points(g,new THREE.PointsMaterial({color:0x887766,size:0.04,transparent:1,opacity:0.3})))
})();

// ─── Interaction ─────────────────────────────────────────

const RAY=new THREE.Raycaster(),PTR=new THREE.Vector2()
const PN=document.getElementById('panel'),PD=document.getElementById('panelDot')
const PNM=document.getElementById('panelName'),PNE=document.getElementById('panelNameEn'),PST=document.getElementById('panelStat')
const PB=document.getElementById('panelBack'),HUD=document.getElementById('hud')

let mode='overview',tgt=null,zp=0
const sP=new THREE.Vector3(),eP=new THREE.Vector3(),sT=new THREE.Vector3(),eT=new THREE.Vector3()
const H_P=new THREE.Vector3(4,7,28),H_T=new THREE.Vector3(0,0,0)
function ez(t){return t<0.5?4*t*t*t:1-(-2*t+2)**3/2}

function focus(idx){
  const p=DATA[idx],pos=MSH[idx-1].position.clone()
  tgt=idx;mode='focus';zp=0
  sP.copy(CAM.position);sT.copy(CTRL.target)
  const d=Math.max(p.r*4,2.5)
  eT.copy(pos);eP.copy(pos.clone().add(new THREE.Vector3(d*0.5,p.r*2,d)))
  CTRL.autoRotate=0
  LBL.forEach(l=>l.visible=0);LBL[idx-1].visible=1
  PN.classList.remove('hidden')
  PD.style.background=`radial-gradient(circle at 35% 35%, #ffcc44, #441100)`
  PNM.textContent=p.n;PNE.textContent=p.en;PST.textContent=p.i
  HUD.style.opacity='0'
}
function unfocus(){
  mode='back';zp=0;sP.copy(CAM.position);sT.copy(CTRL.target)
  eP.copy(H_P);eT.copy(H_T);LBL.forEach(l=>l.visible=1)
  PN.classList.add('hidden');tgt=null;HUD.style.opacity='1';CTRL.autoRotate=1
}

REN.domElement.addEventListener('click',e=>{
  if(mode==='focus'||mode==='back')return
  PTR.x=(e.clientX/W)*2-1;PTR.y=-(e.clientY/H)*2+1
  RAY.setFromCamera(PTR,CAM)
  const h=RAY.intersectObjects(MSH)
  if(h.length>0){const idx=h[0].object.userData.idx;if(idx&&mode==='overview')focus(idx)}
  else if(mode==='zoomed')unfocus()
})
PB.addEventListener('click',unfocus)
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode==='zoomed')unfocus()})

// ─── Animation ───────────────────────────────────────────

let t=0
function anim(){
  requestAnimationFrame(anim)
  t+=0.005

  // Sun glow pulse
  for(let i=0;i<SUN_G.children.length;i++){
    const ch=SUN_G.children[i]
    if(ch.type==='Mesh'&&ch.material.uniforms){
      const s=1+0.02*Math.sin(t*2+i*1.3);ch.scale.setScalar(s)
    }
  }
  // Corona flicker
  SUN_G.children.forEach(ch=>{if(ch.type==='Points')ch.material.opacity=0.18+0.08*Math.sin(t*1.5)})

  // Planets
  ANM.forEach((d,i)=>{
    d.a+=d.sp
    d.msh.position.x=d.data.orbit*Math.cos(d.a)
    d.msh.position.z=d.data.orbit*Math.sin(d.a)
    d.msh.rotation.y+=d.rt

    if(LBL[i]){LBL[i].position.copy(d.msh.position);LBL[i].position.y+=d.data.r*2.2+0.5}

    if(d.data.earth){
      if(EARTH_ATMOS&&!EARTH_ATMOS.parent)d.grp.add(EARTH_ATMOS)
      if(EARTH_ATMOS)EARTH_ATMOS.material.uniforms.uI.value=0.4+0.15*Math.sin(t*0.8)
      if(EARTH_CLOUD&&!EARTH_CLOUD.parent)d.grp.add(EARTH_CLOUD)
      if(EARTH_CLOUD)EARTH_CLOUD.rotation.y+=0.004
    }
  })

  // Zoom
  if(mode==='focus'){zp+=0.018;if(zp>=1){zp=1;mode='zoomed'};const e=ez(zp);CAM.position.lerpVectors(sP,eP,e);CTRL.target.lerpVectors(sT,eT,e)}
  else if(mode==='back'){zp+=0.018;if(zp>=1){zp=1;mode='overview'};const e=ez(zp);CAM.position.lerpVectors(sP,eP,e);CTRL.target.lerpVectors(sT,eT,e)}
  else if(mode==='zoomed'&&tgt){
    const pos=MSH[tgt-1].position.clone(),off=CAM.position.clone().sub(CTRL.target)
    CTRL.target.copy(pos);CAM.position.copy(pos.clone().add(off))
  }

  CTRL.update();CMP.render()
}
anim()

// ─── Resize ──────────────────────────────────────────────

addEventListener('resize',()=>{CAM.aspect=innerWidth/innerHeight;CAM.updateProjectionMatrix();REN.setSize(innerWidth,innerHeight);CMP.setSize(innerWidth,innerHeight)})
