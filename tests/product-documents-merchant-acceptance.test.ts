import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Product Documents merchant acceptance contract',()=>{
  it('requires real merchant auth and exact non-production deployment evidence',()=>{
    const page=read('src/app/admin/pilot-acceptance/page.tsx');
    expect(page).toContain('data-product-documents-acceptance-v1');
    expect(page).toContain('VERCEL_GIT_COMMIT_SHA');
    expect(page).toContain('VERCEL_URL');
    expect(page).toContain('VERCEL_ENV');
    expect(page).toContain('Service-role impersonation');
    expect(page).toContain('kézzel gyártott JWT');
    expect(page).toContain('SQL-runneres auth');
    expect(page).toContain('Product Documents mutációs acceptance production környezeten nem futtatható');
    expect(page).toContain('database target nem azonosítható biztonságosan');
    expect(page).toContain('NOT PROVEN');
  });

  it('uses the product workflow as primary merchant UX and keeps the central page as overview',()=>{
    const page=read('src/app/admin/pilot-acceptance/page.tsx');
    const manager=read('src/components/admin/product-document-manager.tsx');
    const editPage=read('src/app/admin/termekek/feltoltes/[id]/page.tsx');
    const overview=read('src/app/admin/termekek/dokumentumok/page.tsx');
    expect(page).toContain('/admin/termekek/feltoltes');
    expect(editPage).toContain('ProductDocumentManager');
    expect(editPage).toContain('Termék · Dokumentumok');
    expect(overview).toContain('központi áttekintő és karbantartó nézet');
    expect(manager).toContain('Megjelenjen a nyilvános termékoldalon');
    expect(manager).toContain('Vásárlás után automatikusan küldjük');
    expect(manager).toContain('Minden változat');
  });

  it('covers signed upload, activation, storefront, post-purchase, account, variant, revoke, audit and cleanup',()=>{
    const page=read('src/app/admin/pilot-acceptance/page.tsx');
    const manager=read('src/components/admin/product-document-manager.tsx');
    const orderRoute=read('src/app/api/product-documents/order/[documentId]/route.ts');
    const email=read('src/lib/integrations/email.ts');
    const orderPage=read('src/app/rendeles-sikeres/page.tsx');
    expect(page).toContain('/fiokom/letoltesek');
    expect(page).toContain('/admin/audit');
    for(const marker of['Termékhez kötött feltöltés + aktiválás.','Termékoldali megjelenés.','Vásárlás utáni automatikus kézbesítés.','Számla külön authority.','Account scope.','Variant scope.','Revoke + audit.','Fixture cleanup.'])expect(page).toContain(marker);
    expect(manager).toContain("fetch('/api/admin/catalog/product-documents',{method:'POST'");
    expect(manager).toContain('uploadToSignedUrl');
    expect(manager).toContain("method:'PATCH'");
    expect(manager).toContain("method:'DELETE'");
    expect(manager).toContain('postPurchaseDelivery');
    expect(email).toContain('resolveProductDocumentAccess');
    expect(email).toContain('productDocumentBlock');
    expect(email).toContain('invoiceUrl');
    expect(orderPage).toContain('id="termekdokumentumok"');
    expect(orderRoute).toContain('authorizeOrderProductDocumentDownload');
    expect(orderRoute).not.toContain('getPublicUrl');
  });

  it('does not let the checklist itself become acceptance authority',()=>{
    const page=read('src/app/admin/pilot-acceptance/page.tsx');
    expect(page).toContain('A checklist megjelenése önmagában nem PASS.');
    expect(page).toContain('Merchant E2E csak akkor PROVEN');
    expect(page).toContain('ugyanazon exact SHA/deploymenten');
  });
});
