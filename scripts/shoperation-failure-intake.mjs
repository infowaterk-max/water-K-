import {createHash} from 'node:crypto';
import {basename} from 'node:path';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';

const signatures=JSON.parse(readFileSync('quality/knowledge/failure-signatures.v1.json','utf8'));
const knowledge=JSON.parse(readFileSync('quality/knowledge/shoperation-quality-knowledge.v1.json','utf8'));

const outputDir=process.env.SHOPERATION_FAILURE_INTAKE_OUTPUT_DIR??'artifacts/shoperation-failure-intake';
const repository=(process.env.SHOPERATION_REPOSITORY??process.env.GITHUB_REPOSITORY??'').trim()||null;
const sourceCommit=(process.env.SHOPERATION_SOURCE_COMMIT??process.env.GITHUB_SHA??'').trim()||null;
const sourceRef=(process.env.SHOPERATION_SOURCE_REF??process.env.GITHUB_HEAD_REF??process.env.GITHUB_REF_NAME??process.env.VERCEL_GIT_COMMIT_REF??'').trim()||null;
const failureSource=(process.env.SHOPERATION_FAILURE_SOURCE??'ci').trim();
const environment=(process.env.SHOPERATION_ENVIRONMENT??process.env.DEPLOY_ENVIRONMENT??process.env.VERCEL_ENV??'').trim()||null;
const ciRunId=(process.env.SHOPERATION_CI_RUN_ID??process.env.GITHUB_RUN_ID??'').trim()||null;
const ciWorkflow=(process.env.SHOPERATION_CI_WORKFLOW??process.env.GITHUB_WORKFLOW??'').trim()||null;
const templateKey=(process.env.SHOPERATION_TEMPLATE_KEY??'').trim()||null;
const templateVersionRaw=(process.env.SHOPERATION_TEMPLATE_VERSION??'').trim();
const templateVersion=templateVersionRaw?Number(templateVersionRaw):null;
const foundationTemplate=(process.env.SHOPERATION_FOUNDATION_TEMPLATE??'').trim()||null;
const inputs=[];
const coveredGenericCodes=new Set();

const normalize=value=>String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,1200);
const compact=value=>{
  if(value===undefined||value===null)return null;
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
  try{return JSON.stringify(value).slice(0,2400)}catch{return normalize(value)}
};
const toCode=value=>normalize(value).replace(/[^A-Za-z0-9_:-]/g,'_').slice(0,160)||'UNCLASSIFIED_FAILURE';
const artifactGate=file=>basename(file).replace(/\.[^.]+$/,'').replace(/[^A-Za-z0-9]+/g,'_').toUpperCase();

function addInput(input){
  const code=toCode(input.code);
  inputs.push({
    code,
    gateCode:input.gateCode??null,
    gate:input.gate??null,
    status:input.status??'FAIL',
    symptom:normalize(input.symptom??input.reason??code),
    reason:normalize(input.reason??input.symptom??code),
    expected:compact(input.expected),
    actual:compact(input.actual),
    file:input.file??null,
    route:input.route??null,
    endpoint:input.endpoint??null,
    contract:input.contract??null,
    evidence:(input.evidence??[]).map(normalize).filter(Boolean),
  });
}

