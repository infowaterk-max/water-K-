import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';

const createSchema=z.object({
  code:z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/),description:z.string().trim().max(250).optional(),
  discountType:z.enum(['percent','fixed']),discountValue:z.number().int().positive(),minSubtotalHuf:z.number().int().nonnegative().default(0),
  maxDiscountHuf:z.number().int().positive().nullable().optional(),usageLimit:z.number().int().positive().nullable().optional(),startsAt:z.string().datetime().nullable().optional(),endsAt:z.string().datetime().nullable().optional(),
});
const patchSchema=z.object({id:z.string().uuid(),active:z.boolean().optional(),description:z.string().trim().max(250).optional(),usageLimit:z.number().int().positive().nullable().optional(),endsAt:z.string().datetime().nullable().optional()});

export async function POST(request:Request){
  const actor=await getAdminRequestUser(); if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown; try{raw=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
  const parsed=createSchema.safeParse(raw); if(!parsed.success)return NextResponse.json({error:'A kupon adatai érvénytelenek.'},{status:400});
  const d=parsed.data; const admin=createAdminClient();
  if(d.discountType==='percent'&&d.discountValue>100)return NextResponse.json({error:'A százalékos kedvezmény legfeljebb 100% lehet.'},{status:400});
  if(d.startsAt&&d.endsAt&&new Date(d.endsAt)<=new Date(d.startsAt))return NextResponse.json({error:'A lejáratnak a kezdés után kell lennie.'},{status:400});
  const {data,error}=await admin.from('coupons').insert({code:d.code.toUpperCase(),description:d.description||null,discount_type:d.discountType,discount_value:d.discountValue,min_subtotal_huf:d.minSubtotalHuf,max_discount_huf:d.maxDiscountHuf??null,usage_limit:d.usageLimit??null,starts_at:d.startsAt??null,ends_at:d.endsAt??null,active:true}).select('id,code').single();
  if(error)return NextResponse.json({error:error.code==='23505'?'Ez a kuponkód már létezik.':'A kupon létrehozása nem sikerült.'},{status:409});
  return NextResponse.json({ok:true,coupon:data},{status:201});
}

export async function PATCH(request:Request){
  const actor=await getAdminRequestUser(); if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown; try{raw=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
  const parsed=patchSchema.safeParse(raw); if(!parsed.success)return NextResponse.json({error:'Érvénytelen módosítás.'},{status:400});
  const d=parsed.data; const update:Record<string,unknown>={updated_at:new Date().toISOString()};
  if(d.active!==undefined)update.active=d.active;if(d.description!==undefined)update.description=d.description||null;if(d.usageLimit!==undefined)update.usage_limit=d.usageLimit;if(d.endsAt!==undefined)update.ends_at=d.endsAt;
  const admin=createAdminClient(); const {error}=await admin.from('coupons').update(update).eq('id',d.id); if(error)return NextResponse.json({error:'A kupon frissítése nem sikerült.'},{status:500});
  return NextResponse.json({ok:true});
}
