import{createHash}from'node:crypto';
import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{
  catalogCsvHeaders,parseCatalogCsv,parseCatalogOnboardingCsv,suggestCatalogOnboardingMapping,
  type CatalogChange,type CatalogOnboardingMapping
}from'@/lib/catalog-import';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const change=z.object({id:z.string().uuid(),stock:z.number().int().min(0).max(100000).optional(),grossPrice:z.number().int().min(0).max(10000000).optional(),netPrice:z.number().int().min(0).max(10000000).optional(),active:z.boolean().optional()}).refine(v=>Object.keys(v).length>1,'Nincs módosítás.');
const header=z.string().trim().min(1).max(200),idempotencyKey=z.string().trim().min(16).max(120);
const mapping=z.object({
  name:header,sku:header,netPrice:header,grossPrice:header,
  slug:header.optional(),stock:header.optional(),category:header.optional(),attributes:header.optional(),
  shortDescription:header.optional(),description:header.optional(),variantLabel:header.optional(),seoTitle:header.optional(),seoDescription:header.optional()
});
const body=z.discriminatedUnion('mode',[
  z.object({mode:z.literal('preview'),csv:z.string().min(1).max(1000000)}),
  z.object({mode:z.literal('apply'),changes:z.array(change).min(1).max(500)}),
  z.object({mode:z.literal('headers'),csv:z.string().min(1).max(1000000)}),
  z.object({mode:z.literal('onboardingPreview'),csv:z.string().min(1).max(1000000),mapping,idempotencyKey,sourceType:z.enum(['csv','xlsx']).default('csv')}),
  z.object({mode:z.literal('onboardingApply'),batchId:z.string().uuid()})
]);

