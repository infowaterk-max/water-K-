import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAudit } from '@/lib/admin/audit';

const createSchema=z.object({
  code:z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/),description:z.string().trim().max(250).optional(),
  discountType:z.enum(['percent','fixed']),discountValue:z.number().int().positive(),minSubtotalHuf:z.number().int().nonnegative().default(0),
  maxDiscountHuf:z.number().int().positive().nullable().optional(),usageLimit:z.number().int().positive().nullable().optional(),startsAt:z.string().datetime().nullable().optional(),endsAt:z.string().datetime().nullable().optional(),
});
const patchSchema=z.object({id:z.string().uuid(),active:z.boolean().optional(),description:z.string().trim().max(250).optional(),usageLimit:z.number().int().positive().nullable().optional(),endsAt:z.string().datetime().nullable().optional()}).refine(value=>Object.keys(value).some(key=>key!=='id'),'Nincs módosítás.');

export async function POST(request:Request){
  const actor=await getAdminRequestUser(); if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown; try{raw=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
  const parsed=createSchema.safeParse(raw); if(!parsed.success)return NextResponse.json({error:'A kupon adatai érvénytelenek.'},{status:400});
  const d=parsed.data; const admin=createAdminClient();
  if(d.discountType==='percent'&&d.discountValue>100)return NextResponse.json({error:'A százalékos kedvezmény legfeljebb 100% lehet.'},{status:400});
  if(d.startsAt&&d.endsAt&&new Date(d.endsAt)<=new Date(d.startsAt))return NextResponse.json({error:'A lejáratnak a kezdés után kell lennie.'},{status:400});
  const {data,error}=await admin.from('coupons').insert({code:d.code.toUpperCase(),description:d.description||null,discount_type:d.discountType,discount_value:d.discountValue,min_subtotal_huf:d.minSubtotalHuf,max_discount_huf:d.maxDiscountHuf??null,usage_limit:d.usageLimit??null,starts_at:d.startsAt??null,ends_at:d.endsAt??null,active:true}).select('id,code,description,discount_type,discount_value,min_subtotal_huf,max_discount_huf,usage_limit,starts_at,ends_at,active').single();
  if(error)return NextResponse.json({error:error.code==='23505'?'Ez a kuponkód már létezik.':'A kupon létrehozása nem sikerült.'},{status:409});
  await recordAdminAudit({actorUserId:actor.id,action:'coupon.created',entityType:'coupon',entityId:data.id,summary:`${data.code} kupon létrehozva`,afterState:data});
  return NextResponse.json({ok:true,coupon:{id:data.id,code:data.code}},{status:201});
}

export async function PATCH(request:Request){
  const actor=await getAdminRequestUser(); if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown; try{raw=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
  const parsed=patchSchema.safeParse(raw); if(!parsed.success)return NextResponse.json({error:'Érvénytelen módosítás.'},{status:400});
  const d=parsed.data; const admin=createAdminClient();
  const {data:current,error:currentError}=await admin.from('coupons').select('id,code,description,discount_type,discount_value,min_subtotal_huf,max_discount_huf,usage_limit,used_count,starts_at,ends_at,active,updated_at').eq('id',d.id).maybeSingle();
  if(currentError||!current)return NextResponse.json({error:'A kupon nem található.'},{status:404});
  const update:Record<string,unknown>={updated_at:new Date().toISOString()};
  if(d.active!==undefined)update.active=d.active;if(d.description!==undefined)update.description=d.description||null;if(d.usageLimit!==undefined)update.usage_limit=d.usageLimit;if(d.endsAt!==undefined)update.ends_at=d.endsAt;
  if(d.usageLimit!==undefined&&d.usageLimit!==null&&d.usageLimit<Number(current.used_count??0))return NextResponse.json({error:'A felhasználási limit nem lehet kisebb a már felhasznált kuponok számánál.'},{status:409});
  if(d.endsAt&&current.starts_at&&new Date(d.endsAt)<=new Date(current.starts_at))return NextResponse.json({error:'A lejáratnak a kezdés után kell lennie.'},{status:400});
  const {data:updated,error}=await admin.from('coupons').update(update).eq('id',d.id).eq('updated_at',current.updated_at).select('id,code,description,discount_type,discount_value,min_subtotal_huf,max_discount_huf,usage_limit,used_count,starts_at,ends_at,active,updated_at').maybeSingle();
  if(error)return NextResponse.json({error:'A kupon frissítése nem sikerült.'},{status:500});
  if(!updated)return NextResponse.json({error:'A kupont időközben valaki más módosította. Frissítsd az oldalt és próbáld újra.'},{status:409});
  await recordAdminAudit({actorUserId:actor.id,action:'coupon.updated',entityType:'coupon',entityId:d.id,summary:`${updated.code} kupon módosítva`,beforeState:current,afterState:updated,metadata:{fields:Object.keys(d).filter(key=>key!=='id')}});
  return NextResponse.json({ok:true});
}
