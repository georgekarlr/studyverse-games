import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const dir=new URL('../source/',import.meta.url);
const read=async name=>(await readFile(new URL(name,dir))).toString('utf8');
const manifest=JSON.parse(await readFile(new URL('../.studyverse/source-manifest.json',import.meta.url),'utf8'));
const driveCommands=['forward','reverse','left','right','brake'];
const supported=new Set(['article','aside','b','br','button','code','div','em','footer','h1','h2',
 'h3','h4','header','hr','li','main','ol','p','pre','section','small','span','strong','ul']);
const attrs=new Set(['class','id','role','title','aria-label','aria-live','aria-hidden','aria-modal',
 'aria-haspopup','aria-labelledby','aria-describedby','aria-controls','tabindex']);
const bodyMarkup=html=>html.split('<body>')[1]?.split('<script type="module"')[0]??'';

test('actual source body only uses bounded current player HTML elements and attributes',async()=>{
 const body=bodyMarkup(await read('index.html'));
 assert.ok(body.startsWith('\n  <main')&&body.includes('id="question-dialog-panel"'));
 for(const [,tag,attributes] of body.matchAll(/<([a-z][a-z0-9-]*)([^<>]*)>/g)){
  assert.ok(supported.has(tag),'unsupported element '+tag);
  for(const match of attributes.matchAll(/\s([a-z][a-z-]*)(?:="([^"]*)")?/g)){
   const name=match[1],value=match[2]??'';
   assert.ok(attrs.has(name)||(tag==='button'&&['type','disabled'].includes(name)),
    'unsupported attribute '+tag+':'+name);
   assert.ok(Buffer.byteLength(value,'utf8')<=256,'oversized attribute '+name);
   if(name==='type')assert.equal(value,'button');
  }
 }
 assert.doesNotMatch(body,/\bdata-[a-z-]+\s*=|\shidden(?=[ >])|<ol\b/);
});

test('all drive controls retain stable one-to-one real pointer commands',async()=>{
 const [html,main]=await Promise.all([read('index.html'),read('main.js')]);
 for(const command of driveCommands){
  assert.equal((html.match(new RegExp('id="drive-'+command+'"','g'))??[]).length,1);
  assert.match(main,new RegExp("byId\\('drive-'\\+command\\)"));
 }
 assert.match(main,/driveButtons=driveNames\.map\(command/);
 assert.doesNotMatch(main,/dataset\.drive|querySelectorAll\('\[data-drive\]'\)/);
 assert.match(main,/pointerdown/);
 assert.match(main,/pointerup/);
 assert.match(main,/keydown/);
 assert.match(main,/keyup/);
});

test('modal, fallback, exit and replay remain invisible until programmatically shown',async()=>{
 const [html,main,dialog,css]=await Promise.all([
  read('index.html'),read('main.js'),read('question-dialog.js'),read('styles.css')
 ]);
 for(const id of ['exit','question-modal','demo','again']){
  assert.match(html,new RegExp('<(?:button|div)[^>]+id="'+id+'"[^>]+class="[^"]*is-hidden'));
 }
 assert.match(css,/\.is-hidden\{display:none!important\}/);
 assert.match(main,/setVisible\(ui\.exit,nextSession\.kind==='module'\)/);
 assert.match(dialog,/backdrop\.classList\.add\('is-hidden'\)/);
 assert.match(dialog,/backdrop\.classList\.remove\('is-hidden'\)/);
 assert.doesNotMatch(main+dialog,/\.hidden\s*=|instanceof HTMLElement/);
});

test('source manifest pins exact edited bytes; fixed type and Student answer privacy retained',async()=>{
 assert.equal(manifest.fixed_item_type,'multiple_choice');
 for(const name of ['index.html','main.js','question-dialog.js','styles.css']){
  const b=await readFile(new URL(name,dir));
  const file=manifest.source_files.find(x=>x.path===name);
  assert.equal(file?.size_bytes,b.byteLength,name+' size');
  assert.equal(file?.sha256_hex,createHash('sha256').update(b).digest('hex'),name+' digest');
 }
 const session=await read('studyverse-session.js');
 assert.match(session,/item_type !== 'multiple_choice'/);
 assert.match(session,/submitAnswer\(\{item_id:item\.id,response:\{value:optionId\}\}\)/);
 assert.doesNotMatch(session,/checkAnswer|getAnswerKey|correct_choice_id/);
});