function collectDiagnosticArtifact(spec){
  const at=spec.indexOf('=');
  const gateCode=at>0?spec.slice(0,at).trim():null;
  const file=(at>0?spec.slice(at+1):spec).trim();
  if(!file||!existsSync(file))return;
  let data;
  try{data=JSON.parse(readFileSync(file,'utf8'));}catch(error){
    addInput({code:gateCode??'DIAGNOSTIC_ARTIFACT_UNREADABLE',gateCode,gate:artifactGate(file),reason:`Diagnostic artifact unreadable: ${normalize(error)}`,evidence:[`artifact=${file}`]});
    if(gateCode)coveredGenericCodes.add(gateCode);
    return;
  }
  const gate=data.gateId??data.contract??artifactGate(file);
  let detailCount=0;
  const push=(item,defaultCode=gateCode??`${artifactGate(file)}_FAILED`)=>{
    detailCount+=1;
    if(typeof item==='string'){
      addInput({code:defaultCode,gateCode,gate,reason:item,contract:data.contract??null,evidence:[`artifact=${file}`]});
      return;
    }
    const code=item?.code??item?.errorCode??item?.error??defaultCode;
    const files=Array.isArray(item?.files)?item.files:[];
    addInput({
      code,
      gateCode,
      gate,
      status:item?.status??(data.decision==='BLOCK'?'BLOCKED':'FAIL'),
      symptom:item?.symptom??item?.message??item?.reason??item?.error??code,
      reason:item?.reason??item?.message??item?.error??code,
      expected:item?.expected,
      actual:item?.actual,
      file:item?.file??files[0]??null,
      route:item?.route??null,
      endpoint:item?.endpoint??null,
      contract:item?.contract??data.contract??null,
      evidence:[`artifact=${file}`,...(Array.isArray(item?.evidence)?item.evidence:[]),item?.failureId?`failureId=${item.failureId}`:'',item?.case?`case=${item.case}`:''],
    });
  };

  for(const item of data.issues??[])push(item);
  for(const item of data.integrityIssues??[])push(item,gateCode??'KNOWLEDGE_PREFLIGHT_FAILED');
  for(const item of data.violations??[])push(item,gateCode??'RELEASE_RISK_BUDGET_FAILED');
  for(const item of data.errors??[])push(item);
  for(const item of data.diagnostics??[])push(item);

  for(const suite of data.testResults??[]){
    for(const assertion of suite.assertionResults??[]){
      if(assertion.status!=='failed')continue;
      push({
        code:'TEST_FAILED',
        message:assertion.fullName??assertion.title??'Test failed',
        file:suite.name??null,
        expected:assertion.expected,
        actual:assertion.actual,
      },'TEST_FAILED');
    }
  }

  const blocked=['BLOCK','BLOCKED','FAIL','FAILED'].includes(String(data.decision??data.status??'').toUpperCase());
  if(blocked&&detailCount===0){
    push({code:gateCode??`${artifactGate(file)}_FAILED`,message:`${gate} reported ${data.decision??data.status}`,expected:'PASS',actual:data.decision??data.status});
  }
  if(gateCode&&(detailCount>0||blocked))coveredGenericCodes.add(gateCode);
}

for(const spec of (process.env.SHOPERATION_DIAGNOSTIC_ARTIFACTS??'').split(';').map(x=>x.trim()).filter(Boolean))collectDiagnosticArtifact(spec);

const collectManifest=file=>{
  if(!file||!existsSync(file))return;
  try{
    const data=JSON.parse(readFileSync(file,'utf8'));
    let count=0;
    for(const item of data.errors??[]){
      count+=1;
      const raw=String(item.error??item.code??item);
      addInput({code:raw.split(':')[0],gateCode:'QUALITY_GATE_FAILED',gate:'template-quality-manifest',symptom:raw,reason:raw,evidence:[`case=${item.case??'unknown'}`,`artifact=${file}`]});
    }
    if(count)coveredGenericCodes.add('QUALITY_GATE_FAILED');
  }catch{}
};
collectManifest(process.env.SHOPERATION_TEMPLATE_QUALITY_MANIFEST);

const proofPath=process.env.SHOPERATION_HANDOFF_PROOF;
if(proofPath&&existsSync(proofPath)){
  try{
    const data=JSON.parse(readFileSync(proofPath,'utf8'));
    const diagnostics=Array.isArray(data.diagnostics)?data.diagnostics:[];
    if(diagnostics.length){
      for(const item of diagnostics)addInput({...item,gateCode:'PRODUCT_OWNER_JOURNEY_FAILED',gate:'product-owner-handoff',contract:item.contract??data.contract??null,evidence:[`artifact=${proofPath}`,...(Array.isArray(item.evidence)?item.evidence:[])]});
      coveredGenericCodes.add('PRODUCT_OWNER_JOURNEY_FAILED');
    }else{
      for(const rawValue of data.errors??[]){
        const raw=String(rawValue);
        addInput({code:raw.split(':')[0],gateCode:'PRODUCT_OWNER_JOURNEY_FAILED',gate:'product-owner-handoff',symptom:raw,reason:raw,route:data.previewUrl??null,contract:data.contract??null,expected:'Product Owner journey PASS',actual:raw,evidence:[`artifact=${proofPath}`]});
      }
      if((data.errors??[]).length)coveredGenericCodes.add('PRODUCT_OWNER_JOURNEY_FAILED');
    }
  }catch{}
}

for(const code of (process.env.SHOPERATION_GENERIC_FAILURES??'').split(';').map(x=>x.trim()).filter(Boolean)){
  if(coveredGenericCodes.has(code))continue;
  addInput({code,gateCode:code,gate:failureSource,symptom:`${failureSource} reported ${code}`,reason:`${failureSource} reported ${code}`,evidence:[`source=${failureSource}`]});
}

