import{createHash}from'node:crypto';
import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';

export const runtime='nodejs';
const body=z.object({sourceProductId:z.string().uuid(),idempotencyKey:z.string().trim().min(16).max(120),options:z.object({includeMedia:z.boolean().default(true),includeSeo:z.boolean().default(true),includeChannels:z.boolean().default(true),includeStock:z.boolean().default(false)}).default({includeMedia:true,includeSeo:true,includeChannels:true,includeStock:false})});
type Prepared={batchId?:string;sourceProductId?:string;targetProductId?:string;includeMedia?:boolean;applied?:boolean;draft?:boolean;updatedAt?:string};
const BUCKET='product-media';
function safeName(name:string){return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-120)||'image'}

export async function POST(request:Request){
 const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
 let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}const parsed=body.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'A másolási beállítások érvénytelenek.'},{status:400});
 const admin=createAdminClient(),payloadHash=createHash('sha256').update(JSON.stringify({sourceProductId:parsed.data.sourceProductId,options:parsed.data.options})).digest('hex');
 const{data,error}=await admin.rpc('prepare_catalog_product_copy_v1',{p_instance_id:scope.instanceId,p_source_product_id:parsed.data.sourceProductId,p_actor:actor.id,p_idempotency_key:parsed.data.idempotencyKey,p_payload_hash:payloadHash,p_options:parsed.data.options});
 if(error){const message=String(error.message??'');if(message.includes('PRODUCT_NOT_FOUND'))return NextResponse.json({error:'A másolandó termék nem található ebben a webshopban.'},{status:404});if(message.includes('CATALOG_COPY_IDEMPOTENCY_CONFLICT'))return NextResponse.json({error:'Ez a másolási kulcs már más beállításokhoz tartozik.'},{status:409});if(message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});return NextResponse.json({error:'A termékmásolat előkészítése nem sikerült.'},{status:409})}
 const prepared=(data??{})as Prepared;if(!prepared.batchId||!prepared.targetProductId||prepared.sourceProductId!==parsed.data.sourceProductId||prepared.draft!==true)return NextResponse.json({error:'A másolás előkészítésének eredménye nem igazolható.'},{status:500});if(prepared.applied===true||prepared.includeMedia!==true)return NextResponse.json({ok:true,...prepared});
 const{data:media,error:mediaError}=await admin.from('product_media').select('id,storage_bucket,storage_path,original_name').eq('instance_id',scope.instanceId).eq('product_id',parsed.data.sourceProductId).order('sort_order').order('created_at');
 const copied:string[]=[];const rollback=async()=>{if(copied.length)await admin.storage.from(BUCKET).remove(copied);try{await admin.rpc('rollback_catalog_product_copy_v1',{p_instance_id:scope.instanceId,p_batch_id:prepared.batchId!,p_actor:actor.id})}catch{}}
 if(mediaError){await rollback();return NextResponse.json({error:'A forrástermék médiája nem ellenőrizhető; a másolat vissza lett vonva.'},{status:500})}
 const sourceMedia=media??[];if(sourceMedia.some(item=>item.storage_bucket!==BUCKET)){await rollback();return NextResponse.json({error:'A forrástermék nem támogatott médiatárat használ; a másolat vissza lett vonva.'},{status:409})}
 const manifest=sourceMedia.map(item=>({sourceMediaId:item.id,storagePath:`${scope.instanceId}/${prepared.targetProductId}/copy-${prepared.batchId}-${item.id}-${safeName(item.original_name)}`}));
 if(manifest.length)await admin.storage.from(BUCKET).remove(manifest.map(item=>item.storagePath));
 for(let index=0;index<sourceMedia.length;index++){const source=sourceMedia[index],target=manifest[index];const copiedResult=await admin.storage.from(BUCKET).copy(source.storage_path,target.storagePath);if(copiedResult.error){await rollback();return NextResponse.json({error:'A termékmédia másolása megszakadt; a félkész másolat vissza lett vonva.'},{status:409})}copied.push(target.storagePath)}
 const{data:finalized,error:finalizeError}=await admin.rpc('finalize_catalog_product_copy_media_v1',{p_instance_id:scope.instanceId,p_batch_id:prepared.batchId,p_actor:actor.id,p_media_manifest:manifest});
 if(finalizeError){await rollback();return NextResponse.json({error:'A termékmásolat médiájának atomi lezárása nem sikerült; a félkész másolat vissza lett vonva.'},{status:409})}
 const result=(finalized??{})as Prepared&{mediaCount?:number};if(result.targetProductId!==prepared.targetProductId||result.applied!==true)return NextResponse.json({error:'A termékmásolás eredménye nem igazolható; az állapotot a tartós batch eredményből kell ellenőrizni.'},{status:500});
 return NextResponse.json({ok:true,...result});
}
