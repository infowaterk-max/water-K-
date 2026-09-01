import{describe,expect,it}from'vitest';import{readFileSync}from'node:fs';import{join}from'node:path';const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
describe('merchant read-page tenant scope',()=>{
 it('scopes inventory analytics to the current store',()=>{const s=read('src/app/admin/keszlet-elemzes/page.tsx');expect(s).toContain("requireCurrentStoreContext('analytics.read')");expect((s.match(/\.eq\('instance_id',scope\.instanceId\)/g)||[]).length).toBeGreaterThanOrEqual(4)});
 it('scopes support inbox to the current store',()=>{const s=read('src/app/admin/ugyfelszolgalat/page.tsx');expect(s).toContain("requireCurrentStoreContext('support.manage')");expect(s).toContain(".eq('instance_id',scope.instanceId)")});
 it('scopes support conversation and messages to the current store',()=>{const s=read('src/app/admin/ugyfelszolgalat/[id]/page.tsx');expect(s).toContain("requireCurrentStoreContext('support.manage')");expect((s.match(/\.eq\('instance_id',scope\.instanceId\)/g)||[]).length).toBeGreaterThanOrEqual(2)});
});
