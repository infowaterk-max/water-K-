#!/usr/bin/env node
/**
 * F27: source-only Office/Communication sensitive RPC call inventory.
 * This detects structural drift. It does NOT prove JWT/session/tenant/RLS authorization.
 * --print emits a candidate manifest to stdout; NEVER writes or auto-approves.
 * --check compares against the manually-reviewed versioned manifest, fail closed.
 */
import ts from 'typescript';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,relative,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifestFile='quality/knowledge/office-rpc-actor-inventory.v1.json';
const rpcPattern=/office|communication|chat|thread|support|email|inbound/i;
const sensitiveSource=/^src\/(?:app\/api\/admin\/(?:office|communication)\/|app\/admin\/kommunikacio\/|lib\/(?:office|communication)\/)/;
const bindKeys=['p_actor','p_actor_user_id','p_user_id','p_instance_id','p_tenant_id'];
function filesUnder(dir){
  if(!existsSync(dir))return[];
  return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=join(dir,e.name);
    return e.isDirectory()?filesUnder(p):/\.(?:ts|tsx)$/.test(e.name)?[p]:[];
  });
}
const stable=(n,s)=>n.getText(s).replace(/\s+/g,' ').trim();
export function classifyRpcBinding(record){
  const actor=record.bindings.p_actor??record.bindings.p_actor_user_id;
  if(actor){
    if(/(?:formData|form\.get|parsed\.data\.(?:actor|user|instance)|request\.|req\.body|payload\.actor|input\.actorId)/i.test(actor))
      return 'untrusted-actor-expression-REVIEW-BLOCK';
    return actor==='actor.id'?'direct-server-actor-expression-UNVERIFIED':'indirect-actor-expression-TRACE-REQUIRED';
  }
  if(record.bindings.p_user_id){
    return record.rpc==='enqueue_communication_v2'?'customer-recipient-NOT-operator':'user-subject-expression-TRACE-REQUIRED';
  }
  return 'no-actor-binding-system-or-read-TRACE-REQUIRED';
}
export function scanSource(sourceText,file){
  const sf=ts.createSourceFile(file,sourceText,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const calls=[],dynamic=[];
  const encountered=new Map();
  const visit=n=>{
    if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='rpc'){
      const target=n.arguments[0];
      if(target&&ts.isStringLiteralLike(target)&&rpcPattern.test(target.text)){
        const rpc=target.text;
        const ordinal=(encountered.get(rpc)||0)+1;
        encountered.set(rpc,ordinal);
        const bindings={};
        if(n.arguments[1]&&ts.isObjectLiteralExpression(n.arguments[1])){
          for(const p of n.arguments[1].properties){
            if(ts.isPropertyAssignment(p)&&bindKeys.includes(stable(p.name,sf))){
              bindings[stable(p.name,sf)]=stable(p.initializer,sf);
            }
          }
        }
        const record={file,rpc,ordinal,bindings};
        calls.push({...record,classification:classifyRpcBinding(record)});
      }else if((!target||!ts.isStringLiteralLike(target))&&sensitiveSource.test(file)){
        dynamic.push({file,expression:target?stable(target,sf):'MISSING',line:sf.getLineAndCharacterOfPosition(n.pos).line+1});
      }
    }
    ts.forEachChild(n,visit);
  };
  visit(sf);
  return {calls,dynamic};
}
export function scanRepository(root=repo){
  const collected=[],dynamic=[];
  for(const p of filesUnder(join(root,'src'))){
    const f=relative(root,p).replaceAll('\\','/');
    const r=scanSource(readFileSync(p,'utf8'),f);
    collected.push(...r.calls);
    dynamic.push(...r.dynamic);
  }
  return {calls:collected.sort((a,b)=>(a.file+'|'+a.rpc+'|'+a.ordinal).localeCompare(b.file+'|'+b.rpc+'|'+b.ordinal)),dynamic};
}
export function compareInventory(current,expected){
  const issues=[];
  if(expected.contract!=='shoperation.office-rpc-source-actor-inventory.v1')issues.push('INVALID_CONTRACT');
  if(expected.proofCeiling!=='SOURCE_EXPRESSIONS_ONLY_NOT_NATIVE_SUPABASE_AUTH')issues.push('INVALID_PROOF_CEILING');
  if(current.dynamic.length)issues.push('DYNAMIC_RPC_UNCLASSIFIED:'+current.dynamic.map(x=>x.file+':'+x.expression).join(','));
  if(!Array.isArray(expected.calls))return [...issues,'EXPECTED_CALLS_MISSING'];
  const key=x=>x.file+'|'+x.rpc+'|'+x.ordinal;
  const observed=new Map(current.calls.map(x=>[key(x),x])),baseline=new Map(expected.calls.map(x=>[key(x),x]));
  if(observed.size!==current.calls.length||baseline.size!==expected.calls.length)issues.push('DUPLICATE_CALL_IDENTITIES');
  for(const [id,call] of observed){
    const known=baseline.get(id);
    if(!known)issues.push('NEW_UNREVIEWED_RPC:'+id);
    else{
      if(JSON.stringify(call.bindings)!==JSON.stringify(known.bindings))issues.push('RPC_ACTOR_OR_SCOPE_BINDING_DRIFT:'+id);
      if(call.classification!==known.classification)issues.push('RPC_REVIEW_CLASSIFICATION_DRIFT:'+id);
      if(call.classification.includes('REVIEW-BLOCK'))issues.push('UNTRUSTED_ACTOR_CANDIDATE:'+id);
    }
  }
  for(const id of baseline.keys())if(!observed.has(id))issues.push('REMOVED_OR_MOVED_RPC:'+id);
  return issues;
}
const own=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(own){
  const mode=process.argv[2];
  if(!['--print','--check'].includes(mode)||process.argv.length!==3){
    console.error('Usage: node scripts/shoperation-office-rpc-actor-inventory.mjs --print|--check');
    process.exitCode=2;
  }else{
    const inventory=scanRepository();
    if(mode==='--print'){
      const output={contract:'shoperation.office-rpc-source-actor-inventory.v1',proofCeiling:'SOURCE_EXPRESSIONS_ONLY_NOT_NATIVE_SUPABASE_AUTH',decision:'review-required-for-any-callsite-or-binding-change',calls:inventory.calls};
      console.log(JSON.stringify(output,null,2));
      if(inventory.dynamic.length)console.error('DYNAMIC RPC CALLS REQUIRE REVIEW: '+JSON.stringify(inventory.dynamic));
    }else{
      const expected=JSON.parse(readFileSync(join(repo,manifestFile),'utf8'));
      const failures=compareInventory(inventory,expected);
      if(failures.length){for(const f of failures)console.error('OFFICE_RPC_INVENTORY_BLOCK '+f);process.exitCode=1;}
      else console.log('OFFICE_RPC_SOURCE_INVENTORY_PASS calls='+inventory.calls.length+' files='+new Set(inventory.calls.map(x=>x.file)).size+' dynamic='+inventory.dynamic.length+' proof=source-expressions-only');
    }
  }
}

