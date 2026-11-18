// World-space driving renderer with a responsive camera. No grading or SDK calls.
import {TRACK_HEIGHT,buildTrack,startingCar,stepDriving,parkingStatus,assistedRoute,driveAssisted} from './driving-physics.js';
import {createTraffic,stepTraffic,hitTraffic} from './traffic-obstacles.js';

export function createParkingLot({bays,lot,car,traffic,scroller,onChange,onAssist,onCollision}) {
  let track=null,vehicle=null,options=[],buttons=[],locked=true,paused=false;
  let waypoints=[],assistedIndex=-1,raf=0,previousFrame=0,previousReport=0,lastGuide='',lastReady=false;
  let movingCars=[],trafficNodes=[];
  const input={forward:false,reverse:false,left:false,right:false,brake:false};
  const clearInput=()=>{for(const key of Object.keys(input))input[key]=false;};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function snapshot(){
    const parking=track&&vehicle?parkingStatus(vehicle,track):{index:-1,ready:false,reason:'Start a drive to begin.'};
    return {car:vehicle,parking,assistedIndex,assisted:waypoints.length>0,locked,paused};
  }
  function positionCamera(){
    if(!track||!vehicle)return;
    const width=scroller.clientWidth,height=scroller.clientHeight;
    if(!width||!height)return;
    // True edge-to-edge cover camera: the controls are translucent HUD overlays,
    // so the driving world must continue underneath them on every screen size.
    // Cover (not contain) scales the road with its host iframe and aspect ratio.
    const scale=Math.max(width/track.width,height/TRACK_HEIGHT);
    const worldWidth=track.width*scale,worldHeight=TRACK_HEIGHT*scale;
    // Follow both axes when cropped, but never show an empty edge beyond the world.
    const offsetX=worldWidth<=width?(width-worldWidth)/2:
      clamp(width/2-vehicle.x*scale,width-worldWidth,0);
    const offsetY=worldHeight<=height?(height-worldHeight)/2:
      clamp(height/2-vehicle.y*scale,height-worldHeight,0);
    lot.style.transform='translate3d('+offsetX.toFixed(1)+'px,'+offsetY.toFixed(1)+'px,0) scale('+scale.toFixed(4)+')';
  }
  function render(now=0){
    if(!track||!vehicle)return;
    car.style.left=(vehicle.x/track.width*100)+'%';
    car.style.top=(vehicle.y/TRACK_HEIGHT*100)+'%';
    car.style.transform='translate(-50%,-50%) rotate('+vehicle.heading.toFixed(1)+'deg)';
    for(let i=0;i<movingCars.length;i++){
      const npc=movingCars[i],node=trafficNodes[i];
      node.style.left=(npc.x/track.width*100)+'%';
      node.style.top=(npc.y/TRACK_HEIGHT*100)+'%';
      node.style.transform='translate(-50%,-50%) rotate('+(npc.direction>0?90:-90)+'deg)';
    }
    positionCamera();
    const parking=parkingStatus(vehicle,track);
    for(let i=0;i<buttons.length;i++){
      buttons[i].classList.toggle('is-ready',parking.index===i&&parking.ready);
      buttons[i].classList.toggle('is-near',parking.index===i&&!parking.ready);
    }
    const guide=waypoints.length?'Driving to Bay '+(assistedIndex+1)+'. Press an arrow to take control.':parking.reason;
    if(guide!==lastGuide||parking.ready!==lastReady||now-previousReport>125){
      lastGuide=guide;lastReady=parking.ready;previousReport=now;
      onChange({...snapshot(),guide});
    }
  }
  function frame(now){
    raf=0;
    if(locked||paused||!track||!vehicle)return;
    const dt=Math.min((now-(previousFrame||now))/1000,.05);
    previousFrame=now;
    movingCars=stepTraffic(movingCars,dt,track);
    if(waypoints.length){
      const next=driveAssisted(vehicle,waypoints,dt);
      vehicle=next.car;waypoints=next.waypoints;
      if(!waypoints.length)assistedIndex=-1;
    }else vehicle=stepDriving(vehicle,input,dt,track);
    if(hitTraffic(vehicle,movingCars)){
      vehicle=startingCar(track);
      clearInput();waypoints=[];assistedIndex=-1;
      onCollision?.();
    }
    render(now);
    startFrame();
  }
  function stopFrame(){if(raf)cancelAnimationFrame(raf);raf=0;previousFrame=0;}
  function startFrame(){if(!raf&&!locked&&!paused)raf=requestAnimationFrame(frame);}
  function mount(offeredOptions){
    lock();
    options=[...offeredOptions];
    track=buildTrack(options.length);
    vehicle=startingCar(track);
    lot.style.width=track.width+'px';
    lot.style.height=track.height+'px';
    lot.style.setProperty('--bay-count',String(options.length));
    movingCars=createTraffic(track);
    trafficNodes=movingCars.map((npc,index)=>{
      const node=document.createElement('div');
      node.className='traffic-car traffic-car--'+(index+1);
      node.setAttribute('aria-hidden','true');
      const body=document.createElement('span');
      body.className='traffic-car-body';
      node.append(body);
      return node;
    });
    traffic.replaceChildren(...trafficNodes);
    buttons=options.map((option,index)=>{
      const button=document.createElement('button');
      button.type='button';button.className='bay';
      button.setAttribute('aria-label','Bay '+(index+1)+': '+option.text+'. Activate for assisted driving.');
      const badge=document.createElement('span');badge.className='bay-letter';badge.textContent=String(index+1);
      const marker=document.createElement('span');marker.className='bay-marker';marker.setAttribute('aria-hidden','true');marker.textContent='P';
      button.append(badge,marker);
      button.addEventListener('click',()=>assistTo(index));
      return button;
    });
    bays.replaceChildren(...buttons);
    locked=false;
    lastGuide='';previousReport=0;lastReady=false;assistedIndex=-1;
    clearInput();waypoints=[];
    render();startFrame();
  }
  function assistTo(index){
    if(locked||paused||!track||!vehicle||!options[index])return false;
    clearInput();
    waypoints=assistedRoute(vehicle,track,index);
    assistedIndex=index;
    onAssist(index+1);
    render();startFrame();
    return true;
  }
  function setDrive(key,held){
    if(!Object.hasOwn(input,key))return;
    if(locked||paused){input[key]=false;return;}
    input[key]=Boolean(held);
    if(held&&waypoints.length){waypoints=[];assistedIndex=-1;}
    render();
  }
  function releaseControls(){clearInput();}
  function setPaused(next){
    paused=Boolean(next);
    if(paused){clearInput();stopFrame();}
    else startFrame();
    render();
  }
  function reset(){
    if(locked||paused||!track)return;
    vehicle=startingCar(track);
    waypoints=[];assistedIndex=-1;clearInput();
    render();startFrame();
  }
  function parkingChoice(){
    if(locked||paused||!track||!vehicle)return null;
    const status=parkingStatus(vehicle,track);
    return status.ready?options[status.index].id:null;
  }
  function lock(){
    locked=true;clearInput();waypoints=[];assistedIndex=-1;stopFrame();
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
  function canPark(){return parkingChoice()!==null;}
  function canDrive(){return !locked&&!paused&&Boolean(track&&vehicle);}
  function state(){return snapshot();}
  if(typeof ResizeObserver==='function'){
    const observer=new ResizeObserver(()=>positionCamera());
    observer.observe(scroller);
  }else window.addEventListener('resize',positionCamera);
  return {mount,setDrive,releaseControls,setPaused,reset,parkingChoice,park,lock,canPark,canDrive,state};
}
