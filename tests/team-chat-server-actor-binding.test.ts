import {beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
const mocks=vi.hoisted(()=>({auth:vi.fn(),plan:vi.fn(),scope:vi.fn(),cap:vi.fn(),rpc:vi.fn(),admin:vi.fn()}));
vi.mock('@/lib/auth/admin-api',()=>({getAdminRequestUser:mocks.auth}));
vi.mock('@/lib/plans/access',()=>({hasCurrentPlanFeature:mocks.plan}));
vi.mock('@/lib/instances/scope',()=>({requireCurrentStoreContext:mocks.scope}));
vi.mock('@/lib/auth/store-capabilities',()=>({hasStoreCapability:mocks.cap}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:mocks.admin}));
import {POST} from '../src/app/api/admin/office/chat/message/route';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const attacker='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const store='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const otherStore='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const thread='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const msg='ffffffff-ffff-4fff-8fff-ffffffffffff';
const send=async(payload:Record<string,unknown>)=>POST(new Request('http://localhost/api/admin/office/chat/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}));
beforeEach(()=>{
 vi.resetAllMocks();
 mocks.auth.mockResolvedValue({id:actor});
 mocks.plan.mockResolvedValue(true);
 mocks.scope.mockResolvedValue({instanceId:store,organizationId:'org-local',slug:'test-local',isPlatform:false});
 mocks.cap.mockResolvedValue(true);
 mocks.rpc.mockResolvedValue({data:{messageId:msg,threadId:thread},error:null});
 mocks.admin.mockReturnValue({rpc:mocks.rpc});
});
describe('F26 Team Chat server actor and tenant binding',()=>{
 it('rejects forged actor and store fields in caller body, uses authenticated user and server scope',async()=>{
  const res=await send({threadId:thread,body:'hello',actorId:attacker,userId:attacker,p_actor:attacker,instanceId:otherStore,p_instance_id:otherStore});
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ok:true,messageId:msg});
  expect(mocks.plan).toHaveBeenCalledWith('teamChat');
  expect(mocks.cap).toHaveBeenCalledWith(store,actor,'office.internal_chat',expect.objectContaining({resourceOwnerUserId:actor,resourceAssignedUserId:actor}));
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('admin_mutate_office_team_chat_v2',{p_instance_id:store,p_actor:actor,p_action:'add_internal_message',p_payload:{threadId:thread,body:'hello',mentionUserIds:[],objectType:null,objectId:null}});
 });
 it('unauthenticated user is denied before privileged client',async()=>{
  mocks.auth.mockResolvedValue(null);
  expect((await send({threadId:thread,body:'hi'})).status).toBe(403);
  expect(mocks.plan).not.toHaveBeenCalled();
  expect(mocks.admin).not.toHaveBeenCalled();
 });
 it('non-Pro plan blocks access before capability and privileged client',async()=>{
  mocks.plan.mockResolvedValue(false);
  expect((await send({threadId:thread,body:'hi'})).status).toBe(403);
  expect(mocks.cap).not.toHaveBeenCalled();
  expect(mocks.admin).not.toHaveBeenCalled();
 });
 it('missing store scope rejects before service-role call',async()=>{
  mocks.scope.mockRejectedValue(new Error('no store'));
  expect((await send({threadId:thread,body:'hi'})).status).toBe(403);
  expect(mocks.admin).not.toHaveBeenCalled();
 });
 it('missing private chat capability rejects before service-role call',async()=>{
  mocks.cap.mockResolvedValue(false);
  expect((await send({threadId:thread,body:'hi'})).status).toBe(403);
  expect(mocks.admin).not.toHaveBeenCalled();
 });
 it('invalid input, duplicate mention and partial business-object link reject before service-role',async()=>{
  const cases=[{threadId:'bad',body:'hi'},{threadId:thread,body:'   '},{threadId:thread,body:'hi',mentionUserIds:[actor,actor]},{threadId:thread,body:'hi',objectType:'order'},{threadId:thread,body:'hi',objectId:attacker}];
  for(const payload of cases)expect((await send(payload)).status).toBe(400);
  expect(mocks.admin).not.toHaveBeenCalled();
 });
 it('DB authorization error and mismatched RPC evidence never claim success',async()=>{
  mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'OFFICE_PRIVATE_THREAD_ACCESS_DENIED'}}).mockResolvedValueOnce({data:{messageId:msg,threadId:otherStore},error:null}).mockResolvedValueOnce({data:{messageId:null,threadId:thread},error:null});
  for(const status of [403,500,500]){
   const res=await send({threadId:thread,body:'hi'});
   expect(res.status).toBe(status);
   expect((await res.json()).ok).not.toBe(true);
  }
 });
 it('both server actions bind owner-transfer instance and actor to server access context',()=>{
  for(const path of ['src/app/admin/kommunikacio/chat/actions.ts','src/app/admin/kommunikacio/iroda/actions.ts']){
   const source=readFileSync(path,'utf8');
   expect(source).toContain('const actor=await getAdminRequestUser()');
   expect(source).toContain("await requirePlanFeature('teamChat')");
   expect(source).toContain('await requireCurrentStoreContext()');
   expect(source).toContain('hasStoreCapability(');
   const m=source.match(/export async function transferPrivateThreadOwnerAction\(form:FormData\)\{([\s\S]*?)\n\}/);
   expect(m,'transfer function missing in '+path).not.toBeNull();
   expect(m?.[1]).toContain('const{db,userId,instanceId}=await privateChatAccess()');
   expect(m?.[1]).toContain('p_instance_id:instanceId');
   expect(m?.[1]).toContain('p_actor:userId');
   expect(m?.[1]).not.toContain('p_actor:targetUserId');
   expect(m?.[1]).toContain('p_target_user_id:targetUserId');
  }
 });
});
