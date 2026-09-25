import{readFileSync}from'node:fs';
import{describe,expect,it}from'vitest';
import{PLAYROOM_V20_TEMPLATE_PACKAGE}from'@/lib/builder/templates/gaming/playroom/v20';
import{listStorefrontTemplateLibraryEntries}from'@/lib/builder/storefront-template-library';

const read=(path:string)=>readFileSync(path,'utf8');
const migration='supabase/migrations/20260922140000_storefront_template_demo_catalog_lifecycle_v1.sql';
const baseline='supabase/customer-baseline/migrations/0045_storefront_template_demo_catalog_lifecycle_v1.sql';

describe('shared template demo catalog lifecycle',()=>{
  it('mirrors the demo catalog authority into fresh-install customer baseline',()=>{
    expect(read(baseline)).toBe(read(migration));
  });

  it('uses explicit machine markers and never guesses merchant products',()=>{
    const sql=read(migration);
    expect(sql).toContain('template_demo_namespace');
    expect(sql).toContain('template_demo_key');
    expect(sql).toContain("template_demo_state in('fixture','adopted','retired')");
    expect(sql).toContain('products_instance_template_demo_uidx');
    expect(sql).toContain('save_storefront_template_demo_products_v1');
    expect(sql).toContain("coalesce((v_payload->>'installAsDemoProduct')::boolean,false) is not true");
    expect(sql).toContain("template_demo_state='fixture'");
    expect(sql).toContain("v_existing.template_demo_state='adopted'");
    expect(sql).not.toMatch(/name\s+like.*demo|slug\s+like.*demo/i);
  });

  it('makes activation remove only fixture products in the same audited database transaction',()=>{
    const sql=read(migration);
    expect(sql).toContain("coalesce(p.template_demo_state,'')<>'fixture'");
    expect(sql).toContain("delete from public.products where instance_id=p_instance_id and template_demo_state='fixture'");
    expect(sql).toContain("'storefront.demo_catalog_removed_on_activation'");
    expect(sql).toContain("'store.activated'");
    expect(sql).toContain("'demo_products_removed',v_demo_removed");
    expect(sql).toContain("raise exception 'WEBSHOP_REAL_PRODUCT_REQUIRED'");
  });

  it('keeps template choice explicit and documents automatic launch cleanup before opt-in',()=>{
    const library=read('src/components/admin/storefront-template-library.tsx');
    const actions=read('src/app/admin/tartalom/builder/actions.ts');
    const persistence=read('src/lib/builder/storefront-template-persistence.ts');
    expect(library).toContain('Bemutató termékekkel kérem');
    expect(library).toContain('A webshop megnyitásakor a még demóként jelölt termékek automatikusan törlődnek.');
    expect(library).toContain('checked={includeDemoProducts}');
    expect(library).toContain('installDemoProducts');
    expect(actions).toContain('installDemoProducts?:boolean');
    expect(actions).toContain('installDemoProducts:input.installDemoProducts===true');
    expect(persistence).toContain("rpc('save_storefront_template_demo_products_v1'");
    expect(persistence).toContain("record.entityType==='product'&&record.payload.installAsDemoProduct===true");
  });

  it('keeps launch readiness based on real products and shows fixture cleanup evidence',()=>{
    const status=read('src/lib/builder/storefront-template-demo-catalog-server.ts');
    const actions=read('src/app/admin/indulas/actions.ts');
    const page=read('src/app/admin/indulas/page.tsx');
    expect(status).toContain("if(state==='fixture')fixtureProductCount++");
    expect(status).toContain('realProductCount++');
    expect(actions).toContain('catalogStatus.realProductCount>0');
    expect(page).toContain('demótermék csak előnézethez; megnyitáskor automatikusan törlődik');
    expect(page).toContain('A „Megnyitom a webshopom” művelettel ezeket a rendszer automatikusan eltávolítja.');
    expect(page).toContain('auditnaplóba kerül');
  });

  it('exposes the prepared twelve-game Playroom pack but no implicit pack on other templates',()=>{
    const playroom=listStorefrontTemplateLibraryEntries().find(item=>item.templateKey==='gaming.playroom');
    expect(playroom?.demoProductCount).toBe(12);
    const prepared=(PLAYROOM_V20_TEMPLATE_PACKAGE.demoFixtures??[]).filter(item=>item.entityType==='product'&&item.payload.installAsDemoProduct===true);
    expect(prepared).toHaveLength(12);
    expect(prepared.every(item=>String(item.payload.image).startsWith('/storefront/playroom/'))).toBe(true);
  });

  it('lets normal storefront commerce use a demo cover only as media fallback',()=>{
    const scene=read('src/lib/builder/storefront-interactive-scene-server.ts');
    expect(scene).toContain('template_demo_image_url');
    expect(scene).toContain('mediaUrlById.get(primaryMediaId)??product.template_demo_image_url??null');
  });
});
