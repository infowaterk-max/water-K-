import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';
import{
  OFFICE_PRIVATE_ATTACHMENT_BUCKET,
  OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES,
  OFFICE_PRIVATE_ATTACHMENT_MAX_FILES,
  OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES,
  type OfficePrivateAttachmentUploadReservation,
}from'@/lib/office/private-attachments';

const fileSchema=z.object({
  name:z.string().trim().min(1).max(240).refine(value=>!value.includes('/')&&!value.includes('\\')),
  contentType:z.enum(OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES),
  size:z.number().int().min(1).max(OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES),
});
const schema=z.object({
  threadId:z.string().uuid(),
  files:z.array(fileSchema).min(1).max(OFFICE_PRIVATE_ATTACHMENT_MAX_FILES),
});

type PreparedRow={attachmentId:string;path:string;name:string;contentType:(typeof OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES)[number];size:number;expiresAt:string};

export async function POST(request:Request){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  if(!(await hasCurrentPlanFeature('teamChatSecureAttachments')))return NextResponse.json({error:'A biztonságos Team Chat csatolmányok Pro csomagban érhetők el.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext()}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen csatolmányadat.'},{status:400});

  const db=createAdminClient();
  const{data,error}=await db.rpc('admin_prepare_office_private_attachments_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_thread_id:parsed.data.threadId,
    p_files:parsed.data.files,
  });
  if(error){
    const reason=String(error.message??'');
    if(reason.includes('OFFICE_PRIVATE_THREAD_ACCESS_DENIED'))return NextResponse.json({error:'Nincs hozzáférésed ehhez a privát beszélgetéshez.'},{status:403});
    if(reason.includes('OFFICE_ATTACHMENT_PRIVATE_THREAD_REQUIRED'))return NextResponse.json({error:'Csatolmány csak privát belső beszélgetéshez tölthető fel.'},{status:400});
    return NextResponse.json({error:'A csatolmány-feltöltés nem készíthető elő.'},{status:500});
  }

  const result=(data??{})as{threadId?:string;attachments?:PreparedRow[]};
  if(result.threadId!==parsed.data.threadId||!Array.isArray(result.attachments)||result.attachments.length!==parsed.data.files.length){
    return NextResponse.json({error:'A csatolmány-előjegyzés eredménye nem igazolható.'},{status:500});
  }

  const uploads:OfficePrivateAttachmentUploadReservation[]=[];
  for(const item of result.attachments){
    const signed=await db.storage.from(OFFICE_PRIVATE_ATTACHMENT_BUCKET).createSignedUploadUrl(item.path);
    if(signed.error||!signed.data?.token){
      return NextResponse.json({error:'A biztonságos feltöltési cím nem hozható létre.'},{status:500});
    }
    uploads.push({...item,token:signed.data.token});
  }
  return NextResponse.json({ok:true,uploads},{headers:{'Cache-Control':'no-store'}});
}
