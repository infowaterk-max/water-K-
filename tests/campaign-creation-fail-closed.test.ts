import fs from 'node:fs';
import path from 'node:path';
import{describe,expect,test}from'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('campaign creation fail-closed contract',()=>{
  test('lifecycle campaign is not created when source audience data cannot be read',()=>{
    const route=read('src/app/api/admin/campaigns/route.ts');
    const sourceGuard=route.indexOf('ordersError||consentsError||suppressionsError');
    const lifecycleCreate=route.lastIndexOf("rpc('admin_create_marketing_campaign_v2'");
    expect(sourceGuard).toBeGreaterThan(0);
    expect(lifecycleCreate).toBeGreaterThan(sourceGuard);
    expect(route).toContain('Kampány nem jött létre.');
  });

  test('campaign, recipient snapshot and audit commit in one database transaction',()=>{
    const route=read('src/app/api/admin/campaigns/route.ts');
    const sql=read('supabase/migrations/20260903160000_campaign_creation_atomic_v2.sql');
    expect(route.match(/admin_create_marketing_campaign_v2/g)?.length).toBeGreaterThanOrEqual(2);
    expect(route).not.toContain('recordAdminAudit');
    expect(route).not.toContain("from('marketing_campaigns').insert");
    expect(route).not.toContain("from('marketing_campaign_recipients').insert");
    expect(sql).toContain('insert into public.marketing_campaigns');
    expect(sql).toContain('insert into public.marketing_campaign_recipients');
    expect(sql).toContain('insert into public.admin_audit_log');
    expect(sql).toContain("'campaign.created'");
    expect(sql).toContain('CAMPAIGN_RECIPIENT_EVIDENCE_MISMATCH');
    expect(sql).toContain('MARKETING_PERMISSION_REQUIRED');
    expect(sql).toContain('revoke all on function public.admin_create_marketing_campaign_v2');
  });

  test('campaign creation requires marketing management and verifies mutation evidence',()=>{
    const route=read('src/app/api/admin/campaigns/route.ts');
    expect(route).toContain("getAdminRequestUser('marketing.manage')");
    expect(route).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(route).toContain('evidence.total!==recipientSeeds.length');
    expect(route).toContain('evidence.eligible!==expectedEligible');
    expect(route).toContain('A kampány létrehozásának eredménye nem igazolható.');
    expect(route).toContain('Egyetlen rész sem került alkalmazásra.');
  });
});
