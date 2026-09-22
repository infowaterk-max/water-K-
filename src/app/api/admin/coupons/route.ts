import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const createSchema=z.object({
  code:z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/),description:z.string().trim().max(250).optional(),
  discountType:z.enum(['percent','fixed']),discountValue:z.number().int().positive(),minSubtotalHuf:z.number().int().nonnegative().default(0),
  maxDiscountHuf:z.number().int().positive().nullable().optional(),usageLimit:z.number().int().positive().nullable().optional(),
  startsAt:z.string().datetime().nullable().optional(),endsAt:z.string().datetime().nullable().optional(),
});
const patchSchema=z.object({id:z.string().uuid(),active:z.boolean().optional(),description:z.string().trim().max(250).optional(),usageLimit:z.number().int().positive().nullable().optional(),endsAt:z.string().datetime().nullable().optional()}).refine(value=>Object.keys(value).some(key=>key!=='id'),'Nincs módosítás.');

async function access(){
  const actor=await getAdminRequestUser('marketing.manage');if(!actor)return null;
  try{return{actor,scope:await requireCurrentStoreContext('marketing.manage')}}catch{return null}
}

export async function POST(request:Request){
  const ctx=await access();if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=createSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'A kupon adatai érvénytelenek.'},{status:400});
  const d=parsed.data;
  if(d.discountType==='percent'&&d.discountValue>100)return NextResponse.json({error:'A százalékos kedvezmény legfeljebb 100% lehet.'},{status:400});
  if(d.startsAt&&d.endsAt&&new Date(d.endsAt)<=new Date(d.startsAt))return NextResponse.json({error:'A lejáratnak a kezdés után kell lennie.'},{status:400});

  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_mutate_coupon_v2',{
    p_instance_id:ctx.scope.instanceId,p_coupon_id:null,p_actor:ctx.actor.id,p_action:'create',p_expected_updated_at:null,p_payload:d
  });
  if(error){
    if(error.message.includes('MARKETING_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    if(/duplicate|unique|23505/i.test(error.message))return NextResponse.json({error:'Ez a kuponkód ebben a webshopban már létezik.'},{status:409});
    return NextResponse.json({error:'A kupon létrehozása nem sikerült. Egyetlen változás sem került alkalmazásra.'},{status:500});
  }
  const result=(data??{})as{id?:string;code?:string};
  if(!result.id||!result.code)return NextResponse.json({error:'A kupon létrehozása nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,coupon:{id:result.id,code:result.code}},{status:201});
}

export async function PATCH(request:Request){
  const ctx=await access();if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=patchSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen módosítás.'},{status:400});
  const d=parsed.data,admin=createAdminClient();
  const{data:current,error:currentError}=await admin.from('coupons')
    .select('usage_count,starts_at,updated_at').eq('id',d.id).eq('instance_id',ctx.scope.instanceId).maybeSingle();
  if(currentError||!current)return NextResponse.json({error:'A kupon nem található ebben a webshopban.'},{status:404});
  if(d.usageLimit!==undefined&&d.usageLimit!==null&&d.usageLimit<Number(current.usage_count??0))return NextResponse.json({error:'A felhasználási limit nem lehet kisebb a már felhasznált kuponok számánál.'},{status:409});
  if(d.endsAt&&current.starts_at&&new Date(d.endsAt)<=new Date(current.starts_at))return NextResponse.json({error:'A lejáratnak a kezdés után kell lennie.'},{status:400});
  const patch:Record<string,unknown>={};
  if(d.active!==undefined)patch.active=d.active;
  if(d.description!==undefined)patch.description=d.description;
  if(d.usageLimit!==undefined)patch.usageLimit=d.usageLimit;
  if(d.endsAt!==undefined)patch.endsAt=d.endsAt;

  const{data,error}=await admin.rpc('admin_mutate_coupon_v2',{
    p_instance_id:ctx.scope.instanceId,p_coupon_id:d.id,p_actor:ctx.actor.id,p_action:'update',p_expected_updated_at:current.updated_at,p_payload:patch
  });
  if(error){
    if(error.message.includes('STALE_COUPON'))return NextResponse.json({error:'A kupont időközben valaki más módosította. Frissítsd az oldalt és próbáld újra.'},{status:409});
    if(error.message.includes('COUPON_NOT_FOUND'))return NextResponse.json({error:'A kupon nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('MARKETING_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A kupon frissítése nem sikerült. Egyetlen változás sem került alkalmazásra.'},{status:500});
  }
  if(!(data as{id?:string}|null)?.id)return NextResponse.json({error:'A kupon frissítése nem igazolható.'},{status:500});
  return NextResponse.json({ok:true});
}
