import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
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
  const freshPreviewBranch='fix/office-fresh-preview-security-gate-20261019';
  const freshSupabaseUrl='https://istjjkdcvsvilrycqecd.supabase.co';
  const acceptedFreshMarker='office-fresh-20261019';

  const previewResult=(overrides:Record<string,string|undefined>)=>{
    const env:NodeJS.ProcessEnv={
      ...process.env,
      VERCEL:'1',
      VERCEL_ENV:'preview',
      VERCEL_GIT_COMMIT_REF:freshPreviewBranch,
      SHOPERATION_FRESH_ACCEPTANCE:acceptedFreshMarker,
      NEXT_PUBLIC_SUPABASE_URL:freshSupabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-public-key',
      SUPABASE_STAGING_SECRET_KEY:'test-fresh-server-key',
      ...overrides,
      NODE_ENV:'test',
    };
    return spawnSync(process.execPath,[join(process.cwd(),'scripts/validate-vercel-deploy-env.mjs')],{encoding:'utf8',env});
  };

  it('accepts only a precisely identified Fresh Office proof preview with an explicit marker',()=>{
    const result=previewResult({});
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Vercel preview Supabase target: fresh-install (istjjkdcvsvilrycqecd).');
    expect(result.stdout).toContain('Vercel preview environment preflight OK.');
  });

  it('rejects a Fresh target when its explicit acceptance flag is missing or wrong',()=>{
    for(const marker of [undefined,'true','other-proof']){
      const result=previewResult({SHOPERATION_FRESH_ACCEPTANCE:marker});
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('preview Supabase target must be rfuvzgumbardvbvqjxdq; got istjjkdcvsvilrycqecd');
    }
  });

  it('rejects a Fresh target from any other Git ref even with the marker',()=>{
    for(const ref of ['fix/office-support-compose-page-20261019','main','proof/office-compose-fresh-preview-20261019']){
      const result=previewResult({VERCEL_GIT_COMMIT_REF:ref});
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('preview Supabase target must be rfuvzgumbardvbvqjxdq; got istjjkdcvsvilrycqecd');
    }
  });

  it('rejects an incorrect staging URL on the opted-in Fresh proof branch',()=>{
    const result=previewResult({NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrl});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('preview Supabase target must be istjjkdcvsvilrycqecd; got rfuvzgumbardvbvqjxdq');
  });

  it('keeps production pinned to Water-K even if a Fresh acceptance marker and branch are supplied',()=>{
    const result=previewResult({VERCEL_ENV:'production',SUPABASE_STAGING_SECRET_KEY:undefined,SUPABASE_SECRET_KEY:'test-prod-key',CRON_SECRET:validCronSecret,NEXT_PUBLIC_SITE_URL:'https://shop.example.hu'});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('production Supabase target must be ewdederyvnwmghlydbno; got istjjkdcvsvilrycqecd');
  });

  it('fails closed when the preview server credential is absent',()=>{
    const result=previewResult({SUPABASE_STAGING_SECRET_KEY:undefined,SUPABASE_SECRET_KEY:undefined,SUPABASE_SERVICE_ROLE_KEY:undefined});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SUPABASE_STAGING_SECRET_KEY|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY');
  });

});
