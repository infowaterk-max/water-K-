import fs from'node:fs';
import path from'node:path';
import{describe,expect,it}from'vitest';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Block 3 admin manual refund acceptance control',()=>{
  it('surfaces a dedicated refund control on the admin order detail',()=>{
    const page=read('src/app/admin/rendelesek/[id]/page.tsx');
    const control=read('src/components/admin/admin-order-refund-control.tsx');
    expect(page).toContain('AdminOrderRefundControl');
    expect(control).toContain('Teljes visszatérítés rögzítése');
    expect(control).toContain("new Set(['cash_on_delivery','bank_transfer'])");
    expect(control).toContain('role="dialog"');
    expect(control).not.toContain('window.confirm');
    expect(control).not.toContain('window.prompt');
    expect(control).not.toContain('window.alert');
    expect(control).toContain("busy?'Rögzítés…'");
  });

  it('keeps online card refunds out of the manual admin endpoint',()=>{
    const route=read('src/app/api/admin/orders/[id]/refund/route.ts');
    expect(route).toContain("new Set(['cash_on_delivery','bank_transfer'])");
    expect(route).toContain('nem indul K&H vagy más kártyás tranzakció');
    expect(route).toContain("admin.rpc('admin_refund_order_manual_v1'");
    expect(route).toContain('p_expected_updated_at:current.updated_at');
    expect(route).toContain('providerRefundTriggered:false');
  });

  it('records the full manual refund atomically with order, return-case and audit evidence',()=>{
    const sql=read('supabase/migrations/20260905104500_admin_manual_refund_order_v1.sql');
    expect(sql).toContain('create or replace function public.admin_refund_order_manual_v1');
    expect(sql).toContain('public.can_manage_orders(p_instance_id,p_actor)');
    expect(sql).toContain("v_order.payment_method not in ('cash_on_delivery','bank_transfer')");
    expect(sql).toContain("'admin_manual_refund'");
    expect(sql).toContain('insert into public.return_case_items');
    expect(sql).toContain("public.transition_tenant_order_v1(\n    p_instance_id,p_order_id,p_actor,'refunded',null");
    expect(sql).toContain("'orders.manual_refund_recorded'");
    expect(sql).toContain("'providerRefundTriggered',false");
    expect(sql).toContain('MANUAL_REFUND_RETURN_CASE_ALREADY_OPEN');
    expect(sql).toContain('MANUAL_REFUND_PARTIAL_REFUND_EXISTS');
  });
});
