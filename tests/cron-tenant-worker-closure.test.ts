import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('cron tenant worker closure',()=>{
  test('loyalty, retention and integration work are executed per active webshop',()=>{
    const route=read('src/app/api/cron/integrations/route.ts');
    expect(route).toMatch(/webshop_instances/);
    expect(route).toMatch(/process_loyalty_lifecycle_v2/);
    expect(route).toMatch(/p_run_key:loyaltyRunKey/);
    expect(route).toMatch(/loyaltyEvidence\(data,instance\.id,loyaltyRunKey\)/);
    expect(route).toMatch(/plan_customer_retention_journeys_v2/);
    expect(route).toMatch(/p_instance_id:instance\.id/);
    expect(route).toMatch(/dispatch_due_customer_journey_steps_v2/);
    expect(route).toMatch(/integration_jobs[\s\S]*eq\('instance_id',instance\.id\)/);
    expect(route).toMatch(/claim_integration_job_v2/);
    expect(route).toMatch(/processIntegrationJob\(instance\.id,job\.id,claim\.processing_token\)/);
    expect(route).not.toMatch(/admin\.rpc\('claim_integration_jobs'/);
    expect(route).not.toMatch(/admin\.rpc\('plan_customer_retention_journeys'/);
    expect(route).not.toMatch(/admin\.rpc\('dispatch_due_customer_journey_steps'/);
    expect(route).toContain('const ok=inventorySnapshot.ok&&loyaltyOk&&journeyOk&&integrationResults.every(result=>result.ok)&&communication.ok');
  });
  test('communication worker owns its tenant worker-run logging',()=>{
    const route=read('src/app/api/cron/integrations/route.ts');
    expect(route).toMatch(/runCommunicationWorker\(20\)/);
    expect(route).not.toMatch(/from\('communication_worker_runs'\)\.insert/);
  });
  test('legacy global integration batch claim is not executable by service role',()=>{
    const sql=read('supabase/migrations/20260901171000_cron_tenant_worker_closure.sql');
    expect(sql).toContain("p.proname='claim_integration_jobs'");
    expect(sql).toContain('revoke execute on function %s from public, anon, authenticated, service_role');
  });
});
