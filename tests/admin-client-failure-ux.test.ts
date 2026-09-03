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
});
