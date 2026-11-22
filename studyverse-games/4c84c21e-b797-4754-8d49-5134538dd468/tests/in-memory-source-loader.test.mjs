import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifiedInMemorySourceBundle,importVerifiedAuthorModules,
 AUTHOR_SOURCE_FILES,MODULE_LOAD_ORDER} from './in-memory-source-loader.mjs';

const html='<!doctype html><html><head><link rel="stylesheet" href="./styles.css">'+
 '<link rel="stylesheet" href="./focus-layout.css"></head><body><div id="game">Game</div>'+
 '<script type="module" src="./main.js"></script></body></html>';
const source=Object.fromEntries(AUTHOR_SOURCE_FILES.map(name=>[name,
 name==='index.html'?html:name.endsWith('.css')?'body{color:blue}':
 name==='main.js'?"import {ready} from './studyverse-session.js'; document.getElementById('game').textContent=ready;":
 name==='studyverse-session.js'?'export const ready="Game ready";':'export const ready=true;']));
function fixture(overrides={}){
 const current={...source,...overrides};
 const source_files=AUTHOR_SOURCE_FILES.map(path=>{
  const bytes=Buffer.from(source[path]);
  return {path,size_bytes:bytes.length,sha256_hex:createHash('sha256').update(bytes).digest('hex')};
 });
 const manifest=JSON.stringify({fixed_item_type:'multiple_choice',source_files});
 const read=async url=>{
  const path=url.pathname.split('/').at(-1);
  return Buffer.from(path==='source-manifest.json'?manifest:current[path]??'');
 };
 return {read};
}

test('nine real-source entry names and fixed module order are stable',()=>{
 assert.equal(AUTHOR_SOURCE_FILES.length,9);
 assert.equal(MODULE_LOAD_ORDER.length,6);
 assert.equal(new Set(AUTHOR_SOURCE_FILES).size,9);
});
test('exact verified original byte sources are embedded without external dependency',async()=>{
 const bundle=await verifiedInMemorySourceBundle(fixture());
 assert.match(bundle.document,/<style>\nbody\{color:blue\}/);
 assert.match(bundle.document,/<div id="game">Game<\/div>/);
 assert.doesNotMatch(bundle.document,/<script\b[^>]*src=|<link\b[^>]*href=/);
 assert.deepEqual(bundle.modules.map(x=>x.name),MODULE_LOAD_ORDER);
 assert.match(bundle.modules.at(-1).code,/from '\.\/studyverse-session\.js'/);
});
test('source byte change without updated manifest fails closed',async()=>{
 await assert.rejects(verifiedInMemorySourceBundle(fixture({'main.js':'modified'})),
  /owner_source_byte_mismatch/);
});
test('unsupported relative module import fails before browser execution',async()=>{
 const page={evaluate:(fn,data)=>fn(data)};
 await assert.rejects(importVerifiedAuthorModules(page,[{name:'main.js',
  code:"import {hidden} from './no-such-file.js';"}]),/unresolved_author_module_import/);
});
