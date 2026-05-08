(function(){
'use strict';
const{Engine,World,Bodies,Body,Events,Composite,Query}=Matter;
const RE=window.RulesEngine;

const state={tool:'ball',running:false,scale:'pentatonic',muted:false,
  drawing:false,drawStart:null,drawCurrent:null,circleIdCounter:0,
  dragBody:null,dragCircleId:null,dragOffset:null,dragOldPos:null,erasing:false,
  songSequence:null,songIndex:0};

const SCALES={
  pentatonic:['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5'],
  major:['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5'],
  blues:['C4','Eb4','F4','Gb4','G4','Bb4','C5','Eb5','F5','G5'],
  minor:['C4','D4','Eb4','F4','G4','Ab4','Bb4','C5','D5','Eb5'],
  japanese:['C4','Db4','F4','G4','Ab4','C5','Db5','F5','G5','Ab5']};
const SCALE_LABELS={pentatonic:'Penta',major:'Major',blues:'Blues',minor:'Minor',japanese:'Japan'};

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const app=document.getElementById('app');
const engine=Engine.create({gravity:{x:0,y:1.2}, positionIterations:8, velocityIterations:8});
const world=engine.world;
let walls=[];
let synth=null,audioReady=false,lastNoteTime=0;
const particles=[];
const circleGroups={};
const userBodies=[];

// ─── UNDO/REDO ───
const undoStack=[],redoStack=[];
function arrayRemove(a,b){const i=a.indexOf(b);if(i>=0)a.splice(i,1);}
function record(cmd){undoStack.push(cmd);redoStack.length=0;updateUR();}
function undo(){const c=undoStack.pop();if(c){c.undo();redoStack.push(c);}updateUR();}
function redo(){const c=redoStack.pop();if(c){c.redo();undoStack.push(c);}updateUR();}
function updateUR(){
  document.getElementById('btn-undo').disabled=!undoStack.length;
  document.getElementById('btn-redo').disabled=!redoStack.length;
}

// ─── INIT ───
function init(){
  resizeCanvas();
  window.addEventListener('resize',resizeCanvas);
  createWalls();bindUI();bindCanvas();
  renderRulesList();
  requestAnimationFrame(gameLoop);
}
function resizeCanvas(){
  const w=app.clientWidth,h=app.clientHeight-120;
  canvas.width=w*devicePixelRatio;canvas.height=h*devicePixelRatio;
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  createWalls();
}
function createWalls(){
  walls.forEach(w=>World.remove(world,w));
  const W=cW(),H=cH(),t=40;
  walls=[
    Bodies.rectangle(-t/2,H/2,t,H*2+t*2,{isStatic:true,customType:'wall'}),
    Bodies.rectangle(W+t/2,H/2,t,H*2+t*2,{isStatic:true,customType:'wall'})];
  World.add(world,walls);
}
function cW(){return canvas.width/devicePixelRatio;}
function cH(){return canvas.height/devicePixelRatio;}

// ─── AUDIO ───
async function initAudio(){
  if(audioReady)return;
  try{await Tone.start();
    synth=new Tone.PolySynth(Tone.Synth,{maxPolyphony:10,voice:Tone.Synth,
      options:{oscillator:{type:'triangle8'},envelope:{attack:0.005,decay:0.18,sustain:0.01,release:0.4}}});
    const rev=new Tone.Reverb({decay:1.5,wet:0.3}).toDestination();
    synth.connect(rev);audioReady=true;
  }catch(e){console.warn(e);}
}
function playNote(y,velocity,ball){
  if(!audioReady||state.muted||!synth)return;
  const now=performance.now();if(now-lastNoteTime<30)return;lastNoteTime=now;
  const vol=Math.max(-28,Math.min(-6,-24+velocity*1.8));
  synth.volume.value=vol;

  if(state.songSequence && state.songSequence.length > 0){
    const note = state.songSequence[state.songIndex % state.songSequence.length];
    try{synth.triggerAttackRelease(note.name, "16n", Tone.now());}catch(_){}
    state.songIndex++;
    return;
  }

  const scale=SCALES[state.scale];
  const shift=ball&&ball._noteShift?ball._noteShift:0;
  const norm=1-Math.min(1,Math.max(0,y/cH()));
  let idx=Math.min(scale.length-1,Math.max(0,Math.floor(norm*scale.length)+shift));
  idx=Math.max(0,Math.min(scale.length-1,idx));
  try{synth.triggerAttackRelease(scale[idx],'16n');}catch(_){}
}

// ─── PARTICLES ───
function emitParticles(x,y,hue){
  const n=8+Math.floor(Math.random()*6);
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*3;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:1.5+Math.random()*2,hue,alpha:1,life:0.35+Math.random()*0.2,age:0});}
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;
    if(p.age>=p.life){particles.splice(i,1);continue;}
    p.x+=p.vx;p.y+=p.vy;p.vx*=0.96;p.vy*=0.96;p.alpha=1-p.age/p.life;p.r*=0.98;}
}
function renderParticles(){
  ctx.globalCompositeOperation='lighter';
  for(const p of particles){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`hsla(${p.hue},100%,65%,${p.alpha})`;ctx.fill();}
  ctx.globalCompositeOperation='source-over';
}

