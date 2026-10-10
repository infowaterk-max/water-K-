import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const inventoryModulePath: string='../scripts/shoperation-office-rpc-actor-inventory.mjs';
const {compareInventory,scanRepository,scanSource,classifyRpcBinding}=await import(inventoryModulePath);
const expected=JSON.parse(readFileSync('quality/knowledge/office-rpc-actor-inventory.v1.json','utf8'));
const current=scanRepository();
const key=(r:{file:string;rpc:string;ordinal:number})=>r.file+'|'+r.rpc+'|'+r.ordinal;
describe('Core #1186 F27 Office / Communication Hub RPC source actor and tenant inventory',()=>{
 it('covers every current statically named Office/Communication sensitive RPC with approved source-expression ceiling',()=>{
  expect(expected.contract).toBe('shoperation.office-rpc-source-actor-inventory.v1');
  expect(expected.proofCeiling).toBe('SOURCE_EXPRESSIONS_ONLY_NOT_NATIVE_SUPABASE_AUTH');
  expect(current.calls.length).toBe(55);
  expect(new Set(current.calls.map((r:any)=>r.file)).size).toBe(35);
  expect(current.dynamic).toEqual([]);
  expect(compareInventory(current,expected)).toEqual([]);
 });
 it('passes actual local --check without contacting external services or writing baseline',()=>{
  const r=spawnSync(process.execPath,['scripts/shoperation-office-rpc-actor-inventory.mjs','--check'],{encoding:'utf8',timeout:30000});
  expect(r.status).toBe(0);
  expect(r.stdout).toContain('OFFICE_RPC_SOURCE_INVENTORY_PASS calls=55 files=35');
 });
 it('blocks newly introduced privileged RPC even if caller has no explicit actor argument',()=>{
  const injected=scanSource("const x=await db.rpc('admin_mutate_office_surprise_v1',{p_instance_id:request.body.instanceId});",'src/app/api/admin/office/unreviewed/route.ts');
  const result=compareInventory({calls:[...current.calls,...injected.calls],dynamic:current.dynamic},expected);
  expect(result.some((x:string)=>x.includes('NEW_UNREVIEWED_RPC:'))).toBe(true);
 });
 it('blocks change to existing actor or tenant expression, including swapping verified server actor for client data',()=>{
  const changed=current.calls.map((x:any)=>({...x,bindings:{...x.bindings}}));
  const target=changed.find((x:any)=>x.bindings.p_actor==='actor.id'&&x.bindings.p_instance_id==='scope.instanceId');
  expect(target).toBeDefined();
  target.bindings.p_actor='parsed.data.actorId';
  target.bindings.p_instance_id='request.body.instanceId';
  const issues=compareInventory({calls:changed,dynamic:[]},expected);
  expect(issues.some((x:string)=>x.includes('RPC_ACTOR_OR_SCOPE_BINDING_DRIFT:'))).toBe(true);
 });
 it('blocks deletion/move and collision of reviewed RPC call identities',()=>{
  const minus=current.calls.slice(1);
  expect(compareInventory({calls:minus,dynamic:[]},expected).some((x:string)=>x.includes('REMOVED_OR_MOVED_RPC'))).toBe(true);
  const duplicated=[...current.calls,current.calls[0]];
  expect(compareInventory({calls:duplicated,dynamic:[]},expected)).toContain('DUPLICATE_CALL_IDENTITIES');
  expect(key(current.calls[0])).not.toBe('');
 });
 it('flags dynamic calls under Office/Communication source boundaries instead of silently approving',()=>{
  const injection=scanSource("const y=await db.rpc(methodName,{p_actor:user.id,p_instance_id:store.id});",'src/app/api/admin/office/new-dynamic/route.ts');
  expect(injection.calls).toEqual([]);
  expect(injection.dynamic).toHaveLength(1);
  const issues=compareInventory({calls:current.calls,dynamic:injection.dynamic},expected);
  expect(issues.some((x:string)=>x.startsWith('DYNAMIC_RPC_UNCLASSIFIED:'))).toBe(true);
 });
 it('does not conflate a customer recipient p_user_id with a verified admin p_actor',()=>{
  const queue=expected.calls.filter((x:any)=>x.rpc==='enqueue_communication_v2');
  expect(queue).toHaveLength(2);
  for(const x of queue){
    expect(x.classification).toBe('customer-recipient-NOT-operator');
    expect(x.bindings.p_user_id).toBeTruthy();
    expect(x.bindings.p_actor).toBeUndefined();
  }
  expect(classifyRpcBinding({bindings:{p_actor:'form.get("userId")'}} as any)).toContain('REVIEW-BLOCK');
 });
 it('distinguishes direct server actor expressions from indirect helper parameter provenance without claiming native proof',()=>{
  const by=(className:string)=>expected.calls.filter((x:any)=>x.classification===className).length;
  expect(by('direct-server-actor-expression-UNVERIFIED')).toBe(17);
  expect(by('indirect-actor-expression-TRACE-REQUIRED')).toBe(15);
  expect(by('user-subject-expression-TRACE-REQUIRED')).toBe(4);
  expect(by('customer-recipient-NOT-operator')).toBe(2);
  expect(by('no-actor-binding-system-or-read-TRACE-REQUIRED')).toBe(17);
  expect(expected.decision).toContain('review-required');
 });
});
