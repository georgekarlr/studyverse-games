import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Load the real, unbundled source as ESM independently of a project-wide
// package.json. No browser DOM, network, test framework or grader is required.
const fromSource = async file => import('data:text/javascript;base64,'+
  (await readFile(new URL('../source/'+file,import.meta.url))).toString('base64'));

const {normalizeMultipleChoice,createModuleSession,createSampleSession} =
  await fromSource('studyverse-session.js');
const {buildTrack,startingCar,assistedRoute,driveAssisted,parkingStatus} =
  await fromSource('driving-physics.js');

const fixture = (count) => ({
  id:'00000000-0000-4000-8000-000000000021',item_type:'multiple_choice',
  content:{question:'Choose a bay.',options:Array.from({length:count},(_,i)=>({
    id:'answer-'+i,text:'Choice '+(i+1)
  }))},
  answer_key:{evaluator:{correct_choice_id:'answer-0'}}
});

test('2 and 24 valid choices map 1:1 to actual parking bays without answer keys',()=>{
  for (const n of [2,24]) {
    const item=normalizeMultipleChoice(fixture(n));
    assert.equal(item.options.length,n);
    assert.equal(buildTrack(n).bays.length,n);
    assert.equal(Object.hasOwn(item,'answer_key'),false);
    assert.deepEqual(Object.keys(item).sort(),['id','options','question']);
  }
});
test('25–30 Study-compatible choices reject before the road generator is called',()=>{
  for (const n of [25,30]) {
    assert.throws(()=>normalizeMultipleChoice(fixture(n)),/at most 24 answer bays/);
    assert.throws(()=>buildTrack(n),/between 2 and 24/);
  }
});
test('oversized Module calls only SDK Exit to Standard, never answer submission',async()=>{
  const calls=[];
  const sdk={getItem:async()=>{calls.push('get');return fixture(30);},
    exitToStandard:async()=>{calls.push('exit');},
    submitAnswer:async()=>{calls.push('submit');}};
  const session=createModuleSession(sdk);
  await assert.rejects(session.load(),/Returning to Study Standard/);
  assert.deepEqual(calls,['get','exit']);
});
test('fixed type mismatch also exits, without a proposal',async()=>{
  const calls=[];
  const sdk={getItem:async()=>({...fixture(2),item_type:'ordering'}),
    exitToStandard:async()=>{calls.push('exit');},
    submitAnswer:async()=>{calls.push('submit');}};
  await assert.rejects(createModuleSession(sdk).load(),/fixed to Multiple Choice/);
  assert.deepEqual(calls,['exit']);
});
test('valid Module submits exactly one normalized choice proposal, never a score',async()=>{
  const calls=[];
  const sdk={getItem:async()=>fixture(2),
    submitAnswer:async value=>{calls.push(value);return{status:'preview_only'};},
    exitToStandard:async()=>{throw Error('unexpected exit');}};
  const s=createModuleSession(sdk),item=await s.load();
  assert.equal((await s.submit(item,'answer-1')).status,'preview_only');
  assert.deepEqual(calls,[{item_id:item.id,response:{value:'answer-1'}}]);
  await assert.rejects(s.submit(item,'answer-0'),/already submitted/);
  assert.equal(calls.length,1);
});
test('assisted route reaches each compatible target without submitting',()=>{
  for (const count of [2,5,24]) {
    const track=buildTrack(count);
    for (const bay of [0,count-1]) {
      let car=startingCar(track),route=assistedRoute(car,track,bay);
      for (let i=0;i<550&&route.length;i++) {
        const next=driveAssisted(car,route,.05);
        car=next.car;route=next.waypoints;
      }
      assert.equal(route.length,0,'route must end');
      const status=parkingStatus(car,track);
      assert.equal(status.ready,true,'whole car inside bay');
      assert.equal(status.index,bay);
    }
  }
});
test('synthetic sample drive never grades or saves progress',async()=>{
  const s=createSampleSession(),item=await s.load();
  const result=await s.submit(item,item.options[0].id);
  assert.deepEqual(result,{status:'sample_only'});
});
