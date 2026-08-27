import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const validKinds=['payment_followup','repeat_30d','winback_90d'] as const;
type Kind=typeof validKinds[number];

async function isAdmin(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return false;const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();return profile?.role==='admin';}

export async function POST(request:Request){
 if(!await isAdmin())return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let body:{kind?:Kind;reference?:string};try{body=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
 if(!body.kind||!validKinds.includes(body.kind)||!body.reference)return NextResponse.json({error:'Hiányzó vagy érvénytelen adat.'},{status:400});
 const admin=createAdminClient();const now=new Date();const bucket=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
 try{
  if(body.kind==='payment_followup'){
   const {data:o,error}=await admin.from('orders').select('id,order_number,customer_id,customer_email,billing_name,status,total_gross_huf,created_at').eq('id',body.reference).maybeSingle();if(error||!o)return NextResponse.json({error:'A rendelés nem található.'},{status:404});
   const age=Date.now()-new Date(o.created_at).getTime();if(o.status!=='pending'||age<24*3600000||age>=7*8640000)return NextResponse.json({error:'A rendelés jelenleg nem jogosult erre az utánkövetésre.'},{status:409});
   const key=`payment_followup:${o.id}:${now.toISOString().slice(0,10)}`;const {data,error:rpcError}=await admin.rpc('enqueue_communication',{p_email:o.customer_email,p_user_id:o.customer_id,p_purpose:'transactional',p_template_key:'payment_followup',p_payload:{orderId:o.id,orderNumber:o.order_number,name:o.billing_name,totalGrossHuf:o.total_gross_huf},p_idempotency_key:key,p_scheduled_at:now.toISOString()});if(rpcError)throw rpcError;return NextResponse.json({ok:true,id:data});
  }
  const email=body.reference.trim().toLowerCase();const {data:orders,error:ordersError}=await admin.from('orders').select('customer_id,customer_email,billing_name,status,total_gross_huf,created_at').ilike('customer_email',email).in('status',['paid','processing','shipped','completed']).order('created_at',{ascending:false});if(ordersError||!orders?.length)return NextResponse.json({error:'Nincs megfelelő vásárlási előzmény.'},{status:404});
  const last=orders[0];const days=Math.floor((Date.now()-new Date(last.created_at).getTime())/86400000);if(body.kind==='repeat_30d'&&(orders.length<2||days<30||days>=90))return NextResponse.json({error:'Az ügyfél nem jogosult erre a szegmensre.'},{status:409});if(body.kind==='winback_90d'&&days<90)return NextResponse.json({error:'Az ügyfél még nem 90+ napja inaktív.'},{status:409});
  const revenue=orders.reduce((s,o)=>s+Number(o.total_gross_huf||0),0);const key=`${body.kind}:${email}:${bucket}`;const {data,error:rpcError}=await admin.rpc('enqueue_communication',{p_email:email,p_user_id:last.customer_id,p_purpose:'marketing',p_template_key:body.kind,p_payload:{name:last.billing_name,orders:orders.length,revenue,lastOrderAt:last.created_at},p_idempotency_key:key,p_scheduled_at:now.toISOString()});if(rpcError)throw rpcError;return NextResponse.json({ok:true,id:data});
 }catch(error){const message=error instanceof Error?error.message:'A kommunikáció nem tehető sorba.';return NextResponse.json({error:message.includes('marketing consent required')?'Nincs aktív marketing-hozzájárulás.':'A kommunikáció nem tehető sorba.'},{status:409});}
}
