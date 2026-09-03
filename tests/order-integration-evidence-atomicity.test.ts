import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const sqlFile='supabase/migrations/20260903163000_order_integration_evidence_atomic_v2.sql';

describe('order and integration evidence atomicity',()=>{
  test('order status mutation and admin audit share one database transaction',()=>{
    const route=read('src/app/api/admin/orders/[id]/route.ts');
    const sql=read(sqlFile);
    expect(route).toContain("admin_transition_order_v2");
    expect(route).toContain("transition.orderId!==id||transition.status!==nextStatus");
    expect(route).not.toContain('recordAdminAudit');
    expect(route).not.toContain('transitionTenantOrder');
    expect(sql).toContain('public.transition_tenant_order_v1');
    expect(sql).toContain("'order.status_changed'");
    expect(sql).toContain('ORDER_STATUS_EVIDENCE_MISMATCH');
    expect(sql).toContain('insert into public.admin_audit_log');
  });

  test('manual integration final status cannot commit without admin audit evidence',()=>{
    const route=read('src/app/api/admin/integrations/[id]/run/route.ts');
    const processor=read('src/lib/integrations/processor.ts');
    const sql=read(sqlFile);
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
    const sql=read(sqlFile);
    expect(route).toContain('admin_reconcile_invoice_retry_v2');
    expect(route).not.toContain("from('orders').update");
    expect(sql).toContain("'invoice_reconciled'");
    expect(sql).toContain("'invoice.reconciled'");
    expect(sql).toContain("set status='succeeded'");
    expect(sql).toContain('INVOICE_ALREADY_DIFFERENT');
  });

  test('integration retry job, order event and admin audit are one transaction with race-safe deduplication',()=>{
    const route=read('src/app/api/admin/integration-jobs/[id]/retry/route.ts');
    const sql=read(sqlFile);
    expect(route).toContain('admin_retry_integration_job_v2');
    expect(route).not.toContain('enqueueIntegrationJob(');
    expect(route).not.toContain('recordAdminAudit');
    expect(sql).toContain('exception when unique_violation');
    expect(sql).toContain("'integration_retried'");
    expect(sql).toContain("'integration_job.retried'");
    expect(sql).toContain("'alreadyActive',true");
  });

  test('new privileged RPCs are service-runtime only',()=>{
    const sql=read(sqlFile);
    for(const name of [
      'admin_transition_order_v2',
      'admin_finalize_manual_integration_job_v2',
      'admin_reconcile_invoice_retry_v2',
      'admin_retry_integration_job_v2',
    ]){
      expect(sql).toContain(`revoke all on function public.${name}`);
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]{0,220}to service_role`));
    }
  });
});
