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
 function reachable(blocked){
  const seen=new Set([key(start.x,start.y)]),queue=[start];
  for(let i=0;i<queue.length;i++){const c=queue[i];for(const [dx,dy] of steps){const x=c.x+dx,y=c.y+dy,k=key(x,y);if(grid[y]?.[x]&&grid[y][x]!=='#'&&!blocked.has(k)&&!seen.has(k)){seen.add(k);queue.push({x,y});}}}
  return seen;
 }
 // Even treating every patrol cell as permanently blocked leaves every gate reachable.
 const pairs=[];
 for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
  if(grid[y][x]!=='.'||Math.abs(x-start.x)+Math.abs(y-start.y)<4)continue;
  for(const [dx,dy] of [[1,0],[0,1]]){const nx=x+dx,ny=y+dy;if(grid[ny]?.[nx]==='.'&&Math.abs(nx-start.x)+Math.abs(ny-start.y)>=4)pairs.push([{x,y},{x:nx,y:ny}]);}
 }
 const blocked=new Set(),patrols=[];
 for(const pair of shuffle(pairs)){
  const keys=pair.map(c=>key(c.x,c.y));if(keys.some(k=>blocked.has(k)))continue;
  const trial=new Set(blocked);for(const k of keys)trial.add(k);
  const seen=reachable(trial);if(!gates.every(c=>seen.has(key(c.x,c.y))))continue;
  for(const k of keys)blocked.add(k);patrols.push({cells:pair,index:0});if(patrols.length===3)break;
 }
 return {size,grid,start,gates,patrols};
}
const pageSize=4,cameraSize=9,half=4;
const compass=["NW","NE","SW","SE"];
const get=id=>document.querySelector('#'+id);
const ui={field:get('maze-field'),board:get('board'),options:get('options'),question:get('question'),progress:get('progress'),status:get('status'),play:get('play-area'),page:get('page-info'),modal:get('question-modal'),info:get('info'),close:get('close-question'),resume:get('resume'),confirm:get('confirm'),previous:get('previous'),next:get('next'),reset:get('reset'),exit:get('exit'),map:get('map'),mapModal:get('map-modal'),mapView:get('map-view'),mapClose:get('close-map'),mapResume:get('map-resume'),newMaze:get('new-maze'),wait:get('wait')};
const directions=[
 {button:get('up'),dx:0,dy:-1,keys:['arrowup','w']},
 {button:get('down'),dx:0,dy:1,keys:['arrowdown','s']},
 {button:get('left'),dx:-1,dy:0,keys:['arrowleft','a']},
 {button:get('right'),dx:1,dy:0,keys:['arrowright','d']}
];
const tiles=[],optionRows=[];
let sdk=null,item=null,options=[],world=null,page=0,position=null,moves=0,turns=0;
let explored=new Set(),visited=new Set(),phase='loading',overlay='';
let held=null,frame=null,frameCount=0;
const keyOf=(x,y)=>x+','+y;
const activeOptions=()=>options.slice(page*pageSize,(page+1)*pageSize);
function atGate(x,y){return world.gates.findIndex(g=>g.x===x&&g.y===y);}
function currentOption(){return activeOptions()[atGate(position.x,position.y)]||null;}
function gateNumber(i){return page*pageSize+i+1;}
function available(x,y){const c=world.grid[y]?.[x];return !!c&&c!=='#';}
function canMove(){return phase==='playing'&&!overlay;}
function announce(message){if(ui.status.textContent!==message)ui.status.textContent=message;}
function updateText(el,value){if(el.textContent!==value)el.textContent=value;}
function updateClass(el,value){if(el.className!==value)el.className=value;}
function setDisabled(el,value){if(el.disabled!==value)el.disabled=value;}
function makeBoard(){
 for(let y=0;y<cameraSize;y++){
  const row=document.createElement('div');row.className='maze-row';
  for(let x=0;x<cameraSize;x++){
   const el=document.createElement('span');el.className='tile';el.setAttribute('aria-hidden','true');
   const mark=document.createElement('span');mark.className='mark';el.append(mark);
   tiles.push({x,y,el,mark});row.append(el);
  }
  ui.board.append(row);
 }
 for(let i=0;i<pageSize;i++){const el=document.createElement('p');el.className='option';optionRows.push(el);ui.options.append(el);}
}
// Fit a square camera within the actual available field. The isolated guest
// exposes only bounded local element dimensions; never read parent layout.
let boardSide=0;
function fitBoard(){
 const side=Math.floor(Math.min(ui.field.clientWidth,ui.field.clientHeight,640));
 if(!Number.isFinite(side)||side<1||side===boardSide)return;
 boardSide=side;ui.board.style.width=side+'px';ui.board.style.height=side+'px';
}
function watchField(){
 fitBoard();
 if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(fitBoard);observer.observe(ui.field);}
 else window.addEventListener('resize',fitBoard);
}
function patrolAt(x,y){return world.patrols.some(p=>p.cells[p.index].x===x&&p.cells[p.index].y===y);}
function reveal(){
 for(let y=position.y-half;y<=position.y+half;y++)for(let x=position.x-half;x<=position.x+half;x++)
  if(x>=0&&y>=0&&x<world.size&&y<world.size)explored.add(keyOf(x,y));
 visited.add(keyOf(position.x,position.y));
}
function tileView(x,y){
 const kind=world.grid[y]?.[x],k=keyOf(x,y);
 if(!kind)return ['void',''];
 if(x===position.x&&y===position.y)return ['player','P'];
 if(kind==='#')return [(x+y)%2===0?'wall':'stone',''];
 if(patrolAt(x,y))return ['sentry','o'];
 const index=atGate(x,y);
 if(index>=0&&index<activeOptions().length)return ['gate',String(gateNumber(index))];
 if(kind==='S')return ['start','S'];
 if(visited.has(k))return ['trail',''];
 return [(x+y)%2===0?'path':'floor',''];
}
function paintMaze(){
 for(const tile of tiles){const [name,label]=tileView(position.x+tile.x-half,position.y+tile.y-half);updateClass(tile.el,'tile '+name);updateText(tile.mark,label);}
}
function paintOptions(){
 const active=activeOptions();
 for(let i=0;i<optionRows.length;i++){const row=optionRows[i],option=active[i];row.hidden=!option;updateClass(row,option&&option===currentOption()?'option selected':'option');updateText(row,option?gateNumber(i)+' ['+compass[i]+'] '+option.text:'');}
 updateText(ui.page,'Gates '+(page*pageSize+1)+'-'+(page*pageSize+active.length)+' of '+options.length);
 setDisabled(ui.previous,phase!=='playing'||overlay!=='question'||page===0);
 setDisabled(ui.next,phase!=='playing'||overlay!=='question'||(page+1)*pageSize>=options.length);
}
function paintMap(){
 if(overlay!=='map')return;
 const lines=[];
 for(let y=0;y<world.size;y++){
  const line=[];
  for(let x=0;x<world.size;x++){
   if(!explored.has(keyOf(x,y))){line.push('? ');continue;}
   const [name,label]=tileView(x,y);line.push(label?label.padEnd(2,' '):name==='wall'||name==='stone'?'# ':name==='trail'?'+ ':'. ');
  }
  lines.push(line.join(''));
 }
 updateText(ui.mapView,lines.join('\n'));
}
function paintControls(){
 const ready=canMove(),choice=currentOption();
 for(const d of directions)setDisabled(d.button,!ready);
 setDisabled(ui.reset,!ready);setDisabled(ui.wait,!ready);setDisabled(ui.confirm,!ready||!choice);
 updateClass(ui.confirm,ready&&choice?'enter gate-ready':'enter');
 updateText(ui.confirm,choice?'Enter '+gateNumber(atGate(position.x,position.y)):'Enter gate');
 setDisabled(ui.info,phase!=='playing'||!!overlay);setDisabled(ui.map,phase!=='playing'||!!overlay);
 setDisabled(ui.exit,phase==='submitting'||phase==='exiting'||phase==='exited'||!!overlay);
 updateText(ui.progress,'Moves '+moves+' | Gates '+(page*pageSize+1)+'-'+(page*pageSize+activeOptions().length));
}
function draw(){paintMaze();paintOptions();paintControls();paintMap();}
function stopHold(){
 if(frame!==null){window.cancelAnimationFrame(frame);frame=null;}
 if(held){updateClass(held.direction.button,'direction');held=null;}
}
function resetPlayer(message,clearMap=false){
 stopHold();position={...world.start};moves=0;turns=0;
 for(const p of world.patrols)p.index=0;
 if(clearMap){visited=new Set();explored=new Set();}
 reveal();draw();announce(message);
}
function nextWorld(){
 world=buildWorld(Math.floor(Math.random()*4294967296));resetPlayer('New maze ready. Find the gate for your answer.',true);
}
function advancePatrols(){turns++;if(turns%2===0)for(const p of world.patrols)p.index=1-p.index;return patrolAt(position.x,position.y);}
function move(dx,dy){
 if(!canMove())return;
 const x=position.x+dx,y=position.y+dy;
 if(!available(x,y)){stopHold();announce('Wall ahead. Choose another direction.');return;}
 if(patrolAt(x,y)){resetPlayer('Sentry contact! Back to START.');return;}
 position={x,y};moves++;reveal();
 if(advancePatrols()){resetPlayer('Sentry contact! Back to START.');return;}
 if(currentOption())stopHold();
 draw();announce(currentOption()?'Gate '+gateNumber(atGate(x,y))+' ready. Enter or read ? for the choice.':'Row '+(y+1)+', column '+(x+1)+'. Watch the sentries.');
}
function waitTurn(){
 if(!canMove())return;
 if(advancePatrols()){resetPlayer('Sentry contact! Back to START.');return;}
 draw();announce('Waited one turn. Watch for an opening.');
}
function changePage(delta){
 if(phase!=='playing'||overlay!=='question')return;
 const target=page+delta;if(target<0||target*pageSize>=options.length)return;
 page=target;resetPlayer('New answer gates. Back to START.',true);
}
function openOverlay(kind){
 if(!canMove())return;
 stopHold();overlay=kind;ui.modal.hidden=kind!=='question';ui.mapModal.hidden=kind!=='map';draw();
 (kind==='question'?ui.close:ui.mapClose).focus();
}
function closeOverlay(){
 if(!overlay)return;
 const previous=overlay;overlay='';ui.modal.hidden=true;ui.mapModal.hidden=true;draw();
 (previous==='question'?ui.info:ui.map).focus();
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
 stopHold();phase='submitting';draw();announce('Sending your selected gate...');
 try{
  const receipt=await sdk.submitAnswer({item_id:item.id,response:{value:selected.id}});
  if(receipt&&receipt.ok===false)throw new Error('Response not accepted');
  phase='submitted';announce(receipt&&receipt.status==='preview_only'?'Preview received. No answer or score saved.':'Response sent. Continue in StudyVerse.');
 }catch{phase='uncertain';announce('Submission unconfirmed. Exit or restart preview; do not retry.');}
 finally{draw();}
}
async function leave(){
 if(!sdk||phase==='submitting'||phase==='exiting'||phase==='exited'||overlay)return;
 const previous=phase;stopHold();phase='exiting';ui.exit.disabled=true;
 if(world)draw();announce('Returning to Standard...');
 try{await sdk.exitToStandard();phase='exited';announce('Exited to Standard.');}
 catch{phase=previous;ui.exit.disabled=false;if(world)draw();announce('Use the StudyVerse host controls to exit.');}
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
 ui.wait.addEventListener('click',waitTurn);ui.previous.addEventListener('click',()=>changePage(-1));ui.next.addEventListener('click',()=>changePage(1));
 for(const d of directions)bindDirection(d);
 document.addEventListener('keydown',event=>{
  if(overlay){if(event.key==='Escape'){event.preventDefault();closeOverlay();}return;}
  if(!canMove()||event.altKey||event.ctrlKey||event.metaKey)return;
  const key=event.key.toLowerCase();
  if(key==='i'){event.preventDefault();openOverlay('question');return;}
  if(key==='m'){event.preventDefault();openOverlay('map');return;}
  const d=directions.find(d=>d.keys.includes(key));if(d){event.preventDefault();stopHold();move(d.dx,d.dy);}
 });
 window.addEventListener('blur',stopHold);window.addEventListener('pagehide',stopHold);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHold();});
}
async function init(){
 bindControls();
 if(typeof GameSDK==='undefined'||!GameSDK.module){phase='unavailable';announce('Open Maze Quest in StudyVerse to play.');return;}
 sdk=GameSDK.module;
 try{
  item=normalizeItem(await sdk.getItem());ui.exit.disabled=false;
  if(!item){phase='unavailable';announce('Incompatible Study Item. Exit to Standard.');return;}
  options=item.options;ui.question.textContent=item.question;makeBoard();watchField();phase='playing';ui.play.hidden=false;nextWorld();openOverlay('question');
 }catch{phase='unavailable';ui.exit.disabled=false;announce('Could not load the Study Item. Exit to Standard.');}
}
void init();
