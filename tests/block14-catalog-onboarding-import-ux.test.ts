import{readFileSync}from'node:fs';
import{describe,expect,test}from'vitest';
import{catalogCsvHeaders,parseCatalogOnboardingCsv,suggestCatalogOnboardingMapping}from'@/lib/catalog-import';

const read=(path:string)=>readFileSync(path,'utf8');
const productionMigration=read('supabase/migrations/20260910204000_block14_catalog_onboarding_import_ux.sql');
const customerMigration=read('supabase/customer-baseline/migrations/0009_block14_catalog_onboarding_import_ux.sql');

describe('Roadmap Block 14 – Catalog Product Onboarding & Import UX',()=>{
  test('parses semicolon CSV, maps fields and keeps imported products draft-first',()=>{
    const csv='Terméknév;Cikkszám;Nettó;Bruttó;Készlet;Kategória;Tulajdonságok\nTeszt termék;SKU-14;1000;1270;5;Kert;Szín=Zöld|Méret=M';
    const headers=catalogCsvHeaders(csv),suggested=suggestCatalogOnboardingMapping(headers);
    expect(headers).toHaveLength(7);expect(suggested.name).toBe('Terméknév');expect(suggested.sku).toBe('Cikkszám');
    const rows=parseCatalogOnboardingCsv(csv,{name:'Terméknév',sku:'Cikkszám',netPrice:'Nettó',grossPrice:'Bruttó',stock:'Készlet',category:'Kategória',attributes:'Tulajdonságok'});
    expect(rows[0].error).toBeUndefined();expect(rows[0].draft).toMatchObject({name:'Teszt termék',slug:'teszt-termek',sku:'SKU-14',netPrice:1000,grossPrice:1270,stock:5,category:'Kert',categorySlug:'kert',attributes:{Szín:'Zöld',Méret:'M'}});
  });

  test('keeps invalid and duplicate rows out of a valid onboarding plan',()=>{
    const csv='name,sku,net_price,gross_price\nOne,DUP,100,127\nTwo,DUP,100,127\nBad,,x,127';
    const rows=parseCatalogOnboardingCsv(csv,{name:'name',sku:'sku',netPrice:'net_price',grossPrice:'gross_price'});
    expect(rows[0].draft?.sku).toBe('DUP');expect(rows[1].error).toContain('Duplikált SKU');expect(rows[2].error).toContain('hiányzó SKU');
  });

  test('uses the existing catalog authority and stores CSV apply plans server-side',()=>{
    const route=read('src/app/api/admin/catalog/import/route.ts'),manual=read('src/app/api/admin/catalog/onboarding/route.ts');
    for(const source of[route,manual]){expect(source).toContain("getAdminRequestUser('catalog.manage')");expect(source).toContain("requireCurrentStoreContext('catalog.manage')");expect(source).toContain('createAdminClient()')}
    expect(route).toContain("from('catalog_onboarding_batches')");expect(route).toContain('apply_plan:applyPlan');expect(route).toContain("rpc('apply_catalog_onboarding_batch_v1'");
    expect(manual).toContain("rpc('create_catalog_draft_v1'");expect(manual).toContain("createHash('sha256')");
  });

  test('adds tenant-scoped category, attribute, media and durable onboarding contracts',()=>{
    for(const sql of[productionMigration,customerMigration])for(const marker of[
      'public.catalog_categories','public.product_category_assignments','public.product_attributes','public.product_media','public.catalog_onboarding_batches',
      'products_instance_slug_uidx','product_variants_instance_sku_uidx','public.create_catalog_draft_v1','public.apply_catalog_onboarding_batch_v1','public.record_product_media_v1',
      "values(p_instance_id,p_product->>'slug'","false,'retail',false","p_actor,'catalog.product_draft_created'","to service_role"
    ])expect(sql).toContain(marker);
    expect(productionMigration).toContain("revoke all on public.catalog_categories");expect(productionMigration).toContain('foreign key(product_id, instance_id)');
  });

  test('product media upload is bounded, content-signature checked and rolled back on DB failure',()=>{
    const route=read('src/app/api/admin/catalog/media/route.ts');
    expect(route).toContain("const PRODUCT_MEDIA_BUCKET='product-media',MAX_BYTES=8*1024*1024");
    expect(route).toContain('signatureMatches(file.type,bytes)');expect(route).toContain(".eq('instance_id',scope.instanceId)");
    expect(route).toContain("rpc('record_product_media_v1'");expect(route).toContain('.remove([storagePath])');
  });

  test('invalidates the old Fresh Install proof because Block 14 changes the customer schema',()=>{
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
    expect(manifest.status).toBe('snapshot-reviewed');expect(manifest.freshInstallProofRequired).toBe(true);expect(manifest.proofContractSha256).toBeNull();
    expect(customerMigration).toContain('catalog_onboarding_batches');
  });

  test('does not pull later builder/template or excluded enrichment systems into Block 14',()=>{
    const ui=read('src/components/admin/catalog-product-onboarding.tsx'),route=read('src/app/api/admin/catalog/import/route.ts');
    for(const forbidden of['drag&drop','live canvas','Page Schema','supplier feed','marketplace bulk','AI-generated']){expect(ui).not.toContain(forbidden);expect(route).not.toContain(forbidden)}
  });
});