// ─── SHAPES ───
function addBody(body){World.add(world,body);userBodies.push(body);}
function removeBody(body){World.remove(world,body);arrayRemove(userBodies,body);}

function createLine(x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);if(len<10)return;
  const a=Math.atan2(dy,dx),cx=(x1+x2)/2,cy=(y1+y2)/2;
  const b=Bodies.rectangle(cx,cy,len,8,{isStatic:true,angle:a,friction:0.4,restitution:0.5,customType:'line'});
  addBody(b);record({undo(){removeBody(b);},redo(){addBody(b);}});
}
function createRectangle(x1,y1,x2,y2){
  const w=Math.abs(x2-x1),h=Math.abs(y2-y1);if(w<10||h<10)return;
  const b=Bodies.rectangle((x1+x2)/2,(y1+y2)/2,w,h,{isStatic:true,friction:0.4,restitution:0.5,customType:'rectangle'});
  addBody(b);record({undo(){removeBody(b);},redo(){addBody(b);}});
}
function createTriangle(x1,y1,x2,y2){
  const l=Math.min(x1,x2),r=Math.max(x1,x2),t=Math.min(y1,y2),bo=Math.max(y1,y2);
  if(r-l<15||bo-t<15)return;
  const cx=(l+r)/2,cy=(t+bo)/2;
  const v=[{x:l-cx,y:bo-cy},{x:r-cx,y:bo-cy},{x:cx-cx,y:t-cy}];
  const b=Bodies.fromVertices(cx,cy,v,{isStatic:true,friction:0.4,restitution:0.5,customType:'triangle'});
  if(b){addBody(b);record({undo(){removeBody(b);},redo(){addBody(b);}});}
}
function createHollowCircle(cx,cy,radius){
  if(radius<12)return;
  const id=++state.circleIdCounter;
  const n=Math.max(32,Math.round(radius*0.6));
  const segs=[];
  const ro=radius+5;
  const ri=radius-5;
  for(let i=0;i<n;i++){
    const a1=(2*Math.PI*i)/n;
    const a2=(2*Math.PI*(i+1))/n;
    const v = [
      {x: ro*Math.cos(a1), y: ro*Math.sin(a1)},
      {x: ro*Math.cos(a2), y: ro*Math.sin(a2)},
      {x: ri*Math.cos(a2), y: ri*Math.sin(a2)},
      {x: ri*Math.cos(a1), y: ri*Math.sin(a1)}
    ];
    const center = Matter.Vertices.centre(v);
    const localVerts = v.map(p => ({ x: p.x - center.x, y: p.y - center.y }));
    const b = Matter.Body.create({
      position: { x: cx + center.x, y: cy + center.y },
      vertices: localVerts,
      isStatic: true,
      friction: 0.3,
      restitution: 0.6,
      customType: 'circle-segment',
      parentId: id
    });
    segs.push(b);
  }
  
  // Create visual polybool shape
  const outer=[], inner=[];
  const visualN = 64; 
  for(let i=0; i<visualN; i++){
     const a = (2*Math.PI*i)/visualN;
     outer.push([ro*Math.cos(a), ro*Math.sin(a)]);
     inner.push([ri*Math.cos(a), ri*Math.sin(a)]);
  }
  const pbOuter = { regions: [outer], inverted: false };
  const pbInner = { regions: [inner], inverted: false };
  const poly = window.PolyBool.difference(pbOuter, pbInner);

  circleGroups[id]={cx,cy,r:radius,bodies:segs, poly};
  World.add(world,segs);segs.forEach(s=>userBodies.push(s));
  record({undo(){segs.forEach(s=>removeBody(s));delete circleGroups[id];},
    redo(){World.add(world,segs);segs.forEach(s=>userBodies.push(s));circleGroups[id]={cx,cy,r:radius,bodies:segs,poly};}});
}

