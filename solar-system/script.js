import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// ─── Planet Data ───

const DATA = [
  { name:'太阳',   nameEn:'Sun',      r:2.8, orbit:0,   speed:0,     rotSpeed:0.0004, tilt:0.1,    gen:genSunTex,     info:'恒星 · 直径 1,392,700 km · 表面 5,500°C',              emissive:true },
  { name:'水星',   nameEn:'Mercury',  r:0.20,orbit:5.5, speed:4.15,  rotSpeed:0.005,  tilt:0.03,   gen:genMercuryTex, info:'最小行星 · 直径 4,879 km · 公转 88 天',               rough:0.85,metal:0.08 },
  { name:'金星',   nameEn:'Venus',    r:0.42,orbit:8.5, speed:1.62,  rotSpeed:-0.002, tilt:2.64,   gen:genVenusTex,   info:'最热行星 · 直径 12,104 km · 公转 225 天',             rough:0.7,metal:0 },
  { name:'地球',   nameEn:'Earth',    r:0.50,orbit:11.5,speed:1.0,   rotSpeed:0.02,   tilt:0.41,   gen:genEarthTex,   info:'生命家园 · 直径 12,742 km · 公转 365 天',             rough:0.6,metal:0, earth:true },
  { name:'火星',   nameEn:'Mars',     r:0.30,orbit:15,  speed:0.53,  rotSpeed:0.019,  tilt:0.44,   gen:genMarsTex,    info:'红色行星 · 直径 6,779 km · 公转 687 天',             rough:0.8,metal:0.15 },
  { name:'木星',   nameEn:'Jupiter',  r:1.10,orbit:20,  speed:0.084, rotSpeed:0.04,   tilt:0.05,   gen:genJupiterTex, info:'最大行星 · 直径 139,820 km · 公转 11.86 年',         rough:0.5,metal:0 },
  { name:'土星',   nameEn:'Saturn',   r:0.85,orbit:25,  speed:0.034, rotSpeed:0.038,  tilt:0.47,   gen:genSaturnTex,  info:'环系统 · 直径 116,460 km · 公转 29.46 年',           rough:0.55,metal:0, ring:true },
  { name:'天王星', nameEn:'Uranus',   r:0.55,orbit:31,  speed:0.012, rotSpeed:-0.03,  tilt:1.71,   gen:genUranusTex,  info:'冰巨星 · 直径 50,724 km · 公转 84.01 年',            rough:0.3,metal:0 },
  { name:'海王星', nameEn:'Neptune',  r:0.50,orbit:37,  speed:0.006, rotSpeed:0.032,  tilt:0.49,   gen:genNeptuneTex, info:'最远行星 · 直径 49,244 km · 公转 164.8 年',          rough:0.35,metal:0 },
]

// ─── Noise Functions ───

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
function lerp(a, b, t) { return a + (b - a) * t }
function smoothstep(t) { return t * t * (3 - 2 * t) }
function noise2D(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const sx = smoothstep(fx), sy = smoothstep(fy)
  const n00 = hash(ix * 57 + iy * 131)
  const n10 = hash((ix + 1) * 57 + iy * 131)
  const n01 = hash(ix * 57 + (iy + 1) * 131)
  const n11 = hash((ix + 1) * 57 + (iy + 1) * 131)
  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy)
}
function fbm(x, y, oct) {
  let v = 0, amp = 0.5, freq = 1
  for (let i = 0; i < oct; i++) { v += amp * noise2D(x * freq, y * freq); freq *= 2; amp *= 0.5 }
  return v
}
function ridged(x, y, oct) {
  let v = 0, amp = 0.5, freq = 1
  for (let i = 0; i < oct; i++) { v += amp * (1 - Math.abs(noise2D(x * freq, y * freq) * 2 - 1)); freq *= 2.3; amp *= 0.5 }
  return v
}

// ─── Texture Helpers ───

const TW = 1024, TH = 512

function makeCanvas(fn) {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH
  fn(c.getContext('2d'), TW, TH); return c
}
function makeTexFromCanvas(c) {
  const t = new THREE.CanvasTexture(c); t.anisotropy = 16; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
}
function fillPixels(w, h, fn) {
  const img = new ImageData(w, h), d = img.data
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, c = fn(x / w, y / h, x, y)
    d[i] = c[0]; d[i+1] = c[1]; d[i+2] = c[2]; d[i+3] = c[3] !== undefined ? c[3] : 255
  }
  return img
}

