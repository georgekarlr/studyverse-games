import {createModuleSession,createSampleSession} from './studyverse-session.js';
import {createParkingLot} from './parking-lot.js';

const byId = (id) => document.getElementById(id);
const elements = {
  question:byId('question'), status:byId('status'), mode:byId('mode-tag'),
  left:byId('drive-left'), right:byId('drive-right'), park:byId('park'),
  demo:byId('demo'), again:byId('again'), exit:byId('exit')
};
let session = null;
let item = null;
let finished = true;
let busy = false;

function announce(message, kind='normal') {
  elements.status.textContent = message;
  const box=elements.status.parentElement;
  box.classList.toggle('status-error',kind==='error');
  box.classList.toggle('status-success',kind==='success');
}
function refreshControls() {
  const ready=Boolean(item)&&!finished&&!busy;
  elements.left.disabled=!ready||lot.selectedIndex()===0;
  elements.right.disabled=!ready||lot.selectedIndex()===item.options.length-1;
  elements.park.disabled=!ready;
}
const lot=createParkingLot({
  bays:byId('bays'),lot:byId('lot'),car:byId('car'),scroller:byId('lot-scroll'),
  onSelectionChange(option,index,count){
    announce('Bay '+(index+1)+' of '+count+' selected. Steer to another bay or park to submit your answer.');
    refreshControls();
  }
});
function setUnavailable(message) {
  item=null;
  finished=true;
  busy=false;
  elements.question.textContent='Ready for a parking challenge?';
  elements.demo.hidden=false;
  elements.exit.hidden=true;
  elements.again.hidden=true;
  elements.mode.textContent='SAMPLE AVAILABLE';
  announce(message,'error');
  refreshControls();
}
async function start(activeSession) {
  session=activeSession;
  item=null;
  finished=true;
  busy=true;
  elements.demo.hidden=true;
  elements.again.hidden=true;
  elements.exit.hidden=activeSession.kind!=='module';
  elements.mode.textContent=activeSession.kind==='module'?'PRIVATE MODULE PREVIEW':'SAMPLE • NO SCORE';
  elements.question.textContent='Loading your question…';
  announce('Getting a Multiple Choice Study Item…');
  refreshControls();
  try{
    const nextItem=await activeSession.load();
    item=nextItem;
    finished=false;
    busy=false;
    elements.question.textContent=nextItem.question;
    lot.mount(nextItem.options);
    refreshControls();
    elements.question.focus();
  }catch(error){
    const message=error instanceof Error?error.message:'The question could not be loaded.';
    if(activeSession.kind==='module') setUnavailable(message+' You can try the sample without recording progress.');
    else setUnavailable(message);
  }
}
async function park() {
  if(!session||!item||busy||finished)return;
  busy=true;
  refreshControls();
  announce('Parking the car… your selected bay will be submitted once.');
  const optionId=await lot.park();
  if(!optionId){busy=false;refreshControls();return;}
  finished=true;
  try {
    const receipt=await session.submit(item,optionId);
    if(session.kind==='sample'){
      announce('Sample parked! This was only a demo; nothing was checked, graded or saved.','success');
      elements.again.hidden=false;
    }else if(receipt && receipt.status==='preview_only'){
      announce('Parking choice received in private preview. The sample SDK does not grade or save progress.','success');
    }else{
      announce('Parking choice submitted. StudyVerse controls evaluation; this Game cannot grade or save a result.','success');
    }
  }catch(error){
    const message=error instanceof Error?error.message:'The parking submission could not be verified.';
    announce(message+' Restart private Preview before another submission.','error');
  }finally{busy=false;refreshControls();}
}
elements.left.addEventListener('click',()=>{lot.move(-1);refreshControls();});
elements.right.addEventListener('click',()=>{lot.move(1);refreshControls();});
elements.park.addEventListener('click',()=>{void park();});
elements.demo.addEventListener('click',()=>{void start(createSampleSession());});
elements.again.addEventListener('click',()=>{void start(createSampleSession());});
elements.exit.addEventListener('click',async()=>{
  if(!session||session.kind!=='module')return;
  elements.exit.disabled=true;
  try{await session.exit();announce('Returning to Study Standard.');}
  catch{announce('Could not exit automatically. Close private Preview to return to Study Standard.','error');}
  finally{elements.exit.disabled=false;}
});
window.addEventListener('keydown',(event)=>{
  if(!item||finished||busy||event.altKey||event.ctrlKey||event.metaKey)return;
  const node=event.target;
  if(node instanceof HTMLElement && (node.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(node.tagName)))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    event.preventDefault();lot.move(event.key==='ArrowLeft'?-1:1);refreshControls();
  }else if(event.key.toLowerCase()==='p'&&!event.repeat){
    event.preventDefault();void park();
  }
});
const sdk=window.GameSDK && window.GameSDK.module;
if(sdk){void start(createModuleSession(sdk));}
else{setUnavailable('StudyVerse Module SDK was not detected. Open the private Module Preview to use a real Study Item.');}
