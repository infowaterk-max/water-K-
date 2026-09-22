import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

const nullablePrice=z.union([z.number().int().min(0).max(10000000),z.null()]).optional();
const bodySchema = z.object({
  stock: z.number().int().min(0).max(100000).optional(),
  grossPrice: z.number().int().min(0).max(10000000).optional(),
  netPrice: z.number().int().min(0).max(10000000).optional(),
  resellerGrossPrice: nullablePrice,
  resellerNetPrice: nullablePrice,
  unitCostNet: nullablePrice,
  weightGrams:z.union([z.number().int().min(1).max(100000000),z.null()]).optional(),
  supplierLeadTimeDays:z.number().int().min(0).max(365).optional(),
  safetyStockDays:z.number().int().min(0).max(365).optional(),
  minimumOrderQuantity:z.number().int().min(1).max(100000).optional(),
  orderMultiple:z.number().int().min(1).max(100000).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Nincs módosítás.');

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen változatazonosító.'},{status:400});
  const admin=createAdminClient();
  const{data,error}=await admin.from('product_variants').select('weight_grams,instance_id').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(error||!data)return NextResponse.json({error:'A termékváltozat nem található ebben a webshopban.'},{status:404});
  return NextResponse.json({weightGrams:data.weight_grams==null?null:Number(data.weight_grams)});
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen változatazonosító.'},{status:400});

  let raw:unknown;
  try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=bodySchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen termékadat.'},{status:400});

  const admin=createAdminClient();
  const{data:current,error:readError}=await admin.from('product_variants')
    .select('updated_at')
    .eq('id',id)
    .eq('instance_id',scope.instanceId)
    .maybeSingle();
  if(readError||!current)return NextResponse.json({error:'A termékváltozat nem található ebben a webshopban.'},{status:404});

  const{data,error}=await admin.rpc('admin_update_product_variant_v2',{
    p_instance_id:scope.instanceId,
    p_variant_id:id,
    p_actor:actor.id,
    p_expected_updated_at:current.updated_at,
    p_patch:parsed.data
  });

  if(error){
    if(error.message.includes('STALE_VARIANT'))return NextResponse.json({error:'A termékváltozat készlete vagy ára időközben megváltozott. Frissítsd az oldalt, ellenőrizd az aktuális adatokat, majd próbáld újra.'},{status:409});
    if(error.message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    if(error.message.includes('VARIANT_NOT_FOUND'))return NextResponse.json({error:'A termékváltozat nem található ebben a webshopban.'},{status:404});
    return NextResponse.json({error:'A termék módosítása nem sikerült. Egyetlen változás sem került alkalmazásra.'},{status:500});
  }
  if((data as {id?:string}|null)?.id!==id)return NextResponse.json({error:'A termékváltozat módosításának eredménye nem igazolható.'},{status:500});

  return NextResponse.json({ok:true,result:data});
}
