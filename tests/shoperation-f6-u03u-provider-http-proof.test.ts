import {describe,it,expect} from 'vitest';
// @ts-expect-error Source-only Node ESM module intentionally has no declaration.
import {buildCaseMatrix,validateFixture,parseTokenClaims,executeReadOnlyMatrix,offlineBlockedAssessment,performOwnerApprovedLiveProbe,ORIGIN} from '../scripts/shoperation-f6-u03u-provider-http-proof.mjs';

const f:any={
 alap:{userId:'aaaaaaaa-0000-4000-8000-000000000003',storeId:'aaaaaaaa-0000-4000-8000-000000000002',
  customerThreadId:'aaaaaaaa-0000-4000-8000-000000000010',internalThreadId:'aaaaaaaa-0000-4000-8000-000000000011'},
 pro:{userId:'bbbbbbbb-0000-4000-8000-000000000003',storeId:'bbbbbbbb-0000-4000-8000-000000000002',
  customerThreadId:'bbbbbbbb-0000-4000-8000-000000000010',internalThreadId:'bbbbbbbb-0000-4000-8000-000000000011'},
 revoked:{userId:'bbbbbbbb-0000-4000-8000-000000000012'}
};
const when=Math.floor(Date.now()/1000);
const fake=(sub:string,changes:any={},header:any={})=>{
 const h={alg:'HS256',typ:'JWT',...header};
 const p={iss:ORIGIN+'/auth/v1',aud:'authenticated',role:'authenticated',sub,
  exp:when+3600,iat:when-20,...changes};
 const enc=(o:any)=>Buffer.from(JSON.stringify(o)).toString('base64url');
 return enc(h)+'.'+enc(p)+'.'+Buffer.from('no-real-cryptographic-signature').toString('base64url');
};
const tokens=()=>({alap:fake(f.alap.userId),pro:fake(f.pro.userId),revoked:fake(f.revoked.userId)});
const publishableKey='sb_publishable_test_only_example_dummy_1243';
const respond=(url:string,status:number,payload:any,redirected=false)=>({
 status,url,redirected,text:async()=>JSON.stringify(payload)
});
const mock=(tk:any,opts:any={})=>{
 const seen:any[]=[];
 const actor=(header:any)=>{
  const s=header.Authorization;
  if(!s)return 'anon';
  const t=s.slice('Bearer '.length);
  return Object.keys(tk).find(k=>tk[k]===t)||'unknown';
 };
 const cases=buildCaseMatrix(f);
 const requester=async (url:string,options:any)=>{
  seen.push({url,method:options.method,redirect:options.redirect,
   tokenUsed:options.headers.Authorization!==undefined});
  if(opts.redirect)return respond(url,200,[],true);
  if(opts.deniedStatus&&url.includes('/rest/v1/'))return respond(url,opts.deniedStatus,[]);
  if(url===ORIGIN+'/auth/v1/user'){
   const name=actor(options.headers);
   const id=opts.wrongAuth?'11111111-1111-4111-8111-111111111111':f[name]?.userId;
   return respond(url,200,{id});
  }
  const name=actor(options.headers);
  const matched=cases.find((c:any)=>c.actor===name&&url.endsWith('id=eq.'+c.threadId));
  if(!matched)throw Error('TEST_UNKNOWN_GET');
  const payload=opts.leak&&name==='alap'&&matched.visible===false
   ?[{id:matched.threadId,instance_id:matched.storeId}]
   :matched.visible?[{id:matched.threadId,instance_id:matched.storeId}]:[];
  if(opts.wrongStore&&matched.visible)payload[0].instance_id=f.alap.storeId;
  return respond(url,200,payload);
 };
 return {requester,seen};
};
describe('F6-U03u Supabase Auth and PostgREST GET-only live proof preparation',()=>{
 it('preflight never asserts signed JWT or release',()=>{
  const d=offlineBlockedAssessment();
  expect(d.releaseAuthorized).toBe(false);
  expect(d.genuineManagedAuthJwtProven).toBe(false);
  expect(d.genuineManagedPostgrestRlsProven).toBe(false);
  expect(buildCaseMatrix(f)).toHaveLength(11);
  expect(buildCaseMatrix(f).filter((x:any)=>x.visible)).toHaveLength(3);
 });
 it('11 simulated HTTP positive and negative cases validate shape but never assert real provider',async()=>{
  const tk=tokens(),m=mock(tk);
  const q=await executeReadOnlyMatrix({fixture:f,tokens:tk,publishableKey,
   requester:m.requester,nowSeconds:when});
  expect(q.authIdentityGets).toBe(3);
  expect(q.postgrestThreadGets).toBe(11);
  expect(q.positiveRows).toBe(3);
  expect(q.negativeEmptyRows).toBe(8);
  expect(q.remoteTransportAuthority).toBe('CALLER_SUPPLIED_NOT_INDEPENDENTLY_ATTESTED');
  expect(q.providerSignedJwtProven).toBe(false);
  expect(q.releaseAuthorized).toBe(false);
  expect(m.seen).toHaveLength(14);
  expect(m.seen.every((v:any)=>v.method==='GET'&&v.redirect==='error'&&v.url.startsWith(ORIGIN+'/'))).toBe(true);
  expect(m.seen.filter((v:any)=>!v.tokenUsed)).toHaveLength(2);
 });
 it('fails if token issuer, expiry, role, algorithm, shape, actor distinctness or key invalid',async()=>{
  expect(()=>parseTokenClaims(fake(f.alap.userId,{iss:'https://attacker.test/auth/v1'}),f.alap.userId,when)).toThrow('F6U03U_TOKEN_CLAIM_BOUNDARY');
  expect(()=>parseTokenClaims(fake(f.alap.userId,{role:'service_role'}),f.alap.userId,when)).toThrow('F6U03U_TOKEN_CLAIM_BOUNDARY');
  expect(()=>parseTokenClaims(fake(f.alap.userId,{exp:when-2}),f.alap.userId,when)).toThrow('F6U03U_TOKEN_CLAIM_BOUNDARY');
  expect(()=>parseTokenClaims(fake(f.alap.userId,{}, {alg:'none'}),f.alap.userId,when)).toThrow('F6U03U_TOKEN_CLAIM_BOUNDARY');
  expect(()=>parseTokenClaims('not-a-jwt',f.alap.userId,when)).toThrow('F6U03U_TOKEN_SHAPE');
  const t=tokens();t.revoked=t.alap;
  await expect(executeReadOnlyMatrix({fixture:f,tokens:t,publishableKey,
   requester:mock(t).requester,nowSeconds:when})).rejects.toThrow('F6U03U_SHARED_TOKEN_ACROSS_ACTORS');
  const s=tokens();
  await expect(executeReadOnlyMatrix({fixture:f,tokens:s,publishableKey:'service_role_secret',
   requester:mock(s).requester,nowSeconds:when})).rejects.toThrow('F6U03U_PUBLISHABLE_KEY_REQUIRED_NO_SERVICE_ROLE');
 });
 it('rejects wrong Auth subject, RLS row leak, 403 and redirect rather than claiming denial',async()=>{
  const tk=tokens();
  for(const [options,error] of [
   [{wrongAuth:true},'F6U03U_AUTH_PROVIDER_IDENTITY_MISMATCH_ALAP'],
   [{leak:true},'F6U03U_POSTGREST_ROW_VISIBILITY_MISMATCH_ALAP'],
   [{deniedStatus:403},'F6U03U_HTTP_NOT_EXACT_200_OR_REDIRECT'],
   [{redirect:true},'F6U03U_HTTP_NOT_EXACT_200_OR_REDIRECT']
  ] as const){
   await expect(executeReadOnlyMatrix({fixture:f,tokens:tk,publishableKey,
    requester:mock(tk,options).requester,nowSeconds:when})).rejects.toThrow(error);
  }
 });
 it('requires isolated fixture and owner approval before real GET transport is invoked',async()=>{
  expect(validateFixture(f)).toBe(true);
  const bad=structuredClone(f);bad.pro.storeId=bad.alap.storeId;
  expect(()=>validateFixture(bad)).toThrow('F6U03U_FIXTURE_IDENTITIES_NOT_ISOLATED');
  const tk=tokens();
  await expect(performOwnerApprovedLiveProbe({fixture:f,tokens:tk,publishableKey,
   approval:'not-approved',nowSeconds:when})).rejects.toThrow('F6U03U_OWNER_LIVE_APPROVAL_REQUIRED');
 });
});
