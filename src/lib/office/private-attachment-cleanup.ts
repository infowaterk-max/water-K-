import 'server-only';
import{createAdminClient}from'@/lib/supabase/admin';
import{OFFICE_PRIVATE_ATTACHMENT_BUCKET}from'./private-attachments';

type PendingAttachment={id:string;storage_path:string};
export type OfficeAttachmentCleanupResult={
  checked:number;
  revoked:number;
  failed:number;
  failures:Array<{attachmentId:string;stage:'storage'|'database';error:string}>;
};

function message(error:unknown){return error instanceof Error?error.message:String(error??'UNKNOWN_ERROR')}

export async function cleanupExpiredOfficePrivateAttachments(limit=25):Promise<OfficeAttachmentCleanupResult>{
  const admin=createAdminClient();
  const now=new Date().toISOString();
  const{data,error}=await admin.from('office_message_attachments')
    .select('id,storage_path')
    .eq('status','pending')
    .lte('expires_at',now)
    .order('expires_at',{ascending:true})
    .limit(Math.max(1,Math.min(100,Math.trunc(limit)||25)));
  if(error)throw new Error(`OFFICE_ATTACHMENT_CLEANUP_SCAN_FAILED: ${error.message}`);

  const rows=(data??[])as PendingAttachment[];
  const failures:OfficeAttachmentCleanupResult['failures']=[];
  let revoked=0;
  for(const row of rows){
    const removed=await admin.storage.from(OFFICE_PRIVATE_ATTACHMENT_BUCKET).remove([row.storage_path]);
    if(removed.error){
      failures.push({attachmentId:row.id,stage:'storage',error:message(removed.error)});
      continue;
    }
    const{data:revocation,error:revocationError}=await admin.rpc('admin_revoke_expired_office_private_attachment_v1',{
      p_attachment_id:row.id,
      p_expected_storage_path:row.storage_path,
    });
    if(revocationError){
      failures.push({attachmentId:row.id,stage:'database',error:message(revocationError)});
      continue;
    }
    const evidence=(revocation??{})as{id?:string;attachmentId?:string;storagePath?:string;revoked?:boolean};
    if(evidence.id!==row.id||evidence.attachmentId!==row.id||evidence.storagePath!==row.storage_path||evidence.revoked!==true){
      failures.push({attachmentId:row.id,stage:'database',error:'OFFICE_ATTACHMENT_CLEANUP_EVIDENCE_MISSING'});
      continue;
    }
    revoked+=1;
  }
  return{checked:rows.length,revoked,failed:failures.length,failures};
}
