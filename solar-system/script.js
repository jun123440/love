import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// ─── Planet Data ─────────────────────────────────────────

const DATA = [
  { n:'太阳',en:'Sun',     r:2.8, orbit:0,  sp:0,    rot:0.0004, tilt:0.1,  gen:texSun,     i:'恒星 · Ø1,392,700km · 5,500°C' },
  { n:'水星',en:'Mercury', r:0.20,orbit:5.5,sp:4.15, rot:0.005,  tilt:0.03, gen:texMercury, i:'最小 · Ø4,879km · 88天' },
  { n:'金星',en:'Venus',   r:0.42,orbit:8.5,sp:1.62, rot:-0.002, tilt:2.64, gen:texVenus,   i:'最热 · Ø12,104km · 225天' },
  { n:'地球',en:'Earth',   r:0.50,orbit:11.5,sp:1,  rot:0.02,   tilt:0.41, gen:texEarth,   i:'家园 · Ø12,742km · 365天', earth:1 },
  { n:'火星',en:'Mars',    r:0.30,orbit:15, sp:0.53, rot:0.019,  tilt:0.44, gen:texMars,    i:'红色 · Ø6,779km · 687天' },
  { n:'木星',en:'Jupiter', r:1.10,orbit:20, sp:0.084,rot:0.04,   tilt:0.05, gen:texJupiter, i:'最大 · Ø139,820km · 11.86年' },
  { n:'土星',en:'Saturn',  r:0.85,orbit:25, sp:0.034,rot:0.038,  tilt:0.47, gen:texSaturn,  i:'环系统 · Ø116,460km · 29.46年', ring:1 },
  { n:'天王星',en:'Uranus',r:0.55,orbit:31, sp:0.012,rot:-0.03,  tilt:1.71, gen:texUranus,  i:'冰巨星 · Ø50,724km · 84年' },
  { n:'海王星',en:'Neptune',r:0.50,orbit:37,sp:0.006,rot:0.032,  tilt:0.49, gen:texNeptune, i:'最远 · Ø49,244km · 165年' },
]

// ─── Improved Perlin Noise ─────────────────────────────

const perm=new Uint8Array(512)
for(let i=0;i<256;i++)perm[i]=i
for(let i=255;i>0;i--){const j=Math.random()*i|0;[perm[i],perm[j]]=[perm[j],perm[i]]}
for(let i=0;i<256;i++)perm[i+256]=perm[i]
function fade(t){return t*t*t*(t*(t*6-15)+10)}
function grad(h,dx,dy){const u=h&1?dx:-dx,v=h&2?dy:-dy;return(h&4?-v:v)+(h&1?u:(h&2?-dx:dx))}
function n2(x,y){const X=x|0,Y=y|0,fx=x-X,fy=y-X;const u=fade(fx),v=fade(fy);const aa=perm[perm[X]+Y],ab=perm[perm[X]+Y+1],ba=perm[perm[X+1]+Y],bb=perm[perm[X+1]+Y+1];return((1-u)*(1-v)*grad(aa,fx,fy)+(1-u)*v*grad(ab,fx,fy-1)+u*(1-v)*grad(ba,fx-1,fy)+u*v*grad(bb,fx-1,fy-1))}
function fbm(x,y,o){let v=0,a=0.5,f=1;for(let i=0;i<o;i++){v+=a*n2(x*f,y*f);f*=2.2;a*=0.5}return v}
function wfbm(x,y,o,a){const q=fbm(x,y,o);return fbm(x+q*a+1.7,y+q*a+9.2,o)}
function ridg(x,y,o){let v=0,a=0.5,f=1;for(let i=0;i<o;i++){v+=a*(1-Math.abs(n2(x*f,y*f)));f*=2.5;a*=0.5}return v}

// ─── Texture Engine ──────────────────────────────────────

const TW=2048,TH=1024
function makeCanvas(fn){const c=document.createElement('canvas');c.width=TW;c.height=TH;fn(c.getContext('2d'),TW,TH);return c}
function texFromCanvas(c){const t=new THREE.CanvasTexture(c);t.anisotropy=16;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t}
function pix2d(w,h,fn){const d=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,c=fn(x/w,y/h);d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=c[3]??255}return new ImageData(d,w,h)}
const _cache={}
function cached(n,fn){if(!_cache[n])_cache[n]=makeCanvas(fn);return _cache[n]}

// ─── Texture Generators (2048x1024, high detail) ────────

