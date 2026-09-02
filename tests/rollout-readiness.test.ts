import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('V24 rollout readiness contracts', () => {
  it('keeps environment secrets server-only', () => {
    const example = read('.env.example');
    expect(example).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(example).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    expect(example).toContain('SUPABASE_SECRET_KEY');
    expect(example).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
    expect(example).not.toContain('NEXT_PUBLIC_SUPABASE_SECRET_KEY');
    expect(example).not.toContain('NEXT_PUBLIC_KH_SECRET');
    expect(example).not.toContain('NEXT_PUBLIC_CRON_SECRET');
  });

  it('accepts current and legacy Supabase key names in the environment gate', () => {
    const validator = read('scripts/validate-env.mjs');
    expect(validator).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    expect(validator).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(validator).toContain('SUPABASE_SECRET_KEY');
    expect(validator).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('enforces strict staging and production environment requirements', () => {
    const validator = read('scripts/validate-env.mjs');
    expect(validator).toContain('NEXT_PUBLIC_SITE_URL');
    expect(validator).toContain("deployEnvironment === 'staging' || deployEnvironment === 'production'");
    expect(validator).toContain("['KH_MERCHANT_ID', 'KH_SECRET', 'KH_ENVIRONMENT']");
    expect(validator).toContain("parsed.protocol !== 'https:'");
    expect(validator).toContain("['localhost', '127.0.0.1']");
  });

  it('ships a deterministic release manifest generator', () => {
    const manifest = read('scripts/release-manifest.mjs');
    expect(manifest).toContain('GITHUB_SHA');
    expect(manifest).toContain('VERCEL_GIT_COMMIT_SHA');
    expect(manifest).toContain("createHash('sha256')");
    expect(manifest).toContain('release-manifest.json');
  });

  it('ships a cloud smoke gate for critical public routes', () => {
    const smoke = read('scripts/smoke.mjs');
    for (const route of ['/api/health', '/webaruhaz', '/penztar', '/fiokom']) expect(smoke).toContain(route);
    expect(smoke).toContain('process.exit(1)');
    expect(smoke).toContain('VERCEL_AUTOMATION_BYPASS_SECRET');
    expect(smoke).toContain('x-vercel-protection-bypass');
    expect(smoke).toContain('SMOKE_EXPECTED_SHA');
    expect(smoke).toContain('errorCode');
  });

  it('keeps rollout manual and gated', () => {
    const runbook = read('docs/V24-ROLLOUT-RUNBOOK.md');
    expect(runbook).toContain('nem tesz automatikus production deployt');
    expect(runbook).toContain('GO / NO-GO');
    expect(runbook).toContain('release manifest SHA');
    expect(runbook).toContain('V18 post-release session');
    expect(runbook).toContain('V19 recovery governance');
  });

  it('publishes release manifest evidence from CI', () => {
    const workflow = read('.github/workflows/ci.yml');
    expect(workflow).toContain('Generate release manifest');
    expect(workflow).toContain('Upload release manifest');
    expect(workflow).toContain('npm run release:manifest');
  });
});
