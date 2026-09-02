import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { resolveSupabaseServerKey } from '@/lib/supabase/server-credentials';

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

  it('fails the Vercel production preflight when a staging secret leaks into production scope', () => {
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs')],
      {
        encoding: 'utf8',
        env: {
          VERCEL: '1',
          VERCEL_ENV: 'production',
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
          SUPABASE_SECRET_KEY: 'production-secret',
          SUPABASE_STAGING_SECRET_KEY: 'staging-secret',
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SUPABASE_STAGING_SECRET_KEY must not be scoped to production');
  });

  it('accepts a production-only server credential configuration', () => {
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/validate-vercel-deploy-env.mjs')],
      {
        encoding: 'utf8',
        env: {
          VERCEL: '1',
          VERCEL_ENV: 'production',
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
          SUPABASE_SECRET_KEY: 'production-secret',
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Vercel production database environment preflight OK.');
  });
});
