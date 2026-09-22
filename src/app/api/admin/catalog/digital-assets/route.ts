import{randomUUID}from'node:crypto';
import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';

const BUCKET='digital-products-private';
const allowedTypes=new Set(['application/octet-stream','application/zip','application/x-zip-compressed','application/pdf','audio/mpeg','audio/wav','audio/flac','video/mp4','video/webm']);
const createSchema=z.object({
  productId:z.string().uuid(),variantId:z.string().uuid().nullable().optional(),originalName:z.string().trim().min(1).max(255),mediaType:z.string().trim().min(3).max(160),
  sizeBytes:z.number().int().min(1).max(2147483648),checksumSha256:z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),maxDownloads:z.number().int().min(1).max(500).default(25),
});

function safeFileName(value:string){const normalized=value.normalize('NFKC').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'');return normalized.slice(0,180)||'download.bin'}

export async function GET(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const productId=new URL(request.url).searchParams.get('productId');if(!productId||!z.string().uuid().safeParse(productId).success)return NextResponse.json({error:'Érvénytelen termékazonosító.'},{status:400});
  const admin=createAdminClient();const{data,error}=await admin.from('digital_assets').select('id,product_id,variant_id,original_name,media_type,size_bytes,max_downloads,active,created_at,updated_at').eq('instance_id',scope.instanceId).eq('product_id',productId).order('created_at',{ascending:false});
  if(error)return NextResponse.json({error:'A digitális fájlok nem tölthetők be.'},{status:503});
  return NextResponse.json({assets:data??[]});
}

export async function POST(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=createSchema.safeParse(raw);if(!parsed.success||!allowedTypes.has(parsed.data.mediaType))return NextResponse.json({error:'A digitális fájl típusa vagy mérete nem engedélyezett.'},{status:400});
  const admin=createAdminClient(),assetId=randomUUID(),fileName=safeFileName(parsed.data.originalName),storagePath=`${scope.instanceId}/${parsed.data.productId}/${assetId}/${fileName}`;
  const{data:draftData,error:draftError}=await admin.rpc('create_digital_asset_draft_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_asset_id:assetId,p_product_id:parsed.data.productId,p_variant_id:parsed.data.variantId??null,p_storage_path:storagePath,p_original_name:parsed.data.originalName,p_media_type:parsed.data.mediaType,p_size_bytes:parsed.data.sizeBytes,p_checksum_sha256:parsed.data.checksumSha256??'',p_max_downloads:parsed.data.maxDownloads});
  const draft=(draftData??{})as{assetId?:string;storagePath?:string;active?:boolean};
  if(draftError||draft.assetId!==assetId||draft.storagePath!==storagePath||draft.active!==false){const message=String(draftError?.message??'');if(message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság.'},{status:403});if(message.includes('DIGITAL_ASSET_REQUIRES_DIGITAL'))return NextResponse.json({error:'Digitális fájl csak digitális termékhez vagy digitális variánshoz adható.'},{status:409});return NextResponse.json({error:'A digitális fájl előkészítése nem sikerült.'},{status:409})}
  const{data:signed,error:signedError}=await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath,{upsert:false});
  if(signedError||!signed?.signedUrl)return NextResponse.json({error:'A privát feltöltési kapcsolat nem hozható létre. A fájl még nincs aktiválva.',assetId},{status:503});
  return NextResponse.json({ok:true,assetId,uploadUrl:signed.signedUrl,storagePath,expiresByProviderPolicy:true});
}