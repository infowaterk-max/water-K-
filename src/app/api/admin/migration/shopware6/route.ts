import{NextResponse}from'next/server';
import{z}from'zod';
import{createAdminClient}from'@/lib/supabase/admin';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{recordAdminAudit}from'@/lib/admin/audit';
import{assertPublicShopwareUrl,fetchShopwareStagePage,inspectShopware6,type ShopwareStageEntity}from'@/lib/migration/shopware6';

const runId=z.string().uuid();
const credentials=z.object({accessKeyId:z.string().trim().min(4).max(200),secretAccessKey:z.string().min(8).max(500)});
const body=z.discriminatedUnion('action',[
  z.object({action:z.literal('create'),sourceBaseUrl:z.string().trim().min(8).max(500)}),
  z.object({action:z.literal('inspect'),runId,...credentials.shape}),
  z.object({action:z.literal('stage'),runId,entity:z.enum(['catalog','categories','manufacturers','media','customers','orders','promotions']),page:z.number().int().min(1).max(100000).default(1),limit:z.number().int().min(1).max(100).default(100),...credentials.shape}),
  z.object({action:z.literal('preview'),runId}),
  z.object({action:z.literal('apply'),runId,limit:z.number().int().min(1).max(250).default(100)}),
  z.object({action:z.literal('validate'),runId}),
  z.object({action:z.literal('rollback'),runId}),
]);

type Admin=ReturnType<typeof createAdminClient>;
type RunRow={id:string;instance_id:string;organization_id:string;source_platform:string;source_base_url:string;source_summary:Record<string,any>|null;checkpoint:Record<string,any>|null;status:string;phase:string};
type RecordRow={id:string;entity_type:string;source_id:string;source_parent_id:string|null;normalized:Record<string,any>;status:string};
const chunks=<T,>(values:T[],size=500)=>Array.from({length:Math.ceil(values.length/size)},(_,i)=>values.slice(i*size,(i+1)*size));

async function authority(){
  const actor=await getAdminRequestUser('store.manage');if(!actor)return null;
  let scope;try{scope=await requireCurrentStoreContext('store.manage')}catch{return null}
  if(!scope.organizationId||!(await hasCurrentPlanFeature('importExport')))return null;
  return{actor,scope};
}
async function getRun(admin:Admin,id:string,instanceId:string){
  const{data,error}=await admin.from('migration_runs').select('*').eq('id',id).eq('instance_id',instanceId).eq('source_platform','shopware6').maybeSingle();
  if(error||!data)throw new Error('MIGRATION_RUN_NOT_FOUND');return data as RunRow;
}
async function setStatuses(admin:Admin,ids:string[],status:string){for(const part of chunks(ids))if(part.length){const{error}=await admin.from('migration_records').update({status,updated_at:new Date().toISOString()}).in('id',part);if(error)throw error}}

export async function GET(){
  const auth=await authority();if(!auth)return NextResponse.json({error:'Nincs jogosultság a migrációs asszisztenshez.'},{status:403});
  const admin=createAdminClient(),{scope}=auth;
  const{data:runs,error}=await admin.from('migration_runs').select('id,source_base_url,source_label,status,phase,source_summary,checkpoint,validation_summary,created_at,updated_at,applied_at,completed_at,rolled_back_at').eq('instance_id',scope.instanceId).eq('source_platform','shopware6').order('created_at',{ascending:false}).limit(20);
  if(error)return NextResponse.json({error:'A migrációk nem tölthetők be.'},{status:500});
  const ids=(runs??[]).map(r=>r.id);let records:any[]=[];let issues:any[]=[];
  if(ids.length){
    const[r,i]=await Promise.all([
      admin.from('migration_records').select('run_id,entity_type,status').eq('instance_id',scope.instanceId).in('run_id',ids).limit(10000),
      admin.from('migration_issues').select('run_id,severity,code,message,entity_type,source_id,created_at').eq('instance_id',scope.instanceId).in('run_id',ids).order('created_at',{ascending:false}).limit(1000),
    ]);if(r.error||i.error)return NextResponse.json({error:'A migrációs bizonyítékok nem tölthetők be.'},{status:500});records=r.data??[];issues=i.data??[];
  }
  return NextResponse.json({runs:(runs??[]).map(run=>({...run,recordCounts:records.filter(r=>r.run_id===run.id).reduce((acc:Record<string,number>,r:any)=>{const key=`${r.entity_type}:${r.status}`;acc[key]=(acc[key]??0)+1;return acc},{}),issues:issues.filter(i=>i.run_id===run.id).slice(0,50)}))});
}