function spawnBall(x,y){
  const r=6+Math.random()*4,hue=Math.random()*360;
  const b=Bodies.circle(x,y,r,{restitution:0.65,friction:0.02,density:0.002,customType:'ball',ballHue:hue});
  b.spawnPos = {x,y};
  addBody(b);record({undo(){removeBody(b);},redo(){addBody(b);}});
  const rctx=ruleCtx();RE.evalSpawn(b,rctx);
}
function spawnBallAt(x,y,r,hue){
  const b=Bodies.circle(x,y,r,{restitution:0.65,friction:0.02,density:0.002,customType:'ball',ballHue:hue});
  b.spawnPos = {x,y};
  addBody(b);
}

function eraseAt(x,y){
  const found=Query.point(Composite.allBodies(world),{x,y});
  for(const b of found){
    if(b.customType==='wall')continue;
    if(b.customType==='circle-segment'){
      const gid=b.parentId,grp=circleGroups[gid];
      if(grp){const segs=[...grp.bodies];const cx=grp.cx,cy=grp.cy,r=grp.r;
        segs.forEach(s=>removeBody(s));delete circleGroups[gid];
        record({undo(){World.add(world,segs);segs.forEach(s=>userBodies.push(s));circleGroups[gid]={cx,cy,r,bodies:segs};},
          redo(){segs.forEach(s=>removeBody(s));delete circleGroups[gid];}});}
    }else{const saved=b;removeBody(saved);
      record({undo(){addBody(saved);},redo(){removeBody(saved);}});}
  }
}

// ─── DRAG ───
function findBodyAt(x,y){
  const h=Query.point(Composite.allBodies(world),{x,y});
  for(const b of h){if(b.customType!=='wall')return b;}return null;
}
function dragStart(x,y){
  const b=findBodyAt(x,y);if(!b)return;
  if(b.customType==='circle-segment'){
    const g=circleGroups[b.parentId];
    if(g){state.dragCircleId=b.parentId;state.dragOffset={x:x-g.cx,y:y-g.cy};
      state.dragOldPos={cx:g.cx,cy:g.cy};}
  }else{state.dragBody=b;state.dragOffset={x:x-b.position.x,y:y-b.position.y};
    state.dragOldPos={x:b.position.x,y:b.position.y};}
}
function dragMove(x,y){
  if(state.dragCircleId!=null){const g=circleGroups[state.dragCircleId];if(!g)return;
    const nx=x-state.dragOffset.x,ny=y-state.dragOffset.y,dx=nx-g.cx,dy=ny-g.cy;
    g.bodies.forEach(s=>Body.setPosition(s,{x:s.position.x+dx,y:s.position.y+dy}));
    g.cx=nx;g.cy=ny;
  }else if(state.dragBody){Body.setPosition(state.dragBody,{x:x-state.dragOffset.x,y:y-state.dragOffset.y});}
}
function dragEnd(){
  if(state.dragCircleId!=null){
    const gid=state.dragCircleId,g=circleGroups[gid],old=state.dragOldPos;
    if(g){const newP={cx:g.cx,cy:g.cy};
      record({undo(){const dx=old.cx-g.cx,dy=old.cy-g.cy;g.bodies.forEach(s=>Body.setPosition(s,{x:s.position.x+dx,y:s.position.y+dy}));g.cx=old.cx;g.cy=old.cy;},
        redo(){const dx=newP.cx-g.cx,dy=newP.cy-g.cy;g.bodies.forEach(s=>Body.setPosition(s,{x:s.position.x+dx,y:s.position.y+dy}));g.cx=newP.cx;g.cy=newP.cy;}});}
  }else if(state.dragBody){
    const b=state.dragBody,old=state.dragOldPos,np={x:b.position.x,y:b.position.y};
    record({undo(){Body.setPosition(b,old);},redo(){Body.setPosition(b,np);}});
  }
  state.dragBody=null;state.dragCircleId=null;state.dragOffset=null;state.dragOldPos=null;
}

