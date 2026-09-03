import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('admin client failure UX',()=>{
  test('catalog import reports network failures and confirms apply',()=>{
    const source=read('src/components/admin/catalog-importer.tsx');
    expect(source).toContain('Hálózati hiba. Az importelőnézet nem készült el.');
    expect(source).toContain('A módosításokat nem tekintjük alkalmazottnak.');
    expect(source).toContain('window.confirm');
    expect(source).toContain("role={isError?'alert':'status'}");
  });

  test('bulk catalog operation cannot remain permanently busy after fetch failure',()=>{
    const source=read('src/components/admin/bulk-product-editor.tsx');
    expect(source).toContain('finally{setBusy(false)}');
    expect(source).toContain('A tömeges módosítást nem tekintjük végrehajtottnak.');
    expect(source).toContain('window.confirm');
  });

  test('content mutations recover from network errors and confirm destructive delete',()=>{
    const source=read('src/components/admin/content-manager.tsx');
    expect(source).toContain('finally{setBusy(false)}');
    expect(source).toContain('A módosítást nem tekintjük elmentettnek.');
    expect(source).toContain("window.confirm('Biztosan törlöd ezt a tartalmat?");
  });

  test('campaign clients recover from network failures and confirm destructive cancellation',()=>{
    const actions=read('src/components/admin/campaign-actions.tsx');
    const create=read('src/components/admin/campaign-create-form.tsx');
    expect(actions).toContain('finally{');
    expect(actions).toContain('A kampány állapotát nem tekintjük módosítottnak.');
    expect(actions).toContain("window.confirm('Biztosan törlöd ezt a kampányt?')");
    expect(create).toContain('finally{setBusy(false)}');
    expect(create).toContain('A kampányt nem tekintjük létrehozottnak.');
  });
  test('support reply and suppression actions recover from network failures',()=>{
    const support=read('src/components/admin/support-reply-form.tsx');
    const suppression=read('src/components/admin/suppression-actions.tsx');
    expect(support).toContain('A választ nem tekintjük rögzítettnek.');
    expect(support).toContain('finally');
    expect(suppression).toContain('A tiltást nem tekintjük rögzítettnek.');
    expect(suppression).toContain('A feloldást nem tekintjük végrehajtottnak.');
    expect(suppression).toContain("window.confirm('Biztosan feloldod ezt a címet a tiltólistáról?')");
  });

  test('procurement mutations fail closed and confirm full receipt',()=>{
    const source=read('src/components/admin/procurement-controls.tsx');
    expect(source.match(/finally/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('A beszerzést nem tekintjük létrehozottnak.');
    expect(source).toContain('A beszerzési állapotot nem tekintjük módosítottnak.');
    expect(source).toContain('A bevételezést nem tekintjük rögzítettnek.');
    expect(source).toContain("window.confirm('Biztosan bevételezed az összes fennmaradó mennyiséget?')");
  });

  test('integration retry, recommendations and manual fulfillment recover from network failures',()=>{
    const retry=read('src/components/admin/integration-job-retry.tsx');
    const recommendations=read('src/components/admin/recommendation-manager.tsx');
    const manual=read('src/components/admin/manual-fulfillment-control.tsx');
    expect(retry).toContain('Az újrapróbálást nem tekintjük elindítottnak.');
    expect(retry).toContain('finally');
    expect(recommendations).toContain('Az ajánlási szabályt nem tekintjük elmentettnek.');
    expect(recommendations).toContain('A szabály módosítását nem tekintjük végrehajtottnak.');
    expect(recommendations).toContain("window.confirm('Biztosan törlöd ezt az ajánlási szabályt?')");
    expect(manual).toContain('A kézi teljesítési adatokat nem tekintjük elmentettnek.');
    expect(manual).toContain('finally');
  });

});
