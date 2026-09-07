import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Block 5 merchant route guards',()=>{
  it('does not keep legacy platform-only layouts on merchant role-aware surfaces',()=>{
    for(const file of[
      'src/app/admin/intezkedesek/layout.tsx',
      'src/app/admin/iranyitokozpont/layout.tsx',
    ]){
      const full=path.join(root,file);
      const source=fs.existsSync(full)?fs.readFileSync(full,'utf8'):'';
      expect(source).not.toContain('requirePlatformOperator');
    }
  });

  it('keeps Action Center and Control Tower protected by tenant role-aware page guards',()=>{
    const actionCenter=read('src/app/admin/intezkedesek/page.tsx');
    const controlTower=read('src/app/admin/iranyitokozpont/page.tsx');
    expect(actionCenter).toContain("roles.some(role=>roleHasPermission(role,'analytics.read'))");
    expect(actionCenter).toContain("roles.some(role=>roleHasPermission(role,'store.manage'))");
    expect(actionCenter).toContain("access.mode==='read-only'");
    expect(controlTower).toContain("requireCurrentStoreContext('analytics.read')");
    expect(controlTower).toContain("hasStorePermission(store.instanceId,'store.manage')");
    expect(controlTower).toContain("access.mode==='read-only'");
  });
});
