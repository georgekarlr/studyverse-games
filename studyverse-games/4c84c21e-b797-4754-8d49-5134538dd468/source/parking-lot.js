// Visual parking-lot controller. StudyVerse SDK loading and submission are kept in main.js.
import {TRACK_HEIGHT,buildTrack,startingCar,stepDriving,parkingStatus,assistedRoute,driveAssisted} from './driving-physics.js';

export function createParkingLot({bays,lot,car,scroller,onChange,onAssist}) {
  let track=null,vehicle=null,options=[],buttons=[],locked=true;
  let waypoints=[],assistedIndex=-1,raf=0,previousFrame=0,previousReport=0;
  const input={forward:false,reverse:false,left:false,right:false,brake:false};
  let lastGuide='',lastReady=false;
  const clearInput=()=>{for(const key of Object.keys(input))input[key]=false;};
  function snapshot(){
    const parking=track&&vehicle?parkingStatus(vehicle,track):{index:-1,ready:false,reason:'Load a question to begin.'};
    return {car:vehicle,parking,assistedIndex,assisted:waypoints.length>0,locked};
  }
  function render(now=0){
    if(!track||!vehicle)return;
    car.style.left=(vehicle.x/track.width*100)+'%';
    car.style.top=(vehicle.y/TRACK_HEIGHT*100)+'%';
    car.style.transform='translate(-50%,-50%) rotate('+vehicle.heading.toFixed(1)+'deg)';
    const parking=parkingStatus(vehicle,track);
    for(let i=0;i<buttons.length;i++){
      buttons[i].classList.toggle('is-ready',parking.index===i&&parking.ready);
      buttons[i].classList.toggle('is-near',parking.index===i&&!parking.ready);
    }
    if(scroller.clientWidth && car.parentElement){
      const scale=car.parentElement.clientWidth/track.width;
      const visibleX=vehicle.x*scale;
      const edge=125;
      if(visibleX<scroller.scrollLeft+edge||visibleX>scroller.scrollLeft+scroller.clientWidth-edge){
        scroller.scrollLeft=Math.max(0,visibleX-scroller.clientWidth/2);
      }
    }
    const guide=waypoints.length?('Assisted drive to Bay '+(assistedIndex+1)+' in progress. Manual steering cancels assistance.'):parking.reason;
    if(guide!==lastGuide||parking.ready!==lastReady||now-previousReport>125){
      lastGuide=guide;lastReady=parking.ready;previousReport=now;
      onChange({...snapshot(),guide});
    }
  }
  function frame(now){
    raf=0;
    if(locked||!track||!vehicle)return;
    const dt=Math.min((now-(previousFrame||now))/1000,0.05);
    previousFrame=now;
    if(waypoints.length){
      const next=driveAssisted(vehicle,waypoints,dt);
      vehicle=next.car;waypoints=next.waypoints;
      if(!waypoints.length)assistedIndex=-1;
    }else{
      vehicle=stepDriving(vehicle,input,dt,track);
    }
    render(now);
    raf=requestAnimationFrame(frame);
  }
  function stopFrame(){if(raf)cancelAnimationFrame(raf);raf=0;previousFrame=0;}
  function startFrame(){if(!raf&&!locked)raf=requestAnimationFrame(frame);}
  function mount(offeredOptions){
    lock();
    options=[...offeredOptions];
    track=buildTrack(options.length);
    vehicle=startingCar(track);
    lot.style.width=track.width+'px';
    lot.style.height=track.height+'px';
    lot.style.setProperty('--bay-count',String(options.length));
    buttons=options.map((option,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='bay';
      button.setAttribute('aria-label','Answer '+(index+1)+': '+option.text+'. Activate to drive there automatically.');
      const number=document.createElement('span');number.className='bay-letter';number.textContent=String(index+1);
      const text=document.createElement('span');text.className='bay-answer';text.textContent=option.text;
      const hint=document.createElement('span');hint.className='bay-hint';hint.textContent='TAP TO AUTO-DRIVE';
      button.append(number,text,hint);
      button.addEventListener('click',()=>assistTo(index));
      return button;
    });
    bays.replaceChildren(...buttons);
    locked=false;
    lastGuide='';previousReport=0;lastReady=false;assistedIndex=-1;
    clearInput();
    scroller.scrollLeft=Math.max(0,track.width/2-scroller.clientWidth/2);
    render();
    startFrame();
  }
  function assistTo(index){
    if(locked||!track||!vehicle||!options[index])return false;
    clearInput();
    waypoints=assistedRoute(vehicle,track,index);
    assistedIndex=index;
    onAssist(index+1);
    render();
    startFrame();
    return true;
  }
  function setDrive(key,held){
    if(!Object.hasOwn(input,key))return;
    if(locked){input[key]=false;return;}
    input[key]=Boolean(held);
    if(held&&waypoints.length){waypoints=[];assistedIndex=-1;}
    render();
  }
  function releaseControls(){clearInput();}
  function reset(){
    if(locked||!track)return;
    vehicle=startingCar(track);
    waypoints=[];assistedIndex=-1;clearInput();
    render();
    startFrame();
  }
  function parkingChoice(){
    if(locked||!track||!vehicle)return null;
    const status=parkingStatus(vehicle,track);
    return status.ready?options[status.index].id:null;
  }
  function lock(){
    locked=true;
    clearInput();waypoints=[];assistedIndex=-1;
    stopFrame();
    for(const button of buttons)button.disabled=true;
  }
  function park(){
    const id=parkingChoice();
    if(id===null)return null;
    lock();
    car.classList.add('is-parked');
    render();
    return id;
  }
  function canPark(){return Boolean(parkingChoice());}
  function canDrive(){return !locked&&Boolean(track&&vehicle);}
  function state(){return snapshot();}
  return{mount,setDrive,releaseControls,reset,parkingChoice,park,lock,canPark,canDrive,state};
}
