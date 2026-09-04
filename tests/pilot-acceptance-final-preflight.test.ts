import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe,expect,it } from 'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('pilot acceptance final preflight closures',()=>{
  it('keeps transactional public URLs production-safe and blocks loopback production deploys',()=>{
    const identity=read('src/lib/communication/identity.ts');
    const validator=read('scripts/validate-vercel-deploy-env.mjs');
    expect(identity).toContain("import { getServerPublicSiteUrl } from '@/lib/runtime/public-site-url'");
    expect(identity).toContain('const runtimeSiteUrl=getServerPublicSiteUrl()');
    expect(identity).toContain("throw new Error('COMMUNICATION_PUBLIC_SITE_URL_REQUIRED')");
    expect(identity).not.toContain("NEXT_PUBLIC_SITE_URL||'http://localhost:3000'");
    expect(validator).toContain("const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()");
    expect(validator).toContain("host.endsWith('.localhost')");
    expect(validator).toContain('NEXT_PUBLIC_SITE_URL must not use a loopback host in production');
  });

  it('separates provider configuration persistence from provider activation state',()=>{
    const page=read('src/app/admin/beallitasok/fizetes-szallitas/page.tsx');
    expect(page).toContain('Beállítások mentése');
    expect(page).toContain("name=\"enabled\" value={p.enabled?'true':'false'}");
    expect(page).toContain("name=\"enabled\" value={p.enabled?'false':'true'}");
    expect(page).not.toContain('type=\"hidden\" name=\"enabled\"');
  });

  it('gives owners and admins a strictly tenant-scoped audit view while preserving the platform audit',()=>{
    const merchant=read('src/app/admin/audit/page.tsx');
    const layout=read('src/app/admin/layout.tsx');
    const platform=read('src/app/admin/naplo/page.tsx');
    expect(merchant).toContain("requireCurrentStoreContext('store.manage')");
    expect(merchant.match(/\.eq\('instance_id',scope\.instanceId\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(merchant).toContain('Más webshop eseményei nem jelenhetnek meg ebben a nézetben.');
    expect(layout).toContain("{href:'/admin/audit',label:'Audit napló'}");
    expect(layout).toContain("hasStorePermission(instance!.id,'store.manage')");
    expect(platform).toContain('requirePlatformOperator()');
  });
});
