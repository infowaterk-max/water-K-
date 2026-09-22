import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

type AuditInput={
  actorUserId:string;
  action:string;
  entityType:string;
  entityId?:string|null;
  summary:string;
  organizationId?:string|null;
  instanceId?:string|null;
  beforeState?:unknown;
  afterState?:unknown;
  metadata?:Record<string,unknown>;
};

export async function recordAdminAudit(input:AuditInput){
  const admin=createAdminClient();
  const {data,error}=await admin.from('admin_audit_log').insert({
    actor_user_id:input.actorUserId,
    action:input.action,
    entity_type:input.entityType,
    entity_id:input.entityId??null,
    organization_id:input.organizationId??null,
    instance_id:input.instanceId??null,
    summary:input.summary,
    before_state:input.beforeState??null,
    after_state:input.afterState??null,
    metadata:{audit_source:'admin_app',...(input.metadata??{})},
  }).select('id,audit_scope,chain_seq,entry_hash').single();
  if(error){console.error('admin audit write failed',error.message);return null;}
  return data;
}
