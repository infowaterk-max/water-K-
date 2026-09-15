import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Product Documents product-scoped merchant UX',()=>{
  it('keeps active products inside a product-scoped documents workflow',()=>{
    const products=read('src/app/admin/termekek/page.tsx');
    const page=read('src/app/admin/termekek/[id]/dokumentumok/page.tsx');
    expect(products).toContain("product_id:string");
    expect(products).toContain("select('id,product_id,reseller_gross_price_huf");
    expect(products).toContain('href={`/admin/termekek/${row.product_id}/dokumentumok`}');
    expect(products).toContain('>Dokumentumok</Link>');
    expect(page).toContain('data-product-scoped-documents');
    expect(page).toContain('ProductDocumentManager');
    expect(page).toContain("eq('id',id).maybeSingle()");
    expect(page).toContain("eq('product_id',id)");
    expect(page).toContain('A számla külön a számlázóintegráció authorityja.');
  });

  it('does not weaken published-product draft authority to expose documents',()=>{
    const draftPage=read('src/app/admin/termekek/feltoltes/[id]/page.tsx');
    const draftApi=read('src/app/api/admin/catalog/products/[id]/draft/route.ts');
    const productDocs=read('src/app/admin/termekek/[id]/dokumentumok/page.tsx');
    expect(draftPage).toContain('product.active||');
    expect(draftApi).toContain('CATALOG_DRAFT_ALREADY_PUBLISHED');
    expect(productDocs).not.toContain('admin_update_product_draft_v1');
    expect(productDocs).not.toContain("method:'PATCH'");
  });
});
