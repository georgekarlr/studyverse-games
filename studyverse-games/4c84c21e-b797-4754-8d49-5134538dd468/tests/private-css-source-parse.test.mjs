/** Real authored CSS syntax/budget smoke check with the production parser version.
 * Source-local only: this does not import/copy the private Worker containment
 * policy, compile a saved artifact, admit browser source or qualify public Play.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as css from 'css-tree';

const root=new URL('../source/',import.meta.url);
const sourceFiles=['styles.css','focus-layout.css'];
const budget=Object.freeze({
  inputBytes:262144,rules:512,media:24,selectors:768,declarations:2400,
  selectorBytes:192,valueBytes:768
});
const byteLength=value=>Buffer.byteLength(value,'utf8');

async function actualStyledSource(){
  const source=await Promise.all(sourceFiles.map(name=>
    readFile(new URL(name,root),'utf8')));
  return source.join('\n'); // same entry HTML local stylesheet link order
}
function auditSyntax(source){
  const errors=[];
  const tree=css.parse(source,{
    parseValue:true,parseRulePrelude:true,
    onParseError(error){errors.push(error?.message??'unsupported CSS syntax')}
  });
  assert.equal(tree.type,'StyleSheet');
  assert.deepEqual(errors,[],'parser must report no CSS syntax recovery');
  return tree;
}
function auditBoundedStructure(tree){
  const count={rules:0,media:0,selectors:0,declarations:0};
  const issues=[];
  css.walk(tree,node=>{
    if(node.type==='Atrule'){
      count.media++;
      if(String(node.name).toLowerCase()!=='media')
        issues.push('unsupported at-rule');
      if(!node.prelude||byteLength(css.generate(node.prelude))>256)
        issues.push('media query over budget');
    }
    if(node.type==='Rule'){
      count.rules++;
      if(node.prelude?.type!=='SelectorList')
        issues.push('unparsed CSS selector list');
    }
    if(node.type==='Selector'){
      count.selectors++;
      if(byteLength(css.generate(node))>budget.selectorBytes)
        issues.push('selector over budget');
    }
    if(node.type==='Declaration'){
      count.declarations++;
      if(!node.value||byteLength(css.generate(node.value))>budget.valueBytes)
        issues.push('declaration value over budget');
      if(node.property==='position'&&css.generate(node.value).trim().toLowerCase()==='fixed')
        issues.push('fixed overlay forbidden');
      if(node.property==='z-index'){
        const value=css.generate(node.value).trim();
        if(!/^-?\d{1,2}$/.test(value)||Math.abs(Number(value))>20)
          issues.push('z-index over private Game layer budget');
      }
    }
    if(node.type==='Url')issues.push('URL-based CSS resource forbidden');
  });
  assert.deepEqual(issues,[],'source-local syntax/known budget checks');
  for(const [key,cap] of Object.entries(budget)){
    if(key==='inputBytes'||key==='selectorBytes'||key==='valueBytes')continue;
    assert.ok(count[key]<=cap,key+' over source-local v2 cap');
  }
  assert.ok(count.rules>100&&count.declarations>200,
    'the complete authored two-sheet Game was not loaded');
  return count;
}

test('actual two authored CSS stylesheets parse fully under pinned css-tree v3.1.0',async()=>{
  const source=await actualStyledSource();
  assert.ok(byteLength(source)<=budget.inputBytes);
  auditSyntax(source);
});
test('full authored AST stays within known private local CSS structural and layer caps',async()=>{
  auditBoundedStructure(auditSyntax(await actualStyledSource()));
});
