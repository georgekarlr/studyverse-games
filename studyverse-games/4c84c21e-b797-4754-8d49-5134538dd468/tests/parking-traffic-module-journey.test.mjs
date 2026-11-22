/**
 * Exercises original owner-authored physics + real five NPC traffic cars +
 * renderer-only SDK proposal. No DOM, network, browser, answer key exposure,
 * synthetic UI replacement, official grade or saved Game package.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Source remains ESM independently of root package type/compiler.
const fromSource=async name=>import('data:text/javascript;base64,'+
 (await readFile(new URL('../source/'+name,import.meta.url))).toString('base64'));
const {
 buildTrack,startingCar,stepDriving,assistedRoute,driveAssisted,parkingStatus
}=await fromSource('driving-physics.js');
const {createTraffic,stepTraffic,hitTraffic}=
 await fromSource('traffic-obstacles.js');
const {createModuleSession}=await fromSource('studyverse-session.js');

const STUDY_ITEM_ID='00000000-0000-4000-8000-000000000021';
const SECONDS_PER_FRAME=0.0167;
const seededTraffic=()=>0.37;
const fixture=()=>({
 id:STUDY_ITEM_ID,item_type:'multiple_choice',schema_version:1,
 content:{question:'Which traffic signal means stop?',options:[
  {id:'choice-0',text:'Green light'}, {id:'choice-1',text:'Red light'}
 ]},
 // Deliberately present a forbidden creator-only value to verify stripping.
 answer_key:{correct_choice_id:'choice-1'}
});

/** One physical 60Hz step, not an invented teleport into a parking bay. */
const tick=(car,cars,track,route=null,manual=null)=>{
 const traffic=stepTraffic(cars,SECONDS_PER_FRAME,track,seededTraffic);
 const updated=route===null?
  {car:stepDriving(car,manual,SECONDS_PER_FRAME,track),waypoints:null}:
  driveAssisted(car,route,SECONDS_PER_FRAME);
 return {...updated,traffic,collision:hitTraffic(updated.car,traffic)};
};

test('real traffic-aware ArrowUp -> Bay 2 -> deliberate Park -> one Module proposal -> Exit',
 {timeout:10_000},async()=>{
 const calls=[];
 const sdk={
  getItem:async()=>{calls.push({method:'getItem'});return fixture();},
  submitAnswer:async params=>{calls.push({method:'submitAnswer',params});return{status:'preview_only'};},
  exitToStandard:async()=>{calls.push({method:'exitToStandard'});}
 };
 const session=createModuleSession(sdk);
 const item=await session.load();
 const track=buildTrack(item.options.length);
 assert.equal(item.options.length,2);
 assert.deepEqual(Object.keys(item).sort(),['id','options','question']);
 assert.equal(Object.hasOwn(item,'answer_key'),false);
 let car=startingCar(track),cars=createTraffic(track,seededTraffic);
 const beginning=car;
 assert.equal(cars.length,5);
 // Emulate 550 ms of true keyboard-held forward acceleration while moving
 // traffic advances in exactly the same tick as the authored Game frame.
 for(let i=0;i<33;i++){
  const state=tick(car,cars,track,null,{
   forward:true,reverse:false,left:false,right:false,brake:false
  });
  assert.equal(state.collision,false,'keyboard drive should not start inside traffic');
  car=state.car;cars=state.traffic;
 }
 assert.ok(car.y<beginning.y,'car moved toward the top of the real road');
 assert.notEqual(cars[0].x,createTraffic(track,seededTraffic)[0].x,
  'the actual NPC traffic moved during real driving');
 // The next action is a generated real bay choice (not an answer submission).
 let route=assistedRoute(car,track,1);
 assert.ok(route.length>0);
 assert.deepEqual(calls.map(x=>x.method),['getItem']);
 let assistedFrames=0;
 while(route.length&&assistedFrames++<1500){
  const state=tick(car,cars,track,route);
  assert.equal(state.collision,false,'assistance must not ignore a real traffic collision');
  car=state.car;cars=state.traffic;route=state.waypoints;
 }
 assert.ok(assistedFrames>1&&assistedFrames<1500,'assisted road travel completed');
 const bay=parkingStatus(car,track);
 assert.equal(bay.ready,true,'car entire hitbox sits inside actual marked bay');
 assert.equal(bay.index,1,'the selected second bay is the actual parked bay');
 assert.deepEqual(calls.map(x=>x.method),['getItem'],
  'manual driving and assisted arrival must never auto-submit an answer');
 // Deliberate Park confirmation is represented by a separate explicit call.
 const receipt=await session.submit(item,item.options[bay.index].id);
 assert.equal(receipt.status,'preview_only');
 assert.deepEqual(calls[1],{
  method:'submitAnswer',params:{
   item_id:STUDY_ITEM_ID,response:{value:'choice-1'}
  }
 });
 assert.equal(calls.length,2,'Study Standard remains the sole grader');
 await assert.rejects(session.submit(item,'choice-1'),/already submitted/);
 assert.equal(calls.length,2,'even a retry cannot double-submit');
 await session.exit();
 assert.deepEqual(calls.map(x=>x.method),
  ['getItem','submitAnswer','exitToStandard']);
});

test('real moving NPC geometry detects a collision without creating an SDK answer',
 {timeout:10_000},()=>{
 const track=buildTrack(2);
 let car=startingCar(track),cars=createTraffic(track,seededTraffic);
 let route=assistedRoute(car,track,0),contact=false;
 for(let frame=0;frame<1500&&route.length;frame++){
  const state=tick(car,cars,track,route);
  car=state.car;cars=state.traffic;route=state.waypoints;
  if(state.collision){contact=true;break;}
 }
 // This seeded left-bay route currently encounters a moving car; unlike the
 // right-bay positive case, it MUST NOT be counted as a parked choice.
 assert.equal(contact,true,'the authored collision detector actually tripped');
 assert.equal(parkingStatus(car,track).ready,false);
 // The source-level physics functions have no GameSDK binding, so no answer
 // can be sent by a traffic collision or assisted frame.
 assert.equal('GameSDK' in globalThis,false);
});