function texSun(c,w,h){
  const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2)
  g.addColorStop(0,'#fff8e0');g.addColorStop(0.12,'#ffe864');g.addColorStop(0.35,'#ff8800')
  g.addColorStop(0.6,'#cc4400');g.addColorStop(1,'#331100')
  c.fillStyle=g;c.fillRect(0,0,w,h)
  for(let i=0;i<3000;i++){const x=Math.random()*w,y=Math.random()*h,s=1+Math.random()**2*80,a=Math.random()*0.07;c.beginPath();c.arc(x,y,s,0,Math.PI*2);c.fillStyle=`rgba(255,${150+Math.random()*80},0,${a})`;c.fill()}
  for(let i=0;i<150;i++){const x=Math.random()*w,y=Math.random()*h,s=20+Math.random()**2*200;const g2=c.createRadialGradient(x,y,0,x,y,s);g2.addColorStop(0,`rgba(255,220,80,${0.01+Math.random()*0.03})`);g2.addColorStop(1,'rgba(255,220,80,0)');c.fillStyle=g2;c.fillRect(x-s,y-s,s*2,s*2)}
}

function texMercury(c,w,h){
  c.putImageData(pix2d(w,h,(u,v)=>{const n=wfbm(u*8+3,v*8+1,6,1.5),cr=ridg(u*10+5,v*10+7,5)*25;return[110+n*90-cr,105+n*85-cr-5,100+n*80-cr-10]}),0,0)
  for(let i=0;i<400;i++){const x=Math.random()*w,y=Math.random()*h,s=2+Math.random()**1.5*20;c.beginPath();c.arc(x,y,s,0,Math.PI*2);c.fillStyle=`rgba(0,0,0,${0.04+Math.random()*0.2})`;c.fill();c.beginPath();c.arc(x+s*0.25,y-s*0.25,s*0.5,0,Math.PI*2);c.fillStyle=`rgba(200,190,180,${0.03+Math.random()*0.06})`;c.fill()}
}

function texVenus(c,w,h){
  c.putImageData(pix2d(w,h,(u,v)=>{const n=wfbm(u*6+v*3+1,v*6-u*3+2,6,1.2);return[Math.min(255,215+n*55),Math.min(255,190+n*50),Math.min(255,135+n*40)]}),0,0)
}

function texEarth(c,w,h){
  c.putImageData(pix2d(w,h,(u,v)=>{
    const lat=(v-0.5)*Math.PI,lon=u*Math.PI*2,nx=Math.cos(lat)*Math.cos(lon),nz=Math.sin(lat)
    const n=wfbm(nx*3+0.5,nz*3+0.5,6,0.8),t=wfbm(nx*6+2,nz*6+2,4,0.5)
    if(n>0.42+t*0.1){
      const e=wfbm(nx*8+3,nz*8+3,5,0.6),h2=wfbm(nx*12+5,nz*12+5,4,0.4)
      return h2>0.6?[230+h2*30,230+h2*30,230+h2*30]:[40+e*90,100+e*70,20+e*30]
    }else{const d=wfbm(nx*7+1,nz*7+1,4,0.5);return[10+d*25,40+d*65,100+d*100]}
  }),0,0)
}

function texMars(c,w,h){
  c.putImageData(pix2d(w,h,(u,v)=>{
    const lat=(v-0.5)*Math.PI,n=wfbm(u*8+1,v*8+3,6,1.3),pole=Math.abs(lat)>1.05?1:0
    if(pole){const pn=wfbm(u*6+2,v*6+2,4,0.5);return[210+pn*40,185+pn*30,150+pn*30]}
    const d=ridg(u*10+4,v*10+6,5)*25;return[Math.min(255,165+n*85-d),Math.min(255,90+n*45-d),Math.min(255,50+n*25-d)]
  }),0,0)
}

function texJupiter(c,w,h){
  c.putImageData(pix2d(w,h,(u,v)=>{
    const turb=wfbm(u*8,v*14,5,0.5),band=Math.sin((v+turb)*Math.PI*18+2)*0.5+0.5
    const n=wfbm(u*10+1,v*10+3,4,0.3)*0.2,spot=Math.exp(-((u-0.6)**2+(v-0.45)**2)*1500)
    return[Math.min(255,185+band*75+n*40+spot*110),Math.min(255,155+band*45+n*25+spot*25),Math.min(255,100+band*35+n*15)]
  }),0,0)
}

