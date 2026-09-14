import{randomUUID}from'node:crypto';
import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{ORDER_DOCUMENT_BUCKET}from'@/lib/commerce/order-documents';

const paramsSchema=z.object({id:z.string().uuid()});
const mediaTypes=['application/pdf','image/jpeg','image/png','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']as const;
const prepareSchema=z.object({
  kind:z.enum(['invoice','warranty','certificate','service_record','merchant_attachment','other']),
  title:z.string().trim().min(1).max(200),description:z.string().trim().max(2000).optional(),
  fileName:z.string().trim().min(1).max(255),mediaType:z.enum(mediaTypes),sizeBytes:z.number().int().min(1).max(26214400),
});
const activateSchema=z.object({documentId:z.string().uuid()});

function safeFileName(value:string){const parts=value.split('.'),ext=parts.length>1?parts.pop()!.replace(/[^a-zA-Z0-9]/g,'').slice(0,12):'',base=parts.join('.').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'document';return ext?`${base}.${ext.toLowerCase()}`:base}

async function context(rawParams:Promise<{id:string}>){
  const actor=await getAdminRequestUser('orders.manage');if(!actor)return null;
  const parsed=paramsSchema.safeParse(await rawParams);if(!parsed.success)return null;
  let scope;try{scope=await requireCurrentStoreContext('orders.manage')}catch{return null}
  return{actor,scope,orderId:parsed.data.id};
}

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const ctx=await context(params);if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const admin=createAdminClient();
  const{data:order,error:orderError}=await admin.from('orders').select('id').eq('id',ctx.orderId).eq('instance_id',ctx.scope.instanceId).maybeSingle();
  if(orderError)return NextResponse.json({error:'A rendelés nem ellenőrizhető.'},{status:500});if(!order)return NextResponse.json({error:'A rendelés nem található.'},{status:404});
  const{data,error}=await admin.from('order_customer_documents').select('id,kind,title,description,original_name,media_type,size_bytes,status,customer_visible,download_count,last_download_at,created_at').eq('instance_id',ctx.scope.instanceId).eq('order_id',ctx.orderId).order('created_at',{ascending:false});
  if(error)return NextResponse.json({error:'A rendelési dokumentumok nem tölthetők be.'},{status:500});
  return NextResponse.json({documents:data??[]});
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const ctx=await context(params);if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=prepareSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'A dokumentum adatai érvénytelenek.'},{status:400});
  const admin=createAdminClient(),path=`${ctx.scope.instanceId}/${ctx.orderId}/${randomUUID()}-${safeFileName(parsed.data.fileName)}`;
  const{data,error}=await admin.rpc('admin_prepare_order_customer_document_v1',{
    p_instance_id:ctx.scope.instanceId,p_actor:ctx.actor.id,p_order_id:ctx.orderId,p_kind:parsed.data.kind,p_title:parsed.data.title,
    p_description:parsed.data.description??'',p_storage_path:path,p_original_name:parsed.data.fileName,p_media_type:parsed.data.mediaType,p_size_bytes:parsed.data.sizeBytes,p_checksum_sha256:null,
  });
  if(error||!data)return NextResponse.json({error:'A dokumentum feltöltése nem készíthető elő biztonságosan.'},{status:409});
  const prepared=data as{documentId?:string;path?:string;bucket?:string};if(!prepared.documentId||prepared.path!==path||prepared.bucket!==ORDER_DOCUMENT_BUCKET)return NextResponse.json({error:'A dokumentum-előjegyzés eredménye nem igazolható.'},{status:500});
  const signed=await admin.storage.from(ORDER_DOCUMENT_BUCKET).createSignedUploadUrl(path);
  if(signed.error||!signed.data?.token){await admin.rpc('admin_revoke_order_customer_document_v1',{p_instance_id:ctx.scope.instanceId,p_actor:ctx.actor.id,p_document_id:prepared.documentId}).catch(()=>undefined);return NextResponse.json({error:'A privát feltöltési cím nem hozható létre.'},{status:500})}
  return NextResponse.json({documentId:prepared.documentId,bucket:ORDER_DOCUMENT_BUCKET,path,token:signed.data.token});
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const ctx=await context(params);if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=activateSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen dokumentumazonosító.'},{status:400});
  const admin=createAdminClient(),{data,error}=await admin.rpc('admin_activate_order_customer_document_v1',{p_instance_id:ctx.scope.instanceId,p_actor:ctx.actor.id,p_document_id:parsed.data.documentId});
  if(error||!(data as{documentId?:string}|null)?.documentId)return NextResponse.json({error:'A feltöltött dokumentum nem aktiválható. Ellenőrizd, hogy a fájl feltöltése befejeződött.'},{status:409});
  return NextResponse.json({ok:true,document:data});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const ctx=await context(params);if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const documentId=new URL(request.url).searchParams.get('documentId'),parsed=z.string().uuid().safeParse(documentId);if(!parsed.success)return NextResponse.json({error:'Érvénytelen dokumentumazonosító.'},{status:400});
  const admin=createAdminClient(),{data:row,error:rowError}=await admin.from('order_customer_documents').select('id,storage_bucket,storage_path').eq('id',parsed.data).eq('instance_id',ctx.scope.instanceId).eq('order_id',ctx.orderId).maybeSingle();
  if(rowError)return NextResponse.json({error:'A dokumentum nem ellenőrizhető.'},{status:500});if(!row)return NextResponse.json({error:'A dokumentum nem található.'},{status:404});
  const{data,error}=await admin.rpc('admin_revoke_order_customer_document_v1',{p_instance_id:ctx.scope.instanceId,p_actor:ctx.actor.id,p_document_id:parsed.data});if(error||!(data as{documentId?:string}|null)?.documentId)return NextResponse.json({error:'A dokumentum hozzáférése nem vonható vissza.'},{status:409});
  const cleanup=await admin.storage.from(ORDER_DOCUMENT_BUCKET).remove([row.storage_path]);
  return NextResponse.json({ok:true,documentId:parsed.data,cleanupPending:Boolean(cleanup.error)});
}
