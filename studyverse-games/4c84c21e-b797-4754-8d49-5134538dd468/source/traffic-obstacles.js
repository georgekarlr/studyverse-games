// Pure, composable world-space NPC traffic: no DOM, SDK or answer access.
export const TRAFFIC_CAR_COUNT = 5;
const ROAD_BANDS = [335,430,525,620,715];
const SIDE_MARGIN = 67;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const randomBetween = (rng,min,max) => min+(max-min)*clamp(Number(rng())||0,0,1);

// All five cars stay in separate driving-road bands below the parking bays (y <= 269).
export function createTraffic(track,rng=Math.random) {
  const offsets=[0.18,0.49,0.82,0.32,0.67];
  return ROAD_BANDS.map((laneY,id)=>({
    id,
    laneY,
    x:clamp(track.width*offsets[id]+randomBetween(rng,-28,28),SIDE_MARGIN,track.width-SIDE_MARGIN),
    y:laneY,
    targetY:laneY,
    direction:rng()<0.5?-1:1,
    speed:randomBetween(rng,48,100),
    turnIn:randomBetween(rng,1.4,3.6)
  }));
}

// Car speeds, turn intervals and gentle lane drift independently change over time.
// Reflection at the road edges preserves all three cars and avoids teleporting.
export function stepTraffic(cars,seconds,track,rng=Math.random) {
  const dt=clamp(Number.isFinite(seconds)?seconds:0,0,0.05);
  if(dt===0)return cars;
  return cars.map(car=>{
    let {x,y,direction,speed,targetY,turnIn}=car;
    turnIn-=dt;
    if(turnIn<=0){
      direction=rng()<0.23?-direction:direction;
      speed=randomBetween(rng,48,105);
      targetY=car.laneY+randomBetween(rng,-8,8);
      turnIn=randomBetween(rng,1.4,3.6);
    }
    x+=direction*speed*dt;
    const right=track.width-SIDE_MARGIN;
    if(x<SIDE_MARGIN){x=SIDE_MARGIN+(SIDE_MARGIN-x);direction=1;}
    if(x>right){x=right-(x-right);direction=-1;}
    y=clamp(y+clamp(targetY-y,-18*dt,18*dt),car.laneY-8,car.laneY+8);
    return {...car,x,y,direction,speed,targetY,turnIn};
  });
}

// Axis-aligned envelopes of the oriented player and horizontal traffic models;
// padding prevents harmless near-misses from resetting the car.
export function hitTraffic(player,cars) {
  if(!player)return false;
  const angle=player.heading*Math.PI/180;
  const c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
  const halfWidth=25*c+41*s,halfHeight=25*s+41*c;
  return cars.some(car=>Math.abs(player.x-car.x)<halfWidth+37 &&
    Math.abs(player.y-car.y)<halfHeight+21);
}
