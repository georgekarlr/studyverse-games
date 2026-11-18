// Stateless arcade steering and geometrical parking rules, independent of the DOM and SDK.
export const TRACK_HEIGHT = 960;
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
  return {x:track.width/2,y:track.height-83,heading:0,speed:0};
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
  // Detect the actual numbered parking box, not an invisible narrow center strip.
  // The complete rotated 50 × 82 player car must fit inside its painted outline.
  const bay=track.bays.find(row=>
    car.x>=row.x && car.x<=row.x+row.width &&
    car.y>=row.top && car.y<=row.bottom
  );
  if(!bay) return {index:-1,ready:false,reason:'Drive into a marked answer bay to park.'};
  const angle=(Number.isFinite(car.heading)?car.heading:0)*Math.PI/180;
  const cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
  const halfWidth=25*cos+41*sin,halfHeight=25*sin+41*cos;
  const inset=5; // Keep the sprite inside the painted boundary even when turned sideways.
  const inside=car.x-halfWidth>=bay.x+inset &&
    car.x+halfWidth<=bay.x+bay.width-inset &&
    car.y-halfHeight>=bay.top+inset &&
    car.y+halfHeight<=bay.bottom-inset;
  return {index:bay.index,ready:inside,reason:inside
    ? 'Inside Bay '+(bay.index+1)+'. Press Park to submit this answer.'
    : 'Bay '+(bay.index+1)+': move your whole car inside the parking lines.'};
}
// Assisted driving follows a road waypoint and then enters the chosen parking bay.
// It moves the car through actual positions and stops; it never submits an answer.
export function assistedRoute(car,track,bayIndex) {
  const bay=track.bays[bayIndex];
  if(!bay) return [];
  // Stage horizontal alignment below the last traffic band when starting near START.
  // Once nearer a bay, never force an unnecessary retreat to the far end.
  const approachY=Math.max(342,Math.min(car.y,track.height-145));
  return [{x:car.x,y:approachY},{x:bay.centerX,y:approachY},{x:bay.centerX,y:192}];
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
