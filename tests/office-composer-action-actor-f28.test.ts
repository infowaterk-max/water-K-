import {beforeEach,describe,expect,it,vi} from 'vitest';

const m=vi.hoisted(()=>({auth:vi.fn(),plan:vi.fn(),scope:vi.fn(),admin:vi.fn(),rpc:vi.fn(),revalidate:vi.fn()}));
vi.mock('@/lib/auth/admin-api',()=>({getAdminRequestUser:m.auth}));
vi.mock('@/lib/plans/access',()=>({requirePlanFeature:m.plan}));
vi.mock('@/lib/instances/scope',()=>({requireCurrentStoreContext:m.scope}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:m.admin}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
import {
  officeComposerInitialState,saveNewEmailDraftAction,autosaveReplyDraftAction,
  deleteOfficeDraftAction,sendNewEmailAction,sendCustomerEmailV4Action,
} from '../src/app/admin/kommunikacio/iroda/composer-actions';

const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const forged='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const tenant='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const otherTenant='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const draft='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const message='11111111-1111-4111-8111-111111111111';
const thread='22222222-2222-4222-8222-222222222222';
const job='33333333-3333-4333-8333-333333333333';
const threadOther='44444444-4444-4444-8444-444444444444';
const delegatedUser='55555555-5555-4555-8555-555555555555';
const delegation='66666666-6666-4666-8666-666666666666';

const fd=(values:Record<string,string>)=>{const form=new FormData();for(const [k,v] of Object.entries(values))form.set(k,v);return form;};
const forgedFields={actorId:forged,userId:forged,p_actor:forged,instanceId:otherTenant,p_instance_id:otherTenant};
const newDraftForm=()=>fd({...forgedFields,toEmail:'customer@example.test',subject:'Order question',body:'Message'});
const replyForm=()=>fd({...forgedFields,threadId:thread,body:'Reply',draftId:draft,revision:'2'});
const newSendForm=()=>fd({...forgedFields,toEmail:'customer@example.test',subject:'Order question',body:'Message',draftId:draft,revision:'2'});

beforeEach(()=>{
  vi.resetAllMocks();
  m.auth.mockResolvedValue({id:actor});
  m.plan.mockResolvedValue(undefined);
  m.scope.mockResolvedValue({instanceId:tenant,organizationId:'local-org'});
  m.admin.mockReturnValue({rpc:m.rpc});
  m.rpc.mockResolvedValue({data:{id:draft,draftId:draft,revision:1},error:null});
});
describe('F28 Office Composer executable privileged actor/tenant and receipt proof',()=>{
  it('persists a new draft using request actor and server tenant, ignoring forged form identity',async()=>{
    const res=await saveNewEmailDraftAction(officeComposerInitialState,newDraftForm());
    expect(res).toMatchObject({status:'success',draftId:draft,revision:1});
    expect(m.auth).toHaveBeenCalledWith('support.manage');
    expect(m.plan.mock.calls.map(x=>x[0])).toEqual(['officeCommunication','officeCommunicationAdvanced']);
    expect(m.scope).toHaveBeenCalledWith('support.manage');
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith('admin_mutate_office_draft_v3',{
      p_instance_id:tenant,p_actor:actor,p_action:'save',
      p_payload:expect.objectContaining({draftId:null,draftType:'new_email',toEmail:'customer@example.test',subject:'Order question',body:'Message'})
    });
  });
  it('reply autosave and deletion bind actor/tenant and preserve revision; deletion requires persisted truth',async()=>{
    m.rpc.mockResolvedValueOnce({data:{id:draft,draftId:draft,revision:3},error:null})
         .mockResolvedValueOnce({data:{id:draft,draftId:draft,revision:3,deleted:false},error:null});
    const autosave=await autosaveReplyDraftAction(officeComposerInitialState,replyForm());
    expect(autosave.status).toBe('success');
    expect(m.rpc).toHaveBeenNthCalledWith(1,'admin_mutate_office_draft_v3',{p_actor:actor,p_instance_id:tenant,p_action:'save',p_payload:expect.objectContaining({draftId:draft,expectedRevision:2,saveMode:'autosave',threadId:thread})});
    const deleted=await deleteOfficeDraftAction(fd({...forgedFields,draftId:draft,revision:'3'}));
    expect(deleted.status).not.toBe('success');
    expect(m.rpc).toHaveBeenNthCalledWith(2,'admin_mutate_office_draft_v3',{p_actor:actor,p_instance_id:tenant,p_action:'delete',p_payload:{draftId:draft,expectedRevision:3}});
    expect(m.revalidate).not.toHaveBeenCalledWith('/admin/kommunikacio/iroda/uj');
  });
  it.each(['auth','plan','scope'] as const)('denies %s before privileged RPC, for draft and send',async what=>{
    if(what==='auth')m.auth.mockResolvedValue(null);
    if(what==='plan')m.plan.mockRejectedValue(new Error('PRO_REQUIRED'));
    if(what==='scope')m.scope.mockRejectedValue(new Error('TENANT_REQUIRED'));
    const save=await saveNewEmailDraftAction(officeComposerInitialState,newDraftForm());
    const send=await sendNewEmailAction(officeComposerInitialState,newSendForm());
    expect(save.status).not.toBe('success');expect(send.status).not.toBe('success');
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.admin).not.toHaveBeenCalled();
  });
  it('queues delegated new email with authenticated operator distinct from acting-for subject',async()=>{
    m.rpc.mockResolvedValue({data:{id:message,messageId:message,threadId:thread,jobId:job,attachmentCount:0,objectLinked:false,actingForUserId:delegatedUser,delegationId:delegation},error:null});
    const result=await sendNewEmailAction(officeComposerInitialState,fd({...forgedFields,toEmail:'customer@example.test',subject:'Subject',body:'Body',draftId:draft,revision:'2',actingForUserId:delegatedUser}));
    expect(result.status).toBe('success');
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith('admin_queue_office_email_v6',{p_instance_id:tenant,p_actor:actor,p_payload:expect.objectContaining({actingForUserId:delegatedUser,draftId:draft,draftRevision:2,mode:'new_email',idempotencyKey:expect.stringContaining('office:v6:'+tenant+':')})});
  });
  it('SQL delegation rejection and missing queue receipts cannot masquerade as successful send',async()=>{
    m.rpc.mockResolvedValueOnce({data:null,error:{message:'OFFICE_EMAIL_ACTIVE_DELEGATION_REQUIRED'}})
      .mockResolvedValueOnce({data:{id:message,messageId:message,threadId:thread,jobId:null,attachmentCount:0,objectLinked:false},error:null});
    const f=fd({...forgedFields,toEmail:'customer@example.test',subject:'Subject',body:'Body',draftId:draft,revision:'2',actingForUserId:delegatedUser});
    expect((await sendNewEmailAction(officeComposerInitialState,f)).status).toBe('blocked');
    expect((await sendNewEmailAction(officeComposerInitialState,f)).status).not.toBe('success');
    expect(m.revalidate).not.toHaveBeenCalled();
  });
  it('rejects inconsistent draft IDs and existing requested draft mismatches',async()=>{
    m.rpc.mockResolvedValueOnce({data:{id:forged,draftId:draft,revision:1},error:null})
      .mockResolvedValueOnce({data:{id:forged,draftId:forged,revision:3},error:null});
    expect((await saveNewEmailDraftAction(officeComposerInitialState,newDraftForm())).status).not.toBe('success');
    expect((await saveNewEmailDraftAction(officeComposerInitialState,fd({...forgedFields,...{draftId:draft,revision:'2'},toEmail:'customer@example.test',subject:'S',body:'B'}))).status).not.toBe('success');
  });
  it('rejects contradictory email message ID, reply thread ID and delegation receipt',async()=>{
    m.rpc.mockResolvedValueOnce({data:{id:forged,messageId:message,threadId:thread,jobId:job,attachmentCount:0,objectLinked:false},error:null})
      .mockResolvedValueOnce({data:{id:message,messageId:message,threadId:threadOther,jobId:job,attachmentCount:0,objectLinked:false},error:null})
      .mockResolvedValueOnce({data:{id:message,messageId:message,threadId:thread,jobId:job,attachmentCount:0,objectLinked:false,actingForUserId:null,delegationId:null},error:null});
    const f=replyForm();
    expect((await sendCustomerEmailV4Action(officeComposerInitialState,f)).status).not.toBe('success');
    expect((await sendCustomerEmailV4Action(officeComposerInitialState,f)).status).not.toBe('success');
    const delegated=fd({...forgedFields,toEmail:'customer@example.test',subject:'Subject',body:'Body',draftId:draft,revision:'2',actingForUserId:delegatedUser});
    expect((await sendNewEmailAction(officeComposerInitialState,delegated)).status).not.toBe('success');
    expect(m.revalidate).not.toHaveBeenCalled();
  });
});
