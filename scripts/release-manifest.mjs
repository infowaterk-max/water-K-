import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const sha=(process.env.RELEASE_HEAD_SHA||process.env.GITHUB_SHA||process.env.VERCEL_GIT_COMMIT_SHA||'local').trim();
const ref=(process.env.RELEASE_REF_NAME||process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||process.env.VERCEL_GIT_COMMIT_REF||'local').trim();
const environment=(process.env.DEPLOY_ENVIRONMENT||process.env.VERCEL_ENV||'local').trim();
const repository=(process.env.GITHUB_REPOSITORY||'local').trim();
const ciRunId=(process.env.GITHUB_RUN_ID||'').trim()||null;
const ciWorkflow=(process.env.GITHUB_WORKFLOW||'').trim()||null;
const generatedAt=new Date().toISOString();

async function failManifest({code,reason,expected=null,actual=null,evidence=[]}){
  const diagnostic={
    contract:'shoporation.release-manifest-diagnostic.v1',
    repository,
    sourceCommit:sha,
    ref,
    environment,
    ciRunId,
    ciWorkflow,
    generatedAt:new Date().toISOString(),
    errors:[{code,reason,expected,actual,evidence,status:'FAIL'}],
    decision:'FAIL',
  };
  await mkdir('artifacts',{recursive:true});
  await writeFile('artifacts/release-manifest-diagnostic.json',`${JSON.stringify(diagnostic,null,2)}\n`,'utf8');
  throw new Error(`${code}: ${reason}`);
}

const riskPath='artifacts/release-risk-budget.json';
const releaseRisk=existsSync(riskPath)?JSON.parse(await readFile(riskPath,'utf8')):null;
let riskEvidenceHash=null;
const releaseUnitPath=(process.env.RELEASE_UNIT_MANIFEST||'').trim();
let releaseUnit=null,releaseUnitEvidenceHash=null;

if(releaseRisk){
  const riskHead=String(releaseRisk.head??'').trim();
  if(!riskHead)await failManifest({
    code:'RELEASE_MANIFEST_RISK_HEAD_MISSING',
    reason:'Release Risk Budget evidence has no exact head.',
    expected:sha,
    actual:'missing',
    evidence:[`artifact=${riskPath}`],
  });
  if(sha!=='local'&&riskHead!==sha)await failManifest({
    code:'RELEASE_MANIFEST_STALE_RISK_EVIDENCE',
    reason:'Release Risk Budget evidence belongs to a different head.',
    expected:sha,
    actual:riskHead,
    evidence:[`artifact=${riskPath}`],
  });
  if(releaseRisk.decision!=='PASS')await failManifest({
    code:'RELEASE_MANIFEST_RISK_NOT_PASS',
    reason:'Release Risk Budget is not PASS.',
    expected:'PASS',
    actual:releaseRisk.decision??'unknown',
    evidence:[`artifact=${riskPath}`],
  });
  const atlasSource=String(releaseRisk.atlasClosure?.sourceCommit??'').trim();
  if(atlasSource&&sha!=='local'&&atlasSource!==sha)await failManifest({
    code:'RELEASE_MANIFEST_STALE_ATLAS_EVIDENCE',
    reason:'Atlas closure evidence belongs to a different head.',
    expected:sha,
    actual:atlasSource,
    evidence:[`artifact=${riskPath}`,'field=atlasClosure.sourceCommit'],
  });
  riskEvidenceHash=createHash('sha256').update(JSON.stringify(releaseRisk)).digest('hex');
}

if(releaseUnitPath){
  if(!existsSync(releaseUnitPath))await failManifest({
    code:'RELEASE_MANIFEST_UNIT_MISSING',
    reason:'Configured release unit manifest does not exist.',
    expected:releaseUnitPath,
    actual:'missing',
    evidence:[`artifact=${releaseUnitPath}`],
  });
  releaseUnit=JSON.parse(await readFile(releaseUnitPath,'utf8'));
  if(releaseUnit.contract!=='shoporation.release-unit-manifest.v1')await failManifest({
    code:'RELEASE_MANIFEST_UNIT_CONTRACT_INVALID',
    reason:'Release unit manifest contract is invalid.',
    expected:'shoporation.release-unit-manifest.v1',
    actual:releaseUnit.contract??'missing',
    evidence:[`artifact=${releaseUnitPath}`],
  });
  if(releaseUnit.projectedRisk?.decision!=='PASS')await failManifest({
    code:'RELEASE_MANIFEST_UNIT_RISK_NOT_PASS',
    reason:'Release unit projected risk is not PASS.',
    expected:'PASS',
    actual:releaseUnit.projectedRisk?.decision??'missing',
    evidence:[`artifact=${releaseUnitPath}`],
  });
  if(releaseUnit.targetBaseLease?.mode!=='EXACT'||!releaseUnit.targetBaseLease?.sha)await failManifest({
    code:'RELEASE_MANIFEST_UNIT_LEASE_NOT_EXACT',
    reason:'Release unit must be reconciled to an exact target-base lease before final release binding.',
    expected:'EXACT',
    actual:releaseUnit.targetBaseLease?.mode??'missing',
    evidence:[`artifact=${releaseUnitPath}`],
  });
  releaseUnitEvidenceHash=createHash('sha256').update(JSON.stringify(releaseUnit)).digest('hex');
}

const identity=[
  repository,
  sha,
  ref,
  environment,
  ciRunId??'no-run',
  releaseRisk?.decision??'risk-not-evaluated',
  releaseRisk?.score??'na',
  releaseRisk?.policyVersion??'na',
  riskEvidenceHash??'no-risk-evidence',
  releaseUnit?.releaseUnitId??'no-release-unit',
  releaseUnitEvidenceHash??'no-release-unit-evidence',
].join('|');

const manifest={
  version:'v24-risk-budget-v2',
  repository,
  sha,
  ref,
  environment,
  ciRunId,
  ciWorkflow,
  generatedAt,
  releaseUnit:releaseUnit?{releaseUnitId:releaseUnit.releaseUnitId,order:releaseUnit.order,targetBaseSha:releaseUnit.targetBaseSha,lease:releaseUnit.targetBaseLease,projectedRiskDecision:releaseUnit.projectedRisk?.decision??null,evidenceHash:releaseUnitEvidenceHash}:null,
  releaseRisk:releaseRisk?{
    decision:releaseRisk.decision,
    head:releaseRisk.head,
    base:releaseRisk.base,
    mergeBase:releaseRisk.mergeBase,
    score:releaseRisk.score,
    maxPoints:releaseRisk.maxPoints,
    subsystemCount:releaseRisk.subsystemCount,
    subsystems:releaseRisk.subsystems,
    policyVersion:releaseRisk.policyVersion,
    atlasSourceCommit:releaseRisk.atlasClosure?.sourceCommit??null,
    evidenceHash:riskEvidenceHash,
  }:null,
  releaseHash:createHash('sha256').update(identity).digest('hex'),
};

await writeFile('release-manifest.json',`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.log(JSON.stringify(manifest));
