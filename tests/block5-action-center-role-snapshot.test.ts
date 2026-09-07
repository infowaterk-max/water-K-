import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Block 5 action-center role snapshot',()=>{
  it('derives read and manage permissions from one resolved role list',()=>{
    const page=read('src/app/admin/intezkedesek/page.tsx');
    expect(page).toContain("const roles=platformRole?[]:await getActiveStoreRoles(currentInstance.id);");
    expect(page).toContain("roles.some(role=>roleHasPermission(role,'analytics.read'))");
    expect(page).toContain("roles.some(role=>roleHasPermission(role,'store.manage'))");
    expect(page).not.toContain("hasStorePermission(currentInstance.id,'analytics.read')");
    expect(page).not.toContain("hasStorePermission(currentInstance.id,'store.manage')");
  });

  it('renders explicit access denied in-place instead of redirecting a missing reader to the admin home',()=>{
    const page=read('src/app/admin/intezkedesek/page.tsx');
    expect(page).toContain("if(access.mode==='hidden'){");
    expect(page).toContain('<AdminAccessDenied description=');
    expect(page).not.toContain("if(access.mode==='hidden')redirect('/admin')");
  });

  it('keeps the shared denied route and direct denied state visually consistent',()=>{
    const shared=read('src/components/admin/admin-access-denied.tsx');
    const deniedPage=read('src/app/admin/hozzaferes-megtagadva/page.tsx');
    expect(shared).toContain('Jogosultság · 403');
    expect(shared).toContain('Nincs jogosultságod ehhez a modulhoz.');
    expect(shared).toContain('data-access-state="denied"');
    expect(deniedPage).toContain('<AdminAccessDenied/>');
  });
});