// ─── Texture Generators ───

function genSunTex(ctx, w, h) {
  const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2)
  g.addColorStop(0,'#fff8e0'); g.addColorStop(0.2,'#ffdd44'); g.addColorStop(0.5,'#ff8800')
  g.addColorStop(0.75,'#cc4400'); g.addColorStop(1,'#551100')
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h)
  for (let i=0;i<800;i++) {
    const x=Math.random()*w,y=Math.random()*h,s=1+Math.random()*40
    const a=Math.random()*0.12
    ctx.beginPath();ctx.arc(x,y,s,0,Math.PI*2)
    ctx.fillStyle=`rgba(255,${150+Math.random()*80},0,${a})`;ctx.fill()
  }
  for (let i=0;i<60;i++) {
    const x=Math.random()*w,y=Math.random()*h,s=20+Math.random()*100
    const g2=ctx.createRadialGradient(x,y,0,x,y,s)
    g2.addColorStop(0,`rgba(255,200,50,${0.02+Math.random()*0.04})`)
    g2.addColorStop(1,'rgba(255,200,50,0)')
    ctx.fillStyle=g2;ctx.fillRect(x-s,y-s,s*2,s*2)
  }
}

function genMercuryTex(ctx, w, h) {
  const img = fillPixels(w, h, (u,v) => {
    const n = fbm(u*8, v*8, 6)
    const c = 100 + n * 80 - ridged(u*12, v*12, 4) * 30
    return [c, c-5, c-10]
  })
  ctx.putImageData(img,0,0)
  for (let i=0;i<120;i++) {
    const x=Math.random()*w,y=Math.random()*h,s=2+Math.random()*14
    ctx.beginPath();ctx.arc(x,y,s,0,Math.PI*2)
    ctx.fillStyle=`rgba(0,0,0,${0.08+Math.random()*0.2})`;ctx.fill()
    ctx.beginPath();ctx.arc(x+s*0.3,y-s*0.3,s*0.5,0,Math.PI*2)
    ctx.fillStyle=`rgba(180,175,165,${0.05+Math.random()*0.1})`;ctx.fill()
  }
}

function genVenusTex(ctx, w, h) {
  const img = fillPixels(w, h, (u,v) => {
    const n = fbm(u*5+v*2.5, v*5-u*2.5, 5)
    const r = 200 + n * 50, g = 170 + n * 45, b = 120 + n * 35
    return [Math.min(255,r),Math.min(255,g),Math.min(255,b)]
  })
  ctx.putImageData(img,0,0)
}

function genEarthTex(ctx, w, h) {
  const img = fillPixels(w, h, (u,v) => {
    const lat = (v - 0.5) * Math.PI, lon = u * Math.PI * 2
    const nx = Math.cos(lat)*Math.cos(lon), nz = Math.sin(lat)
    const n = fbm(nx*2+0.5, nz*2+0.5, 5)
    const t = fbm(nx*4+2, nz*4+2, 4)
    const land = n > 0.42 + t * 0.08
    if (land) {
      const e = fbm(nx*6+3, nz*6+3, 4)
      return [40+e*90, 100+e*70, 20+e*30]
    } else {
      const d = fbm(nx*5+1, nz*5+1, 3)
      return [10+d*20, 40+d*60, 100+d*90]
    }
  })
  ctx.putImageData(img,0,0)
}

function genMarsTex(ctx, w, h) {
  const img = fillPixels(w, h, (u,v) => {
    const lat = (v - 0.5) * Math.PI
    const n = fbm(u*6, v*6, 5)
    const pole = Math.abs(lat) > 1.05 ? 1 : 0
    if (pole) {
      const pn = fbm(u*4+2, v*4+2, 3)
      return [180+pn*40, 150+pn*30, 120+pn*30]
    }
    return [150+n*80, 80+n*40, 40+n*20]
  })
  ctx.putImageData(img,0,0)
}

function genJupiterTex(ctx, w, h) {
  const img = fillPixels(w, h, (u,v) => {
    const turb = fbm(u*8, v*12, 4) * 0.08
    const band = Math.sin((v + turb) * Math.PI * 14) * 0.5 + 0.5
    const n = fbm(u*6, v*6, 3) * 0.15
    const spot = Math.exp(-((u-0.65)**2 + (v-0.5)**2) * 1000)
    const r = 160 + band*60 + n*30 + spot*90
    const g = 130 + band*40 + n*20 + spot*20
    const b = 80 + band*30 + n*10
    return [Math.min(255,r),Math.min(255,g),Math.min(255,b)]
  })
  ctx.putImageData(img,0,0)
}

