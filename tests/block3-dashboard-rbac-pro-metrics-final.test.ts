import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{describe,expect,it}from'vitest';
const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');

describe('Block 3 dashboard RBAC and Pro metrics final closure',()=>{
  it('filters dashboard actions with the same store permission authority as navigation',()=>{
    const page=read('src/app/admin/page.tsx');
    expect(page).toContain("getActiveStoreRoles(instance.id)");
    expect(page).toContain("roleHasPermission(role,permission)");
    expect(page).toContain("const canCatalog=can('catalog.manage')");
    expect(page).toContain("const canOrders=can('orders.manage')");
    expect(page).toContain("const canSales=can('sales.manage')");
    expect(page).toContain("const canStoreManage=can('store.manage')");
    expect(page).toContain('{canCatalog&&<Link className="card textLink" href="/admin/termekek"');
    expect(page).toContain('{canOrders&&<Link className="card textLink" href="/admin/rendelesek"');
    expect(page).toContain('{canStoreManage&&<Link className="card textLink" href="/admin/beallitasok/fizetes-szallitas"');
  });

  it('reads the production cost snapshot column instead of the removed legacy cost field',()=>{
    const page=read('src/app/admin/page.tsx');
    expect(page).toContain("unit_cost_net_huf_snapshot,quantity");
    expect(page).toContain('i.unit_cost_net_huf_snapshot == null');
    expect(page).toContain('Number(i.unit_cost_net_huf_snapshot)');
    expect(page).not.toContain("line_total_gross_huf,unit_cost_net_huf,quantity");
  });

  it('only loads and links Pro intelligence when analytics or module permissions allow it',()=>{
    const page=read('src/app/admin/page.tsx');
    expect(page).toContain('if (isPro && instance && canAnalytics)');
    expect(page).toContain('{isPro && canAnalytics && advancedLoadError');
    expect(page).toContain('{canMarketing&&<Link className="btn" href="/admin/kampanyok"');
    expect(page).toContain('{canSupport&&<Link className="btn btnPrimary" href="/admin/kommunikacio"');
  });
});
