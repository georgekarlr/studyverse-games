import {createModuleSession,createSampleSession} from './studyverse-session.js';
import {createParkingLot} from './parking-lot.js';
import {createQuestionDialog} from './question-dialog.js';

const byId=id=>document.getElementById(id);
const ui={
  status:byId('status'),statusPanel:byId('status-panel'),mode:byId('mode-tag'),
  gear:byId('gear'),speed:byId('speed'),drivingState:byId('driving-state'),guide:byId('parking-guide'),
  park:byId('park'),reset:byId('reset-car'),demo:byId('demo'),again:byId('again'),exit:byId('exit')
};
const driveNames=['forward','reverse','left','right','brake'];
const driveButtons=driveNames.map(command=>({command,button:byId('drive-'+command)}));
const setVisible=(element,visible)=>element.classList.toggle('is-hidden',!visible);
const keyMap=new Map([
  ['arrowup','forward'],['w','forward'],['arrowdown','reverse'],['s','reverse'],
  ['arrowleft','left'],['a','left'],['arrowright','right'],['d','right'],
  [' ','brake'],['b','brake']
]);
const driveKeys=new Set(),pointerDrives=new Map(),heldCommands=new Set();
let session=null,item=null,finished=true,busy=false,latestGuide='',collisionNotice=0;
function announce(message,kind='normal'){
  if(ui.status.textContent!==message)ui.status.textContent=message;
  ui.statusPanel.classList.toggle('status-error',kind==='error');
  ui.statusPanel.classList.toggle('status-success',kind==='success');
  // Normal driving hints remain available to screen readers without covering the road.
  ui.statusPanel.classList.toggle('is-quiet',kind==='normal');
}
let dialog;
const lot=createParkingLot({
  bays:byId('bays'),lot:byId('lot'),car:byId('car'),traffic:byId('traffic'),scroller:byId('lot-viewport'),
  onAssist(index){announce('Assisted driving toward Bay '+index+'. Park still requires your confirmation.');},
  onCollision(){
    const serial=++collisionNotice;
    announce('Traffic collision! Back to START. Find a safe gap between the moving cars.','error');
    window.setTimeout(()=>{
      if(serial===collisionNotice&&!finished&&!busy&&!dialog?.isOpen()&&lot.canDrive()){
        announce('Watch the moving traffic as you approach a numbered parking bay.');
      }
    },2200);
  },
  onChange(state){
    if(!state.car)return;
    ui.gear.textContent=state.car.speed>2?'D':state.car.speed< -2?'R':'N';
    ui.speed.textContent=String(Math.min(60,Math.round(Math.abs(state.car.speed)*60/190)));
    ui.drivingState.textContent=state.parking.ready?'PARK READY':state.assisted?'AUTO DRIVE':state.parking.index>=0?'IN BAY':'DRIVING';
    if(state.guide!==latestGuide){latestGuide=state.guide;ui.guide.textContent=state.guide;}
    refreshControls();
  }
});
function refreshControls(){
  const active=Boolean(item)&&!finished&&!busy&&!dialog?.isOpen()&&lot.canDrive();
  ui.park.disabled=!active||!lot.canPark();
  ui.reset.disabled=!active;
  for(const {button} of driveButtons)button.disabled=!active;
}
function syncControls(){
  for(const command of driveNames){
    const pressed=[...driveKeys].some(key=>keyMap.get(key)===command)||[...pointerDrives.values()].includes(command);
    if(pressed===heldCommands.has(command))continue;
    if(pressed)heldCommands.add(command);
    else heldCommands.delete(command);
    lot.setDrive(command,pressed);
  }
}
function releaseAll(){
  driveKeys.clear();pointerDrives.clear();syncControls();
  for(const {button} of driveButtons)button.classList.remove('is-held');
}
dialog=createQuestionDialog({
  trigger:byId('info'),backdrop:byId('question-modal'),closeButton:byId('close-info'),
  resumeButton:byId('resume-drive'),questionNode:byId('modal-question'),optionsNode:byId('modal-options'),
  onOpen(){releaseAll();lot.setPaused(true);refreshControls();},
  onClose(){lot.setPaused(false);refreshControls();}
});
function lockGame(){releaseAll();lot.lock();refreshControls();}
function showSampleFallback(message){
  item=null;finished=true;busy=false;lockGame();
  dialog.setItem(null);
  ui.mode.textContent='SAMPLE AVAILABLE';
  setVisible(ui.demo,true);setVisible(ui.again,false);setVisible(ui.exit,false);
  ui.guide.textContent='Open ⓘ for how to drive, or start a sample game.';
  announce(message,'error');
}
async function start(nextSession){
  lockGame();
  session=nextSession;item=null;finished=true;busy=true;latestGuide='';collisionNotice++;
  dialog.close();dialog.setItem(null);
  setVisible(ui.demo,false);setVisible(ui.again,false);
  setVisible(ui.exit,nextSession.kind==='module');
  ui.mode.textContent=nextSession.kind==='module'?'PRIVATE PREVIEW':'SAMPLE • NO GRADE';
  ui.drivingState.textContent='LOADING';
  ui.guide.textContent='Starting the engine…';
  announce('Getting your Multiple Choice driving challenge…');
  refreshControls();
  try{
    const loaded=await nextSession.load();
    if(session!==nextSession)return;
    item=loaded;finished=false;busy=false;
    dialog.setItem(loaded);
    byId('car').classList.remove('is-parked');
    lot.mount(loaded.options);
    refreshControls();
    byId('lot-viewport').focus();
    announce('Ready! Drive using arrow keys or touch arrows. Tap ⓘ for the full question and choices.');
  }catch(error){
    if(session!==nextSession)return;
    const message=error instanceof Error?error.message:'The question could not be loaded.';
    showSampleFallback(message+' The sample drive uses no saved progress.');
  }
}
async function park(){
  if(!session||!item||finished||busy||dialog.isOpen())return;
  const choice=lot.parkingChoice();
  if(choice===null){announce(lot.state().parking.reason,'error');return;}
  busy=true;
  const parked=lot.park();
  if(parked===null){busy=false;refreshControls();return;}
  finished=true;
  refreshControls();
  announce('Parked! Submitting your chosen bay to StudyVerse…');
  try{
    const receipt=await session.submit(item,parked);
    if(session.kind==='sample'){
      announce('Sample parked. No answer was checked, graded or saved.','success');
      setVisible(ui.again,true);
    }else if(receipt&&receipt.status==='preview_only'){
      announce('Private preview received the parked choice. No correctness or score was recorded.','success');
    }else announce('Choice submitted. Only StudyVerse can grade an actual learner answer.','success');
  }catch(error){
    const message=error instanceof Error?error.message:'Parking submission could not be verified.';
    announce(message+' Do not submit again; restart private Preview.','error');
  }finally{busy=false;refreshControls();}
}
ui.park.addEventListener('click',()=>{void park();});
ui.reset.addEventListener('click',()=>{
  if(finished||busy||dialog.isOpen())return;
  releaseAll();lot.reset();announce('Car reset. Your answer has not been submitted.');
});
ui.demo.addEventListener('click',()=>{void start(createSampleSession());});
ui.again.addEventListener('click',()=>{void start(createSampleSession());});
let exitPending=false;
ui.exit.addEventListener('click',async()=>{
  // The compact top-right X exits through the approved StudyVerse SDK only.
  if(!session||session.kind!=='module'||exitPending||busy||dialog.isOpen())return;
  exitPending=true;
  ui.exit.disabled=true;
  releaseAll();
  lot.setPaused(true);
  try{
    await session.exit();
    finished=true;
    lockGame();
    setVisible(ui.exit,false);
    announce('Exit requested. You may close Private Preview if it remains open.');
  }catch{
    lot.setPaused(false);
    announce('Could not exit automatically. Close Private Preview to return to Study Standard.','error');
  }finally{
    exitPending=false;
    ui.exit.disabled=false;
    refreshControls();
  }
});
// Multiple simultaneous touch pointers work: holding up+left/right steers while accelerating.
for(const {button,command} of driveButtons){
  button.addEventListener('pointerdown',event=>{
    if(button.disabled||dialog.isOpen())return;
    event.preventDefault();
    try{button.setPointerCapture(event.pointerId);}catch{}
    pointerDrives.set(event.pointerId,command);
    button.classList.add('is-held');syncControls();
  });
  const release=event=>{
    if(!pointerDrives.has(event.pointerId))return;
    pointerDrives.delete(event.pointerId);
    if(![...pointerDrives.values()].includes(command))button.classList.remove('is-held');
    syncControls();
  };
  button.addEventListener('pointerup',release);
  button.addEventListener('pointercancel',release);
  button.addEventListener('lostpointercapture',release);
}
window.addEventListener('keydown',event=>{
  if(dialog.isOpen())return;
  const target=event.target;
  if(target&&(target.isContentEditable===true||
     ['INPUT','TEXTAREA','SELECT'].includes(String(target.tagName||'').toUpperCase())))return;
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const key=event.key.toLowerCase();
  if(key==='i'&&!event.repeat){event.preventDefault();dialog.open();return;}
  if(!item||finished||busy)return;
  const command=keyMap.get(key);
  if(command && !(key===' '&&String(target?.tagName??'').toUpperCase()==='BUTTON')){
    event.preventDefault();driveKeys.add(key);syncControls();
  }else if(key==='p'&&!event.repeat){event.preventDefault();void park();}
  else if(key==='r'&&!event.repeat){event.preventDefault();releaseAll();lot.reset();announce('Car reset to the starting lane.');}
});
window.addEventListener('keyup',event=>{
  const key=event.key.toLowerCase();
  if(keyMap.has(key)&&driveKeys.delete(key))syncControls();
});
window.addEventListener('blur',releaseAll);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){releaseAll();lot.setPaused(true);}
  else if(!dialog.isOpen())lot.setPaused(false);
});
window.addEventListener('pagehide',()=>lot.lock());

const sdk=window.GameSDK?.module;
if(sdk)void start(createModuleSession(sdk));
else showSampleFallback('StudyVerse Module SDK is not available here. Start a sample drive or open private Module Preview.');
