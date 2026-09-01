import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const nextConfig=read('next.config.ts');
const middleware=read('src/middleware.ts');
const adminAuth=read('src/lib/auth/admin-api.ts');
const workflow=read('.github/workflows/ci.yml');
const envExample=read('.env.example');
const baseline=JSON.parse(read('supabase/customer-baseline/manifest.json')) as Record<string,unknown>;

describe('final Shoperation V1 release gates',()=>{
  test('browser security baseline remains enabled for every route',()=>{
    for(const header of ['X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy','Strict-Transport-Security','Content-Security-Policy']){
      expect(nextConfig).toContain(header);
    }
    expect(nextConfig).toMatch(/poweredByHeader:false/);
    expect(nextConfig).toMatch(/source:'\/:path\*'/);
  });

  test('CSP remains compatible with Next.js App Router hydration',()=>{
    expect(nextConfig).toContain("script-src 'self' 'unsafe-inline'");
    expect(nextConfig).toContain("style-src 'self' 'unsafe-inline'");
  });

  test('cross-origin admin mutations are blocked while Supabase session refresh remains active',()=>{
    expect(middleware).toMatch(/startsWith\('\/api\/admin\/'\)/);
    expect(middleware).toMatch(/MUTATING\.has\(request\.method\)/);
    expect(middleware).toMatch(/new URL\(origin\)\.origin!==request\.nextUrl\.origin/);
    expect(middleware).toMatch(/createServerClient/);
    expect(middleware).toMatch(/supabase\.auth\.getUser\(\)/);
  });

  test('admin API authentication fails closed and optionally enforces distributed rate limiting',()=>{
    expect(adminAuth).toMatch(/if\s*\(\s*!user\s*\)\s*return null/);
    expect(adminAuth).toMatch(/profile\?\.role\s*!==\s*'admin'/);
    expect(adminAuth).toMatch(/SECURITY_RATE_LIMIT_ENABLED\s*===\s*'true'/);
    expect(adminAuth).toMatch(/consume_security_rate_limit/);
    expect(adminAuth).toMatch(/if\s*\(\s*error\s*\|\|\s*data\s*!==\s*true\s*\)\s*return null/);
    expect(adminAuth).toMatch(/catch\s*\{[\s\S]*return null/);
  });

  test('customer baseline is the reviewed neutral snapshot and never replays legacy migrations',()=>{
    expect(baseline.status).toBe('ready');
    expect(baseline.legacyMigrationReplay).toBe(false);
    expect(baseline.sourcePolicy).toBe('schema-snapshot-only');
    expect(baseline.defaultPlan).toBe('alap');
    expect(baseline.freshInstallProofRequired).toBe(false);
    expect(String(baseline.snapshotFile)).toContain('0001_shoperation_v1_schema.sql');
  });

  test('CI release gate includes dependency audit, baseline guard, tests, typecheck and production build',()=>{
    expect(workflow).toContain('npm audit --omit=dev --audit-level=high');
    expect(workflow).toContain('npm run db:customer:guard');
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('npm run release:manifest');
  });

  test('normal CI does not contain a production deployment command',()=>{
    expect(workflow).not.toMatch(/\bvercel\s+(?:deploy|--prod)/i);
    expect(workflow).not.toMatch(/npm\s+run\s+deploy/i);
    expect(workflow).toContain('Production: untouched by this job');
  });

  test('environment example exposes only publishable Supabase credentials to the browser',()=>{
    expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(envExample).toMatch(/NEXT_PUBLIC_SUPABASE_(?:PUBLISHABLE_KEY|ANON_KEY)/);
    expect(envExample).not.toMatch(/NEXT_PUBLIC_SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)/);
    expect(envExample).not.toContain('NEXT_PUBLIC_CRON_SECRET');
    expect(envExample).toContain('WEBSHOP_DEFAULT_PLAN=alap');
  });
});