// ─── RUBBER (PARTIAL ERASE) ───
let lastRubberTime = 0;
function rubberAt(x, y) {
  if (!window.PolyBool) return;
  const now = performance.now();
  if (now - lastRubberTime < 40) return; 
  lastRubberTime = now;

  const r = 20; 
  const eraserVerts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    eraserVerts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  const eraserPoly = { regions: [eraserVerts], inverted: false };

  const bounds = { min: { x: x - r, y: y - r }, max: { x: x + r, y: y + r } };
  const hits = Query.region(Composite.allBodies(world), bounds);

  let erasedSomething = false;
  const toRemove = [];
  const toAdd = [];

  const oldPolys = {};
  for (const b of hits) {
    if (b.customType === 'circle-segment' && circleGroups[b.parentId]) {
      const g = circleGroups[b.parentId];
      if (!g.erasedThisFrame) {
        g.erasedThisFrame = true;
        oldPolys[b.parentId] = g.poly;
        const localEraserVerts = eraserVerts.map(pt => {
           const dx = pt[0] - g.cx, dy = pt[1] - g.cy;
           const angle = -(g.angle || 0);
           return [
              dx * Math.cos(angle) - dy * Math.sin(angle),
              dx * Math.sin(angle) + dy * Math.cos(angle)
           ];
        });
        const localEraserPoly = { regions: [localEraserVerts], inverted: false };
        g.poly = window.PolyBool.difference(g.poly, localEraserPoly);
      }
    }
  }
  const newPolys = {};
  for (const gid in oldPolys) {
     newPolys[gid] = circleGroups[gid].poly;
     circleGroups[gid].erasedThisFrame = false;
  }

  for (const b of hits) {
    if (b.customType === 'circle-segment') {
      const gid = b.parentId;
      if (circleGroups[gid]) {
        const idx = circleGroups[gid].bodies.indexOf(b);
        if (idx >= 0) circleGroups[gid].bodies.splice(idx, 1);
      }
    }

    const parts = b.parts.length > 1 ? b.parts.slice(1) : [b];
    const bodyRegions = parts.map(part => part.vertices.map(v => [v.x, v.y]));
    const shapePoly = { regions: bodyRegions, inverted: false };
    
    let result;
    try { result = PolyBool.difference(shapePoly, eraserPoly); } 
    catch (e) { continue; }

    toRemove.push(b);
    for (const reg of result.regions) {
      if (reg.length < 3) continue;
      const verts = reg.map(p => ({ x: p[0], y: p[1] }));
      const center = Matter.Vertices.centre(verts);
      const newB = Bodies.fromVertices(center.x, center.y, verts, {
        isStatic: true,
        friction: b.friction,
        restitution: b.restitution,
        customType: b.customType,
        parentId: b.parentId
      });
      if (newB) {
        toAdd.push(newB);
        if (b.customType === 'circle-segment' && b.parentId && circleGroups[b.parentId]) {
          circleGroups[b.parentId].bodies.push(newB);
        }
      }
    }
    erasedSomething = true;
  }

  if (erasedSomething) {
    toRemove.forEach(b => removeBody(b));
    toAdd.forEach(b => addBody(b));
    record({
      undo() { 
        toAdd.forEach(b => removeBody(b)); toRemove.forEach(b => addBody(b)); 
        for(const gid in oldPolys) if(circleGroups[gid]) circleGroups[gid].poly = oldPolys[gid];
      },
      redo() { 
        toRemove.forEach(b => removeBody(b)); toAdd.forEach(b => addBody(b)); 
        for(const gid in newPolys) if(circleGroups[gid]) circleGroups[gid].poly = newPolys[gid];
      }
    });
  }
}

// ─── RULES CONTEXT ───
function ruleCtx(){return{world,engine,userBodies,spawnBallAt,canvasW:cW,canvasH:cH};}

