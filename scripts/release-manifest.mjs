import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

const sha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local';
const ref = process.env.GITHUB_REF_NAME || process.env.VERCEL_GIT_COMMIT_REF || 'local';
const environment = process.env.DEPLOY_ENVIRONMENT || process.env.VERCEL_ENV || 'local';
const generatedAt = new Date().toISOString();

const riskPath = 'artifacts/release-risk-budget.json';
const releaseRisk = existsSync(riskPath)
  ? JSON.parse(await readFile(riskPath, 'utf8'))
  : null;

const identity = [
  sha,
  ref,
  environment,
  releaseRisk?.decision ?? 'risk-not-evaluated',
  releaseRisk?.score ?? 'na',
  releaseRisk?.policyVersion ?? 'na',
].join('|');

const manifest = {
  version: 'v24-risk-budget-v1',
  sha,
  ref,
  environment,
  generatedAt,
  releaseRisk: releaseRisk
    ? {
        decision: releaseRisk.decision,
        score: releaseRisk.score,
        maxPoints: releaseRisk.maxPoints,
        subsystemCount: releaseRisk.subsystemCount,
        subsystems: releaseRisk.subsystems,
        policyVersion: releaseRisk.policyVersion,
      }
    : null,
  releaseHash: createHash('sha256').update(identity).digest('hex'),
};

await writeFile('release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest));
