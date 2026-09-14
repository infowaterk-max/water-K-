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

  it('covers upload, activation, public/account/variant scope, revoke, audit and cleanup through existing application surfaces',()=>{
    const page=read('src/app/admin/pilot-acceptance/page.tsx');
    const manager=read('src/components/admin/product-document-manager.tsx');
    const adminPage=read('src/app/admin/termekek/dokumentumok/page.tsx');
    expect(page).toContain('/admin/termekek/dokumentumok');
    expect(page).toContain('/fiokom/letoltesek');
    expect(page).toContain('/admin/audit');
    for(const marker of['Feltöltés + aktiválás.','Public scope.','Account scope.','Variant scope.','Revoke + audit.','Fixture cleanup.'])expect(page).toContain(marker);
    expect(adminPage).toContain("requireCurrentStorePageContext('catalog.manage')");
    expect(manager).toContain("fetch('/api/admin/catalog/product-documents',{method:'POST'");
    expect(manager).toContain('uploadToSignedUrl');
    expect(manager).toContain("method:'PATCH'");
    expect(manager).toContain("method:'DELETE'");
    expect(manager).toContain("<option value=\"account\">Bejelentkezett fiók</option>");
    expect(manager).toContain("<option value=\"public\">Nyilvános termékoldal</option>");
    expect(manager).toContain('<option value="">Minden változat</option>');
  });

  it('does not let the checklist itself become acceptance authority',()=>{
    const page=read('src/app/admin/pilot-acceptance/page.tsx');
    expect(page).toContain('A checklist megjelenése önmagában nem PASS.');
    expect(page).toContain('Merchant E2E csak akkor PROVEN');
    expect(page).toContain('ugyanazon exact SHA/deploymenten');
  });
});
