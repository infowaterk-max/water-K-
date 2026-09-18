import{readFileSync}from'node:fs';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(path,'utf8');
const forward=read('supabase/migrations/20260918051000_product_documents_post_purchase_account_authority.sql');
const baseline=read('supabase/customer-baseline/migrations/0036_product_documents_post_purchase_account_authority.sql');

describe('Product Documents post-purchase account authority',()=>{
  it('keeps forward and customer-baseline migrations byte-identical',()=>{
    expect(baseline).toBe(forward);
  });

  it('requires an eligible paid purchase for account-visible post-purchase discovery',()=>{
    expect(forward).toContain("d.visibility='public'");
    expect(forward).toContain("d.visibility='account'");
    expect(forward).toContain('d.post_purchase_delivery=false');
    expect(forward).toContain('o.customer_id=p_customer_id');
    expect(forward).toContain("o.status::text in('paid','processing','shipped','completed')");
    expect(forward).toContain('pv_purchase.product_id=d.product_id');
    expect(forward).toContain('(d.variant_id is null or oi.variant_id=d.variant_id)');
  });

  it('requires the same purchase authority for account-visible post-purchase download authorization',()=>{
    expect(forward).toContain("v_doc.visibility='account' and p_customer_id is null");
    expect(forward).toContain("v_doc.visibility='account' and v_doc.post_purchase_delivery=true and not exists(");
    expect(forward).toContain('pv_purchase.product_id=v_doc.product_id');
    expect(forward).toContain('(v_doc.variant_id is null or oi.variant_id=v_doc.variant_id)');
  });

  it('keeps the account API route behind the canonical database authorization RPC',()=>{
    const route=read('src/app/api/product-documents/[documentId]/route.ts');
    const service=read('src/lib/commerce/product-documents.ts');
    expect(route).toContain('authorizeProductDocumentDownload');
    expect(service).toContain("admin.rpc('authorize_product_document_download_v1'");
    expect(route).not.toContain('getPublicUrl');
  });
});
