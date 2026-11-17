import {createModuleSession,createSampleSession} from './studyverse-session.js';
import {createParkingLot} from './parking-lot.js';

const byId=(id)=>document.getElementById(id);
const ui={
  question:byId('question'),status:byId('status'),mode:byId('mode-tag'),
  gear:byId('gear'),speed:byId('speed'),steering:byId('steering'),
  drivingState:byId('driving-state'),guide:byId('parking-guide'),
  park:byId('park'),reset:byId('reset-car'),
  demo:byId('demo'),again:byId('again'),exit:byId('exit')
};
const driveButtons=[...document.querySelectorAll('[data-drive]')];
let session=null,item=null,finished=true,busy=false;
let latestGuide='';
function announce(message,kind='normal'){
  if(ui.status.textContent!==message)ui.status.textContent=message;
  const panel=ui.status.parentElement;
  panel.classList.toggle('status-error',kind==='error');
  panel.classList.toggle('status-success',kind==='success');
}
const lot=createParkingLot({
  bays:byId('bays'),lot:byId('lot'),car:byId('car'),scroller:byId('lot-viewport'),
  onAssist(number){announce('Driving to Bay '+number+'. The car will stop automatically; you must still press Park.');},
  onChange(state){
    if(!state.car)return;
    const speed=Math.min(60,Math.round(Math.abs(state.car.speed)*60/190));
    ui.speed.textContent=String(speed);
    ui.gear.textContent=state.car.speed>2?'D':state.car.speed< -2?'R':'N';
    ui.steering.textContent=state.assisted?'AUTO':'MANUAL';
    ui.drivingState.textContent=state.parking.ready?'READY TO PARK':
      state.assisted?'AUTO-DRIVE':state.parking.index>=0?'IN BAY':'DRIVING';
    if(state.guide!==latestGuide){latestGuide=state.guide;ui.guide.textContent=state.guide;}
    refreshControls();
  }
});
function refreshControls(){
  const active=Boolean(item)&&!finished&&!busy&&lot.canDrive();
  ui.park.disabled=!active||!lot.canPark();
  ui.reset.disabled=!active;
  for(const button of driveButtons)button.disabled=!active;
}
function lockGame(){lot.lock();lot.releaseControls();refreshControls();}
function showSampleFallback(message){
  item=null;finished=true;busy=false;lockGame();
  ui.question.textContent='Ready for a driving challenge?';
  ui.mode.textContent='SAMPLE AVAILABLE';
  ui.demo.hidden=false;ui.again.hidden=true;ui.exit.hidden=true;
  announce(message,'error');
}
async function start(nextSession){
  lockGame();
  session=nextSession;item=null;finished=true;busy=true;latestGuide='';
  ui.demo.hidden=true;ui.again.hidden=true;
  ui.exit.hidden=nextSession.kind!=='module';
  ui.mode.textContent=nextSession.kind==='module'?'PRIVATE MODULE PREVIEW':'SAMPLE • NO GRADE';
  ui.question.textContent='Loading your question…';
  announce('Connecting your Multiple Choice driving challenge…');
  refreshControls();
  try{
    const loaded=await nextSession.load();
    if(session!==nextSession)return;
    item=loaded;finished=false;busy=false;
    ui.question.textContent=loaded.question;
    byId('car').classList.remove('is-parked');
    lot.mount(loaded.options);
    refreshControls();
    ui.question.focus();
    announce('Engine ready! Hold ▲ to drive, steer into a bay, brake and park. Tap a bay for assistance.');
  }catch(error){
    if(session!==nextSession)return;
    const message=error instanceof Error?error.message:'The question could not be loaded.';
    showSampleFallback(message+' The practice sample is available without recording progress.');
  }
}
async function park(){
  if(!session||!item||finished||busy)return;
  const optionId=lot.parkingChoice();
  if(optionId===null){
    announce(lot.state().parking.reason,'error');
    return;
  }
  busy=true;
  const parked=lot.park();
  if(parked===null){busy=false;refreshControls();return;}
  finished=true;
  refreshControls();
  announce('Parked successfully! Sending the chosen answer to StudyVerse…');
  try{
    const receipt=await session.submit(item,parked);
    if(session.kind==='sample'){
      announce('Sample parked. This did not check answers, record progress or give a grade.','success');
      ui.again.hidden=false;
    }else if(receipt&&receipt.status==='preview_only'){
      announce('Answer received in private preview. This is not a correctness check or official grade.','success');
    }else{
      announce('Parking choice submitted. StudyVerse controls all trusted evaluation.','success');
    }
  }catch(error){
    const message=error instanceof Error?error.message:'The parking submission could not be verified.';
    announce(message+' Do not resubmit; restart private Preview before another attempt.','error');
  }finally{busy=false;refreshControls();}
}
ui.park.addEventListener('click',()=>{void park();});
ui.reset.addEventListener('click',()=>{
  if(finished||busy)return;
  lot.reset();
  announce('Car returned to the starting lane. No answer was submitted.');
});
ui.demo.addEventListener('click',()=>{void start(createSampleSession());});
ui.again.addEventListener('click',()=>{void start(createSampleSession());});
ui.exit.addEventListener('click',async()=>{
  if(!session||session.kind!=='module')return;
  ui.exit.disabled=true;
  try{await session.exit();announce('Returning to Study Standard.');lockGame();}
  catch{announce('Could not exit automatically. Close private Preview to return to Study Standard.','error');}
  finally{ui.exit.disabled=false;}
});
// Pointer capture keeps hold-to-drive responsive on desktop, touch and multi-touch.
for(const button of driveButtons){
  const drive=button.getAttribute('data-drive');
  button.addEventListener('pointerdown',(event)=>{
    if(button.disabled)return;
    event.preventDefault();
    try{button.setPointerCapture(event.pointerId);}catch{}
    button.classList.add('is-held');
    lot.setDrive(drive,true);
  });
  const release=()=>{
    button.classList.remove('is-held');
    lot.setDrive(drive,false);
  };
  button.addEventListener('pointerup',release);
  button.addEventListener('pointercancel',release);
  button.addEventListener('lostpointercapture',release);
}
// Keys are available while the private game is active, except inside editable fields.
const keyMap={
  arrowup:'forward',w:'forward',arrowdown:'reverse',s:'reverse',
  arrowleft:'left',a:'left',arrowright:'right',d:'right',
  ' ':'brake',b:'brake'
};
window.addEventListener('keydown',(event)=>{
  if(!item||finished||busy||event.altKey||event.ctrlKey||event.metaKey)return;
  const target=event.target;
  if(target instanceof HTMLElement&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)))return;
  const key=event.key.toLowerCase();
  const drive=keyMap[key];
  if(drive && !(key===' '&&target instanceof HTMLButtonElement)){
    event.preventDefault();
    lot.setDrive(drive,true);
  }else if(key==='p'&&!event.repeat){
    event.preventDefault();void park();
  }else if(key==='r'&&!event.repeat){
    event.preventDefault();lot.reset();announce('Car returned to the starting lane.');
  }
});
window.addEventListener('keyup',(event)=>{
  const drive=keyMap[event.key.toLowerCase()];
  if(drive)lot.setDrive(drive,false);
});
const releaseAll=()=>{lot.releaseControls();for(const button of driveButtons)button.classList.remove('is-held');};
window.addEventListener('blur',releaseAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
window.addEventListener('pagehide',()=>lot.lock());

const sdk=window.GameSDK?.module;
if(sdk)void start(createModuleSession(sdk));
else showSampleFallback('The private StudyVerse Module SDK is not available here. Try a sample drive with synthetic options, or open private Module Preview.');
