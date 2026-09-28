import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';

const sha=(process.env.RELEASE_HEAD_SHA||process.env.GITHUB_SHA||process.env.VERCEL_GIT_COMMIT_SHA||'local').trim();
const ref=(process.env.RELEASE_REF_NAME||process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||process.env.VERCEL_GIT_COMMIT_REF||'local').trim();
const environment=(process.env.DEPLOY_ENVIRONMENT||process.env.VERCEL_ENV||'local').trim();
const repository=(process.env.GITHUB_REPOSITORY||'local').trim();
const ciRunId=(process.env.GITHUB_RUN_ID||'').trim()||null;
const ciWorkflow=(process.env.GITHUB_WORKFLOW||'').trim()||null;
const generatedAt=new Date().toISOString();

const riskPath='artifacts/release-risk-budget.json';
const releaseRisk=existsSync(riskPath)?JSON.parse(await readFile(riskPath,'utf8')):null;
let riskEvidenceHash=null;

if(releaseRisk){
  const riskHead=String(releaseRisk.head??'').trim();
  if(!riskHead)throw new Error('RELEASE_MANIFEST_RISK_HEAD_MISSING');
  if(sha!=='local'&&riskHead!==sha)throw new Error(`RELEASE_MANIFEST_STALE_RISK_EVIDENCE: expected=${sha} actual=${riskHead}`);
  if(releaseRisk.decision!=='PASS')throw new Error(`RELEASE_MANIFEST_RISK_NOT_PASS: actual=${releaseRisk.decision??'unknown'}`);
  const atlasSource=String(releaseRisk.atlasClosure?.sourceCommit??'').trim();
  if(atlasSource&&sha!=='local'&&atlasSource!==sha)throw new Error(`RELEASE_MANIFEST_STALE_ATLAS_EVIDENCE: expected=${sha} actual=${atlasSource}`);
  riskEvidenceHash=createHash('sha256').update(JSON.stringify(releaseRisk)).digest('hex');
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