function texSaturn(c,w,h){
  c.putImageData(pix2d(w,h,(u,v)=>{
    const turb=wfbm(u*8,v*12,5,0.4),band=Math.sin((v+turb)*Math.PI*12+1)*0.5+0.5
    return[Math.min(255,205+band*60),Math.min(255,185+band*45),Math.min(255,140+band*35)]
  }),0,0)
}

function texUranus(c,w,h){
  c.putImageData(pix2d(w,h,(u,v)=>{const n=wfbm(u*6+2,v*6+1,4,0.6);return[Math.min(255,130+n*25),Math.min(255,200+n*20),Math.min(255,210+n*15)]}),0,0)
}

function texNeptune(c,w,h){
  c.putImageData(pix2d(w,h,(u,v)=>{
    const n=wfbm(u*6+3,v*6+1,5,0.7),spot=Math.exp(-((u-0.65)**2+(v-0.55)**2)*1200)
    return[Math.min(255,40+n*35+spot*25),Math.min(255,60+n*45+spot*35),Math.min(255,165+n*55+spot*65)]
  }),0,0)
}

// ─── Earth CDN Textures ──────────────────────────────────

const EARTH = {
  map:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
  normal:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_normal_2048.jpg',
  spec:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_specular_2048.jpg',
  clouds:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_clouds_1024.png',
}

// ─── Loading ─────────────────────────────────────────────

let ld=0,ttl=DATA.length
const L=document.getElementById('loading'),P=document.getElementById('progressFill'),T=document.getElementById('loaderText')
function tk(n){ld++;const p=Math.min(ld/ttl*100,100);if(P)P.style.width=p+'%';if(T)T.textContent=n||`${Math.round(p)}%`;if(ld>=ttl)setTimeout(()=>{if(L)L.classList.add('hidden')},800)}
setTimeout(()=>{if(L)L.classList.add('hidden')},12000)

// ─── Scene ───────────────────────────────────────────────

const W=innerWidth,H=innerHeight
const S=new THREE.Scene()
const C=new THREE.PerspectiveCamera(40,W/H,0.1,5000);C.position.set(5,6,26)
const R=new THREE.WebGLRenderer({antialias:1,powerPreference:'high-performance'})
R.setSize(W,H);R.setPixelRatio(Math.min(devicePixelRatio,2))
R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.2;R.outputColorSpace=THREE.SRGBColorSpace
document.body.prepend(R.domElement)

// ─── Post-Processing ─────────────────────────────────────

const CMP=new EffectComposer(R);CMP.addPass(new RenderPass(S,C))
const BL=new UnrealBloomPass(new THREE.Vector2(W,H),0.5,0.2,0.6);CMP.addPass(BL)

// ─── Controls ────────────────────────────────────────────

const CTRL=new OrbitControls(C,R.domElement)
CTRL.enableDamping=1;CTRL.dampingFactor=0.05;CTRL.rotateSpeed=0.3;CTRL.minDistance=2;CTRL.maxDistance=120;CTRL.target.set(0,0,0);CTRL.autoRotate=1;CTRL.autoRotateSpeed=0.15

// ─── Stars ───────────────────────────────────────────────

;(()=>{
  const n=25000,p=new Float32Array(n*3),col=new Float32Array(n*3)
  for(let i=0;i<n;i++){
    const t=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=800+Math.random()*1000
    p[i*3]=r*Math.sin(ph)*Math.cos(t);p[i*3+1]=r*Math.cos(ph);p[i*3+2]=r*Math.sin(ph)*Math.sin(t)
    const L=Math.random()
    if(L<0.02){col[i*3]=1;col[i*3+1]=0.3;col[i*3+2]=0.1}
    else if(L<0.05){col[i*3]=0.5;col[i*3+1]=0.6;col[i*3+2]=1}
    else if(L<0.1){col[i*3]=1;col[i*3+1]=0.8;col[i*3+2]=0.5}
    else{const b=0.8+Math.random()*0.2;col[i*3]=b;col[i*3+1]=b;col[i*3+2]=b}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(col,3))
  S.add(new THREE.Points(g,new THREE.PointsMaterial({size:0.2,vertexColors:1,transparent:1,opacity:0.95,sizeAttenuation:1,blending:THREE.AdditiveBlending,depthWrite:0})))
})();

// ─── Sun ─────────────────────────────────────────────────

const SG=new THREE.Group();S.add(SG)
SG.add(new THREE.Mesh(new THREE.SphereGeometry(DATA[0].r,96,96),new THREE.MeshBasicMaterial({map:texFromCanvas(cached('sun',texSun))})))