export async function POST(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;
  try{scope=await requireCurrentStoreContext('catalog.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  let raw:unknown;
  try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=body.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen importadat.'},{status:400});
  const admin=createAdminClient();

  if(parsed.data.mode==='headers'){
    const headers=catalogCsvHeaders(parsed.data.csv);
    if(!headers.length)return NextResponse.json({error:'A CSV fejléc nem olvasható.'},{status:400});
    return NextResponse.json({headers,suggestedMapping:suggestCatalogOnboardingMapping(headers)});
  }

  if(parsed.data.mode==='onboardingPreview'){
    const rows=parseCatalogOnboardingCsv(parsed.data.csv,parsed.data.mapping as CatalogOnboardingMapping);
    if(!rows.length)return NextResponse.json({error:'Az import nem tartalmaz importálható adatsort.'},{status:400});
    if(rows.length>500)return NextResponse.json({error:'Egy onboarding import legfeljebb 500 adatsort tartalmazhat.'},{status:400});
    const candidates=rows.flatMap(row=>row.draft?[row.draft]:[]),skus=candidates.map(row=>row.sku),slugs=candidates.map(row=>row.slug);
    const[{data:variants,error:variantError},{data:products,error:productError}]=await Promise.all([
      skus.length?admin.from('product_variants').select('sku').eq('instance_id',scope.instanceId).in('sku',skus):Promise.resolve({data:[]as{sku:string}[],error:null}),
      slugs.length?admin.from('products').select('slug').eq('instance_id',scope.instanceId).in('slug',slugs):Promise.resolve({data:[]as{slug:string}[],error:null})
    ]);
    if(variantError||productError)return NextResponse.json({error:'A meglévő katalógus ütközésvizsgálata nem sikerült.'},{status:500});
    const existingSkus=new Set((variants??[]).map(row=>String(row.sku).toLowerCase())),existingSlugs=new Set((products??[]).map(row=>String(row.slug)));
    const preview=rows.map(row=>{
      if(row.error||!row.draft)return{line:row.line,status:'error' as const,message:row.error??'Érvénytelen sor.'};
      if(existingSkus.has(row.draft.sku.toLowerCase()))return{line:row.line,status:'error' as const,name:row.draft.name,sku:row.draft.sku,slug:row.draft.slug,message:'Ez az SKU már létezik ebben a webshopban.'};
      if(existingSlugs.has(row.draft.slug))return{line:row.line,status:'error' as const,name:row.draft.name,sku:row.draft.sku,slug:row.draft.slug,message:'Ez a slug már létezik ebben a webshopban.'};
      return{line:row.line,status:'ready' as const,name:row.draft.name,sku:row.draft.sku,slug:row.draft.slug,category:row.draft.category??null};
    });
    const validLines=new Set(preview.filter(row=>row.status==='ready').map(row=>row.line));
    const applyPlan=candidates.filter(row=>validLines.has(row.line));
    const payloadHash=createHash('sha256').update(JSON.stringify({sourceType:parsed.data.sourceType,csv:parsed.data.csv,mapping:parsed.data.mapping})).digest('hex');
    const{data:existing,error:existingError}=await admin.from('catalog_onboarding_batches').select('id,source_type,payload_hash,state,preview_rows,apply_plan,error_count,result').eq('instance_id',scope.instanceId).eq('idempotency_key',parsed.data.idempotencyKey).maybeSingle();
    if(existingError)return NextResponse.json({error:'Az import-előnézet állapota nem ellenőrizhető.'},{status:500});
    if(existing){
      if(existing.payload_hash!==payloadHash||existing.source_type!==parsed.data.sourceType)return NextResponse.json({error:'Az idempotenciakulcs már más import-előnézethez tartozik.'},{status:409});
      return NextResponse.json({batchId:existing.id,preview:existing.preview_rows,validCount:Array.isArray(existing.apply_plan)?existing.apply_plan.length:0,errorCount:existing.error_count,applied:existing.state==='applied',result:existing.result,sourceType:existing.source_type});
    }
    const{data:created,error:createError}=await admin.from('catalog_onboarding_batches').insert({
      instance_id:scope.instanceId,created_by:actor.id,source_type:parsed.data.sourceType,idempotency_key:parsed.data.idempotencyKey,payload_hash:payloadHash,
      preview_rows:preview,apply_plan:applyPlan,error_count:preview.filter(row=>row.status==='error').length
    }).select('id').single();
    if(createError||!created)return NextResponse.json({error:'Az import-előnézet nem rögzíthető biztonságosan. Ismételd meg ugyanazzal a fájllal.'},{status:409});
    return NextResponse.json({batchId:created.id,preview,validCount:applyPlan.length,errorCount:preview.filter(row=>row.status==='error').length,applied:false,sourceType:parsed.data.sourceType});
  }

  if(parsed.data.mode==='onboardingApply'){
    const{data,error}=await admin.rpc('apply_catalog_onboarding_batch_v1',{p_instance_id:scope.instanceId,p_batch_id:parsed.data.batchId,p_actor:actor.id});
    if(error)return NextResponse.json({error:'Az onboarding tranzakció megszakadt. Piszkozatot csak teljes, igazolt tranzakcióból tekintünk létrehozottnak.'},{status:409});
    const result=Array.isArray(data)?data:[];
    return NextResponse.json({ok:true,count:result.length,result});
  }

  if(parsed.data.mode==='preview'){
    const rows=parseCatalogCsv(parsed.data.csv);
    if(!rows.length)return NextResponse.json({error:'A CSV nem tartalmaz importálható adatsort.'},{status:400});
    const ids=rows.filter(r=>!r.error).map(r=>r.change.id);
    const{data,error}=ids.length
      ?await admin.from('product_variants').select('id,sku,stock_quantity,gross_price_huf,net_price_huf,active').eq('instance_id',scope.instanceId).in('id',ids)
      :{data:[]as any[],error:null};

    if(error)return NextResponse.json({error:'A termékadatok ellenőrzése nem sikerült.'},{status:500});
    const current=new Map((data??[]).map((r:any)=>[r.id,r]));
    const preview=rows.map(row=>{
      if(row.error)return{line:row.line,id:row.change.id,status:'error',message:row.error};
      const before=current.get(row.change.id);
      if(!before)return{line:row.line,id:row.change.id,status:'error',message:'A termék nem található ebben a webshopban.'};
      const after={stock:row.change.stock??before.stock_quantity,grossPrice:row.change.grossPrice??before.gross_price_huf,netPrice:row.change.netPrice??before.net_price_huf,active:row.change.active??before.active};
      const changed=after.stock!==before.stock_quantity||after.grossPrice!==before.gross_price_huf||after.netPrice!==before.net_price_huf||after.active!==before.active;
      return{line:row.line,id:row.change.id,sku:before.sku,status:changed?'change':'same',before:{stock:before.stock_quantity,grossPrice:before.gross_price_huf,netPrice:before.net_price_huf,active:before.active},after,change:row.change};
    });
    const validChanges=preview.filter((r:any)=>r.status==='change').map((r:any)=>r.change as CatalogChange);
    return NextResponse.json({preview,validChanges,errors:preview.filter((r:any)=>r.status==='error').length});
  }

  const{data,error}=await admin.rpc('bulk_update_product_variants_v3',{
    p_instance_id:scope.instanceId,
    p_changes:parsed.data.changes,
    p_actor:actor.id,
    p_audit_action:'catalog.csv_import_applied',
    p_audit_summary:`CSV import alkalmazva: ${parsed.data.changes.length} tétel`,
    p_audit_metadata:{count:parsed.data.changes.length}
  });
  if(error)return NextResponse.json({error:'Az import tranzakció megszakadt. A módosítás és az audit együtt vissza lett vonva.'},{status:409});
  const evidence=Array.isArray(data)?data as{id?:string}[]:[],expectedIds=new Set(parsed.data.changes.map(c=>c.id)),evidenceIds=new Set(evidence.map(r=>r.id).filter((id):id is string=>Boolean(id)));
  if(evidence.length!==parsed.data.changes.length||evidenceIds.size!==expectedIds.size||[...expectedIds].some(id=>!evidenceIds.has(id)))return NextResponse.json({error:'Az import eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,count:parsed.data.changes.length,result:data});
}
