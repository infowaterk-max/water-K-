import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type B2BMemberRole='owner'|'admin'|'buyer';
export type B2BAccountStatus='pending'|'approved'|'suspended';
export type B2BAccountContext={
  accountId:string;
  accountName:string;
  taxNumber:string|null;
  status:B2BAccountStatus;
  memberRole:B2BMemberRole;
  approved:boolean;
  requestedAt:string|null;
  approvedAt:string|null;
};

function isRole(value:unknown):value is B2BMemberRole{
  return value==='owner'||value==='admin'||value==='buyer';
}
function isStatus(value:unknown):value is B2BAccountStatus{
  return value==='pending'||value==='approved'||value==='suspended';
}

export async function resolveB2BAccountContext(instanceId:string,userId:string):Promise<B2BAccountContext|null>{
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('resolve_b2b_account_context_v1',{
    p_instance_id:instanceId,
    p_user_id:userId,
  });
  if(error)throw error;
  if(data==null)return null;
  const row=data as Record<string,unknown>;
  if(
    typeof row.accountId!=='string'||
    typeof row.accountName!=='string'||
    !isStatus(row.status)||
    !isRole(row.memberRole)||
    typeof row.approved!=='boolean'
  )throw new Error('B2B_ACCOUNT_CONTEXT_EVIDENCE_MISSING');
  return{
    accountId:row.accountId,
    accountName:row.accountName,
    taxNumber:typeof row.taxNumber==='string'?row.taxNumber:null,
    status:row.status,
    memberRole:row.memberRole,
    approved:row.approved,
    requestedAt:typeof row.requestedAt==='string'?row.requestedAt:null,
    approvedAt:typeof row.approvedAt==='string'?row.approvedAt:null,
  };
}
