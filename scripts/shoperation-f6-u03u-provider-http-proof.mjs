import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const CONTRACT='shoporation.f6-u03u.provider-http-readonly.v1';
export const PROJECT_REF='istjjkdcvsvilrycqecd';
export const ORIGIN='https://istjjkdcvsvilrycqecd.supabase.co';
export const SCOPE='REAL_PROVIDER_AUTH_GET_AND_POSTGREST_GET_ONLY_NOT_RELEASE';
export const HOSTED_SQL_OR_AUTH_MUTATION_ENABLED=false;
export const EXTERNAL_LIVE_APPROVAL='APPROVED_OWNER_PROVIDED_EXISTING_FIXTURES';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail=(code)=>{throw Error('F6U03U_'+code)};
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join(',')===k.slice().sort().join(',');
const uuid=(x)=>typeof x==='string'&&UUID.test(x);
const tokenChars=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const roleNames=['alap','pro','revoked'];

export function validateFixture(fixture){
 if(!keys(fixture,['alap','pro','revoked']))fail('FIXTURE_SHAPE');
 for(const name of ['alap','pro']){
  const o=fixture[name];
  if(!keys(o,['userId','storeId','customerThreadId','internalThreadId'])||
     Object.values(o).some(v=>!uuid(v)))fail('FIXTURE_'+name.toUpperCase()+'_INVALID');
 }
 if(!keys(fixture.revoked,['userId'])||!uuid(fixture.revoked.userId))
  fail('FIXTURE_REVOKED_INVALID');
 const users=[fixture.alap.userId,fixture.pro.userId,fixture.revoked.userId];
 const threads=[fixture.alap.customerThreadId,fixture.alap.internalThreadId,
  fixture.pro.customerThreadId,fixture.pro.internalThreadId];
 if(new Set(users).size!==3||new Set(threads).size!==4||
    fixture.alap.storeId===fixture.pro.storeId||
    new Set([...users,...threads,fixture.alap.storeId,fixture.pro.storeId]).size!==9)
  fail('FIXTURE_IDENTITIES_NOT_ISOLATED');
 return true;
}
export function parseTokenClaims(token,userId,nowSeconds=Math.floor(Date.now()/1000)){
 if(typeof token!=='string'||token.length>8192||!tokenChars.test(token))
  fail('TOKEN_SHAPE');
 let header,claims;
 try{
  const segments=token.split('.');
  header=JSON.parse(Buffer.from(segments[0],'base64url').toString('utf8'));
  claims=JSON.parse(Buffer.from(segments[1],'base64url').toString('utf8'));
 }catch{fail('TOKEN_DECODE')}
 // Parsing does NOT validate a signature. Only Auth /user verifies token validity.
 if(!header||!['HS256','RS256','ES256'].includes(header.alg)||
    !claims||claims.iss!==ORIGIN+'/auth/v1'||claims.role!=='authenticated'||
    claims.sub!==userId||!uuid(claims.sub)||
    !(claims.aud==='authenticated'||Array.isArray(claims.aud)&&claims.aud.includes('authenticated'))||
    !Number.isSafeInteger(claims.exp)||claims.exp<=nowSeconds+30||
    !Number.isSafeInteger(claims.iat)||claims.iat>nowSeconds+30)
  fail('TOKEN_CLAIM_BOUNDARY');
 return {subject:userId,issuerBound:true,notSignatureVerified:true};
}
export function buildCaseMatrix(fixture){
 validateFixture(fixture);
 const a=fixture.alap,p=fixture.pro;
 const c=(actor,id,store,visible)=>({actor,threadId:id,storeId:store,visible});
 const matrix=[
  c('alap',a.customerThreadId,a.storeId,true),
  c('alap',a.internalThreadId,a.storeId,false),
  c('alap',p.customerThreadId,p.storeId,false),
  c('alap',p.internalThreadId,p.storeId,false),
  c('pro',p.customerThreadId,p.storeId,true),
  c('pro',p.internalThreadId,p.storeId,true),
  c('pro',a.customerThreadId,a.storeId,false),
  c('revoked',p.customerThreadId,p.storeId,false),
  c('revoked',p.internalThreadId,p.storeId,false),
  c('anon',a.customerThreadId,a.storeId,false),
  c('anon',p.internalThreadId,p.storeId,false)
 ];
 if(matrix.length!==11||matrix.filter(x=>x.visible).length!==3)fail('CASE_COVERAGE_DRIFT');
 return Object.freeze(matrix.map(x=>Object.freeze(x)));
}
function validateKey(publishableKey){
 if(typeof publishableKey!=='string'||!/^sb_publishable_[a-zA-Z0-9_-]{12,}$/.test(publishableKey))
  fail('PUBLISHABLE_KEY_REQUIRED_NO_SERVICE_ROLE');
}
function validateTokens(tokens,fixture,nowSeconds){
 if(!keys(tokens,roleNames))fail('THREE_REAL_ACTOR_TOKENS_REQUIRED');
 if(new Set(Object.values(tokens)).size!==3)fail('SHARED_TOKEN_ACROSS_ACTORS');
 for(const n of roleNames)parseTokenClaims(tokens[n],fixture[n].userId,nowSeconds);
}
async function requestJSON(requester,path,{publishableKey,token=null}={}){
 if(typeof requester!=='function')fail('HTTP_TRANSPORT_REQUIRED');
 const url=ORIGIN+path;
 const headers={apikey:publishableKey,Accept:'application/json'};
 if(token!==null)headers.Authorization='Bearer '+token;
 let res;
 try{res=await requester(url,{method:'GET',headers,redirect:'error',cache:'no-store'});}
 catch{fail('HTTP_REQUEST_FAILED')}
 if(!res||res.status!==200||typeof res.text!=='function'||res.redirected===true||
    res.url&&res.url!==url)
  fail('HTTP_NOT_EXACT_200_OR_REDIRECT');
 let content;
 try{content=await res.text();}
 catch{fail('HTTP_RESPONSE_UNREADABLE')}
 if(typeof content!=='string'||content.length>32768)fail('HTTP_RESPONSE_TOO_LARGE');
 try{return JSON.parse(content)}
 catch{fail('HTTP_RESPONSE_NOT_JSON')}
}
export async function executeReadOnlyMatrix({fixture,tokens,publishableKey,requester,nowSeconds}={}){
 validateFixture(fixture);validateKey(publishableKey);validateTokens(tokens,fixture,nowSeconds);
 const confirmed=new Set();
 for(const actor of roleNames){
  const data=await requestJSON(requester,'/auth/v1/user',{publishableKey,token:tokens[actor]});
  if(!data||data.id!==fixture[actor].userId||!uuid(data.id))
   fail('AUTH_PROVIDER_IDENTITY_MISMATCH_'+actor.toUpperCase());
  confirmed.add(actor);
 }
 if(confirmed.size!==3)fail('AUTH_ACTOR_COVERAGE_MISSING');
 const matrix=buildCaseMatrix(fixture);
 for(const spec of matrix){
  const url='/rest/v1/office_threads?select=id%2Cinstance_id&id=eq.'+spec.threadId;
  const rows=await requestJSON(requester,url,{
   publishableKey,token:spec.actor==='anon'?null:tokens[spec.actor]});
  if(!Array.isArray(rows)||rows.length!==(spec.visible?1:0))
   fail('POSTGREST_ROW_VISIBILITY_MISMATCH_'+spec.actor.toUpperCase());
  if(spec.visible){
   const row=rows[0];
   if(!keys(row,['id','instance_id'])||
      row.id!==spec.threadId||row.instance_id!==spec.storeId)
    fail('POSTGREST_WRONG_TENANT_ROW_'+spec.actor.toUpperCase());
  }
 }
 return Object.freeze({
  contract:CONTRACT,projectRef:PROJECT_REF,scope:SCOPE,authIdentityGets:confirmed.size,
  postgrestThreadGets:matrix.length,positiveRows:3,negativeEmptyRows:8,
  requestMethods:['GET'],mutationsPerformed:false,
  remoteTransportAuthority:'CALLER_SUPPLIED_NOT_INDEPENDENTLY_ATTESTED',
  providerSignedJwtProven:false,releaseAuthorized:false
 });
}
export function offlineBlockedAssessment(){
 return Object.freeze({
  contract:CONTRACT,projectRef:PROJECT_REF,scope:SCOPE,
  decision:'BLOCKED_EXISTING_AUTH_IDENTITIES_AND_MODERN_OFFICE_FIXTURES_ABSENT',
  expectedActors:3,expectedReadOnlyOfficeProbes:11,
  genuineManagedAuthJwtProven:false,genuineManagedPostgrestRlsProven:false,
  appMigrationProvenanceReconciled:false,ownerRecoveryKeyConfirmed:false,
  hostedTouched:false,releaseAuthorized:false
 });
}
export async function performOwnerApprovedLiveProbe({fixture,tokens,publishableKey,approval,nowSeconds}={}){
 if(approval!==EXTERNAL_LIVE_APPROVAL)fail('OWNER_LIVE_APPROVAL_REQUIRED');
 // The transport is intentionally non-injectable here; mock-only tests MUST use
 // executeReadOnlyMatrix, whose output is explicitly NOT provider attestation.
 const proof=await executeReadOnlyMatrix({fixture,tokens,publishableKey,
   nowSeconds,requester:globalThis.fetch.bind(globalThis)});
 return Object.freeze({...proof,
  decision:'LIVE_AUTH_POSTGREST_GET_EVIDENCE_ONLY_RELEASE_STILL_BLOCKED',
  remoteTransportAuthority:'NODE_RUNTIME_REAL_HTTPS_GET',
  providerSignedJwtProven:true,
  managedPostgrestReadOnlyMatrixObserved:true,
  // Empty RLS results alone cannot establish that each fixture row exists;
  // owner-controlled revoked role state also needs independent confirmation.
  managedPostgrestReadOnlyRlsProven:false,
  fixtureExistenceIndependentlyProven:false,
  revokedRoleStateIndependentlyProven:false,
  appMigrationProvenanceReconciled:false,ownerRecoveryKeyConfirmed:false,
  releaseAuthorized:false});
}
async function cli(){
 const [mode]=process.argv.slice(2);
 if(process.argv.length!==3||!['--preflight','--live-readonly'].includes(mode))
  fail('ONLY_PREFLIGHT_OR_EXPLICIT_LIVE_GET_ALLOWED');
 if(mode==='--preflight'){
  console.log(JSON.stringify(offlineBlockedAssessment()));return;
 }
 if(process.env.SHOPERATION_F6U03U_LIVE_READONLY_APPROVAL!==EXTERNAL_LIVE_APPROVAL)
  fail('EXPLICIT_LIVE_READONLY_APPROVAL_REQUIRED');
 const fixturePath=process.env.SHOPERATION_F6U03U_FIXTURE_PATH;
 if(!fixturePath||fixturePath.startsWith('artifacts/')||fixturePath.startsWith('tests/'))
  fail('OWNER_CONTROLLED_EXTERNAL_FIXTURE_REQUIRED');
 let fixture;
 try{fixture=JSON.parse(readFileSync(resolve(fixturePath),'utf8'))}
 catch{fail('FIXTURE_FILE_MISSING_OR_INVALID')}
 const report=await performOwnerApprovedLiveProbe({
  fixture,publishableKey:process.env.SHOPERATION_F6U03U_PUBLISHABLE_KEY,
  tokens:{alap:process.env.SHOPERATION_F6U03U_ALAP_TOKEN,
   pro:process.env.SHOPERATION_F6U03U_PRO_TOKEN,
   revoked:process.env.SHOPERATION_F6U03U_REVOKED_TOKEN},
  approval:process.env.SHOPERATION_F6U03U_LIVE_READONLY_APPROVAL
 });
 // Only sanitized counts and boolean evidence. No token, email, payload or rows.
 console.log(JSON.stringify(report));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 cli().catch(e=>{console.error(/^F6U03U_[A-Z0-9_]+$/.test(e.message)?
  e.message:'F6U03U_UNCLASSIFIED_FAILURE');process.exitCode=1});
}
