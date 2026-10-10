import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({auth:vi.fn(),plan:vi.fn(),scope:vi.fn(),admin:vi.fn(),rpc:vi.fn(),revalidate:vi.fn()}));
vi.mock('@/lib/auth/admin-api',()=>({getAdminRequestUser:m.auth}));
vi.mock('@/lib/plans/access',()=>({requirePlanFeature:m.plan}));
vi.mock('@/lib/instances/scope',()=>({requireCurrentStoreContext:m.scope}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:m.admin}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
import {updateMailboxResponsibilityAction,updateThreadRelationshipsAction} from '../src/app/admin/kommunikacio/iroda/communication-hub-actions';

const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',forged='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  tenant='cccccccc-cccc-4ccc-8ccc-cccccccccccc',otherTenant='dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  owner='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',thread='11111111-1111-4111-8111-111111111111',customer='22222222-2222-4222-8222-222222222222';
const fd=(values:Record<string,string>)=>{const f=new FormData();Object.entries(values).forEach(([k,v])=>f.set(k,v));return f;};
const forgedData={actorId:forged,userId:forged,p_actor:forged,instanceId:otherTenant,p_instance_id:otherTenant};
const mailbox=()=>fd({...forgedData,mailboxKey:'sales',responsibleUserId:owner});
const relationship=()=>fd({...forgedData,threadId:thread,customerUserId:customer,customerRef:'C-123',salesOwnerUserId:owner});
beforeEach(()=>{
 vi.resetAllMocks();m.auth.mockResolvedValue({id:actor});m.plan.mockResolvedValue(undefined);m.scope.mockResolvedValue({instanceId:tenant});m.admin.mockReturnValue({rpc:m.rpc});
});
describe('F28 Advanced Communication Hub executable actor/tenant and response truth',()=>{
 it('passes trusted operator and tenant, never forged form identity, for mailbox responsibility',async()=>{
   m.rpc.mockResolvedValue({data:{mailboxKey:'sales',responsibleUserId:owner,advancedEntitlement:true},error:null});
   await updateMailboxResponsibilityAction(mailbox());
   expect(m.auth).toHaveBeenCalledWith('support.manage');
   expect(m.plan).toHaveBeenCalledExactlyOnceWith('officeCommunicationAdvanced');
   expect(m.scope).toHaveBeenCalledWith('support.manage');
   expect(m.rpc).toHaveBeenCalledExactlyOnceWith('admin_update_office_mailbox_responsibility_v2',{p_instance_id:tenant,p_actor:actor,p_mailbox_key:'sales',p_responsible_user_id:owner});
   expect(m.revalidate).toHaveBeenCalledWith('/admin/kommunikacio/iroda/hub');
 });
 it('passes customer and owner as subjects but keeps operator separate in thread relationship RPC',async()=>{
   m.rpc.mockResolvedValue({data:{threadId:thread,customerUserId:customer,customerRef:'C-123',salesOwnerUserId:owner,advancedEntitlement:true},error:null});
   await updateThreadRelationshipsAction(relationship());
   expect(m.rpc).toHaveBeenCalledExactlyOnceWith('admin_update_office_thread_relationships_v2',{p_instance_id:tenant,p_actor:actor,p_thread_id:thread,p_customer_user_id:customer,p_customer_ref:'C-123',p_sales_owner_user_id:owner});
 });
 it.each(['auth','plan','scope'] as const)('blocks %s denial before both sensitive RPCs',async what=>{
   if(what==='auth')m.auth.mockResolvedValue(null);
   if(what==='plan')m.plan.mockRejectedValue(new Error('PRO_REQUIRED'));
   if(what==='scope')m.scope.mockRejectedValue(new Error('TENANT_REQUIRED'));
   await expect(updateMailboxResponsibilityAction(mailbox())).rejects.toThrow();
   await expect(updateThreadRelationshipsAction(relationship())).rejects.toThrow();
   expect(m.admin).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();expect(m.revalidate).not.toHaveBeenCalled();
 });
 it('rejects mismatched target and missing advanced entitlement even if RPC says no error',async()=>{
   m.rpc.mockResolvedValueOnce({data:{mailboxKey:'sales',responsibleUserId:forged,advancedEntitlement:true},error:null})
      .mockResolvedValueOnce({data:{threadId:thread,customerUserId:customer,customerRef:'C-123',salesOwnerUserId:owner,advancedEntitlement:false},error:null});
   await expect(updateMailboxResponsibilityAction(mailbox())).rejects.toThrow('nem igazolható');
   await expect(updateThreadRelationshipsAction(relationship())).rejects.toThrow('nem igazolható');
   expect(m.revalidate).not.toHaveBeenCalled();
 });
 it('database permission error and cross-tenant target rejection are surfaced without revalidation',async()=>{
   m.rpc.mockResolvedValueOnce({data:null,error:{message:'OFFICE_MAILBOX_RESPONSIBLE_ACTIVE_MEMBER_REQUIRED'}})
      .mockResolvedValueOnce({data:null,error:{message:'OFFICE_CUSTOMER_USER_NOT_IN_INSTANCE'}});
   await expect(updateMailboxResponsibilityAction(mailbox())).rejects.toThrow('OFFICE_MAILBOX_RESPONSIBLE_ACTIVE_MEMBER_REQUIRED');
   await expect(updateThreadRelationshipsAction(relationship())).rejects.toThrow('OFFICE_CUSTOMER_USER_NOT_IN_INSTANCE');
   expect(m.revalidate).not.toHaveBeenCalled();
 });
});