function glow(r,c,i,p){
  return new THREE.Mesh(new THREE.SphereGeometry(r,48,48),new THREE.ShaderMaterial({
    vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`varying vec3 vN;varying vec3 vW;uniform vec3 uC;uniform float uI;uniform float uP;void main(){vec3 v=normalize(cameraPosition-vW);float r=1.0-max(0.0,dot(v,vN));r=pow(r,uP);gl_FragColor=vec4(uC,r*uI);}`,
    uniforms:{uC:{value:new THREE.Color(c)},uI:{value:i},uP:{value:p}},
    transparent:1,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:0
  }))
}
for(const g of[glow(DATA[0].r*1.06,'#ffcc44',0.8,4),glow(DATA[0].r*1.2,'#ff6600',0.35,3),glow(DATA[0].r*1.5,'#ff3300',0.12,2),glow(DATA[0].r*2.5,'#ff2200',0.04,1.5)])SG.add(g)

// Sun plasma particles
const PP=new Float32Array(5000*3),PV=new Float32Array(5000),PR=new Float32Array(5000)
for(let i=0;i<5000;i++){const t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1),r=DATA[0].r*(1.02+Math.random()**1.2*1.8);PP[i*3]=r*Math.sin(p)*Math.cos(t);PP[i*3+1]=r*Math.cos(p);PP[i*3+2]=r*Math.sin(p)*Math.sin(t);PV[i]=0.2+Math.random()*2;PR[i]=0.02+Math.random()*0.12}
const PG=new THREE.BufferGeometry();PG.setAttribute('position',new THREE.BufferAttribute(PP,3));PG.setAttribute('size',new THREE.BufferAttribute(PR,1))
const PM=new THREE.PointsMaterial({color:0xff8800,size:0.06,transparent:1,opacity:0.3,blending:THREE.AdditiveBlending,depthWrite:0,sizeAttenuation:1})
const PC=new THREE.Points(PG,PM);SG.add(PC)

// ─── Lighting ────────────────────────────────────────────

S.add(new THREE.PointLight(0xffeedd,3,0,0))
S.add(new THREE.AmbientLight(0x446688,0.5))
S.add(new THREE.HemisphereLight(0x88bbdd,0x222244,0.3))

// ─── Planets ─────────────────────────────────────────────

const M=[],LBL=[],ANM=[]
let EA=null,EC=null

DATA.forEach((p,idx)=>{
  if(idx===0)return

  const G=new THREE.Group();S.add(G)

  let tex,normalTex=null
  const LD=new THREE.TextureLoader()
  if(p.earth){
    LD.load(EARTH.map,t=>{t.colorSpace=THREE.SRGBColorSpace;tex=t;if(M[idx-1]){M[idx-1].material.map=t;M[idx-1].material.needsUpdate=1}},void 0,()=>{tex=texFromCanvas(cached('efb',texEarth))})
    LD.load(EARTH.normal,t=>{t.anisotropy=16;normalTex=t;if(M[idx-1]){M[idx-1].material.normalMap=t;M[idx-1].material.needsUpdate=1}})
    tex=texFromCanvas(cached('efb',texEarth))
  }else tex=texFromCanvas(cached(p.en+'_t',p.gen))

  const mat=new THREE.MeshStandardMaterial({map:tex,roughness:0.45,metalness:0.05})
  const seg=p.n==='木星'||p.n==='土星'?80:56
  const m=new THREE.Mesh(new THREE.SphereGeometry(p.r,seg,Math.floor(seg*0.7)),mat)
  m.rotation.z=p.tilt||0;m.userData.idx=idx;G.add(m);M.push(m)

  // Saturn rings
  if(p.ring){
    const rc=document.createElement('canvas');rc.width=2048;rc.height=256;const rx=rc.getContext('2d')
    for(let x=0;x<2048;x++){
      const t=x/2048,br=0.12+0.4*Math.sin(t*60)+0.1*Math.sin(t*100+1)+0.08*Math.sin(t*180+2),gap=t>0.35&&t<0.42||t>0.55&&t<0.6?0:Math.max(0,1-Math.abs(t-0.5)*1.2),al=Math.min(1,br*gap)*(t>0.04&&t<0.96?0.85:0)
      rx.fillStyle=`rgba(${180+80*br|0},${160+60*br|0},${130+50*br|0},${al})`;rx.fillRect(x,0,1,64);rx.fillRect(x,128,1,128)
    }
    const rt=new THREE.CanvasTexture(rc);rt.anisotropy=16
    const rm=new THREE.Mesh(new THREE.RingGeometry(p.r*1.2,p.r*2.5,128),new THREE.MeshStandardMaterial({map:rt,transparent:1,opacity:0.75,side:THREE.DoubleSide,depthWrite:0,roughness:0.7,metalness:0}))
    rm.rotation.x=Math.PI/2.5;G.add(rm)
  }

  const a0=Math.random()*Math.PI*2
  m.position.x=p.orbit*Math.cos(a0);m.position.z=p.orbit*Math.sin(a0)
  ANM.push({a:a0,sp:p.sp*0.002,rt:p.rot,m,data:p,grp:G})

  // Label
  const lc=document.createElement('canvas');lc.width=256;lc.height=48
  const lx=lc.getContext('2d');lx.shadowColor='rgba(0,0,0,0.9)';lx.shadowBlur=6
  lx.fillStyle='rgba(255,255,255,0.8)';lx.font='bold 20px Inter,Arial,sans-serif'
  lx.textAlign='center';lx.textBaseline='middle';lx.fillText(p.en,128,24)
  const lt=new THREE.CanvasTexture(lc);lt.anisotropy=16
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:lt,transparent:1,depthWrite:0,opacity:0.6,sizeAttenuation:1}))
  sp.scale.set(0.8,0.18,1);sp.userData.idx=idx;S.add(sp);LBL.push(sp)

  tk(p.n)
})
tk('太阳 ☀')

