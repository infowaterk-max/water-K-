import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Customer / Order Document Vault',()=>{
  test('keeps private order documents separate from digital product entitlement authority',()=>{
    const sql=read('supabase/migrations/20260914131500_order_customer_document_vault.sql');
    expect(sql).toContain('create table if not exists public.order_customer_documents');
    expect(sql).toContain("kind in('invoice','warranty','certificate','service_record','merchant_attachment','other')");
    expect(sql).toContain("storage_bucket text not null default 'order-documents-private'");
    expect(sql).toContain('foreign key(order_id,instance_id) references public.orders(id,instance_id)');
    expect(sql).not.toContain('digital_entitlements');
  });

  test('uses private signed upload and explicit activation/revocation',()=>{
    const api=read('src/app/api/admin/orders/[id]/documents/route.ts');
    expect(api).toContain("createSignedUploadUrl(path)");
    expect(api).toContain("admin_prepare_order_customer_document_v1");
    expect(api).toContain("admin_activate_order_customer_document_v1");
    expect(api).toContain("admin_revoke_order_customer_document_v1");
    expect(api).not.toContain('getPublicUrl');
  });

  test('authorizes customer downloads by tenant + order ownership with audit and rate bounds',()=>{
    const sql=read('supabase/migrations/20260914131500_order_customer_document_vault.sql');
    expect(sql).toContain('authorize_order_customer_document_download_v1');
    expect(sql).toContain('o.customer_id=p_customer_id');
    expect(sql).toContain("d.status='active'");
    expect(sql).toContain("v_recent>=60");
    expect(sql).toContain('order_document_download_audit');
  });

  test('splits customer downloads and documents without merging backend authorities',()=>{
    const downloads=read('src/app/fiokom/letoltesek/page.tsx');
    const documents=read('src/app/fiokom/dokumentumok/page.tsx');
    const registry=read('src/lib/account/account-capabilities.ts');
    expect(registry).toContain("label:'Letöltéseim'");
    expect(registry).toContain("label:'Dokumentumaim'");
    expect(downloads).toContain('Digitális tartalom');
    expect(downloads).toContain('listAccountDigitalDownloads');
    expect(documents).toContain('Rendelési dokumentumok');
    expect(documents).toContain('Termékdokumentumok');
    expect(documents).toContain('listAccountOrderDocuments');
    expect(documents).toContain('listAccountProductDocuments');
  });

  test('merchant can manage order-bound documents from the order detail surface',()=>{
    const manager=read('src/components/admin/order-document-manager.tsx');
    const orderPage=read('src/app/admin/rendelesek/[id]/page.tsx');
    expect(manager).toContain('Dokumentum küldése a vásárlónak');
    expect(manager).toContain('uploadToSignedUrl');
    expect(manager).toContain('Hozzáférés visszavonása');
    expect(orderPage).toContain('OrderDocumentManager');
  });
});
