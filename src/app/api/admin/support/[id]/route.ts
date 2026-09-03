import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const schema=z.object({status:z.enum(['open','in_progress','waiting_customer','resolved','closed']),priority:z.enum(['low','normal','high','urgent']),adminNote:z.union([z.string().trim().max(4000),z.null()]).optional()});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('support.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen ügyazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen ügyadat.'},{status:400});

  const a=createAdminClient();
  const{data,error}=await a.rpc('admin_update_support_ticket_v2',{
    p_instance_id:scope.instanceId,
    p_ticket_id:id,
    p_actor:actor.id,
    p_status:parsed.data.status,
    p_priority:parsed.data.priority,
    p_admin_note:parsed.data.adminNote??null,
    p_admin_note_present:parsed.data.adminNote!==undefined
  });
  if(error){
    if(error.message.includes('SUPPORT_TICKET_NOT_FOUND'))return NextResponse.json({error:'Az ügy nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('SUPPORT_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'Az ügy módosítása nem sikerült. Egyetlen változás sem került alkalmazásra.'},{status:500});
  }
  if(!(data as{id?:string}|null)?.id)return NextResponse.json({error:'Az ügy módosítása nem igazolható.'},{status:500});
  return NextResponse.json({ok:true});
}
