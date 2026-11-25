// Maze Quest: renderer-only Multiple Choice module. Host owns checking and feedback.
function buildWorld(seed){
 const size=21,start={x:11,y:11},gates=[{x:1,y:1},{x:19,y:1},{x:1,y:19},{x:19,y:19}];
 let state=seed>>>0;
 const random=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%n;};
 const shuffle=items=>{for(let i=items.length-1;i>0;i--){const j=random(i+1);const t=items[i];items[i]=items[j];items[j]=t;}return items;};
 const grid=Array.from({length:size},()=>Array(size).fill('#'));
 const steps=[[1,0],[-1,0],[0,1],[0,-1]],key=(x,y)=>x+','+y,stack=[start];
 grid[start.y][start.x]='.';
 while(stack.length){
  const c=stack[stack.length-1];
  const choices=shuffle(steps.slice()).map(([dx,dy])=>({x:c.x+2*dx,y:c.y+2*dy,dx,dy})).filter(n=>n.x>0&&n.x<size-1&&n.y>0&&n.y<size-1&&grid[n.y][n.x]==='#');
  if(!choices.length){stack.pop();continue;}
  const n=choices[0];grid[c.y+n.dy][c.x+n.dx]='.';grid[n.y][n.x]='.';stack.push({x:n.x,y:n.y});
 }
 const loops=[];
 for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
  if(grid[y][x]!=='#')continue;
  if((x%2===0&&y%2===1&&grid[y][x-1]==='.'&&grid[y][x+1]==='.')||(y%2===0&&x%2===1&&grid[y-1][x]==='.'&&grid[y+1][x]==='.'))loops.push({x,y});
 }
 for(const c of shuffle(loops).slice(0,6))grid[c.y][c.x]='.';
 grid[start.y][start.x]='S';for(const c of gates)grid[c.y][c.x]='G';
 // Every gate remains reachable through the generated corridors.
 return {size,grid,start,gates};
}
const pageSize=4;
let cameraCols=9,cameraRows=9;
const compass=["NW","NE","SW","SE"];
const get=id=>document.querySelector('#'+id);
const ui={game:get('game-screen'),probe:get('viewport-probe'),field:get('maze-field'),board:get('board'),hero:get('hero'),options:get('options'),question:get('question'),progress:get('progress'),status:get('status'),play:get('play-area'),page:get('page-info'),modal:get('question-modal'),info:get('info'),close:get('close-question'),resume:get('resume'),confirm:get('confirm'),previous:get('previous'),next:get('next'),reset:get('reset'),exit:get('exit'),map:get('map'),mapModal:get('map-modal'),mapView:get('map-view'),mapClose:get('close-map'),mapResume:get('map-resume'),newMaze:get('new-maze')};
const directions=[
 {button:get('up'),dx:0,dy:-1,keys:['arrowup','w']},
 {button:get('down'),dx:0,dy:1,keys:['arrowdown','s']},
 {button:get('left'),dx:-1,dy:0,keys:['arrowleft','a']},
 {button:get('right'),dx:1,dy:0,keys:['arrowright','d']}
];
const tiles=[],optionRows=[];
let sdk=null,item=null,options=[],world=null,page=0,position=null,moves=0;
let explored=new Set(),phase='loading',overlay='';
let targetId=null,targetDistances=new Map();
let held=null,frame=null,frameCount=0;
const keyOf=(x,y)=>x+','+y;
const activeOptions=()=>options.slice(page*pageSize,(page+1)*pageSize);
function atGate(x,y){return world.gates.findIndex(g=>g.x===x&&g.y===y);}
function currentOption(){return activeOptions()[atGate(position.x,position.y)]||null;}
function gateNumber(i){return page*pageSize+i+1;}
function targetIndex(){return activeOptions().findIndex(option=>option.id===targetId);}
function targetGate(){return world.gates[targetIndex()]||null;}
// Navigation distance only; never read an answer key or judge correctness.
function distanceField(grid,goal){
 const key=(x,y)=>x+','+y,distances=new Map([[key(goal.x,goal.y),0]]),queue=[goal];
 for(let i=0;i<queue.length;i++){
  const c=queue[i],distance=distances.get(key(c.x,c.y));
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=c.x+dx,y=c.y+dy,k=key(x,y);
   if(!grid[y]?.[x]||grid[y][x]==='#'||distances.has(k))continue;
   distances.set(k,distance+1);queue.push({x,y});
  }
 }
 return distances;
}
function refreshTarget(){
 targetDistances=new Map();const gate=targetGate();if(!gate)return;
 targetDistances=distanceField(world.grid,gate);
}
function bearing(gate){
 const dy=gate.y-position.y,dx=gate.x-position.x;
 return (dy<0?'N':dy>0?'S':'')+(dx<0?'W':dx>0?'E':'')||'HERE';
}
function shortChoice(text){return text.length>32?text.slice(0,29)+'...':text;}
function navigationMessage(){
 const choice=currentOption();if(choice)return 'Portal '+gateNumber(atGate(position.x,position.y))+': '+shortChoice(choice.text);
 const gate=targetGate();if(!gate)return 'Choose a target in Q&A, or explore freely.';
 const n=targetDistances.get(keyOf(position.x,position.y));
 return 'Target '+gateNumber(targetIndex())+' '+bearing(gate)+(n===undefined?' | Check map':' | '+n+' steps');
}
function trackOption(index){
 if(phase!=='playing'||overlay!=='question')return;
 const option=activeOptions()[index];if(!option)return;
 targetId=option.id;refreshTarget();closeOverlay();
}
function available(x,y){const c=world.grid[y]?.[x];return !!c&&c!=='#';}
function canMove(){return phase==='playing'&&!overlay;}
function announce(message){if(ui.status.textContent!==message)ui.status.textContent=message;}
function updateText(el,value){if(el.textContent!==value)el.textContent=value;}
function updateClass(el,value){if(el.className!==value)el.className=value;}
function setDisabled(el,value){if(el.disabled!==value)el.disabled=value;}
// Arcade-only tile animation. A single bounded hazard moves through open
// visible corridors; no answer data, scoring or host navigation is involved.
const ARROW_TICK_MS=200,ARROW_PERIOD_TICKS=10,ARROW_WARNING_TICKS=2;
const arrowDirections=[{dx:1,dy:0,glyph:'→'},{dx:-1,dy:0,glyph:'←'},{dx:0,dy:1,glyph:'↓'},{dx:0,dy:-1,glyph:'↑'}];
function chooseArrow(grid,center,cols,rows,rng=Math.random){
 const hx=Math.floor(cols/2),hy=Math.floor(rows/2),candidates=[];
 const floor=(x,y)=>grid[y]?.[x]==='.';
 for(let y=Math.max(1,center.y-hy);y<=Math.min(grid.length-2,center.y+hy);y++){
  for(let x=Math.max(1,center.x-hx);x<=Math.min(grid[0].length-2,center.x+hx);x++){
   if(!floor(x,y)||(x===center.x&&y===center.y))continue;
   for(const d of arrowDirections){
    const cells=[];
    for(let step=0;step<5;step++){
     const nx=x+d.dx*step,ny=y+d.dy*step;
     if(!floor(nx,ny)||Math.abs(nx-center.x)>hx||Math.abs(ny-center.y)>hy)break;
     cells.push({x:nx,y:ny});
    }
    if(cells.length>=2)candidates.push({cells,glyph:d.glyph});
   }
  }
 }
 return candidates.length?candidates[Math.floor(rng()*candidates.length)]:null;
}
function createArrowHazard(){
 let tick=0,arrow=null,index=-1;
 function current(){
  if(!arrow)return null;
  const cell=arrow.cells[Math.max(index,0)];
  return {...cell,glyph:arrow.glyph,warning:index<0};
 }
 return {
  reset(){tick=0;arrow=null;index=-1;},
  current,
  hit(p){const a=current();return !!a&&!a.warning&&a.x===p.x&&a.y===p.y;},
  step(grid,center,cols,rows,rng=Math.random){
   tick=(tick+1)%ARROW_PERIOD_TICKS;
   if(tick===ARROW_PERIOD_TICKS-ARROW_WARNING_TICKS){arrow=chooseArrow(grid,center,cols,rows,rng);index=-1;}
   else if(arrow&&(tick===0||index>=0)){
    index++;
    if(index>=arrow.cells.length){arrow=null;index=-1;}
   }
   return current();
  }
 };
}
const arrows=createArrowHazard();
let hazardTimer=null,hazardFrame=null,hazardLast=null,hazardFrameCount=0,scopedHazardsFinished=false;
const nativeHazardTimer=typeof window.setInterval==='function'&&typeof window.clearInterval==='function';
function tickHazards(){
 if(!canMove()||document.hidden)return;
 arrows.step(world.grid,position,cameraCols,cameraRows);
 if(arrows.hit(position)){resetPlayer('Arrow hit. Back to START — 0 moves.');return;}
 paintMaze();
}
function scopedHazardFrame(stamp){
 hazardFrame=null;
 if(!canMove()||document.hidden)return;
 if(hazardLast===null)hazardLast=stamp;
 if(stamp-hazardLast>=ARROW_TICK_MS){hazardLast=stamp;tickHazards();}
 scheduleScopedHazards();
}
function scheduleScopedHazards(){
 if(hazardFrame!==null||!canMove()||document.hidden||scopedHazardsFinished)return;
 // The isolated online preview has a finite total animation-turn budget.
 // Do not consume its whole budget or interfere with movement / resize.
 if(hazardFrameCount>=1800){
  scopedHazardsFinished=true;arrows.reset();paintMaze();
  announce('Timed hazards paused for this limited preview. Keep exploring.');
  return;
 }
 if(typeof window.requestAnimationFrame==='function'){
  hazardFrameCount++;hazardFrame=window.requestAnimationFrame(scopedHazardFrame);
 }
}
function startHazards(){
 if(!canMove()||document.hidden)return;
 if(nativeHazardTimer){
  if(hazardTimer===null)hazardTimer=window.setInterval(tickHazards,ARROW_TICK_MS);
 }else scheduleScopedHazards();
}
function stopHazards(){
 if(hazardTimer!==null){window.clearInterval(hazardTimer);hazardTimer=null;}
 if(hazardFrame!==null){window.cancelAnimationFrame(hazardFrame);hazardFrame=null;}
 hazardLast=null;
}

