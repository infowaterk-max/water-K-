import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const forward='supabase/migrations/20260915151648_order_operational_authenticated_privilege_contract.sql';
const baseline='supabase/customer-baseline/migrations/0035_order_operational_authenticated_privilege_contract.sql';

describe('core transactional e-mail dispatch and order operational privilege contract',()=>{
  test('core order e-mails are claimed and processed immediately after atomic outbox evidence',()=>{
    const route=read('src/app/api/admin/orders/[id]/route.ts');
    const evidenceGuard=route.indexOf('if(!jobEvidenceOk||!eventEvidenceOk)');
    const claim=route.indexOf("admin.rpc('claim_integration_job_v2'");
    const process=route.indexOf('processIntegrationJob(scope.instanceId,evidence.id,claim.processing_token)');
    expect(route).toContain("import { processIntegrationJob } from '@/lib/integrations/processor';");
    expect(route).toContain("evidence.kind!=='email_send'");
    expect(route).toContain("evidence.status!=='pending'");
    expect(claim).toBeGreaterThan(evidenceGuard);
    expect(process).toBeGreaterThan(claim);
    expect(route).toContain('transactional email immediate dispatch deferred');
    expect(route).toContain('transactionalEmails');
    expect(route).not.toContain("hasCurrentPlanFeature('advancedIntegrations')");
  });

  test('order transition remains atomic before best-effort delivery',()=>{
    const route=read('src/app/api/admin/orders/[id]/route.ts');
    const transition=route.indexOf("admin.rpc('admin_transition_order_with_outbox_v3'");
    const evidence=route.indexOf('jobEvidenceOk');
    const process=route.indexOf('processIntegrationJob(scope.instanceId,evidence.id,claim.processing_token)');
    expect(transition).toBeGreaterThan(-1);
    expect(evidence).toBeGreaterThan(transition);
    expect(process).toBeGreaterThan(evidence);
    expect(route).toMatch(/try\{[\s\S]*processIntegrationJob\(scope\.instanceId,evidence\.id,claim\.processing_token\)[\s\S]*\}catch\(error\)\{/);
  });

  test('authenticated order-detail access is explicit and remains RLS governed',()=>{
    const forwardSql=read(forward),baselineSql=read(baseline);
    expect(baselineSql).toBe(forwardSql);
    expect(forwardSql).toContain('grant select, update on table public.orders to authenticated;');
    for(const table of ['order_items','order_events','integration_jobs','payment_attempts']){
      expect(forwardSql).toContain(`grant select on table public.${table} to authenticated;`);
    }
    expect(forwardSql).not.toContain('to anon');
    expect(forwardSql).not.toContain('grant all');
  });

  test('new baseline migration invalidates the previous Fresh Install proof until replayed',()=>{
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json')) as {status:string;freshInstallProofRequired:boolean;proofContractSha256:string|null;notes:string};
    expect(manifest.status).toBe('snapshot-reviewed');
    expect(manifest.freshInstallProofRequired).toBe(true);
    expect(manifest.proofContractSha256).toBeNull();
    expect(manifest.notes).toContain('0035_order_operational_authenticated_privilege_contract.sql');
    expect(manifest.notes).toContain('ordered 0001-0018');
  });
});
