import{NextResponse}from'next/server';
import{z}from'zod';
import{createAdminClient}from'@/lib/supabase/admin';
import{getCurrentWebshopInstance}from'@/lib/instances/access';

const field=z.string().trim().max(160).optional().default('');
const schema=z.object({
  token:z.string().uuid(),
  attribution:z.object({
    source:field,
    medium:field,
    campaign:z.string().trim().min(1).max(160),
    content:field,
    term:field,
    capturedAt:z.string().datetime().optional(),
  })
});

export async function POST(req:Request){
  let body:unknown;
  try{body=await req.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}

  const parsed=schema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen attribúciós adat.'},{status:400});

  const instance=await getCurrentWebshopInstance();
  if(!instance)return NextResponse.json({error:'A rendelés nem található.'},{status:404});

  const a=createAdminClient(),p=parsed.data;
  const{data:order,error:orderError}=await a.from('orders')
    .select('id,utm_campaign')
    .eq('instance_id',instance.id)
    .eq('confirmation_token',p.token)
    .maybeSingle();
  if(orderError)return NextResponse.json({error:'A rendelési attribúció állapota most nem ellenőrizhető.'},{status:500});
  if(!order)return NextResponse.json({error:'A rendelés nem található.'},{status:404});
  if(order.utm_campaign)return NextResponse.json({ok:true,unchanged:true});

  const{data:updated,error:updateError}=await a.from('orders').update({
    utm_source:p.attribution.source||null,
    utm_medium:p.attribution.medium||null,
    utm_campaign:p.attribution.campaign,
    utm_content:p.attribution.content||null,
    utm_term:p.attribution.term||null,
    attributed_at:new Date().toISOString(),
  })
    .eq('id',order.id)
    .eq('instance_id',instance.id)
    .is('utm_campaign',null)
    .select('id,utm_campaign')
    .maybeSingle();
  if(updateError)return NextResponse.json({error:'Az attribúció nem menthető.'},{status:500});
  if(updated?.utm_campaign===p.attribution.campaign)return NextResponse.json({ok:true});

  const{data:current,error:confirmError}=await a.from('orders')
    .select('utm_campaign')
    .eq('id',order.id)
    .eq('instance_id',instance.id)
    .maybeSingle();
  if(confirmError)return NextResponse.json({error:'Az attribúció eredménye nem ellenőrizhető.'},{status:500});
  if(current?.utm_campaign)return NextResponse.json({ok:true,unchanged:true});

  return NextResponse.json({error:'Az attribúció mentésének eredménye nem igazolható.'},{status:500});
}
