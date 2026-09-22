import{NextResponse}from'next/server';
import{z}from'zod';
import{createClient}from'@/lib/supabase/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{getCurrentWebshopInstance}from'@/lib/instances/access';

const schema=z.object({
  name:z.string().trim().max(120).optional().default(''),
  email:z.string().trim().email().max(200),
  orderNumber:z.string().trim().max(80).optional().default(''),
  category:z.enum(['product','order','shipping','invoice','reseller','return','other']),
  subject:z.string().trim().min(3).max(180),
  message:z.string().trim().min(10).max(4000),
  website:z.string().max(200).optional().default('')
});

export async function POST(request:Request){
  let raw:unknown;
  try{raw=await request.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Ellenőrizd a megadott adatokat.'},{status:400});
  if(parsed.data.website)return NextResponse.json({ok:true,ticketNumber:'SUP-OK'});

  const instance=await getCurrentWebshopInstance();
  if(!instance||!['pilot','active'].includes(instance.status)){
    return NextResponse.json({error:'Az ügyfélszolgálat ehhez a webshophoz most nem érhető el.'},{status:409});
  }

  const s=await createClient(),{data:{user}}=await s.auth.getUser();
  const a=createAdminClient();
  const{data,error}=await a.rpc('create_support_ticket_v2',{
    p_instance_id:instance.id,
    p_user_id:user?.id??null,
    p_email:parsed.data.email.toLowerCase(),
    p_name:parsed.data.name||null,
    p_order_number:parsed.data.orderNumber||null,
    p_category:parsed.data.category,
    p_subject:parsed.data.subject,
    p_message:parsed.data.message,
  });
  if(error)return NextResponse.json({error:'Az üzenet rögzítése nem sikerült.'},{status:500});

  const result=(data??{})as{id?:string;ticketNumber?:string;duplicate?:boolean;instanceId?:string};
  if(!result.id||!result.ticketNumber||result.instanceId!==instance.id){
    return NextResponse.json({error:'Az ügyfélszolgálati ügy rögzítésének eredménye nem igazolható.'},{status:500});
  }
  if(result.duplicate===true){
    return NextResponse.json({error:'Hasonló üzenetet néhány perce már rögzítettünk. Kérjük, várj egy kicsit.'},{status:429});
  }
  return NextResponse.json({ok:true,ticketNumber:result.ticketNumber},{status:201});
}