// ─── Earth Atmo & Clouds ─────────────────────────────────

;(()=>{
  const ei=DATA.findIndex(d=>d.earth)
  if(ei<0)return;const er=DATA[ei].r
  EA=new THREE.Mesh(new THREE.SphereGeometry(er*1.04,48,36),new THREE.ShaderMaterial({
    vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`varying vec3 vN;varying vec3 vW;uniform vec3 uC;uniform float uI;uniform float uP;void main(){vec3 v=normalize(cameraPosition-vW);float r=1.0-max(0.0,dot(v,vN));r=pow(r,uP);gl_FragColor=vec4(uC,r*uI);}`,
    uniforms:{uC:{value:new THREE.Color(0x4488ff)},uI:{value:0.6},uP:{value:4}},
    transparent:1,blending:THREE.AdditiveBlending,side:THREE.FrontSide,depthWrite:0
  }))
  const cc=document.createElement('canvas');cc.width=1024;cc.height=512
  const cd=pix2d(1024,512,(u,v)=>{const n=wfbm(u*12+3,v*12+1,6,0.6);const a=n>0.42?(n-0.42)*1.7*0.75:0;return[255,255,255,Math.round(a*255)]})
  cc.getContext('2d').putImageData(cd,0,0)
  const ct=new THREE.CanvasTexture(cc);ct.wrapS=ct.wrapT=THREE.RepeatWrapping;ct.anisotropy=16
  EC=new THREE.Mesh(new THREE.SphereGeometry(er*1.015,48,36),new THREE.MeshStandardMaterial({map:ct,transparent:1,opacity:0.4,depthWrite:0,roughness:0,metalness:0}))
})()

// ─── Asteroid Belt ───────────────────────────────────────

;(()=>{
  const n=4000,p=new Float32Array(n*3)
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=16+Math.random()*3.5,y=(Math.random()-0.5)*1.2;p[i*3]=r*Math.cos(a);p[i*3+1]=y;p[i*3+2]=r*Math.sin(a)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3))
  S.add(new THREE.Points(g,new THREE.PointsMaterial({color:0x887766,size:0.03,transparent:1,opacity:0.25})))
})();

// ─── Interaction ─────────────────────────────────────────

const RAY=new THREE.Raycaster(),PTR=new THREE.Vector2()
const PN=document.getElementById('panel'),PD=document.getElementById('panelDot')
const PNM=document.getElementById('panelName'),PNE=document.getElementById('panelNameEn'),PST=document.getElementById('panelStat')
const PB=document.getElementById('panelBack'),HUD=document.getElementById('hud')

let mode='overview',tgt=null,zp=0
const sP=new THREE.Vector3(),eP=new THREE.Vector3(),sT=new THREE.Vector3(),eT=new THREE.Vector3()
const H_P=new THREE.Vector3(5,6,26),H_T=new THREE.Vector3(0,0,0)
function ez(t){return t<0.5?4*t*t*t:1-(-2*t+2)**3/2}