function makeBoard(cols,rows){
 cameraCols=cols;cameraRows=rows;tiles.length=0;ui.board.replaceChildren();
 for(let y=0;y<rows;y++){
  const row=document.createElement('div');row.className='maze-row';
  row.style.height=(100/rows).toFixed(2)+'%';
  for(let x=0;x<cols;x++){
   const el=document.createElement('span');el.className='tile';el.setAttribute('aria-hidden','true');
   el.style.width=(100/cols).toFixed(2)+'%';
   const mark=document.createElement('span');mark.className='mark';el.append(mark);
   tiles.push({x,y,el,mark});row.append(el);
  }
  ui.board.append(row);
 }
 // Independent reusable character sprite; keep terrain underneath it.
 ui.board.append(ui.hero);
 const hx=Math.floor(cols/2),hy=Math.floor(rows/2);
 ui.hero.style.left=((hx+0.08)*100/cols).toFixed(2)+'%';
 ui.hero.style.top=((hy+0.06)*100/rows).toFixed(2)+'%';
 ui.hero.style.width=(84/cols).toFixed(2)+'%';
 ui.hero.style.height=(88/rows).toFixed(2)+'%';
}
function makeOptions(){
 for(let i=0;i<pageSize;i++){const el=document.createElement('button');el.className='option';el.setAttribute('type','button');el.addEventListener('click',()=>trackOption(i));optionRows.push(el);ui.options.append(el);}
}
// Observe only the independent viewport probe, not the board or a field whose
// height we may change. Defer all layout writes outside ResizeObserver delivery.
// Native hosts use CSS viewport height; the scoped player keeps its bounded fallback.
let nativeFull=null,gameHeight=0,boardWidth=0,boardHeight=0;
let resizeFrame=null,resizeObserver=null,lastWidth=0,lastHeight=0;
let watching=false;
function cameraShape(ratio){
 // Odd grids keep the hero centered and respect the 81-tile mirror budget.
 const shapes=[[3,19],[5,13],[7,11],[9,9],[11,7],[13,5],[19,3]];
 let best=shapes[0],error=Infinity;
 for(const shape of shapes){
  const difference=Math.abs(Math.log((shape[0]/shape[1])/ratio));
  if(difference<error){best=shape;error=difference;}
 }
 return best;
}
function viewportSize(){
 const w=ui.probe.clientWidth||ui.field.clientWidth;
 const h=ui.probe.clientHeight||ui.field.clientHeight;
 return {w,h};
}
function fitBoard(){
 const {w,h:viewport}=viewportSize();
 if(w<=0||viewport<=0)return;
 if(nativeFull===null){
  if(ui.game.clientHeight<=0)return;
  nativeFull=ui.game.clientHeight>=viewport*0.95;
 }
 // Avoid any explicit height write in the native browser. In the isolated
 // player only, preserve the existing reserved height for trusted host chrome.
 const h=nativeFull?viewport:Math.max(100,viewport-(w<=320?90:70));
 if(w===lastWidth&&viewport===lastHeight&&tiles.length)return;
 lastWidth=w;lastHeight=viewport;
 if(!nativeFull&&gameHeight!==h){gameHeight=h;ui.game.style.height=h+'px';}
 const [cols,rows]=cameraShape(w/h);
 const changed=!tiles.length||cameraCols!==cols||cameraRows!==rows;
 if(changed)makeBoard(cols,rows);
 const cell=Math.max(1,Math.ceil(Math.max(w/cols,h/rows)));
 const width=cell*cols,height=cell*rows;
 if(width!==boardWidth){boardWidth=width;ui.board.style.width=width+'px';}
 if(height!==boardHeight){boardHeight=height;ui.board.style.height=height+'px';}
 if(world&&changed){reveal();paintMaze();}
}
function scheduleFit(){
 if(!watching||resizeFrame!==null)return;
 const {w,h}=viewportSize();
 if(w===lastWidth&&h===lastHeight&&tiles.length)return;
 // rAF defers writes to the next frame; do not mutate observed geometry
 // from a ResizeObserver notification. The scoped runtime also supports rAF.
 if(typeof window.requestAnimationFrame==='function'){
  resizeFrame=window.requestAnimationFrame(()=>{resizeFrame=null;if(watching)fitBoard();});
 }else if(typeof window.setTimeout==='function'){
  resizeFrame=window.setTimeout(()=>{resizeFrame=null;if(watching)fitBoard();},16);
 }
}
function watchField(){
 if(watching)return;
 watching=true;
 fitBoard();
 if(typeof ResizeObserver==='function'){
  resizeObserver=new ResizeObserver(scheduleFit);
  resizeObserver.observe(ui.probe);
 }
 window.addEventListener('resize',scheduleFit);
}
function stopWatching(){
 watching=false;
 if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}
 if(resizeFrame!==null){
  if(typeof window.cancelAnimationFrame==='function')window.cancelAnimationFrame(resizeFrame);
  else if(typeof window.clearTimeout==='function')window.clearTimeout(resizeFrame);
  resizeFrame=null;
 }
 window.removeEventListener('resize',scheduleFit);
}
function reveal(){
 const hx=Math.floor(cameraCols/2),hy=Math.floor(cameraRows/2);
 for(let y=position.y-hy;y<=position.y+hy;y++)for(let x=position.x-hx;x<=position.x+hx;x++)
  if(x>=0&&y>=0&&x<world.size&&y<world.size)explored.add(keyOf(x,y));
}
function tileView(x,y,includePlayer=true){
 const kind=world.grid[y]?.[x];
 if(!kind)return ['void',''];
 if(includePlayer&&x===position.x&&y===position.y)return ['player','P'];
 if(kind==='#')return [world.grid[y+1]?.[x]==='#'?'stone':'wall',''];
 const index=atGate(x,y);
 if(index>=0&&index<activeOptions().length)return [index===targetIndex()?'target':'gate',String(gateNumber(index))];
 if(kind==='S')return ['start','S'];
 return ['floor',''];
}
function paintMaze(){
 const hx=Math.floor(cameraCols/2),hy=Math.floor(cameraRows/2),arrow=arrows.current();
 for(const tile of tiles){
  const x=position.x+tile.x-hx,y=position.y+tile.y-hy;
  const [name,label]=tileView(x,y,false);
  const here=arrow&&arrow.x===x&&arrow.y===y;
  updateClass(tile.el,'tile '+name+(here?(arrow.warning?' arrow-warning':' arrow-flight'):''));
  updateText(tile.mark,here?arrow.glyph:label);
 }
}
function paintOptions(){
 const active=activeOptions();
 for(let i=0;i<optionRows.length;i++){
  const row=optionRows[i],option=active[i],tracked=option&&option.id===targetId;
  row.hidden=!option;setDisabled(row,!option||phase!=='playing'||overlay!=='question');
  updateClass(row,tracked?'option selected':'option');
  updateText(row,option?(tracked?'Tracking ':'Gate ')+gateNumber(i)+' ['+compass[i]+'] '+option.text:'');
 }
 updateText(ui.page,'Track a destination | Gates '+(page*pageSize+1)+'-'+(page*pageSize+active.length)+' of '+options.length);
 ui.previous.hidden=options.length<=pageSize;ui.next.hidden=options.length<=pageSize;
 setDisabled(ui.previous,phase!=='playing'||overlay!=='question'||page===0);
 setDisabled(ui.next,phase!=='playing'||overlay!=='question'||(page+1)*pageSize>=options.length);
}
function paintMap(){
 if(overlay!=='map')return;
 const lines=[];
 for(let y=0;y<world.size;y++){
  const line=[];
  for(let x=0;x<world.size;x++){
   const gate=atGate(x,y);
   if(!explored.has(keyOf(x,y))){line.push(gate>=0&&gate<activeOptions().length?String(gateNumber(gate)).padEnd(2,' '):'? ');continue;}
   const [name,label]=tileView(x,y);line.push(label?label.padEnd(2,' '):name==='wall'||name==='stone'?'# ':'. ');
  }
  lines.push(line.join(''));
 }
 updateText(ui.mapView,lines.join('\n'));
}
function paintControls(){
 const ready=canMove(),choice=currentOption();
 for(const d of directions)setDisabled(d.button,!ready);
 setDisabled(ui.reset,!ready);setDisabled(ui.confirm,!ready||!choice);
 updateClass(ui.confirm,ready&&choice?'enter gate-ready':'enter');
 updateText(ui.confirm,choice?'Enter gate '+gateNumber(atGate(position.x,position.y)):'Reach a gate');
 setDisabled(ui.info,phase!=='playing'||!!overlay);setDisabled(ui.map,phase!=='playing'||!!overlay);
 setDisabled(ui.exit,phase==='submitting'||phase==='exiting'||phase==='exited'||!!overlay);
 updateText(ui.progress,'Moves '+moves+' | '+(targetIndex()>=0?'Target '+gateNumber(targetIndex()):'Gates '+(page*pageSize+1)+'-'+(page*pageSize+activeOptions().length)));
}
function draw(){paintMaze();paintOptions();paintControls();paintMap();}
function stopHold(){
 if(frame!==null){window.cancelAnimationFrame(frame);frame=null;}
 if(held){updateClass(held.direction.button,'direction');held=null;}
}
function resetPlayer(message,clearMap=false){
 stopHold();arrows.reset();position={...world.start};moves=0;
 if(clearMap)explored=new Set();
 reveal();draw();announce(message);
}
function nextWorld(){
 world=buildWorld(Math.floor(Math.random()*4294967296));refreshTarget();resetPlayer('New maze ready. Choose a gate in Q&A.',true);
}
function move(dx,dy){
 if(!canMove())return;
 const x=position.x+dx,y=position.y+dy;
 if(!available(x,y)){stopHold();announce('Wall ahead. Try another direction.');return;}
 position={x,y};moves++;reveal();
 if(arrows.hit(position)){resetPlayer('Arrow hit. Back to START — 0 moves.');return;}
 startHazards();
 if(currentOption())stopHold();
 draw();announce(navigationMessage());
}
function changePage(delta){
 if(phase!=='playing'||overlay!=='question')return;
 const target=page+delta;if(target<0||target*pageSize>=options.length)return;
 page=target;targetId=null;refreshTarget();draw();announce('New gates available. Your progress is preserved.');
}
function openOverlay(kind){
 if(!canMove())return;
 stopHold();stopHazards();overlay=kind;ui.modal.hidden=kind!=='question';ui.mapModal.hidden=kind!=='map';draw();
 (kind==='question'?ui.close:ui.mapClose).focus();
}
function closeOverlay(){
 if(!overlay)return;
 const previous=overlay;overlay='';ui.modal.hidden=true;ui.mapModal.hidden=true;draw();
 (previous==='question'?ui.info:ui.map).focus();announce(navigationMessage());startHazards();
}
function newMaze(){if(phase==='playing'&&overlay==='map'){nextWorld();closeOverlay();}}
function scheduleHold(){
 // Keep below the private guest lifetime limit. Ordinary taps remain available.
 if(!held||!canMove()||frameCount>=1200||typeof window.requestAnimationFrame!=='function')return;
 frameCount++;frame=window.requestAnimationFrame(holdFrame);
}
function holdFrame(stamp){
 frame=null;if(!held||!canMove())return;
 if(held.last===null)held.last=stamp;
 if(stamp-held.last>=155){const d=held.direction;d.skipClick=true;held.last=stamp;move(d.dx,d.dy);}
 if(held&&canMove())scheduleHold();
}
function startHold(d,event){
 if(!canMove())return;
 stopHold();d.skipClick=false;
 if(!Number.isSafeInteger(event.pointerId)||event.pointerId<0)return;
 // The trusted mirror can replace the native button during pointerdown.
 // Move on the real pointer event itself; do not depend on a later click.
 d.skipClick=true;held={direction:d,pointerId:event.pointerId,last:null};
 updateClass(d.button,'direction held');
 try{d.button.setPointerCapture(event.pointerId);}catch{}
 move(d.dx,d.dy);if(held)scheduleHold();
}
function releaseHold(event){if(held&&event.pointerId===held.pointerId)stopHold();}
function bindDirection(d){
 d.skipClick=false;
 d.button.addEventListener('pointerdown',event=>startHold(d,event));
 d.button.addEventListener('pointerup',releaseHold);
 d.button.addEventListener('pointercancel',releaseHold);
 d.button.addEventListener('lostpointercapture',releaseHold);
 d.button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')d.skipClick=false;});
 d.button.addEventListener('click',()=>{if(d.skipClick){d.skipClick=false;return;}move(d.dx,d.dy);});
}
async function submit(){
 if(!canMove())return;
 const selected=currentOption();if(!selected||!options.some(option=>option.id===selected.id))return;
 stopHold();stopHazards();arrows.reset();phase='submitting';draw();announce('Sending your selected gate...');
 try{
  const receipt=await sdk.submitAnswer({item_id:item.id,response:{value:selected.id}});
  if(receipt&&receipt.ok===false)throw new Error('Response not accepted');
  phase='submitted';announce(receipt&&receipt.status==='preview_only'?'Preview complete. No study progress changed.':'Continue in StudyVerse.');
 }catch{phase='uncertain';announce('Submission unconfirmed. Exit or restart preview; do not retry.');}
 finally{draw();}
}
async function leave(){
 if(!sdk||phase==='submitting'||phase==='exiting'||phase==='exited'||overlay)return;
 const previous=phase;stopHold();stopHazards();arrows.reset();phase='exiting';ui.exit.disabled=true;
 if(world)draw();announce('Returning to Standard...');
 try{await sdk.exitToStandard();phase='exited';announce('Exited to Standard.');}
 catch{phase=previous;ui.exit.disabled=false;if(world)draw();announce('Use the StudyVerse host controls to exit.');startHazards();}
}
function normalizeItem(raw){
 if(!raw||raw.item_type!=='multiple_choice'||typeof raw.id!=='string'||!raw.id.trim()||!raw.content||typeof raw.content.question!=='string'||!raw.content.question.trim())return null;
 const choices=raw.content.options;if(!Array.isArray(choices)||choices.length<2||choices.length>30)return null;
 const ids=new Set();for(const choice of choices){if(!choice||typeof choice.id!=='string'||!choice.id.trim()||choice.id.length>80||typeof choice.text!=='string'||!choice.text.trim()||ids.has(choice.id))return null;ids.add(choice.id);}
 return {id:raw.id,question:raw.content.question,options:choices.map(choice=>({id:choice.id,text:choice.text}))};
}
function bindControls(){
 ui.exit.addEventListener('click',leave);ui.info.addEventListener('click',()=>openOverlay('question'));ui.map.addEventListener('click',()=>openOverlay('map'));
 for(const b of [ui.close,ui.resume,ui.mapClose,ui.mapResume])b.addEventListener('click',closeOverlay);
 ui.newMaze.addEventListener('click',newMaze);ui.confirm.addEventListener('click',submit);
 ui.reset.addEventListener('click',()=>{if(canMove())resetPlayer('Back to START. Explored map preserved.');});
 ui.previous.addEventListener('click',()=>changePage(-1));ui.next.addEventListener('click',()=>changePage(1));
 for(const d of directions)bindDirection(d);
 document.addEventListener('keydown',event=>{
  if(overlay){
   if(event.key==='Escape'){event.preventDefault();closeOverlay();return;}
   if(event.key==='Tab'){
    const controls=(overlay==='question'?[ui.close,...optionRows,ui.previous,ui.next,ui.resume]:[ui.mapClose,ui.newMaze,ui.mapResume]).filter(node=>!node.hidden&&!node.disabled);
    if(controls.length){
     const first=controls[0],last=controls[controls.length-1],active=document.activeElement;
     if(event.shiftKey&&active===first){event.preventDefault();last.focus();}
     else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
    }
   }
   return;
  }
  if(!canMove()||event.altKey||event.ctrlKey||event.metaKey)return;
  const key=event.key.toLowerCase();
  if(key==='i'){event.preventDefault();openOverlay('question');return;}
  if(key==='m'){event.preventDefault();openOverlay('map');return;}
  const d=directions.find(d=>d.keys.includes(key));if(d){event.preventDefault();stopHold();move(d.dx,d.dy);}
 });
 window.addEventListener('blur',()=>{stopHold();if(nativeHazardTimer)stopHazards();});
 if(nativeHazardTimer)window.addEventListener('focus',startHazards);
 window.addEventListener('pagehide',()=>{stopHold();stopHazards();stopWatching();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopHold();stopHazards();}else startHazards();});
}
async function init(){
 bindControls();
 if(typeof GameSDK==='undefined'||!GameSDK.module){phase='unavailable';announce('Open Maze Quest in StudyVerse to play.');return;}
 sdk=GameSDK.module;
 try{
  item=normalizeItem(await sdk.getItem());ui.exit.disabled=false;
  if(!item){phase='unavailable';announce('Incompatible Study Item. Exit to Standard.');return;}
  options=item.options;ui.question.textContent=item.question;makeOptions();phase='playing';ui.play.hidden=false;nextWorld();watchField();startHazards();
 }catch{phase='unavailable';ui.exit.disabled=false;announce('Could not load the Study Item. Exit to Standard.');}
}
void init();
