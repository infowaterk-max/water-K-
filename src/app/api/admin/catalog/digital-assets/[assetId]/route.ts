import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';

const paramsSchema=z.object({assetId:z.string().uuid()});

export async function PATCH(_request:Request,{params}:{params:Promise<{assetId:string}>}){
  const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const parsed=paramsSchema.safeParse(await params);if(!parsed.success)return NextResponse.json({error:'Érvénytelen fájlazonosító.'},{status:400});
  const admin=createAdminClient();const{data,error}=await admin.rpc('activate_digital_asset_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_asset_id:parsed.data.assetId});
  const result=(data??{})as{assetId?:string;active?:boolean};
  if(error||result.assetId!==parsed.data.assetId||result.active!==true){const message=String(error?.message??'');if(message.includes('DIGITAL_ASSET_OBJECT_MISSING'))return NextResponse.json({error:'A fájlfeltöltés még nem fejeződött be vagy a privát objektum hiányzik.'},{status:409});if(message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság.'},{status:403});return NextResponse.json({error:'A digitális fájl nem aktiválható.'},{status:409})}
  return NextResponse.json({ok:true,assetId:parsed.data.assetId,active:true});
}

export async function DELETE(_request:Request,{params}:{params:Promise<{assetId:string}>}){
  const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const parsed=paramsSchema.safeParse(await params);if(!parsed.success)return NextResponse.json({error:'Érvénytelen fájlazonosító.'},{status:400});
  const admin=createAdminClient();const{data:asset,error:assetError}=await admin.from('digital_assets').select('storage_bucket,storage_path').eq('id',parsed.data.assetId).eq('instance_id',scope.instanceId).maybeSingle();
  if(assetError||!asset)return NextResponse.json({error:'A digitális fájl nem található.'},{status:404});
  const{data,error}=await admin.rpc('deactivate_digital_asset_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_asset_id:parsed.data.assetId});
  const result=(data??{})as{assetId?:string;active?:boolean};if(error||result.assetId!==parsed.data.assetId||result.active!==false)return NextResponse.json({error:'A digitális hozzáférés nem vonható vissza biztonságosan.'},{status:409});
  const{error:removeError}=await admin.storage.from(asset.storage_bucket).remove([asset.storage_path]);if(removeError)console.error('inactive digital asset object cleanup deferred',{instanceId:scope.instanceId,assetId:parsed.data.assetId,error:removeError});
  return NextResponse.json({ok:true,assetId:parsed.data.assetId,active:false,cleanupPending:Boolean(removeError)});
}