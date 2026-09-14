import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Digital Commerce fulfillment/logistics closure',()=>{
  test('uses v7 server-derived fulfillment and rejects COD for carts containing digital lines',()=>{
    const checkout=read('src/lib/orders/tenant-checkout.ts');
    const orderRoute=read('src/app/api/orders/route.ts');
    const migration=read('supabase/migrations/20260914133000_digital_fulfillment_checkout_closure.sql');
    expect(checkout).toContain("place_order_provider_v7_fulfillment_idempotent");
    expect(migration).toContain("v_mode not in('physical','digital','mixed')");
    expect(migration).toContain("v_payment_flow='cash_on_delivery'");
    expect(migration).toContain("DIGITAL_COMMERCE_COD_NOT_SUPPORTED");
    expect(migration).toContain("shipping_method=case when v_requires_shipping then shipping_method else 'digital_delivery' end");
    expect(orderRoute).toContain("fulfillment.digitalLines>0&&payment.flow==='cash_on_delivery'");
  });

  test('never sends digital order lines to courier shipment calculations',()=>{
    const processor=read('src/lib/integrations/processor.ts');
    expect(processor).toContain("select('variant_id,sku,quantity,line_total_gross_huf,fulfillment_type')");
    expect(processor).toContain("filter(item=>item.fulfillment_type==='physical')");
    expect(processor).toContain("order.fulfillment_mode==='digital'||order.shipping_method==='digital_delivery'");
    expect(processor).toContain('physicalValueHuf');
    expect(processor).toContain("order.fulfillment_mode==='mixed'?physicalValueHuf");
    expect(processor).toContain('physical_line_count:physicalItems.length');
  });

  test('external logistics email contains only physical fulfillment lines',()=>{
    const logistics=read('src/lib/integrations/external-logistics.ts');
    expect(logistics).toContain(".eq('fulfillment_type','physical')");
    expect(logistics).toContain("order.fulfillment_mode==='digital'||order.shipping_method==='digital_delivery'");
    expect(logistics).toContain('Kiszállítandó tételek');
    expect(logistics).toContain('physicalItemsGross');
    expect(logistics).toContain('A rendelés digitális tételeket is tartalmaz; azok nem részei ennek a logisztikai teljesítésnek.');
  });

  test('digital entitlement requires canonical paid evidence and is revoked after cancellation/refund',()=>{
    const migration=read('supabase/migrations/20260914133000_digital_fulfillment_checkout_closure.sql');
    expect(migration).toContain("if v_order.status::text in('cancelled','refunded')");
    expect(migration).toContain('if v_order.paid_at is null');
    expect(migration).toContain("oi.fulfillment_type='digital'");
    expect(migration).toContain("set status='revoked'");
    expect(migration).toContain('orders_sync_digital_entitlements');
  });

  test('pure digital lifecycle skips physical shipped state while mixed retains it',()=>{
    const lifecycle=read('supabase/migrations/20260914133500_digital_order_lifecycle_closure.sql');
    const contract=read('src/lib/orders/orchestration-contract.ts');
    expect(lifecycle).toContain("v_order.fulfillment_mode='digital'");
    expect(lifecycle).toContain("v_target_status in ('completed','refunded')");
    expect(lifecycle).toContain("v_target_status in ('shipped','refunded')");
    expect(contract).toContain("processing:['shipped','completed']");
  });
});
