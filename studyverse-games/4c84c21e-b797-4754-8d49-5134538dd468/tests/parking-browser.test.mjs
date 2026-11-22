/**
 * PRIVATE local Chromium rehearsal of the ACTUAL authored nine-file Game.
 * It checks out real source for manifest-pinned memory delivery by default,
 * or ephemeral loopback HTTP with SV_PARKING_BROWSER_DELIVERY=loopback.
 *
 * It does not verify a compiled/saved receipt, isolated public QuickJS runtime,
 * current browser-rights/host integration, answer correctness or public Play.
 * No production secrets, answer keys, external network requests or account data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {verifiedInMemorySourceBundle,importVerifiedAuthorModules}
 from './in-memory-source-loader.mjs';

const source=new URL('../source/',import.meta.url);
const allowed=new Set([
 'index.html','styles.css','focus-layout.css','main.js','driving-physics.js',
 'parking-lot.js','question-dialog.js','studyverse-session.js',
 'traffic-obstacles.js'
]);
const types={'.html':'text/html; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const ITEM_ID='00000000-0000-4000-8000-000000000021';

async function localSourceServer(){
 const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url??'/','http://localhost').pathname;
  const filename=pathname==='/'?'index.html':pathname.slice(1);
  if(req.method!=='GET'||!allowed.has(filename)){
   res.writeHead(404,{'Cache-Control':'no-store'}).end();return;
  }
  try{
   const body=await readFile(new URL(filename,source));
   const ext=filename.slice(filename.lastIndexOf('.'));
   res.writeHead(200,{'Content-Type':types[ext],
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(body);
  }catch{
   res.writeHead(404,{'Cache-Control':'no-store'}).end();
  }
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
 });
 return {server,origin:'http://127.0.0.1:'+server.address().port};
}

/** Same learner-safe fixture in both native HTTP and in-memory delivery modes. */
function installSyntheticModuleSdk({id,count,itemType}){
 window.__sdkCalls=[];
 // Deterministic traffic is still animated and uses the real source physics.
 Math.random=()=>0.37;
 const item={
  id,item_type:itemType,schema_version:1,
  content:{question:'Which traffic signal means stop?',
   options:Array.from({length:count},(_,i)=>({
    id:'choice-'+i,text:i===1?'Red light':'Choice '+(i+1)
   }))}
 };
 window.GameSDK=Object.freeze({module:Object.freeze({
  getItem:async()=>{
   window.__sdkCalls.push({method:'getItem'});
   return structuredClone(item);
  },
  submitAnswer:async request=>{
   window.__sdkCalls.push({method:'submitAnswer',request});
   return {status:'preview_only'};
  },
  exitToStandard:async()=>{
   window.__sdkCalls.push({method:'exitToStandard'});
  }
 })});
}

async function openGame(t,{count=2,itemType='multiple_choice',viewport={width:1280,height:850}}={}){
 const delivery=process.env.SV_PARKING_BROWSER_DELIVERY||'memory';
 if(!['memory','loopback'].includes(delivery))throw Error('unsupported_browser_delivery');
 const host=delivery==='loopback'?await localSourceServer():null;
 let browser;
 t.after(async()=>{
  try{await browser?.close();}finally{
   if(host)await new Promise(resolve=>host.server.close(resolve));
  }
 });
 browser=await chromium.launch({headless:true,
  ...(process.env.SV_LOCAL_CHROMIUM_EXECUTABLE?
   {executablePath:process.env.SV_LOCAL_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport,acceptDownloads:false});
 const page=await context.newPage();
 const external=[];
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error.message).slice(0,160)));
 // Memory mode denies all HTTP. Loopback mode allows ONLY its own ephemeral host.
 await page.route('**/*',route=>{
  if(!host||new URL(route.request().url()).origin!==host.origin){
   external.push('blocked');return route.abort();
  }
  return route.continue();
 });
 const fixture={id:ITEM_ID,count,itemType};
 if(delivery==='memory'){
  // Exact nine Git files must match their owner source manifest first.
  // JS is never fetched or evaluated through HTTP; the browser's real native
  // ESM loader imports the original modules through local blob URLs.
  const bundle=await verifiedInMemorySourceBundle();
  await page.setContent(bundle.document,{waitUntil:'load'});
  await page.evaluate(installSyntheticModuleSdk,fixture);
  await importVerifiedAuthorModules(page,bundle.modules);
 }else{
  await page.addInitScript(installSyntheticModuleSdk,fixture);
  await page.goto(host.origin+'/',{waitUntil:'load'});
 }
 return {page,errors,external};
}

