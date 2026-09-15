import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Product Documents foundation',()=>{
  test('keeps product documents separate from paid digital, invoices and order document authorities',()=>{
    const sql=read('supabase/migrations/20260914145500_product_documents_foundation.sql');
    const email=read('src/lib/integrations/email.ts');
    expect(sql).toContain('create table if not exists public.product_documents');
    expect(sql).toContain("visibility in('public','account')");
    expect(sql).toContain("storage_bucket text not null default 'product-documents-private'");
    expect(sql).toContain("kind in('manual','datasheet','size_guide','warranty_info','compatibility','installation_guide','other')");
    expect(sql).not.toContain('digital_entitlements');
    expect(sql).not.toContain('order_customer_documents');
    expect(email).toContain('invoiceUrl');
    expect(email).toContain('productDocumentBlock');
  });

  test('binds documents to the canonical product and optional matching variant',()=>{
    const sql=read('supabase/migrations/20260914145500_product_documents_foundation.sql');
    expect(sql).toContain('product_id uuid not null references public.products(id)');
    expect(sql).toContain('variant_id uuid references public.product_variants(id)');
    expect(sql).toContain('PRODUCT_DOCUMENT_VARIANT_SCOPE_INVALID');
    expect(sql).toContain("new.storage_path not like new.instance_id::text||'/'||new.product_id::text||'/%'");
  });

  test('keeps the bucket private and authorizes short-lived storefront downloads through RPC',()=>{
    const sql=read('supabase/migrations/20260914145500_product_documents_foundation.sql');
    const service=read('src/lib/commerce/product-documents.ts');
    const route=read('src/app/api/product-documents/[documentId]/route.ts');
    expect(sql).toContain("'product-documents-private','product-documents-private',false");
    expect(sql).toContain('authorize_product_document_download_v1');
    expect(sql).toContain("v_doc.visibility='account' and p_customer_id is null");
    expect(sql).toContain('v_recent>=60');
    expect(service).toContain('createSignedUrl(authorization.path,SIGNED_DOWNLOAD_SECONDS');
    expect(service).toContain('const SIGNED_DOWNLOAD_SECONDS=300');
    expect(route).toContain("headers:{'Cache-Control':'no-store'}");
    expect(route).not.toContain('getPublicUrl');
  });

  test('uses RPC projections rather than direct Data API access to the new tables',()=>{
    const service=read('src/lib/commerce/product-documents.ts');
    const adminRoute=read('src/app/api/admin/catalog/product-documents/route.ts');
    const hardening=read('supabase/migrations/20260914150000_product_documents_runtime_hardening.sql');
    expect(service).toContain("admin.rpc('list_storefront_product_documents_v1'");
    expect(service).toContain("admin.rpc('authorize_product_document_download_v1'");
    expect(service).toContain("admin.rpc('list_order_product_documents_v1'");
    expect(service).toContain("admin.rpc('authorize_order_product_document_download_v1'");
    expect(adminRoute).toContain("admin.rpc('admin_list_product_documents_v1'");
    expect(adminRoute).not.toContain("from('product_documents')");
    expect(hardening).toContain('admin_list_product_documents_v1');
  });

  test('merchant upload flow uses signed private upload and explicit activation/revocation',()=>{
    const adminRoute=read('src/app/api/admin/catalog/product-documents/route.ts');
    const manager=read('src/components/admin/product-document-manager.tsx');
    expect(adminRoute).toContain('createSignedUploadUrl(path,{upsert:false})');
    expect(adminRoute).toContain('admin_prepare_product_document_v2');
    expect(adminRoute).toContain('p_post_purchase_delivery');
    expect(adminRoute).toContain('admin_activate_product_document_v1');
    expect(adminRoute).toContain('admin_revoke_product_document_v1');
    expect(manager).toContain('uploadToSignedUrl');
    expect(manager).toContain('Minden változat');
    expect(manager).toContain('Megjelenjen a nyilvános termékoldalon');
    expect(manager).toContain('Vásárlás után automatikusan küldjük');
    expect(manager).toContain('postPurchaseDelivery');
  });

  test('canonical merchant workflow stores post-purchase delivery independently from product-page visibility',()=>{
    const forward=read('supabase/migrations/20260915074500_product_documents_merchant_workflow.sql');
    const baseline=read('supabase/customer-baseline/migrations/0034_product_documents_merchant_workflow.sql');
    for(const sql of[forward,baseline]){
      expect(sql).toContain('post_purchase_delivery boolean not null default false');
      expect(sql).toContain('admin_prepare_product_document_v2');
      expect(sql).toContain('list_order_product_documents_v1');
      expect(sql).toContain('authorize_order_product_document_download_v1');
      expect(sql).toContain("d.status='active' and d.post_purchase_delivery=true");
    }
  });

  test('storefront renders Product Documents only when real documents are available',()=>{
    const page=read('src/app/termek/[slug]/page.tsx');
    expect(page).toContain('listStorefrontProductDocuments');
    expect(page).toContain('productDocuments.length>0');
    expect(page).toContain('data-product-documents');
    expect(page).toContain('Termékdokumentumok');
    expect(page).toContain('/api/product-documents/${document.documentId}?variantId=');
  });

  test('account convergence discovers purchased-product documents without becoming a new file authority',()=>{
    const service=read('src/lib/commerce/product-documents.ts');
    const account=read('src/app/fiokom/letoltesek/page.tsx');
    expect(service).toContain("from('order_items')");
    expect(service).toContain(".eq('orders.instance_id',instanceId)");
    expect(service).toContain(".eq('orders.customer_id',customerId)");
    expect(service).toContain('listStorefrontProductDocuments(instanceId,variant.variantId,customerId)');
    expect(service).not.toContain("from('product_documents')");
    expect(account).toContain('listAccountProductDocuments');
    expect(account).toContain('Termékdokumentumok');
    expect(account).toContain('item.downloadHref');
  });

  test('post-purchase email sends a Shoperation link and the file route signs only after order authorization',()=>{
    const email=read('src/lib/integrations/email.ts');
    const orderPage=read('src/app/rendeles-sikeres/page.tsx');
    const orderRoute=read('src/app/api/product-documents/order/[documentId]/route.ts');
    expect(email).toContain('resolveProductDocumentAccess');
    expect(email).toContain('/rendeles-sikeres?token=${encodeURIComponent(String(order.confirmation_token))}#termekdokumentumok');
    expect(email).not.toContain('createSignedUrl');
    expect(orderPage).toContain('id="termekdokumentumok"');
    expect(orderPage).toContain('/api/product-documents/order/${document.documentId}?orderId=');
    expect(orderRoute).toContain('authorizeOrderProductDocumentDownload');
    expect(orderRoute).toContain('NextResponse.redirect(signed.url,302)');
    expect(orderRoute).not.toContain('getPublicUrl');
  });

  test('merchant discovers documents from the product workflow while central page remains an overview',()=>{
    const editPage=read('src/app/admin/termekek/feltoltes/[id]/page.tsx');
    const overview=read('src/app/admin/termekek/dokumentumok/page.tsx');
    const nav=read('src/lib/navigation/admin-ia.ts');
    expect(editPage).toContain('ProductDocumentManager');
    expect(editPage).toContain('Termék · Dokumentumok');
    expect(overview).toContain('központi áttekintő és karbantartó nézet');
    expect(nav).toContain("id:'product-documents'");
    expect(nav).toContain("href:'/admin/termekek/dokumentumok'");
  });
});
