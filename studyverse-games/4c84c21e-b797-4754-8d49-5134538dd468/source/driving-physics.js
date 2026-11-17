// Stateless arcade steering and geometrical parking rules, independent of the DOM and SDK.
export const TRACK_HEIGHT = 620;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const approach = (value,amount) => value>0?Math.max(0,value-amount):Math.min(0,value+amount);

export function buildTrack(numberOfBays) {
  if (!Number.isInteger(numberOfBays) || numberOfBays<2 || numberOfBays>24) {
    throw new Error('This Game needs between 2 and 24 answer bays.');
  }
  const width = Math.max(960,110 + numberOfBays*186);
  const slotWidth = (width-110)/numberOfBays;
  const bays = Array.from({length:numberOfBays},(_,index)=>({
    index,
    x:55 + index*slotWidth,
    centerX:55 + (index+0.5)*slotWidth,
    width:slotWidth,
    top:70,bottom:269
  }));
  return {width,height:TRACK_HEIGHT,bays};
}
export function startingCar(track) {
  return {x:track.width/2,y:537,heading:0,speed:0};
}
export function shortestAngle(a,b) {
  return ((a-b+540)%360)-180;
}
// Heading 0 means north/up. Speed is in game-world units per second, not a real driving speed.
export function stepDriving(car,inputs,seconds,track) {
  const dt=clamp(Number.isFinite(seconds)?seconds:0,0,0.05);
  const forward=Boolean(inputs.forward),reverse=Boolean(inputs.reverse),brake=Boolean(inputs.brake);
  let speed=car.speed;
  if (brake || (forward&&reverse)) speed=approach(speed,480*dt);
  else if (forward) speed=clamp(speed+205*dt,-115,190);
  else if (reverse) speed=clamp(speed-155*dt,-115,190);
  else speed=approach(speed,95*dt);
  let heading=car.heading;
  const steer=(inputs.right?1:0)-(inputs.left?1:0);
  if (Math.abs(speed)>3) heading+=steer*speed/190*98*dt;
  heading=shortestAngle(heading,0);
  const angle=heading*Math.PI/180;
  const x=car.x+Math.sin(angle)*speed*dt;
  const y=car.y-Math.cos(angle)*speed*dt;
  const boundedX=clamp(x,32,track.width-32);
  const boundedY=clamp(y,54,track.height-37);
  if(x!==boundedX||y!==boundedY) speed=0;
  return {x:boundedX,y:boundedY,heading,speed};
}
export function parkingStatus(car,track) {
  const bay=track.bays.find(row=>{
    const safeWidth=Math.max(38,Math.min(80,row.width/2-27));
    return Math.abs(car.x-row.centerX)<=safeWidth && car.y>=150 && car.y<=223;
  });
  if(!bay) return {index:-1,ready:false,reason:'Drive into a marked answer bay to park.'};
  if(Math.abs(car.speed)>15) return {index:bay.index,ready:false,reason:'Bay '+(bay.index+1)+': brake until the car stops.'};
  if(Math.min(Math.abs(shortestAngle(car.heading,0)),Math.abs(shortestAngle(car.heading,180)))>36){
    return {index:bay.index,ready:false,reason:'Bay '+(bay.index+1)+': align your car with the parking lines.'};
  }
  return {index:bay.index,ready:true,reason:'Aligned in Bay '+(bay.index+1)+'. Park to submit this answer.'};
}
// Assisted driving follows a road waypoint and then enters the chosen parking bay.
// It moves the car through actual positions and stops; it never submits an answer.
export function assistedRoute(car,track,bayIndex) {
  const bay=track.bays[bayIndex];
  if(!bay) return [];
  return [{x:car.x,y:342},{x:bay.centerX,y:342},{x:bay.centerX,y:192}];
}
export function driveAssisted(car,waypoints,seconds) {
  const dt=clamp(Number.isFinite(seconds)?seconds:0,0,0.05);
  const next=[...waypoints];
  let state={...car},remaining=158*dt;
  while(next.length&&remaining>0){
    const point=next[0],dx=point.x-state.x,dy=point.y-state.y;
    const distance=Math.hypot(dx,dy);
    if(distance<0.01){next.shift();continue;}
    const distanceToMove=Math.min(distance,remaining);
    state.x+=dx/distance*distanceToMove;
    state.y+=dy/distance*distanceToMove;
    state.heading=Math.atan2(dx,-dy)*180/Math.PI;
    state.speed=distanceToMove/dt;
    remaining-=distanceToMove;
    if(distanceToMove>=distance-0.01)next.shift();
  }
  if(!next.length){state.heading=0;state.speed=0;}
  return {car:state,waypoints:next};
}
