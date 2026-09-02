import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('communication tenant closure',()=>{
  test('database contract scopes communication, office and recovery state',()=>{
    const sql=read('supabase/migrations/20260901165100_communication_tenant_closure.sql');
    expect(sql).toMatch(/office_threads alter column instance_id set not null/);
    expect(sql).toMatch(/communication_jobs_instance_idempotency_uidx/);
    expect(sql).toMatch(/checkout_recovery_open_instance_user_uq/);
    expect(sql).toMatch(/initialize_support_ticket_thread[\s\S]*instance_id,ticket_id/);
    expect(sql).toMatch(/claim_communication_jobs_v2/);
    expect(sql).toMatch(/queue_abandoned_checkout_recoveries_v2/);
    expect(sql).toMatch(/admin_manage_communication_job_v2/);
  });

  test('public and customer writes carry the active tenant',()=>{
    expect(read('src/app/api/support/route.ts')).toMatch(/instance_id:instance\.id/);
    expect(read('src/app/api/account/marketing-consent/route.ts')).toMatch(/instance_id:instance\.id/);
    expect(read('src/app/api/marketing/newsletter/route.ts')).toMatch(/instance_id:instance\.id/);
    expect(read('src/app/api/account/support/[id]/messages/route.ts')).toMatch(/\.eq\('instance_id',instance\.id\)/);
  });

  test('inbound and provider events resolve a concrete tenant before persistence',()=>{
    const inbound=read('src/app/api/communication/inbound/route.ts');
    const webhook=read('src/app/api/webhooks/communication/route.ts');
    expect(inbound).toMatch(/support_email/);
    expect(inbound).toMatch(/instance_id:instanceId/);
    expect(webhook).toMatch(/provider_message_id/);
    expect(webhook).toMatch(/instance_id:instanceId/);
  });

  test('worker and admin queue operations use tenant-aware RPCs',()=>{
    expect(read('src/lib/communication/worker.ts')).toMatch(/claim_communication_jobs_v2/);
    expect(read('src/lib/communication/worker.ts')).toMatch(/getCommunicationIdentityForInstance/);
    expect(read('src/app/api/admin/communication/enqueue/route.ts')).toMatch(/enqueue_communication_v2/);
    expect(read('src/app/admin/kommunikacio/iroda/actions.ts')).toMatch(/enqueue_communication_v2/);
  });

  test('unsubscribe signatures bind the tenant and recipient together',()=>{
    const provider=read('src/lib/communication/provider.ts');
    const route=read('src/app/api/communication/unsubscribe/route.ts');
    expect(provider).toMatch(/instanceId.*email/);
    expect(route).toMatch(/instanceId.*email/);
  });
});
