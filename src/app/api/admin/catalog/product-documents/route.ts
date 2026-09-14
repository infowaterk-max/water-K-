import{randomUUID}from'node:crypto';
import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{PRODUCT_DOCUMENT_BUCKET}from'@/lib/commerce/product-documents';

const mediaTypes=['application/pdf','image/jpeg','image/png','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']as const;
const kindSchema=z.enum(['manual','datasheet','size_guide','warranty_info','compatibility','installation_guide','other']);
const createSchema=z.object({
  productId:z.string().uuid(),variantId:z.string().uuid().nullable().optional(),kind:kindSchema,title:z.string().trim().min(1).max(200),description:z.string().trim().max(2000).optional(),sortOrder:z.number().int().min(0).max(10000).default(0),visibility:z.enum(['public','account']).default('account'),fileName:z.string().trim().min(1).max(255),mediaType:z.enum(mediaTypes),sizeBytes:z.number().int().min(1).max(26214400),
});
const activateSchema=z.object({documentId:z.string().uuid()});
const uuid=z.string().uuid();
function safeFileName(value:string){const parts=value.split('.'),ext=parts.length>1?parts.pop()!.replace(/[^a-zA-Z0-9]/g,'').slice(0,12):'',base=parts.join('.').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'document';return ext?`${base}.${ext.toLowerCase()}`:base}

async function context(){const actor=await getAdminRequestUser('catalog.manage');if(!actor)return null;try{return{actor,scope:await requireCurrentStoreContext('catalog.manage')}}catch{return null}}

export async function GET(request:Request){
  const ctx=await context();if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const productId=new URL(request.url).searchParams.get('productId'),parsed=uuid.safeParse(productId);if(!parsed.success)return NextResponse.json({error:'Érvénytelen termékazonosító.'},{status:400});
  const admin=createAdminClient(),{data,error}=await admin.rpc('admin_list_product_documents_v1',{p_instance_id:ctx.scope.instanceId,p_actor:ctx.actor.id,p_product_id:parsed.data});
  if(error)return NextResponse.json({error:'A termékdokumentumok nem tölthetők be.'},{status:503});
  return NextResponse.json({documents:Array.isArray(data)?data:[]});
}

export async function POST(request:Request){
  const ctx=await context();if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=createSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'A dokumentum adatai érvénytelenek.'},{status:400});
  const admin=createAdminClient(),documentId=randomUUID(),path=`${ctx.scope.instanceId}/${parsed.data.productId}/${documentId}-${safeFileName(parsed.data.fileName)}`;
  const{data,error}=await admin.rpc('admin_prepare_product_document_v1',{p_instance_id:ctx.scope.instanceId,p_actor:ctx.actor.id,p_document_id:documentId,p_product_id:parsed.data.productId,p_variant_id:parsed.data.variantId??null,p_kind:parsed.data.kind,p_title:parsed.data.title,p_description:parsed.data.description??'',p_sort_order:parsed.data.sortOrder,p_visibility:parsed.data.visibility,p_storage_path:path,p_original_name:parsed.data.fileName,p_media_type:parsed.data.mediaType,p_size_bytes:parsed.data.sizeBytes,p_checksum_sha256:null});
  const prepared=(data??{})as{documentId?:string;bucket?:string;path?:string;status?:string};
  if(error||prepared.documentId!==documentId||prepared.bucket!==PRODUCT_DOCUMENT_BUCKET||prepared.path!==path||prepared.status!=='pending')return NextResponse.json({error:'A termékdokumentum feltöltése nem készíthető elő biztonságosan.'},{status:409});
  const signed=await admin.storage.from(PRODUCT_DOCUMENT_BUCKET).createSignedUploadUrl(path,{upsert:false});
  if(signed.error||!signed.data?.token){await admin.rpc('admin_revoke_product_document_v1',{p_instance_id:ctx.scope.instanceId,p_actor:ctx.actor.id,p_document_id:documentId});return NextResponse.json({error:'A privát feltöltési cím nem hozható létre.'},{status:503})}
  return NextResponse.json({documentId,bucket:PRODUCT_DOCUMENT_BUCKET,path,token:signed.data.token});
}

export async function PATCH(request:Request){
  const ctx=await context();if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=activateSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen dokumentumazonosító.'},{status:400});
  const admin=createAdminClient(),{data,error}=await admin.rpc('admin_activate_product_document_v1',{p_instance_id:ctx.scope.instanceId,p_actor:ctx.actor.id,p_document_id:parsed.data.documentId});
  if(error||!(data as{documentId?:string;status?:string}|null)?.documentId)return NextResponse.json({error:'A feltöltött termékdokumentum nem aktiválható. Ellenőrizd, hogy a fájl feltöltése befejeződött.'},{status:409});
  return NextResponse.json({ok:true,document:data});
}

export async function DELETE(request:Request){
  const ctx=await context();if(!ctx)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const documentId=new URL(request.url).searchParams.get('documentId'),parsed=uuid.safeParse(documentId);if(!parsed.success)return NextResponse.json({error:'Érvénytelen dokumentumazonosító.'},{status:400});
  const admin=createAdminClient(),{data,error}=await admin.rpc('admin_revoke_product_document_v1',{p_instance_id:ctx.scope.instanceId,p_actor:ctx.actor.id,p_document_id:parsed.data});
  const revoked=(data??{})as{documentId?:string;bucket?:string;path?:string;status?:string};if(error||revoked.documentId!==parsed.data||revoked.bucket!==PRODUCT_DOCUMENT_BUCKET||!revoked.path||revoked.status!=='revoked')return NextResponse.json({error:'A termékdokumentum nem vonható vissza.'},{status:409});
  const cleanup=await admin.storage.from(PRODUCT_DOCUMENT_BUCKET).remove([revoked.path]);
  return NextResponse.json({ok:true,documentId:parsed.data,cleanupPending:Boolean(cleanup.error)});
}
