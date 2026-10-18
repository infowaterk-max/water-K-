import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { resolveSupabaseServerKey } from '../src/lib/supabase/server-credentials';

const validCronSecret='0123456789abcdef0123456789abcdef';
const productionSupabaseUrl='https://ewdederyvnwmghlydbno.supabase.co';
const stagingSupabaseUrl='https://rfuvzgumbardvbvqjxdq.supabase.co';

describe('Supabase server credential scoping', () => {
  it('never lets a staging-only secret shadow production credentials', () => {
    expect(
      resolveSupabaseServerKey({
        VERCEL_ENV: 'production',
        SUPABASE_STAGING_SECRET_KEY: 'staging-secret',
        SUPABASE_SECRET_KEY: 'production-secret',
      }),
    ).toBe('production-secret');
  });

  it('supports the legacy production service-role fallback', () => {
    expect(
      resolveSupabaseServerKey({
        DEPLOY_ENVIRONMENT: 'production',
        SUPABASE_STAGING_SECRET_KEY: 'staging-secret',
        SUPABASE_SERVICE_ROLE_KEY: 'production-service-role',
      }),
    ).toBe('production-service-role');
  });

  it('prefers the staging secret outside production', () => {
    expect(
      resolveSupabaseServerKey({
        VERCEL_ENV: 'preview',
        SUPABASE_STAGING_SECRET_KEY: 'staging-secret',
        SUPABASE_SECRET_KEY: 'generic-secret',
      }),
    ).toBe('staging-secret');
  });

  it('treats Vercel preview as authoritative over a conflicting custom deploy environment', () => {
    expect(
      resolveSupabaseServerKey({
        VERCEL_ENV: 'preview',
        DEPLOY_ENVIRONMENT: 'production',
        SUPABASE_STAGING_SECRET_KEY: 'staging-secret',
        SUPABASE_SECRET_KEY: 'production-secret',
      }),
    ).toBe('staging-secret');
  });

  it('fails the Vercel production preflight when a staging secret leaks into production scope', () => {
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs')],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          VERCEL: '1',
          VERCEL_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: 'https://shop.example.hu',
          NEXT_PUBLIC_SUPABASE_URL: productionSupabaseUrl,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
          SUPABASE_SECRET_KEY: 'production-secret',
          SUPABASE_STAGING_SECRET_KEY: 'staging-secret',
          CRON_SECRET: validCronSecret,
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SUPABASE_STAGING_SECRET_KEY must not be scoped to production');
  });

  it('accepts a complete production-only server credential configuration', () => {
    const { SUPABASE_STAGING_SECRET_KEY: _stagingSecret, ...cleanEnv } = process.env;
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs')],
      {
        encoding: 'utf8',
        env: {
          ...cleanEnv,
          VERCEL: '1',
          VERCEL_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: 'https://water-k-native.vercel.app',
          NEXT_PUBLIC_SUPABASE_URL: productionSupabaseUrl,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
          SUPABASE_SECRET_KEY: 'production-secret',
          CRON_SECRET: validCronSecret,
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Vercel production Supabase target: production (ewdederyvnwmghlydbno).');
    expect(result.stdout).toContain('Vercel production environment preflight OK.');
  });

  it('accepts a preview only when it targets the canonical staging Supabase project', () => {
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs')],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          VERCEL: '1',
          VERCEL_ENV: 'preview',
          NEXT_PUBLIC_SUPABASE_URL: stagingSupabaseUrl,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
          SUPABASE_STAGING_SECRET_KEY: 'staging-secret',
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Vercel preview Supabase target: staging (rfuvzgumbardvbvqjxdq).');
    expect(result.stdout).toContain('Vercel preview environment preflight OK.');
  });

  it('fails closed when a preview points at the production Supabase project', () => {
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs')],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          VERCEL: '1',
          VERCEL_ENV: 'preview',
          NEXT_PUBLIC_SUPABASE_URL: productionSupabaseUrl,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
          SUPABASE_STAGING_SECRET_KEY: 'staging-secret',
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('preview Supabase target must be rfuvzgumbardvbvqjxdq; got ewdederyvnwmghlydbno');
  });

  it('fails the Vercel production preflight when CRON_SECRET is missing', () => {
    const { SUPABASE_STAGING_SECRET_KEY: _stagingSecret, CRON_SECRET: _cronSecret, ...cleanEnv } = process.env;
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs')],
      {
        encoding: 'utf8',
        env: {
          ...cleanEnv,
          VERCEL: '1',
          VERCEL_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: 'https://water-k-native.vercel.app',
          NEXT_PUBLIC_SUPABASE_URL: productionSupabaseUrl,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
          SUPABASE_SECRET_KEY: 'production-secret',
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('CRON_SECRET must be at least 16 characters in production');
  });

  it('fails the Vercel production preflight for a loopback public site URL', () => {
    const { SUPABASE_STAGING_SECRET_KEY: _stagingSecret, ...cleanEnv } = process.env;
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs')],
      {
        encoding: 'utf8',
        env: {
          ...cleanEnv,
          VERCEL: '1',
          VERCEL_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
          NEXT_PUBLIC_SUPABASE_URL: productionSupabaseUrl,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
          SUPABASE_SECRET_KEY: 'production-secret',
          CRON_SECRET: validCronSecret,
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_SITE_URL must not use a loopback host in production');
  });
  // F6 Office Fresh acceptance is deliberately branch-specific and cannot relax normal preview/production.
  const freshAcceptanceEnv = {
    ...process.env,
    NODE_ENV: 'test',
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'feature/core-1186-f6-u03x-single-baseline-integration',
    SHOPERATION_FRESH_ACCEPTANCE: 'true',
    NEXT_PUBLIC_SUPABASE_URL: 'https://istjjkdcvsvilrycqecd.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fresh-publishable-fixture',
    SUPABASE_STAGING_SECRET_KEY: 'fresh-secret-fixture',
    SUPABASE_SECRET_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: 'DISABLED_FRESH_ACCEPTANCE_NO_EXTERNAL_ACTIONS',
    KH_MERCHANT_ID: 'DISABLED_FRESH_ACCEPTANCE_NO_EXTERNAL_ACTIONS',
    KH_SECRET: 'DISABLED_FRESH_ACCEPTANCE_NO_EXTERNAL_ACTIONS',
    KH_ENVIRONMENT: 'disabled',
    FOXPOST_API_KEY: 'DISABLED_FRESH_ACCEPTANCE_NO_EXTERNAL_ACTIONS',
    GLS_USERNAME: 'DISABLED_FRESH_ACCEPTANCE_NO_EXTERNAL_ACTIONS',
    GLS_PASSWORD: 'DISABLED_FRESH_ACCEPTANCE_NO_EXTERNAL_ACTIONS',
    MPL_API_KEY: 'DISABLED_FRESH_ACCEPTANCE_NO_EXTERNAL_ACTIONS',
  };

  function freshPreviewPreflight(overrides: Record<string, string> = {}) {
    return spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs')],
      { encoding: 'utf8', env: { ...freshAcceptanceEnv, ...overrides } },
    );
  }

  it('allows only the exact approved Fresh Install preview branch with disabled external-service credentials', () => {
    const result = freshPreviewPreflight();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Vercel preview Supabase target: fresh-acceptance (istjjkdcvsvilrycqecd).');
    expect(result.stdout).toContain('Vercel preview environment preflight OK.');
  });

  it('refuses Fresh Install on any other branch or without the explicit acceptance marker', () => {
    const wrongBranch = freshPreviewPreflight({ VERCEL_GIT_COMMIT_REF: 'main' });
    expect(wrongBranch.status).toBe(1);
    expect(wrongBranch.stderr).toContain('exact approved Vercel preview Git branch');
    const absentMarker = freshPreviewPreflight({ SHOPERATION_FRESH_ACCEPTANCE: '' });
    expect(absentMarker.status).toBe(1);
    expect(absentMarker.stderr).toContain('preview Supabase target must be rfuvzgumbardvbvqjxdq');
  });

  it('refuses Fresh acceptance when the target is not the exact Fresh Install project', () => {
    const stagingFallback = freshPreviewPreflight({ NEXT_PUBLIC_SUPABASE_URL: stagingSupabaseUrl });
    expect(stagingFallback.status).toBe(1);
    expect(stagingFallback.stderr).toContain('preview Supabase target must be istjjkdcvsvilrycqecd');
  });

  it('refuses to inherit production/server or external-service credentials in Fresh acceptance', () => {
    for (const override of [
      { SUPABASE_SECRET_KEY: 'production-secret' },
      { SUPABASE_SERVICE_ROLE_KEY: 'production-service-role' },
      { SUPABASE_STAGING_SECRET_KEY: 'DISABLED_FRESH_ACCEPTANCE_NO_EXTERNAL_ACTIONS' },
      { KH_SECRET: 'live-payment-secret' },
      { KH_ENVIRONMENT: 'production' },
    ]) {
      const result = freshPreviewPreflight(override);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Fresh Install acceptance');
    }
  });

  it('never permits Fresh acceptance marker to weaken a production deployment', () => {
    const result = freshPreviewPreflight({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://istjjkdcvsvilrycqecd.supabase.co',
      SUPABASE_SECRET_KEY: 'prod-server-key',
      CRON_SECRET: validCronSecret,
      NEXT_PUBLIC_SITE_URL: 'https://shop.example.hu',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('production Supabase target must be ewdederyvnwmghlydbno');
    expect(result.stderr).toContain('Fresh Install acceptance requires its exact approved Vercel preview Git branch');
  });

  it('keeps every runtime schema probe except the unrelated Builder demo columns intact', () => {
    const validator = readFileSync(
      join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs'), 'utf8',
    ) as string;
    expect(validator).toContain("freshAcceptanceAllowed && probe.table === 'content_pages' ? ['id'] : probe.columns");
    expect(validator).toContain("table: 'customer_billing_profiles'");
    expect(validator).toContain("table: 'b2b_quote_requests'");
    expect(validator).toContain('await probeRuntimeSchema(');
  });

});
