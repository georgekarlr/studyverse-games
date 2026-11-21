/**
 * Reproducible fixed-asset, zero-binding, standalone Car parking Free Play host.
 * Game authoring source/manifest must match byte-for-byte before deployment.
 * The built-in sample is explicitly ungraded and no StudyVerse session is used.
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const sourceRoot=fileURLToPath(new URL('../studyverse-games/4c84c21e-b797-4754-8d49-5134538dd468/',import.meta.url));
const outputPath=fileURLToPath(new URL('./dist/worker.mjs',import.meta.url));
const sha=s=>createHash('sha256').update(s).digest('hex');
const allowed=new Set(['index.html','styles.css','focus-layout.css','main.js','studyverse-session.js',
  'parking-lot.js','driving-physics.js','traffic-obstacles.js','question-dialog.js']);
const manifest=JSON.parse(await readFile(path.join(sourceRoot,'.studyverse/source-manifest.json'),'utf8'));
if(manifest.protocol!=='studyverse-github-source-tree-v1' ||
 manifest.project_id!=='4c84c21e-b797-4754-8d49-5134538dd468' ||
 !Array.isArray(manifest.source_files) || manifest.source_files.length!==allowed.size)
 throw Error('Source manifest is not the pinned Car parking project');
const files={};
for(const item of manifest.source_files){
 if(!allowed.delete(item.path)||typeof item.sha256_hex!=='string'||
  !Number.isSafeInteger(item.size_bytes))throw Error('Unreviewed game asset or duplicate');
 const raw=await readFile(path.join(sourceRoot,'source',item.path));
 if(raw.byteLength!==item.size_bytes||sha(raw)!==item.sha256_hex)
  throw Error('Game source does not match source manifest');
 let text=raw.toString('utf8');
 // This distinct account-free release never pretends to be an actual
 // StudyVerse SDK session. Begin the author's included local sample directly.
 if(item.path==='main.js'){
  const before="else showSampleFallback('StudyVerse Module SDK is not available here. Start a sample drive or open private Module Preview.');";
  if(text.split(before).length!==2)throw Error('Sample bootstrap source unexpectedly changed');
  text=text.replace(before,'else void start(createSampleSession());');
 }
 if(/\b(?:XMLHttpRequest|WebSocket|EventSource|sendBeacon|serviceWorker)\b/.test(text))
  throw Error('Network/device capability requires separate review');
 files['/'+item.path]=text;
}
if(allowed.size)throw Error('A canonical source asset is missing');
const body=String.raw`
/** Immutable source-file bundle, separate from StudyVerse signed Game Play. */
const FILES=__FILES__;
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8'};
const POLICY="default-src 'none'; base-uri 'none'; connect-src 'none'; "+
 "script-src 'self'; style-src 'self'; img-src 'self' data:; "+
 "font-src 'none'; media-src 'none'; worker-src 'none'; object-src 'none'; "+
 "frame-src 'none'; child-src 'none'; form-action 'none'; frame-ancestors 'none'";
const SECURITY={
 'Content-Security-Policy':POLICY,
 'Cross-Origin-Opener-Policy':'same-origin',
 'Cross-Origin-Resource-Policy':'same-origin',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()',
 'Cache-Control':'no-store'
};
export default {
 async fetch(request){
  if(request.method!=='GET'&&request.method!=='HEAD')
   return new Response('Method not allowed',{status:405,headers:{...SECURITY,'Allow':'GET, HEAD'}});
  const pathname=new URL(request.url).pathname;
  if(pathname==='/healthz'){
   return new Response(request.method==='HEAD'?null:JSON.stringify({
    game:'Car parking',mode:'free_play',source_manifest_sha256_hex:'__MANIFEST_SHA__',
    sdk_connected:false,grading:false,account_access:false
   }),{headers:{...SECURITY,'Content-Type':'application/json; charset=utf-8'}});
  }
  const name=pathname==='/'?'/index.html':pathname;
  if(!Object.hasOwn(FILES,name))
   return new Response('Not found',{status:404,headers:SECURITY});
  const ext=name.slice(name.lastIndexOf('.'));
  return new Response(request.method==='HEAD'?null:FILES[name],{
   status:200,headers:{...SECURITY,'Content-Type':TYPES[ext]||'text/plain; charset=utf-8'}
  });
 }
};
`;
const built=body.replace('__FILES__',JSON.stringify(files))
 .replace('__MANIFEST_SHA__',sha(await readFile(path.join(sourceRoot,'.studyverse/source-manifest.json'))));
await mkdir(path.dirname(outputPath),{recursive:true});
await writeFile(outputPath,built);
process.stdout.write(JSON.stringify({status:'built',output_sha256_hex:sha(built),
  bytes:Buffer.byteLength(built),assets:Object.keys(files).length})+'\n');