function genSaturnTex(ctx, w, h) {
  const img = fillPixels(w, h, (u,v) => {
    const turb = fbm(u*6, v*10, 4) * 0.06
    const band = Math.sin((v + turb) * Math.PI * 10 + 0.5) * 0.5 + 0.5
    const r = 180 + band*50, g = 160 + band*40, b = 120 + band*30
    return [Math.min(255,r),Math.min(255,g),Math.min(255,b)]
  })
  ctx.putImageData(img,0,0)
}

function genUranusTex(ctx, w, h) {
  const img = fillPixels(w, h, (u,v) => {
    const n = fbm(u*4, v*4, 3)
    return [120+n*20, 190+n*20, 200+n*15]
  })
  ctx.putImageData(img,0,0)
}

function genNeptuneTex(ctx, w, h) {
  const img = fillPixels(w, h, (u,v) => {
    const n = fbm(u*5, v*5, 4)
    const spot = Math.exp(-((u-0.7)**2 + (v-0.6)**2) * 800)
    const r = 30+n*30+spot*20, g = 50+n*40+spot*30, b = 150+n*50+spot*60
    return [Math.min(255,r),Math.min(255,g),Math.min(255,b)]
  })
  ctx.putImageData(img,0,0)
}

// ─── Loading ───

let loaded = 0, totalAssets = DATA.length
const loadingEl = document.getElementById('loading')
const progFill = document.getElementById('progressFill')
const loaderTxt = document.getElementById('loaderText')

function tickLoad(name) {
  loaded++; const pct = Math.min(loaded / totalAssets * 100, 100)
  if (progFill) progFill.style.width = pct + '%'
  if (loaderTxt) loaderTxt.textContent = name || `生成中 ${Math.round(pct)}%`
  if (loaded >= totalAssets) setTimeout(() => { if (loadingEl) loadingEl.classList.add('hidden') }, 500)
}
setTimeout(() => { if (loadingEl) loadingEl.classList.add('hidden') }, 6000)

// ─── Scene Setup ───

const W = window.innerWidth, H = window.innerHeight
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(40, W/H, 0.1, 5000)
camera.position.set(4, 7, 28)

const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' })
renderer.setSize(W, H)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
document.body.prepend(renderer.domElement)

// ─── Post-Processing ───

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.4, 0.3, 0.85)
composer.addPass(bloomPass)

// ─── Controls ───

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.rotateSpeed = 0.35
controls.minDistance = 1.5
controls.maxDistance = 100
controls.target.set(0, 0, 0)

const maxAniso = renderer.capabilities.getMaxAnisotropy()

// ─── Stars ───

function createStars() {
  const count = 15000, pos = new Float32Array(count * 3), col = new Float32Array(count * 3), sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1), r = 500 + Math.random() * 500
    pos[i*3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i*3+1] = r * Math.cos(phi)
    pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta)
    const t = Math.random()
    if (t < 0.04) { col[i*3]=1; col[i*3+1]=0.5; col[i*3+2]=0.2 }
    else if (t < 0.08) { col[i*3]=0.5; col[i*3+1]=0.6; col[i*3+2]=1 }
    else if (t < 0.14) { col[i*3]=1; col[i*3+1]=0.8; col[i*3+2]=0.5 }
    else { const b=0.7+Math.random()*0.3; col[i*3]=b; col[i*3+1]=b; col[i*3+2]=b }
    sizes[i] = 0.3 + Math.random() * 2.2
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({ size:1.0, vertexColors:true, transparent:true, opacity:0.85, sizeAttenuation:true, blending:THREE.AdditiveBlending, depthWrite:false })
  return new THREE.Points(geo, mat)
}
scene.add(createStars())

// ─── Sun ───

const sunGroup = new THREE.Group(); scene.add(sunGroup)

const sunTex = makeTexFromCanvas(makeCanvas(genSunTex))
const sunMat = new THREE.MeshBasicMaterial({ map: sunTex })
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(DATA[0].r, 80, 80), sunMat)
sunGroup.add(sunMesh)

