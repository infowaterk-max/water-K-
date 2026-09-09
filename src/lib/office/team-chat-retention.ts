import 'server-only';
import{createAdminClient}from'@/lib/supabase/admin';

export type TeamChatRetentionResult={
  instanceId:string;
  checkedAt:string;
  threadsArchived:number;
  messagesDeleted:number;
  auditDeleted:number;
};

type RetentionEvidence={
  instanceId?:unknown;
  checkedAt?:unknown;
  threadsArchived?:unknown;
  messagesDeleted?:unknown;
  auditDeleted?:unknown;
};

function nonNegativeInteger(value:unknown):value is number{
  return typeof value==='number'&&Number.isInteger(value)&&value>=0;
}

export async function runOfficeTeamChatRetention(instanceId:string):Promise<TeamChatRetentionResult>{
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_run_office_team_chat_retention_v1',{p_instance_id:instanceId});
  if(error)throw new Error(`OFFICE_TEAM_CHAT_RETENTION_FAILED: ${error.message}`);
  const evidence=(data??{})as RetentionEvidence;
  if(
    evidence.instanceId!==instanceId||
    typeof evidence.checkedAt!=='string'||evidence.checkedAt.length===0||
    !nonNegativeInteger(evidence.threadsArchived)||
    !nonNegativeInteger(evidence.messagesDeleted)||
    !nonNegativeInteger(evidence.auditDeleted)
  )throw new Error('OFFICE_TEAM_CHAT_RETENTION_EVIDENCE_MISSING');
  return{
    instanceId,
    checkedAt:evidence.checkedAt,
    threadsArchived:evidence.threadsArchived,
    messagesDeleted:evidence.messagesDeleted,
    auditDeleted:evidence.auditDeleted,
  };
}