const tfIds=new Set(Object.keys(knowledge.templateFactoryFailureApplicability??{}));
const globalById=new Map((knowledge.knownFailures??[]).map(item=>[item.id,item]));
const matchRule=raw=>signatures.rules.find(rule=>rule.match==='exact'?raw===rule.pattern:rule.match==='prefix'?raw.startsWith(rule.pattern):raw.includes(rule.pattern));
const genericCodes=new Set(signatures.genericCodes??[]);
const records=[];
const seen=new Set();

for(const item of inputs){
  const rawErrorCode=normalize(item.code);
  const symptom=normalize(item.symptom);
  const rule=matchRule(rawErrorCode);
  const knownFailureId=rule?.failureId??null;
  const globalKnown=knownFailureId?globalById.get(knownFailureId):null;
  const matchedKnown=Boolean(globalKnown||(knownFailureId&&tfIds.has(knownFailureId)));
  const classificationStatus=matchedKnown?'matched-known-failure':genericCodes.has(rawErrorCode)?'needs-review':'candidate-new-failure';
  const locationKey=item.file??item.route??item.endpoint??item.contract??'';
  const failureFingerprint=`SQ-FP-${createHash('sha256').update(JSON.stringify({failureClass:knownFailureId??rawErrorCode,locationKey})).digest('hex').slice(0,16).toUpperCase()}`;
  const candidateKey=`${failureSource}|${rawErrorCode}|${templateKey??''}|${locationKey}`;
  const candidateId=`SQ-CAND-${createHash('sha256').update(candidateKey).digest('hex').slice(0,12).toUpperCase()}`;
  const dedupeKey=`${failureFingerprint}|${sourceCommit??''}|${item.gate??''}`;
  if(seen.has(dedupeKey))continue;
  seen.add(dedupeKey);
  records.push({
    contract:'shoporation.failure-intake.v2',
    candidateId,
    failureFingerprint,
    repository,
    sourceCommit,
    sourceRef,
    environment,
    ciRunId,
    ciWorkflow,
    templateKey,
    templateVersion:Number.isFinite(templateVersion)?templateVersion:null,
    foundationTemplate,
    failureSource,
    gate:item.gate,
    gateCode:item.gateCode,
    status:item.status,
    rawErrorCode,
    symptom,
    reason:item.reason,
    expected:item.expected,
    actual:item.actual,
    file:item.file,
    route:item.route,
    endpoint:item.endpoint,
    evidence:item.evidence,
    rootCauseArea:null,
    authorityInvariantIds:globalKnown?.invariantIds??[],
    knownFailureId,
    failureHistory:matchedKnown?'known-failure-class':'unclassified',
    classificationStatus,
  });
}

mkdirSync(outputDir,{recursive:true});
const report={
  contract:'shoporation.failure-intake-batch.v2',
  repository,
  sourceCommit,
  sourceRef,
  environment,
  ciRunId,
  ciWorkflow,
  failureSource,
  generatedAt:new Date().toISOString(),
  records,
  unresolved:records.filter(r=>['candidate-new-failure','needs-review'].includes(r.classificationStatus)).map(r=>r.candidateId),
};
writeFileSync(`${outputDir}/failure-intake.json`,JSON.stringify(report,null,2)+'\n');
writeFileSync(`${outputDir}/failure-intake.md`,[
  '# Shoperation failure intake',
  '',
  `Source: ${failureSource}`,
  `Repository: ${repository??'unknown'}`,
  `Commit: ${sourceCommit??'unknown'}`,
  `Ref: ${sourceRef??'unknown'}`,
  `Environment: ${environment??'unknown'}`,
  `CI run: ${ciRunId??'unknown'}`,
  '',
  ...records.map(r=>`- ${r.failureFingerprint} / ${r.candidateId} — ${r.classificationStatus} — ${r.rawErrorCode} — ${r.reason}${r.file?` — file=${r.file}`:''}${r.route?` — route=${r.route}`:''}${r.knownFailureId?` → ${r.knownFailureId}`:''}`),
].join('\n')+'\n');
console.log(JSON.stringify({records:records.length,unresolved:report.unresolved.length,matchedKnown:records.filter(r=>r.classificationStatus==='matched-known-failure').length,commit:sourceCommit,run:ciRunId},null,2));
