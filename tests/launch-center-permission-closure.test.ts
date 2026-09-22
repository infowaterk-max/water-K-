import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('launch center permission closure',()=>{
 test('opening a webshop requires store.manage and atomic activation evidence',()=>{
  const page=read('src/app/admin/indulas/page.tsx');
  const actions=read('src/app/admin/indulas/actions.ts');
  const sql=read('supabase/migrations/20260903170000_admin_workspace_settings_evidence_atomic_v2.sql');
  expect(page).toContain("requireCurrentStoreContext('store.manage')");
  expect(actions).toContain("getAdminRequestUser('store.manage')");
  expect(actions).toContain("requireCurrentStoreContext('store.manage')");
  expect(actions).toContain("admin_activate_webshop_v2");
  expect(actions).toContain("evidence.id!==scope.instanceId||evidence.status!=='active'");
  expect(actions).not.toContain(".from('webshop_instances').update(");
  expect(actions).not.toContain('requireAdmin()');
  expect(sql).toContain("if v_before.status<>'pilot' then raise exception 'WEBSHOP_ACTIVATION_STATE_INVALID'");
  expect(sql).toContain("'store.activated'");
 });
});