function glowShader(r, color, intensity, power) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 48, 48),
    new THREE.ShaderMaterial({
      vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
      fragmentShader:`varying vec3 vN;varying vec3 vW;uniform vec3 uC;uniform float uI;uniform float uP;void main(){vec3 v=normalize(cameraPosition-vW);float r=1.0-max(0.0,dot(v,vN));r=pow(r,uP);gl_FragColor=vec4(uC,r*uI);}`,
      uniforms:{uC:{value:new THREE.Color(color)},uI:{value:intensity},uP:{value:power}},
      transparent:true,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false
    })
  )
}
const sunGlows = [
  glowShader(DATA[0].r*1.06,'#ffaa44',0.6,4),
  glowShader(DATA[0].r*1.18,'#ff6600',0.25,3),
  glowShader(DATA[0].r*1.5,'#ff3300',0.08,2),
  glowShader(DATA[0].r*2.2,'#ff2200',0.025,1.5),
]
sunGlows.forEach(g => sunGroup.add(g))
tickLoad('太阳 ☀')

// Corona particles
const cCount = 2500, cPos = new Float32Array(cCount*3), cVel = new Float32Array(cCount)
for (let i=0;i<cCount;i++) {
  const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1)
  const r = DATA[0].r*(1.05+Math.random()*0.9)
  cPos[i*3]=r*Math.sin(phi)*Math.cos(theta)
  cPos[i*3+1]=r*Math.cos(phi)
  cPos[i*3+2]=r*Math.sin(phi)*Math.sin(theta)
  cVel[i]=0.5+Math.random()*1.5
}
const coronaGeo = new THREE.BufferGeometry()
coronaGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3))
const coronaMat = new THREE.PointsMaterial({ color:0xff8800, size:0.06, transparent:true, opacity:0.25, blending:THREE.AdditiveBlending, depthWrite:false })
const corona = new THREE.Points(coronaGeo, coronaMat)
sunGroup.add(corona)

// ─── Lighting ───

scene.add(new THREE.PointLight(0xffeedd, 3, 300))
scene.add(new THREE.AmbientLight(0x222244, 0.12))
scene.add(new THREE.DirectionalLight(0xffffff, 0.3))

// ─── Planets ───

const meshes = []
const orbitLines = []
const labels = []
const animData = []

DATA.forEach((p, idx) => {
  const isSun = idx === 0
  if (isSun) return // skip sun

  const group = new THREE.Group()
  scene.add(group)

  // Orbit line
  const pts = []
  for (let i = 0; i <= 128; i++) {
    const a = (i/128)*Math.PI*2
    pts.push(Math.cos(a)*p.orbit, 0, Math.sin(a)*p.orbit)
  }
  const oGeo = new THREE.BufferGeometry()
  oGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  const oMat = new THREE.LineBasicMaterial({ color:0x445566, transparent:true, opacity:0.08 })
  const orbitLine = new THREE.Line(oGeo, oMat)
  scene.add(orbitLine)
  orbitLines.push(orbitLine)

  // Texture
  const tex = makeTexFromCanvas(makeCanvas(p.gen))

  // Material
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex, roughness: p.rough || 0.6, metalness: p.metal || 0,
  })
  const segs = p.name === '木星' || p.name === '土星' ? 80 : 56
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, segs, Math.floor(segs*0.7)), mat)
  mesh.rotation.z = p.tilt || 0
  mesh.userData.idx = idx
  group.add(mesh)
  meshes.push(mesh)

  // Saturn rings
  if (p.ring) {
    const rc = document.createElement('canvas'); rc.width = 1024; rc.height = 128
    const rctx = rc.getContext('2d')
    for (let x = 0; x < 1024; x++) {
      const t = x/1024
      const bright = 0.15+0.35*Math.sin(t*50)+0.12*Math.sin(t*80+1)+0.08*Math.sin(t*150+2)+0.05*Math.sin(t*200+3)
      const alpha = (t > 0.08 && t < 0.92) ? Math.min(1, bright * (1-Math.abs(t-0.5)*0.6)) * 0.75 : 0
      const r2 = 180+60*bright, g2 = 165+50*bright, b2 = 130+40*bright
      rctx.fillStyle = `rgba(${r2|0},${g2|0},${b2|0},${alpha})`
      rctx.fillRect(x, 0, 1, 32)
      rctx.fillStyle = `rgba(${r2*0.7|0},${g2*0.7|0},${b2*0.7|0},${alpha*0.5})`
      rctx.fillRect(x, 64, 1, 64)
    }
    const ringTex = new THREE.CanvasTexture(rc)
    ringTex.anisotropy = maxAniso
    const ringMat = new THREE.MeshPhysicalMaterial({
      map: ringTex, transparent:true, opacity:0.8, side:THREE.DoubleSide, depthWrite:false, roughness:0.7, metalness:0
    })
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(p.r*1.25, p.r*2.6, 128), ringMat)
    ringMesh.rotation.x = Math.PI/2.5
    group.add(ringMesh)
  }

  // Init position
  const angle = Math.random() * Math.PI * 2
  mesh.position.x = p.orbit * Math.cos(angle)
  mesh.position.z = p.orbit * Math.sin(angle)

  animData.push({ angle, speed: p.speed * 0.003, rotSpeed: p.rotSpeed, mesh, data: p })

  // Label
  const lc = document.createElement('canvas'); lc.width = 512; lc.height = 100
  const lctx = lc.getContext('2d')
  lctx.shadowColor = 'rgba(0,0,0,0.9)'; lctx.shadowBlur = 12
  lctx.fillStyle = '#fff'; lctx.font = 'bold 38px Inter,Arial,sans-serif'
  lctx.textAlign = 'center'; lctx.textBaseline = 'middle'
  lctx.fillText(p.nameEn, 256, 44)
  lctx.shadowBlur = 0
  lctx.fillStyle = 'rgba(255,255,255,0.3)'; lctx.font = '16px Inter,Arial,sans-serif'
  lctx.fillText(p.name, 256, 80)
  const lTex = new THREE.CanvasTexture(lc)
  lTex.anisotropy = maxAniso
  const lMat = new THREE.SpriteMaterial({ map:lTex, transparent:true, depthWrite:false, opacity:0.6, sizeAttenuation:true })
  const sprite = new THREE.Sprite(lMat)
  sprite.scale.set(2.2, 0.5, 1)
  sprite.userData.idx = idx
  scene.add(sprite)
  labels.push(sprite)

  tickLoad(p.name)
})

