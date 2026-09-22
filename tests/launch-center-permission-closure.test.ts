import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('launch center permission closure',()=>{
 test('opening a webshop requires store.manage, a real catalog and atomic demo cleanup evidence',()=>{
  const page=read('src/app/admin/indulas/page.tsx');
  const actions=read('src/app/admin/indulas/actions.ts');
  const sql=read('supabase/migrations/20260922140000_storefront_template_demo_catalog_lifecycle_v1.sql');
  expect(page).toContain("requireCurrentStoreContext('store.manage')");
  expect(page).toContain('catalogStatus.realProductCount>0');
  expect(page).toContain('demótermék található a webshopban');
  expect(page).toContain('automatikusan eltávolítja');
  expect(actions).toContain("getAdminRequestUser('store.manage')");
  expect(actions).toContain("requireCurrentStoreContext('store.manage')");
  expect(actions).toContain("admin_activate_webshop_v2");
  expect(actions).toContain("evidence.id!==scope.instanceId||evidence.status!=='active'");
  expect(actions).toContain('catalogStatus.realProductCount>0');
  expect(actions).not.toContain(".from('webshop_instances').update(");
  expect(actions).not.toContain(".from('products').delete(");
  expect(actions).not.toContain('requireAdmin()');
  expect(sql).toContain("if v_before.status<>'pilot' then raise exception 'WEBSHOP_ACTIVATION_STATE_INVALID'");
  expect(sql).toContain("raise exception 'WEBSHOP_REAL_PRODUCT_REQUIRED'");
  expect(sql).toContain("template_demo_state='fixture'");
  expect(sql).toContain("'storefront.demo_catalog_removed_on_activation'");
  expect(sql).toContain("'store.activated'");
 });
});
