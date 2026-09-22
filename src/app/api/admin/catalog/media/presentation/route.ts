import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';

export const runtime='nodejs';
const uuid=z.string().uuid();
const transform=z.object({zoom:z.number().min(1).max(3),offsetX:z.number().min(-50).max(50),offsetY:z.number().min(-50).max(50),rotation:z.number().min(-180).max(180)}).strict();
const presentation=z.object({card:transform,detail:transform,mobile:transform}).strict();
const save=z.object({action:z.literal('save'),productId:uuid,mediaId:uuid,presentation}).strict();
const createPreset=z.object({action:z.literal('createPreset'),name:z.string().trim().min(1).max(80),presentation}).strict();
const deletePreset=z.object({action:z.literal('deletePreset'),presetId:uuid}).strict();
const apply=z.object({action:z.literal('applyVariants'),productId:uuid,sourceMediaId:uuid,targetVariantIds:z.array(uuid).min(1).max(100),mode:z.enum(['same-media','presentation-only'])}).strict();
const mutation=z.discriminatedUnion('action',[save,createPreset,deletePreset,apply]);

async function context(){
 const actor=await getAdminRequestUser('catalog.manage');if(!actor)return null;
 try{return{actor,scope:await requireCurrentStoreContext('catalog.manage'),admin:createAdminClient()}}catch{return null}
}

export async function GET(request:Request){
 const ctx=await context();if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const productId=uuid.safeParse(new URL(request.url).searchParams.get('productId'));if(!productId.success)return NextResponse.json({error:'Érvénytelen termékazonosító.'},{status:400});
 const{admin,scope}=ctx,{data:product,error:productError}=await admin.from('products').select('id').eq('instance_id',scope.instanceId).eq('id',productId.data).maybeSingle();
 if(productError)return NextResponse.json({error:'A termék nem ellenőrizhető.'},{status:500});if(!product)return NextResponse.json({error:'A termék nem található.'},{status:404});
 const[presentations,presets,variants]=await Promise.all([
  admin.from('product_media_presentations').select('media_id,context,zoom,offset_x,offset_y,rotation').eq('instance_id',scope.instanceId).eq('product_id',productId.data),
  admin.from('product_media_presets').select('id,name,presentation').eq('instance_id',scope.instanceId).order('name'),
  admin.from('product_variants').select('id,label,primary_media_id').eq('instance_id',scope.instanceId).eq('product_id',productId.data).order('created_at'),
 ]);
 if(presentations.error||presets.error||variants.error)return NextResponse.json({error:'A médiaszerkesztő adatai nem tölthetők be.'},{status:500});
 return NextResponse.json({ok:true,presentations:presentations.data??[],presets:presets.data??[],variants:variants.data??[]});
}

export async function POST(request:Request){
 const ctx=await context();if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const parsed=mutation.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen médiaszerkesztési kérés.'},{status:400});
 const{admin,scope,actor}=ctx,input=parsed.data;
 if(input.action==='save'){
  const{data,error}=await admin.rpc('save_product_media_presentations_v1',{p_instance_id:scope.instanceId,p_product_id:input.productId,p_media_id:input.mediaId,p_actor:actor.id,p_presentations:input.presentation});
  if(error)return NextResponse.json({error:'A kép megjelenítési beállításai nem menthetők.'},{status:409});
  const result=(data??{})as{mediaId?:string;productId?:string;presentation?:unknown};if(result.mediaId!==input.mediaId||result.productId!==input.productId)return NextResponse.json({error:'A médiaszerkesztés eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,...result});
 }
 if(input.action==='createPreset'){
  const{data,error}=await admin.rpc('create_product_media_preset_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_name:input.name,p_presentations:input.presentation});
  if(error)return NextResponse.json({error:'A média preset nem menthető.'},{status:409});
  const result=(data??{})as{presetId?:string;name?:string;presentation?:unknown};if(!result.presetId||!result.name)return NextResponse.json({error:'A preset mentésének eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,...result});
 }
 if(input.action==='deletePreset'){
  const{data,error}=await admin.rpc('delete_product_media_preset_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_preset_id:input.presetId});
  if(error)return NextResponse.json({error:'A média preset nem törölhető.'},{status:409});
  const result=(data??{})as{presetId?:string;deleted?:boolean};if(result.presetId!==input.presetId||result.deleted!==true)return NextResponse.json({error:'A preset törlésének eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,...result});
 }
 const{data,error}=await admin.rpc('apply_product_media_to_variants_v1',{p_instance_id:scope.instanceId,p_product_id:input.productId,p_source_media_id:input.sourceMediaId,p_actor:actor.id,p_target_variant_ids:input.targetVariantIds,p_mode:input.mode});
 if(error)return NextResponse.json({error:'A kép nem alkalmazható a kiválasztott variánsokra. Ellenőrizd, hogy minden célvariáns és kép még létezik-e.'},{status:409});
 const result=(data??{})as{mode?:string;sourceMediaId?:string;appliedVariantIds?:string[];skippedVariantIds?:string[];appliedCount?:number;skippedCount?:number};
 if(result.mode!==input.mode||result.sourceMediaId!==input.sourceMediaId||!Array.isArray(result.appliedVariantIds)||!Array.isArray(result.skippedVariantIds))return NextResponse.json({error:'A variánsokra alkalmazás eredménye nem igazolható.'},{status:500});
 return NextResponse.json({ok:true,...result});
}
