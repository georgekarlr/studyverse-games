/** Private source-browser delivery for environments where HTTP navigation is disallowed.
 * Exact author files and all nine source manifest hashes are checked locally.
 * The browser receives original HTML/CSS/JS content; only stylesheet/entry transport
 * and static relative module import URLs change to in-memory equivalents.
 * NOT a saved package verifier, production compiler, public isolated player or grader.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const sourceRoot=new URL('../source/',import.meta.url);
const manifestLocation=new URL('../.studyverse/source-manifest.json',import.meta.url);
export const AUTHOR_SOURCE_FILES=Object.freeze([
 'index.html','styles.css','focus-layout.css','main.js','driving-physics.js',
 'parking-lot.js','question-dialog.js','studyverse-session.js','traffic-obstacles.js'
]);
export const MODULE_LOAD_ORDER=Object.freeze([
 'studyverse-session.js','driving-physics.js','traffic-obstacles.js',
 'question-dialog.js','parking-lot.js','main.js'
]);
const STYLE_LINKS=Object.freeze([
 '<link rel="stylesheet" href="./styles.css">',
 '<link rel="stylesheet" href="./focus-layout.css">'
]);
const ENTRY_SCRIPT='<script type="module" src="./main.js"></script>';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
function exactlyOnce(text,token){
 if(text.indexOf(token)<0||text.indexOf(token)!==text.lastIndexOf(token))
  throw Error('authored_source_transport_not_supported');
 return text.replace(token,'');
}

/** Resolve only the nine filenames declared by this particular owner source.
 * No network, live account, real Study Item, manifest write or new artifact.
 */
export async function verifiedInMemorySourceBundle({read=readFile,
 sourceBase=sourceRoot,manifestUrl=manifestLocation}={}){
 const manifest=JSON.parse((await read(manifestUrl)).toString('utf8'));
 if(manifest.fixed_item_type!=='multiple_choice'||
  !Array.isArray(manifest.source_files)||
  manifest.source_files.length!==AUTHOR_SOURCE_FILES.length)
  throw Error('source_manifest_wrong_fixed_type_or_file_count');
 const declared=new Map();
 for(const entry of manifest.source_files){
  if(!entry||typeof entry.path!=='string'||declared.has(entry.path))
   throw Error('source_manifest_invalid_paths');
  declared.set(entry.path,entry);
 }
 const content=Object.create(null);
 for(const name of AUTHOR_SOURCE_FILES){
  const entry=declared.get(name);
  if(!entry||!Number.isSafeInteger(entry.size_bytes)||entry.size_bytes<=0||
   !/^[a-f0-9]{64}$/.test(entry.sha256_hex))
   throw Error('source_manifest_missing_file');
  const bytes=await read(new URL(name,sourceBase));
  if(bytes.length!==entry.size_bytes||sha256(bytes)!==entry.sha256_hex)
   throw Error('owner_source_byte_mismatch');
  const decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(decoded.includes('\0'))throw Error('owner_source_invalid_text');
  content[name]=decoded;
 }
 let document=content['index.html'];
 for(const link of STYLE_LINKS)document=exactlyOnce(document,link);
 document=exactlyOnce(document,ENTRY_SCRIPT);
 if(!document.includes('</head>')||document.indexOf('</head>')!==document.lastIndexOf('</head>')||
  /<\/style/i.test(content['styles.css']+content['focus-layout.css']))
  throw Error('authored_source_inline_style_not_supported');
 const styles='<style>\n'+content['styles.css']+'\n'+content['focus-layout.css']+'\n</style>\n';
 document=document.replace('</head>',styles+'</head>');
 if(/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\bhref\s*=/i.test(document))
  throw Error('external_source_dependency_not_supported');
 return Object.freeze({document,modules:Object.freeze(MODULE_LOAD_ORDER.map(name=>
  Object.freeze({name,code:content[name]})))});
}

/** Uses native browser ESM and local blob URLs, with exactly the original JS
 * module code except relative import specifiers replaced by generated blob URLs.
 * Caller MUST set up the synthetic GameSDK before invoking this function.
 */
export async function importVerifiedAuthorModules(page,modules){
 return page.evaluate(async parts=>{
  const urls=new Map();
  for(const {name,code} of parts){
   if(typeof name!=='string'||typeof code!=='string'||urls.has(name))
    throw Error('invalid_author_module');
   const rewritten=code.replace(/(\bfrom\s*)(['"])\.\/([a-z0-9-]+\.js)\2/g,
    (_,prefix,quote,dependency)=>{
     const url=urls.get(dependency);
     if(!url)throw Error('unresolved_author_module_import');
     return prefix+quote+url+quote;
    });
   if(/\bfrom\s*['"]\.\//.test(rewritten))
    throw Error('unresolved_relative_module');
   urls.set(name,URL.createObjectURL(new Blob([rewritten],{type:'text/javascript'})));
  }
  if(!urls.has('main.js'))throw Error('missing_game_entry_module');
  await import(urls.get('main.js'));
 },modules);
}