function focus(idx){
  const p=DATA[idx],pos=M[idx-1].position.clone()
  tgt=idx;mode='focus';zp=0;sP.copy(C.position);sT.copy(CTRL.target)
  const d=Math.max(p.r*4,2.5);eT.copy(pos);eP.copy(pos.clone().add(new THREE.Vector3(d*0.5,p.r*2,d)))
  CTRL.autoRotate=0;LBL.forEach(l=>l.visible=0);LBL[idx-1].visible=1
  PN.classList.remove('hidden');PD.style.background=`radial-gradient(circle at 35% 35%, #ffcc44, #441100)`
  PNM.textContent=p.n;PNE.textContent=p.en;PST.textContent=p.i;HUD.style.opacity='0'
}
function unfocus(){
  mode='back';zp=0;sP.copy(C.position);sT.copy(CTRL.target)
  eP.copy(H_P);eT.copy(H_T);LBL.forEach(l=>l.visible=1)
  PN.classList.add('hidden');tgt=null;HUD.style.opacity='1';CTRL.autoRotate=1
}

R.domElement.addEventListener('click',e=>{
  if(mode==='focus'||mode==='back')return
  PTR.x=(e.clientX/W)*2-1;PTR.y=-(e.clientY/H)*2+1
  RAY.setFromCamera(PTR,C)
  const h=RAY.intersectObjects(M)
  if(h.length>0){const idx=h[0].object.userData.idx;if(idx&&mode==='overview')focus(idx)}
  else if(mode==='zoomed')unfocus()
})
PB.addEventListener('click',unfocus)
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode==='zoomed')unfocus()})

// ─── Animation ───────────────────────────────────────────

let time=0
function anim(){
  requestAnimationFrame(anim)
  time+=0.005

  // Sun
  for(const ch of SG.children){
    if(ch.type==='Mesh'&&ch.material.uniforms){const s=1+0.025*Math.sin(time*2.5+ch.id*0.1);ch.scale.setScalar(s)}
    if(ch.type==='Points'){ch.material.opacity=0.2+0.12*Math.sin(time*2)}
  }
  // Plasma particles
  const pp=PC.geometry.attributes.position.array
  for(let i=0;i<5000;i++){
    const t=time*0.5+i*0.001+PV[i]*time*0.3
    pp[i*3]=DATA[0].r*(1.02+0.5*Math.sin(t*2+PR[i]*10)+0.3*Math.sin(t*3.5+PV[i]*5))*Math.sin(t*1.3+PR[i]*8)
    pp[i*3+1]=DATA[0].r*(1.02+0.5*Math.cos(t*1.7+PR[i]*6))*Math.cos(t*0.8+PV[i]*3)
    pp[i*3+2]=DATA[0].r*(1.02+0.5*Math.sin(t*2.3+PR[i]*7))*Math.sin(t*1.1+PV[i]*4)
  }
  PC.geometry.attributes.position.needsUpdate=1

  // Planets
  ANM.forEach((d,i)=>{
    d.a+=d.sp
    d.m.position.x=d.data.orbit*Math.cos(d.a)
    d.m.position.z=d.data.orbit*Math.sin(d.a)
    d.m.rotation.y+=d.rt
    if(LBL[i]){LBL[i].position.copy(d.m.position);LBL[i].position.y+=d.data.r*2+0.3}
    if(d.data.earth){
      if(EA&&!EA.parent)d.grp.add(EA)
      if(EA)EA.material.uniforms.uI.value=0.4+0.15*Math.sin(time*0.8)
      if(EC&&!EC.parent)d.grp.add(EC)
      if(EC)EC.rotation.y+=0.005
    }
  })

  // Zoom
  if(mode==='focus'){zp+=0.015;if(zp>=1){zp=1;mode='zoomed'};const e=ez(zp);C.position.lerpVectors(sP,eP,e);CTRL.target.lerpVectors(sT,eT,e)}
  else if(mode==='back'){zp+=0.015;if(zp>=1){zp=1;mode='overview'};const e=ez(zp);C.position.lerpVectors(sP,eP,e);CTRL.target.lerpVectors(sT,eT,e)}
  else if(mode==='zoomed'&&tgt){const pos=M[tgt-1].position.clone(),off=C.position.clone().sub(CTRL.target);CTRL.target.copy(pos);C.position.copy(pos.clone().add(off))}

  CTRL.update();CMP.render()
}
anim()

// ─── Resize ──────────────────────────────────────────────

addEventListener('resize',()=>{C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix();R.setSize(innerWidth,innerHeight);CMP.setSize(innerWidth,innerHeight)})
