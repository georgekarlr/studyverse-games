// Renderer-only Multiple Choice module. StudyVerse owns correctness and feedback.
const layout = [
 '###########',
 '#G..#....G#',
 '###.#.###.#',
 '#...#...#.#',
 '#.#####.#.#',
 '#.....#...#',
 '#.###.###.#',
 '#...#S....#',
 '###.#.###.#',
 '#G....#..G#',
 '###########'
];
const gates = [{x:1,y:1},{x:9,y:1},{x:1,y:9},{x:9,y:9}];
const start = {x:5,y:7};
const pageSize = 4;
const get = id => document.querySelector('#' + id);
const ui = {
 board:get('board'), options:get('options'), question:get('question'),
 progress:get('progress'), status:get('status'), play:get('play-area'),
 page:get('page-info'), modal:get('question-modal'), info:get('info'),
 close:get('close-question'), resume:get('resume'), confirm:get('confirm'),
 previous:get('previous'), next:get('next'), reset:get('reset'), exit:get('exit')
};
const directions = [
 {button:get('up'),dx:0,dy:-1,keys:['arrowup','w']},
 {button:get('down'),dx:0,dy:1,keys:['arrowdown','s']},
 {button:get('left'),dx:-1,dy:0,keys:['arrowleft','a']},
 {button:get('right'),dx:1,dy:0,keys:['arrowright','d']}
];
const tiles = [], optionRows = [];
let sdk = null, item = null, options = [], page = 0, moves = 0;
let position = {...start}, visited = new Set(), phase = 'loading', questionOpen = false;

function keyOf(x,y) { return x + ',' + y; }
function activeOptions() { return options.slice(page*pageSize,(page+1)*pageSize); }
function atGate(x,y) { return gates.findIndex(gate=>gate.x===x&&gate.y===y); }
function offeredAt(x,y) {
 const index=atGate(x,y);
 return index<0 ? null : activeOptions()[index] || null;
}
function currentOption() { return offeredAt(position.x,position.y); }
function gateNumber(index) { return page*pageSize+index+1; }
function available(x,y) {
 const kind=layout[y] && layout[y][x];
 return !!kind && kind!=='#' && (kind!=='G'||!!offeredAt(x,y));
}
function canMove() { return phase==='playing'&&!questionOpen; }
function announce(message) { if(ui.status.textContent!==message)ui.status.textContent=message; }
function updateText(el,value) { if(el.textContent!==value)el.textContent=value; }
function updateClass(el,value) { if(el.className!==value)el.className=value; }

