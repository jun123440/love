(() => {
  const hero = document.querySelector('.hero');
  const canvas = document.querySelector('#water');
  const button = document.querySelector('#motion');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false, powerPreference:'low-power'});
  let paused = reduced.matches;
  let visible = true;
  let frame = 0;
  let clock = 0;
  let lastTime = 0;
  let lastRipple = -1;
  let nextRipple = 0;
  let loaded = false;
  const ripples = new Float32Array(24).fill(-100);
  let program;
  const uniforms = {};
  const picture = new Image();

  if (gl) {
    const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
    const fragment = `
precision highp float;
uniform sampler2D painting;
uniform vec2 resolution;
uniform vec2 imageSize;
uniform float time;
uniform vec3 ripples[8];
void main(){
  vec2 screen=gl_FragCoord.xy/resolution;
  vec2 offset=vec2(0.);
  float light=0.;
  float aspect=resolution.x/resolution.y;
  for(int i=0;i<8;i++){
    float age=time-ripples[i].z;
    if(age>=0. && age<3.){
      vec2 delta=(screen-ripples[i].xy)*vec2(aspect,1.);
      float distance=length(delta);
      float wave=distance-age*.15;
      float envelope=exp(-abs(wave)*28.)*exp(-age*1.15);
      float amplitude=sin(wave*100.)*envelope;
      offset+=normalize(delta+vec2(.0001))*.005*amplitude;
      light+=amplitude*.025;
    }
  }
  float water=(1.-smoothstep(.4,.9,screen.y));
  offset.x+=sin(screen.y*18.+time*.45)*.0007*water;
  offset.y+=cos(screen.x*13.+time*.3)*.0005*water;
  vec2 uv=screen+offset;
  float imageAspect=imageSize.x/imageSize.y;
  vec2 scale=vec2(min(1.,aspect/imageAspect),min(1.,imageAspect/aspect));
  uv=(uv-.5)*scale+.5;
  vec3 color=texture2D(painting,clamp(uv,0.,1.)).rgb;
  gl_FragColor=vec4(color+light,1.);
}`;
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error('Water shader compile failed');
      return shader;
    }
    try {
      program=gl.createProgram();
      gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
      gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Water shader link failed');
      gl.useProgram(program);
      const buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      for(const name of ['resolution','imageSize','time','painting','ripples']) uniforms[name]=gl.getUniformLocation(program,name);
    } catch { program=null; }
  }

  function draw() {
    if(!loaded || !program)return;
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.uniform2f(uniforms.imageSize,picture.width,picture.height);
    gl.uniform1f(uniforms.time,clock);
    gl.uniform3fv(uniforms.ripples,ripples);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function animate(now) {
    frame=0;
    clock+=Math.min((now-lastTime)/1000,.05);lastTime=now;
    draw();
    if(!paused && visible && !document.hidden)frame=requestAnimationFrame(animate);
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;
    button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',paused?'播放水面动画':'暂停水面动画');
    button.innerHTML=paused?'<span>唤醒水面</span> ▷':'<span>静止画面</span> Ⅱ';
    if(!paused && visible && !document.hidden && loaded){lastTime=performance.now();frame=requestAnimationFrame(animate);}
    draw();
  }
  if(program) {
    picture.onload=()=>{
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,picture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      loaded=true;canvas.classList.add('ready');sync();
    };
    picture.onerror=()=>{button.hidden=true;document.querySelector('.water-hint').textContent='一座收藏好奇心的数字花园';};
    picture.src='garden.webp';
  } else {
    button.hidden=true;
    document.querySelector('.water-hint').textContent='一座收藏好奇心的数字花园';
  }
  new ResizeObserver(()=>{
    const rect=hero.getBoundingClientRect();
    const scale=Math.min(devicePixelRatio,1.5,1800/rect.width);
    canvas.width=Math.round(rect.width*scale);canvas.height=Math.round(rect.height*scale);
    gl?.viewport(0,0,canvas.width,canvas.height);draw();
  }).observe(hero);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(hero);
  document.addEventListener('visibilitychange',sync);
  button.addEventListener('click',()=>{paused=!paused;sync();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});
  function ripple(event) {
    if(paused || clock-lastRipple<.08)return;
    const rect=hero.getBoundingClientRect();
    ripples[nextRipple*3]=(event.clientX-rect.left)/rect.width;
    ripples[nextRipple*3+1]=1-(event.clientY-rect.top)/rect.height;
    ripples[nextRipple*3+2]=clock;
    nextRipple=(nextRipple+1)%8;lastRipple=clock;
  }
  hero.addEventListener('pointermove',ripple,{passive:true});
  hero.addEventListener('pointerdown',ripple,{passive:true});
  document.querySelectorAll('.magnetic').forEach(el=>{
    el.addEventListener('pointermove',event=>{
      if(event.pointerType!=='mouse'||reduced.matches)return;
      const rect=el.getBoundingClientRect();
      el.style.transform='translate('+((event.clientX-rect.left-rect.width/2)*.12)+'px,'+((event.clientY-rect.top-rect.height/2)*.12)+'px)';
    });
    el.addEventListener('pointerleave',()=>el.style.transform='');
  });
  document.querySelector('#project-list').addEventListener('pointermove',event=>{
    const row=event.target.closest('.project');if(!row)return;
    const rect=row.getBoundingClientRect();
    row.style.setProperty('--row-x',(event.clientX-rect.left)+'px');row.style.setProperty('--row-y',(event.clientY-rect.top)+'px');
  });
})();

