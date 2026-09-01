import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

const schema=z.object({code:z.string().trim().min(3).max(32),subtotal:z.number().int().nonnegative()});

export async function POST(request:Request){
  const instance=await getCurrentWebshopInstance();
  if(!instance)return NextResponse.json({valid:false,error:'A webshop nem érhető el.'},{status:404});
  let raw:unknown; try{raw=await request.json();}catch{return NextResponse.json({valid:false,error:'Érvénytelen kérés.'},{status:400});}
  const parsed=schema.safeParse(raw); if(!parsed.success)return NextResponse.json({valid:false,error:'Érvénytelen kuponkód.'},{status:400});
  const code=parsed.data.code.toUpperCase(); const admin=createAdminClient();
  const {data:coupon,error}=await admin.from('coupons').select('code,discount_type,discount_value,min_subtotal_huf,max_discount_huf,usage_limit,usage_count,starts_at,ends_at,active').eq('instance_id',instance.id).eq('code',code).maybeSingle();
  if(error||!coupon||!coupon.active)return NextResponse.json({valid:false,error:'A kupon nem érvényes.'},{status:404});
  const now=Date.now(); if(coupon.starts_at&&now<new Date(coupon.starts_at).getTime())return NextResponse.json({valid:false,error:'A kupon még nem használható.'},{status:409});
  if(coupon.ends_at&&now>=new Date(coupon.ends_at).getTime())return NextResponse.json({valid:false,error:'A kupon lejárt.'},{status:409});
  if(coupon.usage_limit!=null&&coupon.usage_count>=coupon.usage_limit)return NextResponse.json({valid:false,error:'A kupon felhasználási kerete elfogyott.'},{status:409});
  if(parsed.data.subtotal<coupon.min_subtotal_huf)return NextResponse.json({valid:false,error:`A kupon minimum kosárértéke ${coupon.min_subtotal_huf} Ft.`},{status:409});
  let discount=coupon.discount_type==='percent'?Math.floor(parsed.data.subtotal*Math.min(coupon.discount_value,100)/100):Math.min(coupon.discount_value,parsed.data.subtotal);
  if(coupon.max_discount_huf!=null)discount=Math.min(discount,coupon.max_discount_huf); discount=Math.max(0,Math.min(discount,parsed.data.subtotal));
  return NextResponse.json({valid:true,code,discount,discountType:coupon.discount_type,discountValue:coupon.discount_value});
}
