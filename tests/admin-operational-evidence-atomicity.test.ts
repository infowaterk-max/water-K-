import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const engagement='supabase/migrations/20260903145000_admin_engagement_evidence_atomic_v2.sql';
const operations='supabase/migrations/20260903146000_admin_procurement_return_evidence_atomic_v2.sql';

describe('admin operational evidence atomicity',()=>{
  test('support ticket state and replies commit together with audit evidence',()=>{
    const state=read('src/app/api/admin/support/[id]/route.ts');
    const reply=read('src/app/api/admin/support/[id]/messages/route.ts');
    const sql=read(engagement);
    expect(state).toContain('admin_update_support_ticket_v2');
    expect(reply).toContain('admin_add_support_reply_v2');
    expect(state).not.toContain('recordAdminAudit');
    expect(reply).not.toContain('recordAdminAudit');
    expect(sql).toContain('public.can_manage_support(p_instance_id,p_actor)');
    expect(sql).toContain('insert into public.support_ticket_messages');
    expect(sql).toContain('insert into public.admin_audit_log');
    expect(sql).toContain("'support.ticket_updated'");
    expect(sql).toContain("'support.reply_added'");
    expect(sql).toContain('exception when others then');
    expect(sql).toContain("'notificationQueued',v_queued");
  });

  test('recommendation, B2B role, coupon and review mutations are tenant-scoped audited RPCs',()=>{
    const recommendation=read('src/app/api/admin/recommendations/[id]/route.ts');
    const customer=read('src/app/api/admin/customers/[id]/route.ts');
    const coupon=read('src/app/api/admin/coupons/route.ts');
    const review=read('src/app/admin/velemenyek/actions.ts');
    const sql=read(engagement);
    for(const source of [recommendation,customer,coupon,review])expect(source).not.toContain('recordAdminAudit');
    expect(sql).toContain('admin_mutate_product_recommendation_v2');
    expect(sql).toContain('admin_update_customer_store_role_v2');
    expect(sql).toContain('admin_mutate_coupon_v2');
    expect(sql).toContain('admin_moderate_product_review_v2');
    expect(sql).toContain('RECOMMENDATION_TARGET_TENANT_MISMATCH');
    expect(sql).toContain('STALE_CUSTOMER_ROLE');
    expect(sql).toContain('STALE_COUPON');
    expect(sql).toContain('REVIEW_ALREADY_MODERATED');
    expect(sql.match(/insert into public\.admin_audit_log/g)?.length).toBeGreaterThanOrEqual(7);
  });

  test('procurement domain RPCs are wrapped with permission and audit in the same transaction',()=>{
    const create=read('src/app/api/admin/procurement/route.ts');
    const update=read('src/app/api/admin/procurement/[id]/route.ts');
    const sql=read(operations);
    expect(create).toContain('admin_manage_purchase_order_v3');
    expect(update).toContain('admin_manage_purchase_order_v3');
    expect(create).not.toContain('recordAdminAudit');
    expect(update).not.toContain('recordAdminAudit');
    expect(sql).toContain('public.can_manage_procurement(p_instance_id,p_actor)');
    expect(sql).toContain('public.create_purchase_order_v2');
    expect(sql).toContain('public.receive_purchase_order_items_v2');
    expect(sql).toContain('public.receive_purchase_order_v2');
    expect(sql).toContain('public.transition_purchase_order_v2');
    expect(sql).toContain("'procurement.purchase_order_created'");
    expect(sql).toContain("'procurement.partial_receipt'");
    expect(sql).toContain("'procurement.received'");
  });

  test('return transition, notification evidence and audit are tenant scoped and concurrency protected',()=>{
    const route=read('src/app/api/admin/returns/[id]/route.ts');
    const sql=read(operations);
    expect(route).toContain('admin_transition_return_case_v2');
    expect(route).toContain('p_expected_updated_at:current.updated_at');
    expect(route).not.toContain('recordAdminAudit');
    expect(sql).toContain('where id=p_case_id and instance_id=p_instance_id');
    expect(sql).toContain('STALE_RETURN_CASE');
    expect(sql).toContain('RETURN_ORDER_TENANT_MISMATCH');
    expect(sql).toContain('where id=current_row.order_id and instance_id=p_instance_id');
    expect(sql).toContain('public.transition_return_case');
    expect(sql).toContain('public.enqueue_communication_v2');
    expect(sql).toContain("'returns.case_updated'");
    expect(sql).toContain("'restockPolicy','item-ledger'");
  });

  test('all new privileged RPCs revoke public client execution and allow only service runtime',()=>{
    const sql=read(engagement)+'\n'+read(operations);
    for(const name of [
      'admin_update_support_ticket_v2',
      'admin_add_support_reply_v2',
      'admin_mutate_product_recommendation_v2',
      'admin_update_customer_store_role_v2',
      'admin_mutate_coupon_v2',
      'admin_moderate_product_review_v2',
      'admin_manage_purchase_order_v3',
      'admin_transition_return_case_v2',
    ]){
      expect(sql).toContain(`revoke all on function public.${name}`);
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]{0,180}to service_role`));
    }
  });
});