// ─── Earth Atmosphere ───

const earthIdx = DATA.findIndex(d => d.earth)
if (earthIdx > 0) {
  const er = DATA[earthIdx].r
  // Outer glow
  const atMat = new THREE.ShaderMaterial({
    vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`varying vec3 vN;varying vec3 vW;uniform vec3 uC;uniform float uI;uniform float uP;void main(){vec3 v=normalize(cameraPosition-vW);float r=1.0-max(0.0,dot(v,vN));r=pow(r,uP);gl_FragColor=vec4(uC,r*uI);}`,
    uniforms:{uC:{value:new THREE.Color(0x4488ff)},uI:{value:0.35},uP:{value:3.5}},
    transparent:true,blending:THREE.AdditiveBlending,side:THREE.FrontSide,depthWrite:false
  })
  const atmos = new THREE.Mesh(new THREE.SphereGeometry(er*1.025, 48, 36), atMat)
  // We'll add this to the Earth's group during animation
  // Actually, let me attach it to the mesh directly
  atmos.renderOrder = 1
  // I'll track it and add it manually
  window.__atmos = atmos
}

// ─── Asteroid Belt ───

function createAsteroidBelt() {
  const count = 3000, pos = new Float32Array(count*3)
  for (let i=0;i<count;i++) {
    const angle = Math.random()*Math.PI*2, r = 16+Math.random()*3, y = (Math.random()-0.5)*0.8
    pos[i*3] = r*Math.cos(angle); pos[i*3+1] = y; pos[i*3+2] = r*Math.sin(angle)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({ color:0x887766, size:0.06, transparent:true, opacity:0.4 })
  scene.add(new THREE.Points(geo, mat))
}
createAsteroidBelt()

// ─── Interaction ───

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

const panel = document.getElementById('panel')
const panelDot = document.getElementById('panelDot')
const panelName = document.getElementById('panelName')
const panelNameEn = document.getElementById('panelNameEn')
const panelStat = document.getElementById('panelStat')
const panelBack = document.getElementById('panelBack')
const hudTitle = document.getElementById('hudTitle')

let state = 'overview' // overview | zooming | zoomed | zoomOut
let targetIdx = null
let zoomT = 0
const startCam = new THREE.Vector3(), endCam = new THREE.Vector3()
const startTgt = new THREE.Vector3(), endTgt = new THREE.Vector3()
const HOME_CAM = new THREE.Vector3(4, 7, 28)
const HOME_TGT = new THREE.Vector3(0, 0, 0)

function ease(t) { return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2 }

function zoomTo(idx) {
  const p = DATA[idx]
  const pos = meshes[idx-1].position.clone()
  targetIdx = idx; state = 'zooming'; zoomT = 0
  startCam.copy(camera.position); startTgt.copy(controls.target)
  const dist = Math.max(p.r*4, 2)
  endTgt.copy(pos)
  endCam.copy(pos.clone().add(new THREE.Vector3(dist*0.5, p.r*2, dist)))
  labels.forEach(l => l.visible = false)
  labels[idx-1].visible = true
  panel.classList.remove('hidden')
  const c1 = p.gen === genSunTex ? '#ffcc44' : '#888'
  panelDot.style.background = `radial-gradient(circle at 35% 35%, ${c1}, #222)`
  panelName.textContent = p.name
  panelNameEn.textContent = p.nameEn
  panelStat.textContent = p.info
  hudTitle.style.opacity = '0'
}
function zoomBack() {
  state = 'zoomOut'; zoomT = 0
  startCam.copy(camera.position); startTgt.copy(controls.target)
  endCam.copy(HOME_CAM); endTgt.copy(HOME_TGT)
  labels.forEach(l => l.visible = true)
  panel.classList.add('hidden'); targetIdx = null
  hudTitle.style.opacity = '1'
}

renderer.domElement.addEventListener('click', (e) => {
  if (state === 'zooming' || state === 'zoomOut') return
  pointer.x = (e.clientX/W)*2-1; pointer.y = -(e.clientY/H)*2+1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(meshes)
  if (hits.length > 0) {
    const idx = hits[0].object.userData.idx
    if (idx && state === 'overview') zoomTo(idx)
  } else if (state === 'zoomed') zoomBack()
})
panelBack.addEventListener('click', zoomBack)
document.addEventListener('keydown', e => { if (e.key==='Escape' && state==='zoomed') zoomBack() })

// ─── Animation Loop ───

let time = 0

function animate() {
  requestAnimationFrame(animate)
  time += 0.005

  // Sun rotation
  sunGroup.rotation.y += 0.0005

  // Sun glow pulse
  sunGlows.forEach((g, i) => {
    const s = 1 + 0.015 * Math.sin(time*2 + i*1.2)
    g.scale.setScalar(s)
  })
  // Corona pulse
  coronaMat.opacity = 0.2 + 0.08 * Math.sin(time * 1.5)

  // Planet orbits
  animData.forEach((d, i) => {
    d.angle += d.speed
    d.mesh.position.x = d.data.orbit * Math.cos(d.angle)
    d.mesh.position.z = d.data.orbit * Math.sin(d.angle)
    d.mesh.rotation.y += d.rotSpeed

    // Label follows planet
    if (labels[i]) {
      labels[i].position.copy(d.mesh.position)
      labels[i].position.y += d.data.r * 2.2 + 0.5
    }

    // Earth atmosphere
    if (d.data.earth && window.__atmos) {
      const at = window.__atmos
      if (!at.parent) d.mesh.parent.add(at)
      // Slight atmosphere shimmer
      at.material.uniforms.uI.value = 0.3 + 0.08 * Math.sin(time * 0.7 + i)
    }
  })

  // Star twinkle
  // Handled by the points material opacity variation... can't easily do per-star without custom shader

  // Zoom animation
  if (state === 'zooming') {
    zoomT += 0.02
    if (zoomT >= 1) { zoomT = 1; state = 'zoomed' }
    const t = ease(zoomT)
    camera.position.lerpVectors(startCam, endCam, t)
    controls.target.lerpVectors(startTgt, endTgt, t)
  } else if (state === 'zoomOut') {
    zoomT += 0.02
    if (zoomT >= 1) { zoomT = 1; state = 'overview' }
    const t = ease(zoomT)
    camera.position.lerpVectors(startCam, endCam, t)
    controls.target.lerpVectors(startTgt, endTgt, t)
  } else if (state === 'zoomed' && targetIdx) {
    const pos = meshes[targetIdx-1].position.clone()
    const offset = camera.position.clone().sub(controls.target)
    controls.target.copy(pos)
    camera.position.copy(pos.clone().add(offset))
  }

  controls.update()
  composer.render()
}
animate()

// ─── Resize ───

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})
