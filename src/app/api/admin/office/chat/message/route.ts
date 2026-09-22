import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{hasStoreCapability}from'@/lib/auth/store-capabilities';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';

const objectTypeSchema=z.enum(['order','commercial_offer','return_case','support_ticket','task']);
const schema=z.object({
  threadId:z.string().uuid(),
  body:z.string().trim().min(1).max(10000),
  mentionUserIds:z.array(z.string().uuid()).max(10).default([]),
  objectType:z.union([objectTypeSchema,z.null()]).default(null),
  objectId:z.union([z.string().uuid(),z.null()]).default(null),
}).superRefine((value,ctx)=>{
  if((value.objectType===null)!==(value.objectId===null))ctx.addIssue({code:z.ZodIssueCode.custom,message:'A kapcsolt objektum típusa és azonosítója együtt szükséges.'});
  if(new Set(value.mentionUserIds).size!==value.mentionUserIds.length)ctx.addIssue({code:z.ZodIssueCode.custom,message:'Duplikált említés.'});
});

export async function POST(request:Request){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  if(!(await hasCurrentPlanFeature('teamChat')))return NextResponse.json({error:'A Team Chat ehhez a csomaghoz nem érhető el.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext()}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const allowed=await hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat',{
    resourceOwnerUserId:actor.id,resourceAssignedUserId:actor.id,
  });
  if(!allowed)return NextResponse.json({error:'Nincs jogosultság a belső chat használatához.'},{status:403});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen belső üzenet.'},{status:400});

  const db=createAdminClient();
  const{data,error}=await db.rpc('admin_mutate_office_team_chat_v2',{
    p_instance_id:scope.instanceId,p_actor:actor.id,p_action:'add_internal_message',
    p_payload:{threadId:parsed.data.threadId,body:parsed.data.body,mentionUserIds:parsed.data.mentionUserIds,objectType:parsed.data.objectType,objectId:parsed.data.objectId},
  });
  if(error){
    const reason=String(error.message??'');
    if(reason.includes('OFFICE_PRIVATE_THREAD_ACCESS_DENIED'))return NextResponse.json({error:'Nincs hozzáférésed ehhez a belső beszélgetéshez.'},{status:403});
    if(reason.includes('OFFICE_OBJECT_LINK_PERMISSION_REQUIRED'))return NextResponse.json({error:'Ehhez az üzleti objektumhoz nincs jogosultságod.'},{status:403});
    if(reason.includes('OFFICE_MENTION_PARTICIPANT_REQUIRED'))return NextResponse.json({error:'Csak aktív résztvevő említhető meg.'},{status:400});
    return NextResponse.json({error:'A belső üzenet nem menthető.'},{status:500});
  }
  const result=(data??{})as{messageId?:string;threadId?:string};
  if(!result.messageId||result.threadId!==parsed.data.threadId)return NextResponse.json({error:'A belső üzenet mentése nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,messageId:result.messageId},{headers:{'Cache-Control':'no-store'}});
}