function makeBoard() {
 for(let y=0;y<layout.length;y+=1){
  const row=document.createElement('div');
  row.className='maze-row';
  for(let x=0;x<layout[y].length;x+=1){
   const el=document.createElement('span');
   el.className='tile';
   el.setAttribute('aria-hidden','true');
   tiles.push({x,y,kind:layout[y][x],el});
   row.append(el);
  }
  ui.board.append(row);
 }
 for(let i=0;i<pageSize;i+=1){
  const el=document.createElement('p');
  el.className='option';
  optionRows.push(el);
  ui.options.append(el);
 }
}
function paintMaze() {
 const active=activeOptions();
 for(const tile of tiles){
  const here=tile.x===position.x&&tile.y===position.y;
  const index=atGate(tile.x,tile.y);
  const gate=index>=0&&index<active.length;
  const blocked=tile.kind==='#'||(index>=0&&!gate);
  const name=here?'player':gate?'gate':blocked?'wall':
   tile.kind==='S'?'start':visited.has(keyOf(tile.x,tile.y))?'trail':'path';
  updateClass(tile.el,'tile '+name);
  updateText(tile.el,here?'P':gate?String(gateNumber(index)):tile.kind==='S'?'S':'');
 }
}
function paintOptions() {
 const active=activeOptions();
 for(let i=0;i<optionRows.length;i+=1){
  const row=optionRows[i],option=active[i];
  row.hidden=!option;
  updateClass(row,option&&option===currentOption()?'option selected':'option');
  updateText(row,option?gateNumber(i)+'. '+option.text:'');
 }
 updateText(ui.page,'Gates '+(page*pageSize+1)+'-'+
  (page*pageSize+active.length)+' of '+options.length);
 const choosing=phase==='playing'&&questionOpen;
 ui.previous.disabled=!choosing||page===0;
 ui.next.disabled=!choosing||(page+1)*pageSize>=options.length;
}
function paintControls() {
 const ready=canMove(), selected=currentOption();
 for(const d of directions)d.button.disabled=!ready;
 ui.reset.disabled=!ready;
 ui.confirm.disabled=!ready||!selected;
 updateClass(ui.confirm,ready&&selected?'enter gate-ready':'enter');
 updateText(ui.confirm,selected?'Enter '+gateNumber(atGate(position.x,position.y)):'Enter gate');
 ui.info.disabled=phase!=='playing';
 updateText(ui.progress,'Moves '+moves+' | Gates '+(page*pageSize+1)+'-'+
  (page*pageSize+activeOptions().length));
}
function draw(){paintMaze();paintOptions();paintControls();}
function move(dx,dy) {
 if(!canMove())return;
 const x=position.x+dx,y=position.y+dy;
 if(!available(x,y)){announce('Wall ahead. Choose another direction.');return;}
 visited.add(keyOf(position.x,position.y));
 position={x,y};
 moves+=1;
 draw();
 const gate=currentOption();
 announce(gate?'Gate '+gateNumber(atGate(x,y))+' ready. Enter or keep exploring.':
  'Row '+(y+1)+', column '+(x+1)+'. Explore the maze.');
}
function resetMaze(message) {
 position={...start};moves=0;visited=new Set();draw();announce(message);
}
function changePage(delta) {
 if(phase!=='playing'||!questionOpen)return;
 const target=page+delta;
 if(target<0||target*pageSize>=options.length)return;
 page=target;resetMaze('New gates. Player returned to START.');
}
function openQuestion() {
 if(phase!=='playing'||questionOpen)return;
 questionOpen=true;ui.modal.hidden=false;draw();
 ui.close.focus();
}
function closeQuestion() {
 if(!questionOpen)return;
 questionOpen=false;ui.modal.hidden=true;draw();ui.info.focus();
}
async function submit() {
 if(!canMove())return;
 const selected=currentOption();
 if(!selected||!options.some(option=>option.id===selected.id))return;
 phase='submitting';ui.exit.disabled=true;draw();
 announce('Sending your selected gate...');
 try{
  const receipt=await sdk.submitAnswer({item_id:item.id,response:{value:selected.id}});
  if(receipt&&receipt.ok===false)throw new Error('Response not accepted');
  phase='submitted';
  announce(receipt&&receipt.status==='preview_only'?
   'Preview received. No answer or score saved.':'Response sent. Continue in StudyVerse.');
 }catch{
  phase='uncertain';
  announce('Submission unconfirmed. Exit or restart preview; do not retry.');
 }finally{
  ui.exit.disabled=false;draw();
 }
}
async function leave() {
 if(!sdk||phase==='submitting'||phase==='exiting'||phase==='exited')return;
 const oldPhase=phase;phase='exiting';ui.exit.disabled=true;
 if(options.length)draw();
 announce('Returning to Standard...');
 try{
  await sdk.exitToStandard();phase='exited';announce('Exited to Standard.');
 }catch{
  phase=oldPhase;ui.exit.disabled=false;
  if(options.length)draw();
  announce('Use the StudyVerse host controls to exit.');
 }
}
function normalizeItem(raw) {
 if(!raw||raw.item_type!=='multiple_choice'||typeof raw.id!=='string'||!raw.id.trim()||
  !raw.content||typeof raw.content.question!=='string'||!raw.content.question.trim())return null;
 const choices=raw.content.options;
 if(!Array.isArray(choices)||choices.length<2||choices.length>30)return null;
 const ids=new Set();
 for(const choice of choices){
  if(!choice||typeof choice.id!=='string'||!choice.id.trim()||choice.id.length>80||
   typeof choice.text!=='string'||!choice.text.trim()||ids.has(choice.id))return null;
  ids.add(choice.id);
 }
 return {id:raw.id,question:raw.content.question,options:choices.map(choice=>({id:choice.id,text:choice.text}))};
}
function bindControls(){
 ui.exit.addEventListener('click',leave);
 ui.info.addEventListener('click',openQuestion);
 ui.close.addEventListener('click',closeQuestion);
 ui.resume.addEventListener('click',closeQuestion);
 ui.confirm.addEventListener('click',submit);
 ui.reset.addEventListener('click',()=>{if(canMove())resetMaze('Maze reset. Choose a gate.');});
 ui.previous.addEventListener('click',()=>changePage(-1));
 ui.next.addEventListener('click',()=>changePage(1));
 for(const d of directions)d.button.addEventListener('click',()=>move(d.dx,d.dy));
 document.addEventListener('keydown',event=>{
  if(questionOpen){
   if(event.key==='Escape'){event.preventDefault();closeQuestion();}
   return;
  }
  if(!canMove()||event.altKey||event.ctrlKey||event.metaKey)return;
  const key=event.key.toLowerCase();
  if(key==='i'){event.preventDefault();openQuestion();return;}
  const direction=directions.find(d=>d.keys.includes(key));
  if(direction){event.preventDefault();move(direction.dx,direction.dy);}
 });
}
async function init() {
 bindControls();
 if(typeof GameSDK==='undefined'||!GameSDK.module){
  phase='unavailable';announce('Open Maze Quest in StudyVerse to play.');return;
 }
 sdk=GameSDK.module;
 try{
  item=normalizeItem(await sdk.getItem());
  ui.exit.disabled=false;
  if(!item){phase='unavailable';announce('Incompatible Study Item. Exit to Standard.');return;}
  options=item.options;
  ui.question.textContent=item.question;
  makeBoard();phase='playing';ui.play.hidden=false;
  resetMaze('Read the question, then explore.');
  openQuestion();
 }catch{
  phase='unavailable';ui.exit.disabled=false;
  announce('Could not load the Study Item. Exit to Standard.');
 }
}
void init();
