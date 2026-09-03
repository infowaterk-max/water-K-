import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const baseSqlFile='supabase/migrations/20260903163000_order_integration_evidence_atomic_v2.sql';
const outboxSqlFile='supabase/migrations/20260903174500_order_transition_outbox_atomic_v3.sql';

describe('order and integration evidence atomicity',()=>{
  test('order status, admin audit and required outbox plan share one database transaction',()=>{
    const route=read('src/app/api/admin/orders/[id]/route.ts');
    const baseSql=read(baseSqlFile);
    const outboxSql=read(outboxSqlFile);
    expect(route).toContain('admin_transition_order_with_outbox_v3');
    expect(route).toContain('p_jobs:jobs');
    expect(route).toContain('p_manual_events:manualEvents');
    expect(route).toContain('jobEvidenceOk');
    expect(route).toContain('eventEvidenceOk');
    expect(route).not.toContain('enqueueIntegrationJob(');
    expect(route).not.toContain("from('order_events').insert");
    expect(baseSql).toContain('public.transition_tenant_order_v1');
    expect(baseSql).toContain("'order.status_changed'");
    expect(outboxSql).toContain('public.admin_transition_order_v2');
    expect(outboxSql).toContain('insert into public.integration_jobs');
    expect(outboxSql).toContain("'invoice_manual_required'");
    expect(outboxSql).toContain('ORDER_OUTBOX_JOB_EVIDENCE_MISSING');
    expect(outboxSql).toContain('ORDER_MANUAL_EVENT_EVIDENCE_MISSING');
  });

  test('provider planning reads fail closed before the order transition',()=>{
    const route=read('src/app/api/admin/orders/[id]/route.ts');
    const invoicing=read('src/lib/integrations/invoicing.ts');
    const logistics=read('src/lib/integrations/external-logistics.ts');
    expect(route).toContain("getConfiguredInvoiceProviderCodeForInstance(scope.instanceId,{strict:true})");
    expect(route).toContain("getExternalLogisticsConfig(scope.instanceId,current.shipping_method,{strict:true})");
    expect(route).toContain('A kapcsolódó szolgáltatói beállítások most nem ellenőrizhetők. A rendelés állapota nem változott.');
    expect(invoicing).toContain("if(connectionError||catalogError){if(options?.strict)throw");
    expect(logistics).toContain("if(error){if(options?.strict)throw error;return null}");
  });

  test('different transactional e-mail templates can coexist without losing dedupe',()=>{
    const route=read('src/app/api/admin/orders/[id]/route.ts');
    const outbox=read('src/lib/integrations/outbox.ts');
    const sql=read(outboxSqlFile);
    for(const template of ['payment_confirmed','order_shipped','order_completed']){
      expect(route).toContain(`template:'${template}'`);
    }
    expect(sql).toContain('integration_jobs_active_order_email_template_uidx');
    expect(sql).toContain("(payload->>'template')");
    expect(sql).toContain("kind<>'email_send'");
    expect(outbox).toContain("row.kind==='email_send'");
    expect(outbox).toContain("job.payload as {template?:unknown}");
  });

  test('COD processing plans external logistics partner notification atomically',()=>{
    const route=read('src/app/api/admin/orders/[id]/route.ts');
    expect(route).toContain("current.payment_method==='cash_on_delivery'");
    expect(route).toContain("kind:'logistics_email',provider:'external_logistics_email'");
    expect(route).toContain("kind:'invoice_create'");
    expect(route).toContain("eventType:'invoice_manual_required'");
  });

  test('manual integration final status cannot commit without admin audit evidence',()=>{
    const route=read('src/app/api/admin/integrations/[id]/run/route.ts');
    const processor=read('src/lib/integrations/processor.ts');
    const sql=read(baseSqlFile);
    expect(route).toContain('{manualActorId:actor.id}');
    expect(route).not.toContain('recordAdminAudit');
    expect(processor).toContain('admin_finalize_manual_integration_job_v2');
    expect(sql).toContain("p_status not in ('succeeded','failed','blocked')");
    expect(sql).toContain("'integration.retry_succeeded'");
    expect(sql).toContain("'integration.retry_failed'");
    expect(sql).toContain('INTEGRATION_CLAIM_LOST');
  });

  test('invoice reconciliation resolves order, source job, events and audit atomically',()=>{
    const route=read('src/app/api/admin/integration-jobs/[id]/retry/route.ts');
    const sql=read(baseSqlFile);
    expect(route).toContain('admin_reconcile_invoice_retry_v2');
    expect(route).not.toContain("from('orders').update");
    expect(sql).toContain("'invoice_reconciled'");
    expect(sql).toContain("'invoice.reconciled'");
    expect(sql).toContain("set status='succeeded'");
    expect(sql).toContain('INVOICE_ALREADY_DIFFERENT');
    expect(sql).toContain('v_replayed:=coalesce(v_order.invoice_number=p_invoice_number,false)');
  });

  test('integration retry uses template-aware race-safe deduplication',()=>{
    const route=read('src/app/api/admin/integration-jobs/[id]/retry/route.ts');
    const sql=read(outboxSqlFile);
    expect(route).toContain('admin_retry_integration_job_v2');
    expect(route).not.toContain('enqueueIntegrationJob(');
    expect(route).not.toContain('recordAdminAudit');
    expect(sql).toContain('exception when unique_violation');
    expect(sql).toContain("v_job.kind<>'email_send'");
    expect(sql).toContain("coalesce(payload->>'template','')=coalesce(v_job.payload->>'template','')");
    expect(sql).toContain("'integration_retried'");
    expect(sql).toContain("'integration_job.retried'");
  });

  test('new privileged RPC is service-runtime only',()=>{
    const sql=read(outboxSqlFile);
    expect(sql).toContain('revoke all on function public.admin_transition_order_with_outbox_v3');
    expect(sql).toMatch(/grant execute on function public\.admin_transition_order_with_outbox_v3[\s\S]{0,260}to service_role/);
    expect(sql).toContain('revoke all on function public.admin_retry_integration_job_v2');
  });
});