export async function POST(request:Request){
  const auth=await authority();if(!auth)return NextResponse.json({error:'Nincs jogosultság a migrációs asszisztenshez.'},{status:403});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=body.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen migrációs kérés.'},{status:400});
  const admin=createAdminClient(),{actor,scope}=auth,now=new Date().toISOString();
  try{
    if(parsed.data.action==='create'){
      const sourceBaseUrl=await assertPublicShopwareUrl(parsed.data.sourceBaseUrl),sourceLabel=new URL(sourceBaseUrl).hostname;
      const{data,error}=await admin.from('migration_runs').insert({instance_id:scope.instanceId,organization_id:scope.organizationId,source_platform:'shopware6',source_base_url:sourceBaseUrl,source_label:sourceLabel,status:'draft',phase:'source',created_by:actor.id}).select('*').single();if(error)throw error;
      await recordAdminAudit({actorUserId:actor.id,action:'migration.run_created',entityType:'migration_run',entityId:data.id,organizationId:scope.organizationId,instanceId:scope.instanceId,summary:'Shopware 6 migráció létrehozva',afterState:{sourceBaseUrl,status:'draft'},metadata:{source_platform:'shopware6',credentials_persisted:false}});
      return NextResponse.json({run:data});
    }

    const run=await getRun(admin,parsed.data.runId,scope.instanceId);
    if(parsed.data.action==='inspect'){
      if(['applying','applied','completed','rolled_back'].includes(run.status))return NextResponse.json({error:'Ez a migráció ebben az állapotban nem vizsgálható újra.'},{status:409});
      const inspected=await inspectShopware6({baseUrl:run.source_base_url,accessKeyId:parsed.data.accessKeyId,secretAccessKey:parsed.data.secretAccessKey});
      const{data,error}=await admin.from('migration_runs').update({source_base_url:inspected.baseUrl,source_fingerprint:inspected.fingerprint,source_summary:inspected.summary,status:'inspected',phase:'inspect',updated_at:now}).eq('id',run.id).eq('instance_id',scope.instanceId).select('*').single();if(error)throw error;
      await recordAdminAudit({actorUserId:actor.id,action:'migration.source_inspected',entityType:'migration_run',entityId:run.id,organizationId:scope.organizationId,instanceId:scope.instanceId,summary:'Shopware 6 forrás ellenőrizve',afterState:inspected.summary,metadata:{source_platform:'shopware6',credentials_persisted:false}});
      return NextResponse.json({run:data,inspection:inspected.summary});
    }

    if(parsed.data.action==='stage'){
      if(!['inspected','staging','needs_attention','ready'].includes(run.status))return NextResponse.json({error:'A forrást előbb sikeresen ellenőrizni kell.'},{status:409});
      if(parsed.data.entity==='catalog'&&String(run.source_summary?.systemCurrency??'').toUpperCase()!=='HUF')return NextResponse.json({error:'Automatikus katalógus-alkalmazás csak HUF rendszerpénznemnél engedélyezett.'},{status:409});
      const result=await fetchShopwareStagePage({baseUrl:run.source_base_url,accessKeyId:parsed.data.accessKeyId,secretAccessKey:parsed.data.secretAccessKey},parsed.data.entity as ShopwareStageEntity,parsed.data.page,parsed.data.limit);
      const rows=result.records.map((record,index)=>({run_id:run.id,instance_id:scope.instanceId,organization_id:scope.organizationId,entity_type:record.entityType,source_id:record.sourceId,source_parent_id:record.sourceParentId,payload:record.payload,normalized:record.normalized,checksum:record.checksum,status:'staged',target_table:null,target_id:null,sequence_no:(parsed.data.page-1)*parsed.data.limit+index}));
      if(rows.length){const{error}=await admin.from('migration_records').upsert(rows,{onConflict:'run_id,entity_type,source_id'});if(error)throw error;}
      const checkpoint={...(run.checkpoint??{}),[parsed.data.entity]:{page:parsed.data.page,limit:parsed.data.limit,total:result.total,sourceRows:result.sourceRows,stagedRecords:rows.length,hasMore:result.hasMore,at:now}};
      const{error:updateError}=await admin.from('migration_runs').update({checkpoint,status:'staging',phase:'stage',updated_at:now}).eq('id',run.id).eq('instance_id',scope.instanceId);if(updateError)throw updateError;
      return NextResponse.json({ok:true,entity:parsed.data.entity,page:parsed.data.page,sourceRows:result.sourceRows,stagedRecords:rows.length,total:result.total,hasMore:result.hasMore,checkpoint});
    }

    if(parsed.data.action==='preview'){
      if(!['staging','inspected','needs_attention','ready'].includes(run.status))return NextResponse.json({error:'Ebben az állapotban nem készíthető új előnézet.'},{status:409});
      const{data:records,error:recordError}=await admin.from('migration_records').select('id,entity_type,source_id,source_parent_id,normalized,status').eq('run_id',run.id).eq('instance_id',scope.instanceId).limit(10000);if(recordError)throw recordError;
      if(!records?.length)return NextResponse.json({error:'Még nincs stagingelt adat.'},{status:409});
      const typed=records as RecordRow[],products=typed.filter(r=>r.entity_type==='product'),variants=typed.filter(r=>r.entity_type==='variant');
      const productSources=new Set(products.map(r=>r.source_id));
      const{data:links,error:linkError}=await admin.from('migration_external_links').select('entity_type,source_id,target_id').eq('instance_id',scope.instanceId).eq('source_platform','shopware6');if(linkError)throw linkError;
      const linkMap=new Map((links??[]).map((l:any)=>[`${l.entity_type}:${l.source_id}`,String(l.target_id)]));
      const slugs=products.map(r=>String(r.normalized.slug??'')).filter(Boolean),skus=variants.map(r=>String(r.normalized.sku??'')).filter(Boolean);
      const[targetProducts,targetVariants]=await Promise.all([
        slugs.length?admin.from('products').select('id,slug').eq('instance_id',scope.instanceId).in('slug',slugs):Promise.resolve({data:[],error:null}),
        skus.length?admin.from('product_variants').select('id,sku').eq('instance_id',scope.instanceId).in('sku',skus):Promise.resolve({data:[],error:null}),
      ]);if(targetProducts.error||targetVariants.error)throw targetProducts.error??targetVariants.error;
      const slugOwner=new Map((targetProducts.data??[]).map((r:any)=>[r.slug,String(r.id)])),skuOwner=new Map((targetVariants.data??[]).map((r:any)=>[r.sku,String(r.id)]));
      const duplicate=(values:string[])=>{const seen=new Set<string>(),dupes=new Set<string>();for(const v of values){if(seen.has(v))dupes.add(v);seen.add(v)}return dupes};
      const duplicateSlugs=duplicate(slugs),duplicateSkus=duplicate(skus),issues:any[]=[],ready:string[]=[],errors:string[]=[],deferred:string[]=[];
      for(const record of typed){
        const n=record.normalized??{};let blocked=false;
        const add=(code:string,message:string)=>{issues.push({run_id:run.id,instance_id:scope.instanceId,organization_id:scope.organizationId,severity:'error',code,entity_type:record.entity_type,source_id:record.source_id,message,details:{}});blocked=true};
        if(record.entity_type==='product'){
          const name=String(n.name??'').trim(),slug=String(n.slug??'').trim();if(!name)add('PRODUCT_NAME_REQUIRED','A terméknév hiányzik.');if(!slug)add('PRODUCT_SLUG_REQUIRED','A cél slug hiányzik.');if(duplicateSlugs.has(slug))add('SOURCE_SLUG_DUPLICATE','A Shopware forrásból több termék ugyanarra a slugra normalizálódik.');
          const linked=linkMap.get(`product:${record.source_id}`),owner=slugOwner.get(slug);if(owner&&owner!==linked)add('TARGET_SLUG_CONFLICT','A cél webshopban már más termék használja ezt a slugot.');
        }else if(record.entity_type==='variant'){
          const sku=String(n.sku??'').trim(),parent=String(n.productSourceId??'').trim(),net=Number(n.netPriceHuf),gross=Number(n.grossPriceHuf),stock=Number(n.stock);
          if(!sku)add('VARIANT_SKU_REQUIRED','A variáns cikkszáma hiányzik.');if(!parent||(!productSources.has(parent)&&!linkMap.has(`product:${parent}`)))add('VARIANT_PARENT_MISSING','A variáns szülőterméke nincs stagingelve vagy korábban összekapcsolva.');if(!Number.isInteger(net)||net<0||!Number.isInteger(gross)||gross<0)add('VARIANT_PRICE_INVALID','A variáns HUF ára érvénytelen.');if(!Number.isInteger(stock)||stock<0)add('VARIANT_STOCK_INVALID','A készlet érvénytelen.');if(duplicateSkus.has(sku))add('SOURCE_SKU_DUPLICATE','A Shopware forrásban duplikált cél SKU található.');
          const linked=linkMap.get(`variant:${record.source_id}`),owner=skuOwner.get(sku);if(owner&&owner!==linked)add('TARGET_SKU_CONFLICT','A cél webshopban már más variáns használja ezt az SKU-t.');
        }else{
          issues.push({run_id:run.id,instance_id:scope.instanceId,organization_id:scope.organizationId,severity:'warning',code:'TARGET_WRITE_DEFERRED',entity_type:record.entity_type,source_id:record.source_id,message:'Az adat stagingben megőrződött, de a jelenlegi Shoporation célmodellbe nem írjuk automatikusan.',details:{reason:record.entity_type==='customer'?'auth_identity_not_auto_created':'lossless_target_mapping_unavailable'}});deferred.push(record.id);continue;
        }
        (blocked?errors:ready).push(record.id);
      }
      const{error:deleteIssueError}=await admin.from('migration_issues').delete().eq('run_id',run.id).eq('instance_id',scope.instanceId);if(deleteIssueError)throw deleteIssueError;
      for(const part of chunks(issues,400)){if(part.length){const{error}=await admin.from('migration_issues').insert(part);if(error)throw error}}
      await Promise.all([setStatuses(admin,ready,'ready'),setStatuses(admin,errors,'error'),setStatuses(admin,deferred,'deferred')]);
      const summary={records:typed.length,ready:ready.length,errors:errors.length,deferred:deferred.length,warnings:issues.filter(i=>i.severity==='warning').length};
      const{error:runError}=await admin.from('migration_runs').update({status:errors.length?'needs_attention':'ready',phase:'preview',validation_summary:summary,updated_at:now}).eq('id',run.id).eq('instance_id',scope.instanceId);if(runError)throw runError;
      await recordAdminAudit({actorUserId:actor.id,action:'migration.preview_completed',entityType:'migration_run',entityId:run.id,organizationId:scope.organizationId,instanceId:scope.instanceId,summary:'Shopware 6 migrációs előnézet elkészült',afterState:summary,metadata:{source_platform:'shopware6'}});
      return NextResponse.json({ok:errors.length===0,summary,issues:issues.slice(0,100)});
    }

    if(parsed.data.action==='apply'){
      const{data,error}=await admin.rpc('apply_shopware6_catalog_migration_v1',{p_run_id:run.id,p_instance_id:scope.instanceId,p_actor:actor.id,p_limit:parsed.data.limit});if(error)return NextResponse.json({error:'A migrációs batch megszakadt; az adott batch minden célírása vissza lett vonva.',code:error.message},{status:409});return NextResponse.json(data);
    }

    if(parsed.data.action==='validate'){
      const{data:records,error}=await admin.from('migration_records').select('entity_type,status,target_id').eq('run_id',run.id).eq('instance_id',scope.instanceId).limit(10000);if(error)throw error;
      const catalog=(records??[]).filter((r:any)=>['product','variant'].includes(r.entity_type)),blocking=catalog.filter((r:any)=>r.status!=='applied').length,applied=catalog.filter((r:any)=>r.status==='applied'&&r.target_id).length;
      if(blocking)return NextResponse.json({error:'A katalógus migráció még nem teljes; maradt nem alkalmazott vagy hibás rekord.',blocking},{status:409});
      const summary={catalogRecords:catalog.length,applied,deferred:(records??[]).filter((r:any)=>r.status==='deferred').length,validatedAt:now};
      if(!['applied','completed'].includes(run.status))return NextResponse.json({error:'A migrációt előbb teljesen alkalmazni kell.'},{status:409});
      const{data:validatedRun,error:updateError}=await admin.from('migration_runs').update({status:'completed',phase:'validate',validation_summary:summary,completed_at:now,updated_at:now}).eq('id',run.id).eq('instance_id',scope.instanceId).in('status',['applied','completed']).select('id').maybeSingle();if(updateError)throw updateError;if(!validatedRun)throw new Error('MIGRATION_VALIDATE_STATE_CHANGED');
      await recordAdminAudit({actorUserId:actor.id,action:'migration.validated',entityType:'migration_run',entityId:run.id,organizationId:scope.organizationId,instanceId:scope.instanceId,summary:'Shopware 6 migráció validálva',afterState:summary,metadata:{source_platform:'shopware6'}});
      return NextResponse.json({ok:true,summary});
    }

    const{data,error}=await admin.rpc('rollback_shopware6_catalog_migration_v1',{p_run_id:run.id,p_instance_id:scope.instanceId,p_actor:actor.id});if(error)return NextResponse.json({error:'A biztonságos visszaállítás nem hajtható végre. A rendszer nem írta felül a migráció óta módosított céladatot.',code:error.message},{status:409});return NextResponse.json(data);
  }catch(error){
    console.error('shopware migration assistant error',error instanceof Error?error.message:'unknown');
    const code=error instanceof Error?error.message:'MIGRATION_FAILED';
    const status=code.startsWith('SHOPWARE_')?400:500;
    return NextResponse.json({error:status===400?'A Shopware kapcsolat vagy forrásadat ellenőrzése nem sikerült.':'A migrációs művelet nem sikerült.',code},{status});
  }
}
