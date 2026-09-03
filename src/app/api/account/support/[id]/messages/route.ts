import{NextResponse}from'next/server';
import{z}from'zod';
import{createClient}from'@/lib/supabase/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{getCurrentWebshopInstance}from'@/lib/instances/access';

const schema=z.object({message:z.string().trim().min(2).max(4000)});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const s=await createClient(),{data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:'Bejelentkezés szükséges.'},{status:401});
  const instance=await getCurrentWebshopInstance();
  if(!instance)return NextResponse.json({error:'Nincs aktív webshop.'},{status:409});
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen ügyazonosító.'},{status:400});
  let raw:unknown;
  try{raw=await request.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Az üzenet 2–4000 karakter lehet.'},{status:400});

  const a=createAdminClient();
  const{data:ticket,error:ticketError}=await a.from('support_tickets')
    .select('id,status')
    .eq('id',id)
    .eq('instance_id',instance.id)
    .eq('user_id',user.id)
    .maybeSingle();
  if(ticketError||!ticket)return NextResponse.json({error:'Az ügy nem található.'},{status:404});
  if(ticket.status==='closed')return NextResponse.json({error:'A lezárt ügyhöz nem küldhető új válasz.'},{status:409});

  const{data:message,error}=await a.from('support_ticket_messages').insert({
    instance_id:instance.id,
    ticket_id:id,
    author_user_id:user.id,
    author_role:'customer',
    message:parsed.data.message,
  }).select('id').single();
  if(error){
    if(/lezárt ügyhöz|closed/i.test(error.message))return NextResponse.json({error:'A lezárt ügyhöz nem küldhető új válasz.'},{status:409});
    return NextResponse.json({error:'A válasz rögzítése nem sikerült.'},{status:500});
  }
  if(!message?.id)return NextResponse.json({error:'A válasz rögzítésének eredménye nem igazolható.'},{status:500});

  return NextResponse.json({ok:true,messageId:message.id});
}
