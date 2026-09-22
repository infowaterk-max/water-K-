import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getCurrentWebshopInstance} from '@/lib/instances/access';

const schema=z.object({confirmationToken:z.string().uuid()});

type ClaimResult={
  status?:'claimed'|'already_claimed'|'claimed_by_other'|'email_mismatch'|'not_found'|'claim_conflict'|'invalid_request';
  orderId?:string;
  orderNumber?:string;
};

export async function POST(request:Request){
  const instance=await getCurrentWebshopInstance();
  if(!instance||!['pilot','active'].includes(instance.status))return NextResponse.json({error:'A webshop nem érhető el.'},{status:404});
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user?.id||!user.email)return NextResponse.json({error:'A rendelés fiókhoz kapcsolásához bejelentkezés szükséges.'},{status:401});
  let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({error:'Érvénytelen rendelési hivatkozás.'},{status:400});
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('claim_guest_order_v1',{
    p_instance_id:instance.id,
    p_confirmation_token:parsed.data.confirmationToken,
    p_customer_id:user.id,
    p_customer_email:user.email,
  });
  if(error){console.error('guest order claim failed',{instanceId:instance.id,userId:user.id,error});return NextResponse.json({error:'A rendelés kapcsolása átmenetileg nem sikerült.'},{status:503})}
  const result=(data??{}) as ClaimResult;
  if(result.status==='claimed'||result.status==='already_claimed')return NextResponse.json({ok:true,status:result.status,orderId:result.orderId,orderNumber:result.orderNumber});
  if(result.status==='email_mismatch')return NextResponse.json({error:'A bejelentkezett fiók e-mail címe nem egyezik a rendelésnél használt címmel.'},{status:403});
  if(result.status==='claimed_by_other')return NextResponse.json({error:'Ezt a rendelést már másik hitelesített fiókhoz kapcsolták.'},{status:409});
  if(result.status==='not_found')return NextResponse.json({error:'A rendelés nem található vagy a hivatkozás nem érvényes.'},{status:404});
  return NextResponse.json({error:'A rendelés most nem kapcsolható a fiókhoz.'},{status:409});
}