test('real authored desktop Game: keyboard movement, question, Bay 2 parking, one proposal, Exit',
 {timeout:75_000},async t=>{
 const {page,errors,external}=await openGame(t);
 await page.waitForFunction(()=>
  document.querySelector('#mode-tag')?.textContent==='PRIVATE PREVIEW'&&
  document.querySelectorAll('#bays .bay').length===2&&
  document.querySelector('#park')?.disabled===true);
 assert.deepEqual(await page.evaluate(()=>window.__sdkCalls.map(x=>x.method)),['getItem']);
 assert.equal(await page.locator('#modal-options li').count(),2);
 // Question dialog is an existing pause/return/focus control, not a grader.
 await page.locator('#info').click();
 await page.locator('#question-modal:not(.is-hidden)').waitFor();
 assert.match(await page.locator('#modal-question').innerText(),/traffic signal/);
 await page.keyboard.press('Escape');
 assert.ok(await page.locator('#question-modal').evaluate(x=>x.classList.contains('is-hidden')));

 const before=await page.locator('#car').evaluate(x=>x.style.getPropertyValue('--vehicle-y'));
 await page.keyboard.down('ArrowUp');
 await page.waitForTimeout(550);
 await page.keyboard.up('ArrowUp');
 const after=await page.locator('#car').evaluate(x=>x.style.getPropertyValue('--vehicle-y'));
 assert.notEqual(after,before,'actual keyboard drive moves car world position');

 // A genuine keyboard Enter on the real Bay 2 button starts authored assisted
 // movement. Assistance never submits; the learner must click Park after arrival.
 await page.locator('#bays .bay').nth(1).press('Enter');
 await page.waitForFunction(()=>document.querySelector('#parking-guide')?.textContent.includes('Driving to Bay 2'),
  null,{timeout:4_000});
 assert.equal((await page.evaluate(()=>window.__sdkCalls)).length,1,'assisted driving never submits');
 await page.waitForFunction(()=>document.querySelector('#park')?.disabled===false,
  null,{timeout:35_000});
 assert.equal((await page.evaluate(()=>window.__sdkCalls)).length,1,'arriving in bay does not submit');
 await page.locator('#park').click();
 await page.waitForFunction(()=>window.__sdkCalls.some(x=>x.method==='submitAnswer'),
  null,{timeout:5_000});
 const calls=await page.evaluate(()=>window.__sdkCalls);
 assert.deepEqual(calls.map(x=>x.method),['getItem','submitAnswer']);
 assert.deepEqual(calls[1].request,{item_id:ITEM_ID,response:{value:'choice-1'}});
 assert.match(await page.locator('#status').innerText(),/No correctness or score was recorded/);
 await page.locator('#exit').click();
 await page.waitForFunction(()=>window.__sdkCalls.some(x=>x.method==='exitToStandard'),
  null,{timeout:5_000});
 assert.deepEqual(await page.evaluate(()=>window.__sdkCalls.map(x=>x.method)),
  ['getItem','submitAnswer','exitToStandard']);
 assert.deepEqual(external,[],'no external source/network requests');
 assert.deepEqual(errors,[],'no unhandled real source errors');
});

test('real authored touch controls: held pointer drives and Exit requests Standard only',
 {timeout:35_000},async t=>{
 const {page,errors,external}=await openGame(t,{viewport:{width:390,height:844}});
 await page.waitForFunction(()=>document.querySelectorAll('#bays .bay').length===2);
 const button=page.locator('#drive-forward');
 const box=await button.boundingBox();
 assert.ok(box&&box.width>20&&box.height>20,'responsive touch button visible');
 const before=await page.locator('#car').evaluate(x=>x.style.getPropertyValue('--vehicle-y'));
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.waitForTimeout(650);
 await page.mouse.up();
 const after=await page.locator('#car').evaluate(x=>x.style.getPropertyValue('--vehicle-y'));
 assert.notEqual(before,after,'actual pointer hold moves car');
 assert.equal((await page.evaluate(()=>window.__sdkCalls)).length,1,
  'steering is not an answer submission');
 await page.locator('#exit').click();
 await page.waitForFunction(()=>window.__sdkCalls.some(x=>x.method==='exitToStandard'));
 assert.deepEqual(await page.evaluate(()=>window.__sdkCalls.map(x=>x.method)),
  ['getItem','exitToStandard']);
 assert.deepEqual(external,[]);
 assert.deepEqual(errors,[]);
});

test('25 answer choices safely Exit to Standard without mounting or submitting',
 {timeout:25_000},async t=>{
 const {page,errors,external}=await openGame(t,{count:25});
 await page.waitForFunction(()=>window.__sdkCalls.some(x=>x.method==='exitToStandard'));
 assert.deepEqual(await page.evaluate(()=>window.__sdkCalls.map(x=>x.method)),
  ['getItem','exitToStandard']);
 assert.equal(await page.locator('#bays .bay').count(),0,
  'out-of-range Study Item cannot map to a partial/broken road');
 assert.match(await page.locator('#status').innerText(),/24 answer bays/);
 assert.deepEqual(external,[]);
 assert.deepEqual(errors,[]);
});
