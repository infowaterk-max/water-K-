import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const sha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local';
const ref = process.env.GITHUB_REF_NAME || process.env.VERCEL_GIT_COMMIT_REF || 'local';
const environment = process.env.DEPLOY_ENVIRONMENT || process.env.VERCEL_ENV || 'local';
const generatedAt = new Date().toISOString();
const identity = `${sha}|${ref}|${environment}`;
const manifest = {
  version: 'v24',
  sha,
  ref,
  environment,
  generatedAt,
  releaseHash: createHash('sha256').update(identity).digest('hex'),
};

await writeFile('release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest));
