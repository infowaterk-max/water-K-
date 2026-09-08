import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';
import{OFFICE_PRIVATE_ATTACHMENT_MAX_FILES}from'@/lib/office/private-attachments';

const objectTypeSchema=z.enum(['order','commercial_offer','return_case','support_ticket','task']);
const schema=z.object({
  threadId:z.string().uuid(),
  body:z.string().trim().min(1).max(10000),
  mentionUserIds:z.array(z.string().uuid()).max(10).default([]),
  objectType:z.union([objectTypeSchema,z.null()]).default(null),
  objectId:z.union([z.string().uuid(),z.null()]).default(null),
  attachmentIds:z.array(z.string().uuid()).max(OFFICE_PRIVATE_ATTACHMENT_MAX_FILES).default([]),
}).superRefine((value,ctx)=>{
  if((value.objectType===null)!==(value.objectId===null))ctx.addIssue({code:z.ZodIssueCode.custom,message:'A kapcsolt objektum típusa és azonosítója együtt szükséges.'});
  if(new Set(value.mentionUserIds).size!==value.mentionUserIds.length)ctx.addIssue({code:z.ZodIssueCode.custom,message:'Duplikált említés.'});
  if(new Set(value.attachmentIds).size!==value.attachmentIds.length)ctx.addIssue({code:z.ZodIssueCode.custom,message:'Duplikált csatolmány.'});
});

export async function POST(request:Request){
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  if(!(await hasCurrentPlanFeature('officeCommunication')))return NextResponse.json({error:'A Digitális iroda Pro csomaghoz kötött.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('support.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen belső üzenet vagy csatolmányadat.'},{status:400});

  const db=createAdminClient();
  const{data,error}=await db.rpc('admin_finalize_office_private_message_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_thread_id:parsed.data.threadId,
    p_payload:{
      threadId:parsed.data.threadId,
      body:parsed.data.body,
      mentionUserIds:parsed.data.mentionUserIds,
      objectType:parsed.data.objectType,
      objectId:parsed.data.objectId,
      attachmentIds:parsed.data.attachmentIds,
    },
  });
  if(error){
    const reason=String(error.message??'');
    if(reason.includes('OFFICE_PRIVATE_THREAD_ACCESS_DENIED'))return NextResponse.json({error:'Nincs hozzáférésed ehhez a privát beszélgetéshez.'},{status:403});
    if(reason.includes('OFFICE_MENTION_PARTICIPANT_REQUIRED'))return NextResponse.json({error:'Csak aktív résztvevő említhető meg.'},{status:400});
    if(reason.includes('OFFICE_OBJECT_LINK_NOT_FOUND'))return NextResponse.json({error:'A kapcsolt üzleti objektum nem található ebben a webshopban.'},{status:400});
    if(reason.includes('OFFICE_ATTACHMENT_RESERVATION_INVALID')||reason.includes('OFFICE_ATTACHMENT_STORAGE_OBJECT_MISSING'))return NextResponse.json({error:'A csatolmány feltöltése lejárt vagy nem igazolható. Töltsd fel újra.'},{status:409});
    return NextResponse.json({error:'A privát üzenet nem menthető. Egyetlen változást sem tekintünk alkalmazottnak.'},{status:500});
  }
  const result=(data??{})as{id?:string;messageId?:string;threadId?:string;attachmentCount?:number};
  if(!result.id||result.id!==result.messageId||result.threadId!==parsed.data.threadId||result.attachmentCount!==parsed.data.attachmentIds.length){
    return NextResponse.json({error:'A privát üzenet véglegesítése nem igazolható.'},{status:500});
  }
  return NextResponse.json({ok:true,messageId:result.messageId,attachmentCount:result.attachmentCount},{headers:{'Cache-Control':'no-store'}});
}