// ─── RENDERING ───
function render(){
  const W=cW(),H=cH();ctx.clearRect(0,0,W,H);
  const allB=Composite.allBodies(world);const drawn=new Set();
  for(const b of allB){
    if(b.customType==='wall')continue;
    if(b.customType==='ball'){
      const h=b.ballHue||0,r=b.circleRadius;
      ctx.save();ctx.shadowColor=`hsl(${h},100%,60%)`;ctx.shadowBlur=14;
      ctx.fillStyle=`hsl(${h},100%,60%)`;ctx.beginPath();ctx.arc(b.position.x,b.position.y,r,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.fillStyle=`hsl(${h},100%,80%)`;ctx.beginPath();ctx.arc(b.position.x,b.position.y,r*0.5,0,Math.PI*2);ctx.fill();
      continue;
    }
    if(b.customType==='circle-segment'){
      const gid=b.parentId;
      if(circleGroups[gid]){
        if(!drawn.has(gid)){
          drawn.add(gid);const g=circleGroups[gid];
          ctx.save(); ctx.translate(g.cx, g.cy); ctx.rotate(g.angle || 0);
          ctx.strokeStyle='#fff';ctx.lineWidth=2;
          ctx.beginPath();
          for(const reg of g.poly.regions) {
             if(reg.length===0)continue;
             ctx.moveTo(reg[0][0], reg[0][1]);
             for(let i=1; i<reg.length; i++) ctx.lineTo(reg[i][0], reg[i][1]);
             ctx.closePath();
          }
          ctx.stroke();
          ctx.restore();
        }
        continue;
      }
    }
    if(b.isStatic){
      ctx.strokeStyle='#fff';ctx.lineWidth=2;
      const parts=b.parts.length>1?b.parts.slice(1):[b];
      for(const part of parts){
        ctx.beginPath();const v=part.vertices;
        ctx.moveTo(v[0].x,v[0].y);
        for(let i=1;i<v.length;i++)ctx.lineTo(v[i].x,v[i].y);
        ctx.closePath();ctx.stroke();
      }
    }
  }
  renderParticles();
  if(state.drawing&&state.drawStart&&state.drawCurrent)renderPreview();
}
function renderPreview(){
  const s=state.drawStart,c=state.drawCurrent;
  ctx.setLineDash([6,4]);ctx.strokeStyle='rgba(0,255,170,0.5)';ctx.lineWidth=2;
  if(state.tool==='line'){ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(c.x,c.y);ctx.stroke();}
  else if(state.tool==='rectangle'){ctx.strokeRect(Math.min(s.x,c.x),Math.min(s.y,c.y),Math.abs(c.x-s.x),Math.abs(c.y-s.y));}
  else if(state.tool==='triangle'){const l=Math.min(s.x,c.x),r=Math.max(s.x,c.x),t=Math.min(s.y,c.y),b=Math.max(s.y,c.y);
    ctx.beginPath();ctx.moveTo(l,b);ctx.lineTo(r,b);ctx.lineTo((l+r)/2,t);ctx.closePath();ctx.stroke();}
  else if(state.tool==='circle'){const dx=c.x-s.x,dy=c.y-s.y;ctx.beginPath();ctx.arc(s.x,s.y,Math.sqrt(dx*dx+dy*dy),0,Math.PI*2);ctx.stroke();}
  ctx.setLineDash([]);
}

// ─── COLLISION ───
Events.on(engine,'collisionStart',function(ev){
  const rc=ruleCtx();
  for(const pair of ev.pairs){
    let ball=null,other=null;
    if(pair.bodyA.customType==='ball'&&pair.bodyB.isStatic){ball=pair.bodyA;other=pair.bodyB;}
    else if(pair.bodyB.customType==='ball'&&pair.bodyA.isStatic){ball=pair.bodyB;other=pair.bodyA;}
    if(!ball||!other||other.customType==='wall')continue;
    const cp=pair.collision.supports&&pair.collision.supports[0]?{x:pair.collision.supports[0].x,y:pair.collision.supports[0].y}:{x:ball.position.x,y:ball.position.y};
    emitParticles(cp.x,cp.y,ball.ballHue);
    ball.ballHue=(ball.ballHue+32)%360;
    const vel=Math.sqrt(ball.velocity.x**2+ball.velocity.y**2);
    playNote(cp.y,vel,ball);
    // Determine shape type for rules
    let shapeType=other.customType;
    let target=other;
    if(shapeType==='circle-segment'){
      shapeType='circle';
      target=circleGroups[other.parentId];
    }
    RE.evalCollision(ball,target,shapeType,rc);
  }
});

// ─── CANVAS INPUT ───
function getPos(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function bindCanvas(){
  canvas.addEventListener('pointerdown',onDown,{passive:false});
  canvas.addEventListener('pointermove',onMove,{passive:false});
  canvas.addEventListener('pointerup',onUp,{passive:false});
  canvas.addEventListener('pointercancel',onUp,{passive:false});
}
function onDown(e){e.preventDefault();const p=getPos(e);
  if(state.tool==='ball'){spawnBall(p.x,p.y);return;}
  if(state.tool==='eraser'){eraseAt(p.x,p.y);state.erasing=true;return;}
  if(state.tool==='rubber'){rubberAt(p.x,p.y);state.erasing=true;return;}
  if(state.tool==='drag'){dragStart(p.x,p.y);return;}
  state.drawing=true;state.drawStart=p;state.drawCurrent=p;
}
function onMove(e){e.preventDefault();const p=getPos(e);
  if(state.tool==='drag'&&(state.dragBody||state.dragCircleId!=null)){dragMove(p.x,p.y);return;}
  if(state.tool==='eraser'&&state.erasing){eraseAt(p.x,p.y);return;}
  if(state.tool==='rubber'&&state.erasing){rubberAt(p.x,p.y);return;}
  if(state.drawing)state.drawCurrent=p;
}
function onUp(e){e.preventDefault();
  if(state.tool==='drag'){dragEnd();return;}
  if(state.tool==='eraser'||state.tool==='rubber'){state.erasing=false;return;}
  if(!state.drawing)return;
  const s=state.drawStart,c=getPos(e);state.drawing=false;
  if(state.tool==='line')createLine(s.x,s.y,c.x,c.y);
  else if(state.tool==='rectangle')createRectangle(s.x,s.y,c.x,c.y);
  else if(state.tool==='triangle')createTriangle(s.x,s.y,c.x,c.y);
  else if(state.tool==='circle'){const dx=c.x-s.x,dy=c.y-s.y;createHollowCircle(s.x,s.y,Math.sqrt(dx*dx+dy*dy));}
  state.drawStart=null;state.drawCurrent=null;
}

// ─── TOAST ───
let toastTimer;
function showToast(msg,isError){
  const t=document.getElementById('toast');t.textContent=msg;
  t.className=isError?'error':'';clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.add('hidden'),2500);
}

// ─── RULES UI ───
function renderRulesList(){
  const list=document.getElementById('rules-list');list.innerHTML='';
  RE.getAll().forEach(r=>{
    const div=document.createElement('div');div.className='rule-item'+(r.enabled?'':' disabled');
    div.innerHTML=`<input type="checkbox" class="rule-toggle" ${r.enabled?'checked':''}><span class="rule-text">${r.text}</span><button class="rule-delete">✕</button>`;
    div.querySelector('.rule-toggle').onchange=()=>{RE.toggle(r.id);renderRulesList();};
    div.querySelector('.rule-delete').onclick=()=>{RE.remove(r.id);renderRulesList();};
    list.appendChild(div);
  });
}
function addRuleFromInput(){
  const inp=document.getElementById('rule-input');
  const err=document.getElementById('rule-error');
  const text=inp.value.trim();if(!text)return;
  const r=RE.add(text);
  if(!r){err.textContent='⚠ Could not parse rule. Try: "when ball hits [shape] it [action]"';err.classList.remove('hidden');return;}
  err.classList.add('hidden');inp.value='';renderRulesList();
  showToast('✓ Rule added');
}

// ─── UI BINDINGS ───
function bindUI(){
  document.getElementById('audio-overlay').addEventListener('click',async()=>{
    await initAudio();document.getElementById('audio-overlay').classList.add('hidden');});
  document.querySelectorAll('.tool-btn').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.tool-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');state.tool=b.dataset.tool;}));
  const bs=document.getElementById('btn-start');
  bs.addEventListener('click',()=>{state.running=!state.running;
    document.getElementById('lbl-start').textContent=state.running?'STOP':'START';
    document.getElementById('icon-play').style.display=state.running?'none':'block';
    document.getElementById('icon-pause').style.display=state.running?'block':'none';
    bs.classList.toggle('running',state.running);});
  document.getElementById('btn-clear').addEventListener('click',()=>{
    [...userBodies].forEach(b=>World.remove(world,b));userBodies.length=0;
    for(const id in circleGroups)delete circleGroups[id];
    particles.length=0;undoStack.length=0;redoStack.length=0;updateUR();
    state.running=false;document.getElementById('lbl-start').textContent='START';
    document.getElementById('icon-play').style.display='block';
    document.getElementById('icon-pause').style.display='none';
    document.getElementById('btn-start').classList.remove('running');});
  const popup=document.getElementById('scale-popup');
  document.getElementById('btn-scale').addEventListener('click',e=>{e.stopPropagation();popup.classList.toggle('hidden');});
  
  // MIDI
  const btnMidi = document.getElementById('btn-midi');
  const midiUpload = document.getElementById('midi-upload');
  if(btnMidi && midiUpload) {
    btnMidi.addEventListener('click', () => midiUpload.click());
    midiUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const midi = new window.Midi(evt.target.result);
          let bestTrack = null, maxNotes = 0;
          midi.tracks.forEach(t => {
            if(t.notes.length > maxNotes) { maxNotes = t.notes.length; bestTrack = t; }
          });
          if(bestTrack && maxNotes > 0) {
            state.songSequence = bestTrack.notes;
            state.songIndex = 0;
            showToast(`Loaded MIDI: ${maxNotes} notes`);
            btnMidi.classList.add('active'); // highlight
          } else {
            showToast('No notes found in MIDI', true);
          }
        } catch(err) {
          console.error(err);
          showToast('Error parsing MIDI file', true);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
  document.addEventListener('click',()=>popup.classList.add('hidden'));
  popup.addEventListener('click',e=>e.stopPropagation());
  document.querySelectorAll('.scale-opt').forEach(o=>o.addEventListener('click',()=>{
    document.querySelectorAll('.scale-opt').forEach(x=>x.classList.remove('active'));
    o.classList.add('active');state.scale=o.dataset.scale;
    document.getElementById('lbl-scale').textContent=SCALE_LABELS[state.scale];popup.classList.add('hidden');}));
  document.getElementById('btn-mute').addEventListener('click',()=>{state.muted=!state.muted;
    document.getElementById('icon-unmuted').style.display=state.muted?'none':'block';
    document.getElementById('icon-muted').style.display=state.muted?'block':'none';});
  // Undo/Redo
  document.getElementById('btn-undo').addEventListener('click',undo);
  document.getElementById('btn-redo').addEventListener('click',redo);
  // Rules panel
  const rp=document.getElementById('rules-panel');
  document.getElementById('btn-rules').addEventListener('click',()=>rp.classList.toggle('hidden'));
  document.getElementById('rules-close').addEventListener('click',()=>rp.classList.add('hidden'));
  document.getElementById('btn-add-rule').addEventListener('click',addRuleFromInput);
  document.getElementById('rule-input').addEventListener('keydown',e=>{if(e.key==='Enter')addRuleFromInput();});
  document.querySelectorAll('.preset-btn').forEach(b=>b.addEventListener('click',()=>{
    const r=RE.add(b.dataset.rule);
    if(r){renderRulesList();showToast('✓ Rule added');}
  }));
}

// ─── GAME LOOP ───
let lastTime=0;
function gameLoop(ts){
  const dt=Math.min((ts-lastTime)/1000,0.05);lastTime=ts;
  if(state.running){
    Engine.update(engine,dt*1000);
    
    // Process spinning bodies & clamp velocity
    for(const b of userBodies){
      if(b.customType === 'ball') {
        const speed = Math.sqrt(b.velocity.x**2 + b.velocity.y**2);
        if(speed > 25) {
          const r = 25 / speed;
          Body.setVelocity(b, {x: b.velocity.x * r, y: b.velocity.y * r});
        }
      }
      if(b.spinSpeed) {
        Body.rotate(b, b.spinSpeed);
        Body.setAngularVelocity(b, b.spinSpeed);
      }
    }
    for(const id in circleGroups){
      const g = circleGroups[id];
      if(g.spinSpeed){
        g.angle = (g.angle || 0) + g.spinSpeed;
        g.bodies.forEach(s => {
          Body.rotate(s, g.spinSpeed, {x: g.cx, y: g.cy});
          Body.setAngularVelocity(s, g.spinSpeed);
        });
      }
    }

    // Offscreen check for rules
    if(RE.hasOffscreenRules()){
      const H=cH(),rc=ruleCtx();
      const balls=[...userBodies].filter(b=>b.customType==='ball');
      for(const b of balls){if(b.position.y>H+50||b.position.x<-50||b.position.x>cW()+50)RE.evalOffscreen(b,rc);}
    }
  }
  updateParticles(dt);render();requestAnimationFrame(gameLoop);
}

init();
})();
