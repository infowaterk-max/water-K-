import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const schema=z.object({message:z.string().trim().min(2).max(4000)});

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('support.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen ügyazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Az üzenet 2–4000 karakter lehet.'},{status:400});

  const a=createAdminClient();
  const{data,error}=await a.rpc('admin_add_support_reply_v2',{
    p_instance_id:scope.instanceId,
    p_ticket_id:id,
    p_actor:actor.id,
    p_message:parsed.data.message
  });
  if(error){
    if(error.message.includes('SUPPORT_TICKET_NOT_FOUND'))return NextResponse.json({error:'Az ügy nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('SUPPORT_TICKET_CLOSED'))return NextResponse.json({error:'A lezárt ügyhöz nem küldhető új válasz.'},{status:409});
    if(error.message.includes('SUPPORT_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A válasz rögzítése nem sikerült. A választ nem tekintjük elküldöttnek.'},{status:500});
  }
  const result=(data??{})as{messageId?:string;notificationQueued?:boolean;notificationError?:string|null};
  if(!result.messageId)return NextResponse.json({error:'A válasz rögzítése nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,notificationQueued:result.notificationQueued===true});
}
