import {mkdirSync,writeFileSync} from 'node:fs';

const baseUrl=(process.env.SMOKE_BASE_URL||process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');
const expectedSha=(process.env.SMOKE_EXPECTED_SHA||'').trim().toLowerCase();
const expectedVersion=expectedSha?expectedSha.slice(0,12):'';
const environment=(process.env.DEPLOY_ENVIRONMENT||'unknown').trim();
const ciRunId=(process.env.GITHUB_RUN_ID||'').trim()||null;
const ciWorkflow=(process.env.GITHUB_WORKFLOW||'').trim()||null;
const attempt=Number(process.env.SMOKE_ATTEMPT||'1');
const outputDir=process.env.SMOKE_OUTPUT_DIR||'artifacts/cloud-smoke';
const bypassSecret=process.env.VERCEL_AUTOMATION_BYPASS_SECRET||'';
const smokeHeaders={
  'user-agent':'shoperation-smoke/2.0',
  ...(bypassSecret?{'x-vercel-protection-bypass':bypassSecret}:{}),
};

const checks=[
  {path:'/api/health',expectJson:true,verifyVersion:true},
  {path:'/',expectText:true},
  {path:'/webaruhaz',expectText:true},
  {path:'/penztar',expectText:true},
  {path:'/fiokom',expectText:true},
];

const results=[];
const errors=[];

function formatError(error){
  if(!(error instanceof Error))return String(error);
  const cause=error.cause;
  if(!cause||typeof cause!=='object')return error.message;
  const causeCode='code'in cause&&typeof cause.code==='string'?cause.code:'';
  const causeMessage='message'in cause&&typeof cause.message==='string'?cause.message:'';
  return [error.message,causeCode?`code=${causeCode}`:'',causeMessage?`cause=${causeMessage}`:''].filter(Boolean).join(' ');
}

function recordError({code,route,reason,expected=null,actual=null,endpoint=null}){
  errors.push({code,route,endpoint:endpoint??route,reason,expected,actual,status:'FAIL'});
}

function writeEvidence(decision){
  mkdirSync(outputDir,{recursive:true});
  const report={
    contract:'shoporation.cloud-smoke-proof.v2',
    repository:(process.env.GITHUB_REPOSITORY||'local').trim(),
    sourceCommit:expectedSha||null,
    environment,
    ciRunId,
    ciWorkflow,
    attempt:Number.isFinite(attempt)?attempt:1,
    generatedAt:new Date().toISOString(),
    baseUrl:baseUrl||null,
    checks:results,
    errors,
    decision,
  };
  writeFileSync(`${outputDir}/smoke.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
}

if(!baseUrl){
  recordError({
    code:'CLOUD_SMOKE_BASE_URL_REQUIRED',
    route:null,
    endpoint:null,
    reason:'SMOKE_BASE_URL or NEXT_PUBLIC_SITE_URL is required.',
    expected:'non-empty deployment URL',
    actual:'missing',
  });
  writeEvidence('FAIL');
  console.error('SMOKE_BASE_URL vagy NEXT_PUBLIC_SITE_URL kötelező.');
  process.exit(1);
}

for(const check of checks){
  const started=Date.now();
  const result={route:check.path,status:'PENDING',httpStatus:null,contentType:null,latencyMs:null,expectedVersion:check.verifyVersion&&expectedVersion?expectedVersion:null,actualVersion:null};
  try{
    const response=await fetch(`${baseUrl}${check.path}`,{redirect:'follow',headers:smokeHeaders});
    const latency=Date.now()-started;
    const contentType=response.headers.get('content-type')||'';
    let body=null;
    if(check.expectJson&&contentType.includes('application/json'))body=await response.json();

    result.httpStatus=response.status;
    result.contentType=contentType;
    result.latencyMs=latency;

    if(!response.ok){
      const actual=body&&typeof body==='object'?{status:response.status,errorCode:body.errorCode??null,version:body.version??null}:{status:response.status};
      recordError({code:'CLOUD_SMOKE_HTTP_FAILURE',route:check.path,reason:`HTTP ${response.status}`,expected:'2xx response',actual});
      throw new Error(`HTTP ${response.status}`);
    }

    if(check.expectJson&&!contentType.includes('application/json')){
      recordError({code:'CLOUD_SMOKE_CONTENT_TYPE_MISMATCH',route:check.path,reason:`Expected JSON but received ${contentType||'unknown'}`,expected:'application/json',actual:contentType||'unknown'});
      throw new Error(`nem JSON: ${contentType}`);
    }
    if(check.expectText&&!contentType.includes('text/html')){
      recordError({code:'CLOUD_SMOKE_CONTENT_TYPE_MISMATCH',route:check.path,reason:`Expected HTML but received ${contentType||'unknown'}`,expected:'text/html',actual:contentType||'unknown'});
      throw new Error(`nem HTML: ${contentType}`);
    }

    if(check.verifyVersion&&expectedVersion){
      const actualVersion=body&&typeof body==='object'&&typeof body.version==='string'?body.version.toLowerCase():'';
      result.actualVersion=actualVersion||null;
      if(actualVersion!==expectedVersion){
        recordError({code:'CLOUD_SMOKE_SHA_MISMATCH',route:check.path,reason:`Artifact SHA mismatch on ${check.path}`,expected:expectedVersion,actual:actualVersion||'unknown'});
        throw new Error(`artifact SHA eltérés: expected=${expectedVersion} actual=${actualVersion||'unknown'}`);
      }
    }

    result.status='PASS';
    results.push(result);
    console.log(`OK ${check.path} ${response.status} ${latency}ms`);
  }catch(error){
    result.status='FAIL';
    result.latencyMs=result.latencyMs??Date.now()-started;
    if(!errors.some(item=>item.route===check.path)){
      recordError({code:'CLOUD_SMOKE_REQUEST_FAILED',route:check.path,reason:formatError(error),expected:'reachable critical route',actual:'request failed'});
    }
    results.push(result);
  }
}

const decision=errors.length?'FAIL':'PASS';
writeEvidence(decision);

if(errors.length){
  console.error('Shoperation smoke gate: HIBA');
  errors.forEach(failure=>console.error(`- ${failure.code} ${failure.route??''}: ${failure.reason}`));
  process.exit(1);
}
console.log('Shoperation smoke gate: OK');
