import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';

export const runtime='nodejs';
const PRODUCT_MEDIA_BUCKET='product-media',MAX_BYTES=8*1024*1024,allowed=new Set(['image/jpeg','image/png','image/webp','image/avif']);
const uuid=z.string().uuid(),key=z.string().trim().min(16).max(120),mediaMutation=z.object({productId:uuid,mediaId:uuid});

function safeName(name:string){return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-160)||'image'}
function signatureMatches(type:string,bytes:Uint8Array){
  if(type==='image/jpeg')return bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(type==='image/png')return bytes.length>=8&&[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i)=>bytes[i]===v);
  const ascii=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
  if(type==='image/webp')return bytes.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
  if(type==='image/avif')return bytes.length>=16&&ascii(4,8)==='ftyp'&&['avif','avis'].includes(ascii(8,12));
  return false;
}

export async function POST(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let form:FormData;try{form=await request.formData()}catch{return NextResponse.json({error:'Érvénytelen feltöltés.'},{status:400})}
  const productIdRaw=form.get('productId'),uploadKeyRaw=form.get('idempotencyKey'),altRaw=form.get('altText'),file=form.get('file');
  const productId=uuid.safeParse(productIdRaw),uploadKey=key.safeParse(uploadKeyRaw);
  if(!productId.success||!uploadKey.success||!(file instanceof File))return NextResponse.json({error:'Hiányzó vagy érvénytelen médiaadat.'},{status:400});
  if(!allowed.has(file.type)||file.size<1||file.size>MAX_BYTES)return NextResponse.json({error:'Csak legfeljebb 8 MB-os JPEG, PNG, WebP vagy AVIF kép tölthető fel.'},{status:400});
  const altText=typeof altRaw==='string'?altRaw.trim():'';if(altText.length>300)return NextResponse.json({error:'Az alternatív szöveg legfeljebb 300 karakter lehet.'},{status:400});
  const bytes=new Uint8Array(await file.arrayBuffer());if(!signatureMatches(file.type,bytes))return NextResponse.json({error:'A fájl tartalma nem egyezik a megadott képformátummal.'},{status:422});
  const admin=createAdminClient();
  const{data:existing,error:existingError}=await admin.from('product_media').select('id,product_id,storage_path').eq('instance_id',scope.instanceId).eq('upload_key',uploadKey.data).maybeSingle();
  if(existingError)return NextResponse.json({error:'A feltöltés előzménye nem ellenőrizhető.'},{status:500});
  if(existing){
    if(existing.product_id!==productId.data)return NextResponse.json({error:'Az idempotenciakulcs más termékhez tartozik.'},{status:409});
    const publicUrl=admin.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(existing.storage_path).data.publicUrl;
    return NextResponse.json({ok:true,mediaId:existing.id,storagePath:existing.storage_path,publicUrl,replayed:true});
  }
  const{data:product,error:productError}=await admin.from('products').select('id').eq('instance_id',scope.instanceId).eq('id',productId.data).maybeSingle();
  if(productError)return NextResponse.json({error:'A termék nem ellenőrizhető.'},{status:500});
  if(!product)return NextResponse.json({error:'A termék nem található ebben a webshopban.'},{status:404});
  const storagePath=`${scope.instanceId}/${productId.data}/${uploadKey.data}-${safeName(file.name)}`;
  const uploaded=await admin.storage.from(PRODUCT_MEDIA_BUCKET).upload(storagePath,bytes,{contentType:file.type,upsert:false});
  if(uploaded.error)return NextResponse.json({error:'A kép tárhelyre mentése nem sikerült. Újrapróbálható ugyanazzal az idempotenciakulccsal.'},{status:409});
  const{data,error}=await admin.rpc('record_product_media_v1',{
    p_instance_id:scope.instanceId,p_product_id:productId.data,p_actor:actor.id,p_upload_key:uploadKey.data,
    p_storage_path:storagePath,p_original_name:file.name.slice(0,255),p_content_type:file.type,p_byte_size:file.size,p_alt_text:altText||null
  });
  if(error){await admin.storage.from(PRODUCT_MEDIA_BUCKET).remove([storagePath]).catch(()=>null);return NextResponse.json({error:'A médiametaadat nem rögzíthető; a feltöltött objektum vissza lett vonva.'},{status:409})}
  const result=(data??{})as{mediaId?:string;storagePath?:string;replayed?:boolean};
  if(!result.mediaId||result.storagePath!==storagePath){await admin.storage.from(PRODUCT_MEDIA_BUCKET).remove([storagePath]).catch(()=>null);return NextResponse.json({error:'A médiafeltöltés eredménye nem igazolható.'},{status:500})}
  const publicUrl=admin.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  return NextResponse.json({ok:true,...result,publicUrl});
}

export async function PATCH(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=mediaMutation.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen médiaazonosító.'},{status:400});
  const admin=createAdminClient(),{data,error}=await admin.rpc('set_product_primary_media_v1',{p_instance_id:scope.instanceId,p_product_id:parsed.data.productId,p_media_id:parsed.data.mediaId,p_actor:actor.id});
  if(error)return NextResponse.json({error:'A főkép beállítása nem sikerült.'},{status:409});
  const result=(data??{})as{primaryMediaId?:string};if(result.primaryMediaId!==parsed.data.mediaId)return NextResponse.json({error:'A főkép módosításának eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,primaryMediaId:result.primaryMediaId});
}

export async function DELETE(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=mediaMutation.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen médiaazonosító.'},{status:400});
  const admin=createAdminClient(),{data,error}=await admin.rpc('delete_product_media_v1',{p_instance_id:scope.instanceId,p_product_id:parsed.data.productId,p_media_id:parsed.data.mediaId,p_actor:actor.id});
  if(error)return NextResponse.json({error:'A kép törlése nem sikerült. A katalógus állapota nem változott.'},{status:409});
  const result=(data??{})as{deleted?:boolean;cleanupJobId?:string;storageBucket?:string;storagePath?:string;nextPrimaryMediaId?:string|null};
  if(result.deleted!==true||!result.cleanupJobId||result.storageBucket!==PRODUCT_MEDIA_BUCKET||!result.storagePath)return NextResponse.json({error:'A képtörlés eredménye nem igazolható.'},{status:500});
  const removed=await admin.storage.from(PRODUCT_MEDIA_BUCKET).remove([result.storagePath]);
  if(removed.error)return NextResponse.json({ok:true,deleted:true,cleanupPending:true,nextPrimaryMediaId:result.nextPrimaryMediaId??null},{status:202});
  const{error:cleanupError}=await admin.rpc('complete_product_media_cleanup_v1',{p_instance_id:scope.instanceId,p_cleanup_job_id:result.cleanupJobId,p_actor:actor.id});
  if(cleanupError)return NextResponse.json({ok:true,deleted:true,cleanupPending:true,nextPrimaryMediaId:result.nextPrimaryMediaId??null},{status:202});
  return NextResponse.json({ok:true,deleted:true,cleanupPending:false,nextPrimaryMediaId:result.nextPrimaryMediaId??null});
}
