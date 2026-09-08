import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');

describe('Digital Office individual internal-chat capability gate',()=>{
  const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
  const actions=read('src/app/admin/kommunikacio/iroda/actions.ts');
  const migration=read('supabase/migrations/20260908065000_digital_office_team_chat_2_foundation_v1.sql');
  const integrity=read('supabase/migrations/20260908065100_digital_office_team_chat_2_integrity_v1.sql');
  const ownerTransfer=read('supabase/migrations/20260908065200_digital_office_team_chat_owner_transfer_v1.sql');
  const roleFoundation=read('supabase/migrations/20260907203000_team_permissions_foundation_v1.sql');
  const prepare=read('src/app/api/admin/office/attachments/prepare/route.ts');
  const finalize=read('src/app/api/admin/office/attachments/finalize/route.ts');
  const download=read('src/app/api/admin/office/attachments/[id]/route.ts');

  it('opens private chat through effective capability without redefining role presets',()=>{
    expect(page).toContain("hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat'");
    expect(actions).toContain("hasStoreCapability(access.instanceId,access.userId,'office.internal_chat'");
    expect(migration).toContain("evaluate_store_capability_v1(p_instance_id,p_actor,'office.internal_chat'");
    expect(roleFoundation).toContain("('support','office.internal_chat','all')");
    expect(roleFoundation).toContain("('order_manager','office.internal_chat','all')");
    for(const sql of[migration,integrity,ownerTransfer]){
      expect(sql).not.toContain('insert into public.store_role_permission_presets');
      expect(sql).not.toContain('delete from public.store_role_permission_presets');
      expect(sql).not.toContain('update public.store_role_permission_presets');
    }
  });

  it('keeps customer support actions on coarse support authority',()=>{
    expect(actions).toContain('async function supportAccess()');
    expect(actions).toContain("getAdminRequestUser('support.manage')");
    expect(actions).toContain("requireCurrentStoreContext('support.manage')");
    expect(actions).toContain('const{db,userId,instanceId}=await supportAccess();');
    expect(page).toContain("hasStorePermission(scope.instanceId,'support.manage')");
    expect(page).toContain('const canCustomerAct=canReadAct&&canSupportWorkspace');
  });

  it('does not load broad business datasets for chat-only access',()=>{
    expect(page).toContain('const taskPromise=canSupportWorkspace');
    expect(page).toContain('const orderPromise=canSupportWorkspace');
    expect(page).toContain('const offerPromise=canSupportWorkspace');
    expect(page).toContain('const returnPromise=canSupportWorkspace');
    expect(page).toContain('const ticketPromise=canSupportWorkspace');
    expect(page).toContain('const jobPromise=canSupportWorkspace');
    expect(page).toContain('const objectOptions:ObjectOption[]=canSupportWorkspace?[');
    expect(page).toContain('if(!canSupportWorkspace)return null');
    expect(page).toContain('Ez a jogosultság önmagában nem ad hozzáférést rendelésekhez, ajánlatokhoz, visszárukhoz vagy ügyféladatokhoz.');
  });

  it('builds participant choices from effective chat grants so a narrow base role can receive the checkbox',()=>{
    expect(page).toContain('const bindings=((bindingData??[])as Binding[]).filter(row=>active(row.valid_until));');
    expect(page).toContain("hasStoreCapability(scope.instanceId,userId,'office.internal_chat'");
    expect(page).toContain('const chatUserIds=new Set');
    expect(page).toContain('const chatAssignees:Assignee[]=teamUserIds.filter(userId=>chatUserIds.has(userId))');
    expect(page).toContain('chatAssignees.filter(member=>member.userId!==actor.id');
  });

  it('blocks business-object linking for chat-only actors at RPC and trigger boundaries',()=>{
    const rpcGuards=migration.match(/OFFICE_OBJECT_LINK_PERMISSION_REQUIRED/g)??[];
    expect(rpcGuards.length).toBeGreaterThanOrEqual(2);
    expect(migration).toContain('v_object_type is not null and not public.can_manage_support(p_instance_id,p_actor)');
    expect(integrity).toContain('not public.can_manage_support(new.instance_id,new.created_by)');
    expect(integrity).toContain("raise exception 'OFFICE_OBJECT_LINK_PERMISSION_REQUIRED'");
    expect(finalize).toContain('OFFICE_OBJECT_LINK_PERMISSION_REQUIRED');
  });

  it('makes explicit deny effective immediately for owner-only management operations',()=>{
    const ownerCheck=migration.indexOf('private.office_active_thread_owner_v1(p_instance_id,v_thread_id,p_actor)');
    const capabilityAwareRead=migration.indexOf('public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor)',ownerCheck);
    expect(ownerCheck).toBeGreaterThan(0);
    expect(capabilityAwareRead).toBeGreaterThan(ownerCheck);
    expect(ownerTransfer).toContain('public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor)');
  });

  it('lets private attachment routes rely on current participant-capability authorization instead of support.manage',()=>{
    for(const route of[prepare,finalize,download]){
      expect(route).toContain('getAdminRequestUser()');
      expect(route).toContain('requireCurrentStoreContext()');
      expect(route).not.toContain("getAdminRequestUser('support.manage')");
      expect(route).not.toContain("requireCurrentStoreContext('support.manage')");
    }
  });

  it('does not activate mailbox, customer email identity, MX or AI behavior',()=>{
    const all=(page+'\n'+actions+'\n'+migration+'\n'+integrity+'\n'+ownerTransfer).toLowerCase();
    expect(all).not.toContain('gmail');
    expect(all).not.toContain('microsoft graph');
    expect(all).not.toContain('imap');
    expect(all).not.toContain('openai');
    expect(all).not.toContain('anthropic');
    expect(all).not.toContain('mx record');
  });
});
