/** Source-bounded check for known current private CSS v2 containment rules.
 * This is NOT a full css-tree or browser qualification: it only guards the
 * two specifically reviewed no-fixed-position and z-index bounds.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const dir=new URL('../source/',import.meta.url);
const read=name=>readFile(new URL(name,dir),'utf8');
const manifest=JSON.parse(await readFile(new URL('../.studyverse/source-manifest.json',import.meta.url),'utf8'));

test('actual Car Parking overlay uses the existing local positioned Game shell',async()=>{
 const main=await read('styles.css');
 assert.match(main,/\.game-shell\{position:relative;/);
 assert.match(main,/\.modal-backdrop\{position:absolute;inset:0;z-index:20;/);
 assert.doesNotMatch(main,/(?:^|[;{])\s*position\s*:\s*fixed\b/i);
});

test('all authored CSS z-index values fit private CSS v2 local +/-20 budget',async()=>{
 const css=(await read('styles.css'))+'\n'+(await read('focus-layout.css'));
 const values=[...css.matchAll(/(?:^|[;{])\s*z-index\s*:\s*(-?\d+)/g)]
  .map(match=>Number(match[1]));
 assert.ok(values.length>=10);
 assert.ok(values.every(n=>Number.isInteger(n)&&Math.abs(n)<=20));
 assert.doesNotMatch(css,/(?:^|[;{])\s*position\s*:\s*fixed\b/i);
 const overlay=await read('focus-layout.css');
 assert.match(overlay,/\.hud\{position:absolute;z-index:15;/);
 assert.match(overlay,/\.game-controls\{position:absolute;z-index:18;/);
 assert.match(overlay,/\.game-shell \.status-toast:not\(\.is-quiet\)\{z-index:17;/);
});

test('both exact edited CSS files remain manifest-pinned',async()=>{
 for(const name of ['styles.css','focus-layout.css']){
  const bytes=await readFile(new URL(name,dir));
  const record=manifest.source_files.find(x=>x.path===name);
  assert.equal(record?.size_bytes,bytes.byteLength,name);
  assert.equal(record?.sha256_hex,createHash('sha256').update(bytes).digest('hex'),name);
 }
 assert.equal(manifest.fixed_item_type,'multiple_choice');
});
