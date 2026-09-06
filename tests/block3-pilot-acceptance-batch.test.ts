import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe,expect,it } from 'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('roadmap block 3 pilot acceptance batch',()=>{
  it('keeps B2C single-unit ordering while preserving B2B MOQ authority',()=>{
    const sql=read('supabase/migrations/20260905204538_block3_pilot_acceptance_batch_validation.sql');
    const catalog=read('src/lib/catalog-server.ts');
    const cartPage=read('src/app/kosar/page.tsx');
    const cart=read('src/components/cart/cart-view.tsx');
    expect(sql).toContain("if v_channel='b2b' then v_min_qty:=greatest");
    expect(sql).toContain('else v_min_qty:=1;v_multiple:=1;end if;');
    expect(catalog).toContain("const b2bRules=!includeAllChannels&&channel==='b2b'");
    expect(catalog).toContain('const orderMultiple=b2bRules?positiveInt(row.order_multiple):1');
    expect(catalog).toContain('const minimumQuantity=b2bRules?normalizeMinimum');
    expect(cartPage).toContain('minimumQuantity:product.minimumQuantity');
    expect(cart).toContain('normalizeQuantity(item.quantity,undefined,current.minimumQuantity,current.orderMultiple)');
  });

  it('validates Hungarian company tax numbers on client and server',()=>{
    const sql=read('supabase/migrations/20260905204538_block3_pilot_acceptance_batch_validation.sql');
    const helper=read('src/lib/commerce/hu-tax-number.ts');
    const checkout=read('src/components/checkout/checkout-form.tsx');
    expect(sql).toContain('private.is_valid_hu_tax_number');
    expect(sql).toContain('Érvénytelen magyar adószám.');
    expect(helper).toContain('isValidHuTaxNumber');
    expect(helper).toContain("/^\\d{8}-\\d-\\d{2}$/");
    expect(checkout).toContain('isValidHuTaxNumber(normalizedTax)');
    expect(checkout).toContain('12345676-1-12');
  });

  it('adds tenant-scoped merchant RBAC management with audit evidence and permission-filtered navigation',()=>{
    const sql=read('supabase/migrations/20260905204538_block3_pilot_acceptance_batch_validation.sql');
    const orgScope=read('supabase/migrations/20260905213000_block3_rbac_org_scope_actor_fix.sql');
    const actions=read('src/app/admin/csapat/actions.ts');
    const page=read('src/app/admin/csapat/page.tsx');
    const layout=read('src/app/admin/layout.tsx');
    const navigation=read('src/lib/admin/workspace-navigation.ts');
    const scope=read('src/lib/instances/scope.ts');
    const controls=read('src/components/admin/team-member-controls.tsx');
    expect(sql).toContain('merchant_set_store_role_v1');
    expect(sql).toContain('merchant_remove_store_role_v1');
    expect(sql).toContain('LAST_WEBSHOP_OWNER');
    expect(sql).toContain("'store.role_binding_updated'");
    expect(orgScope).toContain('(rb.instance_id=p_instance_id or rb.instance_id is null)');
    expect(actions).toContain("getAdminRequestUser('store.manage')");
    expect(actions).toContain("admin.rpc('merchant_set_store_role_v1'");
    expect(page).toContain("requireCurrentStorePageContext('store.manage')");
    expect(page).toContain('Csapat és jogosultságok');
    expect(navigation).toContain("permission: 'orders.manage'");
    expect(navigation).toContain("permission: 'catalog.manage'");
    expect(navigation).toContain("permission: 'store.manage'");
    expect(layout).toContain('roles.some((role) => roleHasPermission(role, permission))');
    expect(scope).toContain("redirect('/admin/hozzaferes-megtagadva')");
    expect(controls).toContain('<select key={role} name="role" defaultValue={role}>');
  });

  it('uses explicit pending states, accessible quantity controls and custom cancellation confirmation',()=>{
    const inventory=read('src/components/admin/inventory-editor.tsx');
    const products=read('src/app/admin/termekek/page.tsx');
    const submit=read('src/components/admin/admin-submit-button.tsx');
    const cart=read('src/components/cart/cart-view.tsx');
    const status=read('src/components/admin/order-status-control.tsx');
    expect(inventory).toContain('B2B minimum rendelés (db)');
    expect(inventory).not.toContain('minWidth:620');
    expect(products).toContain('AdminSubmitButton');
    expect(products).toContain("requireCurrentStorePageContext('catalog.manage')");
    expect(submit).toContain('useFormStatus');
    expect(cart).toContain('cartQuantityStepper');
    expect(cart).toContain('Mennyiség csökkentése');
    expect(cart).toContain('rendelési egység {multiple} db');
    expect(status).not.toContain('window.confirm');
    expect(status).toContain('adminModalBackdrop');
    expect(status).toContain("cancelled:'Lemondva'");
  });

  it('makes operational identities and audit records readable in Budapest time and fully localized',()=>{
    const order=read('src/app/admin/rendelesek/[id]/page.tsx');
    const display=read('src/lib/order-display.ts');
    const audit=read('src/app/admin/audit/page.tsx');
    const css=read('src/app/admin/block3-pilot-batch.css');
    expect(order).toContain("timeZone:'Europe/Budapest'");
    expect(order).toContain('Vendég vásárló');
    expect(order).toContain('Jóváhagyott viszonteladói partner');
    expect(display).toContain("cancelled:'Lemondva'");
    expect(audit).toContain("timeZone:'Europe/Budapest'");
    expect(audit).toContain('AuditState title="Előtte"');
    expect(audit).toContain('AuditState title="Utána"');
    expect(audit).toContain("'campaign.approve':'Kampány jóváhagyva'");
    expect(audit).toContain("'customer.store_role_updated':'Ügyfél webshop-szerepköre módosítva'");
    expect(audit).toContain("'office.thread_updated':'Irodai beszélgetés módosítva'");
    expect(audit).toContain("'orders.manual_refund_recorded':'Kézi visszatérítés rögzítve'");
    expect(audit).toContain('Egyéb rendszer-művelet');
    expect(audit).toContain('details name="audit-change"');
    expect(css).toContain('max-width:1560px!important');
    expect(css).not.toContain('max-width:none!important');
  });

  it('uses an admin-specific access-denied experience instead of the checkout error copy',()=>{
    const denied=read('src/app/admin/hozzaferes-megtagadva/page.tsx');
    const fallback=read('src/app/admin/error.tsx');
    expect(denied).toContain('Nincs jogosultságod ehhez a modulhoz.');
    expect(denied).toContain('Vissza az adminhoz');
    expect(fallback).toContain('Ez az admin nézet most nem nyitható meg.');
    expect(fallback).not.toContain('A már leadott rendelést ne add le újra automatikusan');
  });
});
