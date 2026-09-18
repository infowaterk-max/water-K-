import{NextResponse}from'next/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{createPilotAcceptanceToken,PILOT_ACCEPTANCE_COOKIE}from'@/lib/storefront/pilot-access';
import{createStorefrontVisualBuilderComponentRegistry}from'@/lib/builder/storefront-builder-registry';
import{composeStorefrontDigitalCommerceTemplatePackage}from'@/lib/builder/storefront-digital-commerce-composition';
import{planStorefrontTemplateInstallation,type StorefrontExistingTemplatePage}from'@/lib/builder/storefront-template-installation';
import{hashStorefrontPageDocument}from'@/lib/builder/storefront-persistence';
import{PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE}from'@/lib/builder/templates/playroom-v19-canonical';
import{PLAYROOM_V20_TEMPLATE_PACKAGE}from'@/lib/builder/templates/playroom-v20';
import{PLANS}from'@/lib/plans/catalog';

export const dynamic='force-dynamic';

const EXPECTED_STAGING_URL='https://rfuvzgumbardvbvqjxdq.supabase.co';
const EXPECTED_BRANCH='feature/playroom-v20-functional-acceptance';
const INSTANCE_ID='6027c79a-e5f3-4c9c-a8d0-b6090958efde';
const ACTOR_ID='f6ee71eb-8c50-4d85-bcd9-743a3cc8a7ef';

const json=async(response:Response)=>{try{return await response.json() as Record<string,unknown>}catch{return{}}};
const errorMessage=(error:unknown)=>error instanceof Error?error.message:String(error);
const capability={plan:'alap' as const,features:PLANS.alap.features};
const registry=createStorefrontVisualBuilderComponentRegistry();

async function persistPlan(admin:ReturnType<typeof createAdminClient>,plan:ReturnType<typeof planStorefrontTemplateInstallation>,operationKey:string){
  const{data,error}=await admin.rpc('save_storefront_template_drafts_v1',{
    p_instance_id:INSTANCE_ID,
    p_actor_user_id:ACTOR_ID,
    p_template_key:plan.templateKey,
    p_template_version:plan.templateVersion,
    p_pages:plan.pages.map(page=>({
      pageKey:page.pageKey,
      pageType:page.pageType,
      schemaVersion:page.document.schemaVersion,
      document:page.document,
      documentSha256:hashStorefrontPageDocument(page.document),
      expectedDraftRevision:page.expectedDraftRevision,
    })),
    p_operation_key:operationKey,
  });
  if(error)throw error;
  return(data??{})as Record<string,unknown>;
}

async function readExistingPages(admin:ReturnType<typeof createAdminClient>):Promise<StorefrontExistingTemplatePage[]>{
  const{data:pages,error}=await admin.from('storefront_pages')
    .select('id,page_key,page_type,draft_revision_id,published_revision_id')
    .eq('instance_id',INSTANCE_ID).order('page_key');
  if(error)throw error;
  const revisionIds=[...new Set((pages??[]).flatMap(page=>[page.draft_revision_id,page.published_revision_id]).filter((value):value is string=>typeof value==='string'))];
  const{data:revisions,error:revisionError}=revisionIds.length
    ?await admin.from('storefront_page_revisions').select('id,revision_number,template_key,template_version').eq('instance_id',INSTANCE_ID).in('id',revisionIds)
    :{data:[],error:null};
  if(revisionError)throw revisionError;
  const byId=new Map((revisions??[]).map(row=>[row.id,row]));
  return(pages??[]).map(page=>{
    const draft=page.draft_revision_id?byId.get(page.draft_revision_id):undefined;
    const published=page.published_revision_id?byId.get(page.published_revision_id):undefined;
    return{
      pageKey:page.page_key,
      pageType:page.page_type as StorefrontExistingTemplatePage['pageType'],
      draftRevision:draft?.revision_number??null,
      draftTemplateKey:draft?.template_key??null,
      draftTemplateVersion:draft?.template_version??null,
      publishedTemplateKey:published?.template_key??null,
      publishedTemplateVersion:published?.template_version??null,
    };
  });
}

async function storefrontEvidence(admin:ReturnType<typeof createAdminClient>){
  const{data:pages,error}=await admin.from('storefront_pages')
    .select('id,page_key,page_type,draft_revision_id,published_revision_id')
    .eq('instance_id',INSTANCE_ID).order('page_key');
  if(error)throw error;
  const draftIds=(pages??[]).map(page=>page.draft_revision_id).filter((value):value is string=>typeof value==='string');
  const{data:revisions,error:revisionError}=draftIds.length
    ?await admin.from('storefront_page_revisions').select('id,revision_number,kind,template_key,template_version,operation_key').eq('instance_id',INSTANCE_ID).in('id',draftIds)
    :{data:[],error:null};
  if(revisionError)throw revisionError;
  const byId=new Map((revisions??[]).map(row=>[row.id,row]));
  return{
    pageCount:(pages??[]).length,
    publishedCount:(pages??[]).filter(page=>page.published_revision_id).length,
    allDrafts:(pages??[]).every(page=>Boolean(page.draft_revision_id)),
    allTemplate19:(pages??[]).every(page=>byId.get(page.draft_revision_id??'')?.template_key==='gaming.playroom'&&byId.get(page.draft_revision_id??'')?.template_version===19),
    allTemplate20:(pages??[]).every(page=>byId.get(page.draft_revision_id??'')?.template_key==='gaming.playroom'&&byId.get(page.draft_revision_id??'')?.template_version===20),
    revisions:(pages??[]).map(page=>byId.get(page.draft_revision_id??'')?.revision_number??null),
  };
}

async function cleanup(admin:ReturnType<typeof createAdminClient>,input:{supportEmail:string;newsletterEmail:string;startedAt:string}){
  const{data:tickets}=await admin.from('support_tickets').select('id').eq('email',input.supportEmail);
  const ticketIds=(tickets??[]).map(row=>row.id);
  if(ticketIds.length)await admin.from('support_ticket_messages').delete().in('ticket_id',ticketIds);
  if(ticketIds.length)await admin.from('support_tickets').delete().in('id',ticketIds);
  await admin.from('marketing_consents').delete().eq('email',input.newsletterEmail).eq('source','a4_playroom_acceptance');

  const{data:pages}=await admin.from('storefront_pages').select('id').eq('instance_id',INSTANCE_ID);
  const pageIds=(pages??[]).map(row=>row.id);
  if(pageIds.length){
    await admin.from('storefront_pages').update({draft_revision_id:null,published_revision_id:null}).in('id',pageIds);
    await admin.from('storefront_page_revisions').delete().eq('instance_id',INSTANCE_ID);
    await admin.from('storefront_pages').delete().in('id',pageIds);
  }
  await admin.from('admin_audit_log').delete()
    .eq('instance_id',INSTANCE_ID).eq('actor_user_id',ACTOR_ID).gte('created_at',input.startedAt)
    .in('action',['storefront.page_draft_saved','storefront.template_drafts_materialized']);

  const[{count:supportCount},{count:newsletterCount},{count:pageCount}]=await Promise.all([
    admin.from('support_tickets').select('id',{count:'exact',head:true}).eq('email',input.supportEmail),
    admin.from('marketing_consents').select('id',{count:'exact',head:true}).eq('email',input.newsletterEmail).eq('source','a4_playroom_acceptance'),
    admin.from('storefront_pages').select('id',{count:'exact',head:true}).eq('instance_id',INSTANCE_ID),
  ]);
  return{supportCount:supportCount??0,newsletterCount:newsletterCount??0,storefrontPageCount:pageCount??0};
}

export async function GET(request:Request){
  if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!==EXPECTED_BRANCH)return new NextResponse(null,{status:404});
  if((process.env.NEXT_PUBLIC_SUPABASE_URL??'').replace(/\/$/,'')!==EXPECTED_STAGING_URL)return new NextResponse(null,{status:404});
  const commitProof=request.headers.get('x-shoperation-acceptance-proof')??'';
  if(!/^[a-f0-9]{40}$/.test(commitProof)||commitProof!==(process.env.VERCEL_GIT_COMMIT_SHA??''))return new NextResponse(null,{status:404});

  const startedAt=new Date().toISOString();
  const tag=commitProof.slice(0,12);
  const supportEmail=`a4-support-${tag}@example.invalid`;
  const newsletterEmail=`a4-newsletter-${tag}@example.invalid`;
  const supportSubject=`A4 Playroom acceptance ${tag}`;
  const admin=createAdminClient();
  let cleanupEvidence={supportCount:-1,newsletterCount:-1,storefrontPageCount:-1};

  try{
    const[{count:pagePreflight},{count:orderBefore},{count:productBefore}]=await Promise.all([
      admin.from('storefront_pages').select('id',{count:'exact',head:true}).eq('instance_id',INSTANCE_ID),
      admin.from('orders').select('id',{count:'exact',head:true}).eq('instance_id',INSTANCE_ID),
      admin.from('products').select('id',{count:'exact',head:true}).eq('instance_id',INSTANCE_ID),
    ]);
    if((pagePreflight??0)!==0)return NextResponse.json({ok:false,errorCode:'A4_STOREFRONT_PREFLIGHT_NOT_EMPTY',count:pagePreflight},{status:409});

    const pilotToken=createPilotAcceptanceToken(INSTANCE_ID);
    const bypass=request.headers.get('x-vercel-protection-bypass')??'';
    const commonHeaders:Record<string,string>={
      'content-type':'application/json',
      'cookie':`${PILOT_ACCEPTANCE_COOKIE}=${encodeURIComponent(pilotToken)}`,
    };
    if(bypass)commonHeaders['x-vercel-protection-bypass']=bypass;

    const supportBody={name:'A4 Acceptance',email:supportEmail,orderNumber:'',category:'other',subject:supportSubject,message:'Playroom v20 protected preview acceptance message.',website:''};
    const supportFirst=await fetch(new URL('/api/support',request.url),{method:'POST',headers:commonHeaders,body:JSON.stringify(supportBody),cache:'no-store'});
    const supportFirstBody=await json(supportFirst);
    const supportSecond=await fetch(new URL('/api/support',request.url),{method:'POST',headers:commonHeaders,body:JSON.stringify(supportBody),cache:'no-store'});
    const supportSecondBody=await json(supportSecond);
    if(supportFirst.status!==201||supportSecond.status!==429)throw new Error(`A4_SUPPORT_HTTP_FAILED:${supportFirst.status}:${supportSecond.status}`);

    const newsletterBody={email:newsletterEmail,consent:true,source:'a4_playroom_acceptance'};
    const newsletterFirst=await fetch(new URL('/api/marketing/newsletter',request.url),{method:'POST',headers:commonHeaders,body:JSON.stringify(newsletterBody),cache:'no-store'});
    const newsletterFirstBody=await json(newsletterFirst);
    const newsletterSecond=await fetch(new URL('/api/marketing/newsletter',request.url),{method:'POST',headers:commonHeaders,body:JSON.stringify(newsletterBody),cache:'no-store'});
    const newsletterSecondBody=await json(newsletterSecond);
    if(newsletterFirst.status!==201||newsletterSecond.status!==200||newsletterFirstBody.duplicate!==false||newsletterSecondBody.duplicate!==true){
      throw new Error(`A4_NEWSLETTER_HTTP_FAILED:${newsletterFirst.status}:${newsletterSecond.status}`);
    }

    const[{data:supportRows,error:supportError},{data:newsletterRows,error:newsletterError}]=await Promise.all([
      admin.from('support_tickets').select('id,instance_id,ticket_number,email,subject').eq('email',supportEmail).eq('subject',supportSubject),
      admin.from('marketing_consents').select('id,instance_id,email,status,source').eq('email',newsletterEmail).eq('source','a4_playroom_acceptance'),
    ]);
    if(supportError||newsletterError)throw supportError??newsletterError??new Error('A4_PUBLIC_EVIDENCE_QUERY_FAILED');
    if((supportRows??[]).length!==1||(newsletterRows??[]).length!==1)throw new Error('A4_PUBLIC_EVIDENCE_CARDINALITY_FAILED');
    const publicInstanceId=supportRows![0]!.instance_id;
    if(newsletterRows![0]!.instance_id!==publicInstanceId)throw new Error('A4_PUBLIC_TENANT_MISMATCH');

    const v19=composeStorefrontDigitalCommerceTemplatePackage(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE);
    const v19Plan=planStorefrontTemplateInstallation({template:v19,componentRegistry:registry,capability});
    if(!v19Plan.gate.ok||v19Plan.mode!=='install'||v19Plan.pages.length!==14)throw new Error('A4_V19_INSTALL_PLAN_INVALID');
    const v19Result=await persistPlan(admin,v19Plan,`a4-playroom-${tag}-v19`);
    const v19Evidence=await storefrontEvidence(admin);
    if(v19Evidence.pageCount!==14||v19Evidence.publishedCount!==0||!v19Evidence.allTemplate19)throw new Error('A4_V19_PERSISTENCE_FAILED');

    const existing=await readExistingPages(admin);
    const v20=composeStorefrontDigitalCommerceTemplatePackage(PLAYROOM_V20_TEMPLATE_PACKAGE);
    const v20Plan=planStorefrontTemplateInstallation({template:v20,componentRegistry:registry,capability,existingPages:existing});
    if(!v20Plan.gate.ok||v20Plan.mode!=='upgrade'||v20Plan.pages.length!==14)throw new Error('A4_V20_UPGRADE_PLAN_INVALID');
    const v20Result=await persistPlan(admin,v20Plan,`a4-playroom-${tag}-v20`);
    const v20Evidence=await storefrontEvidence(admin);
    if(v20Evidence.pageCount!==14||v20Evidence.publishedCount!==0||!v20Evidence.allTemplate20||!v20Evidence.revisions.every(value=>value===2)){
      throw new Error('A4_V20_PERSISTENCE_FAILED');
    }

    const[{count:orderAfter},{count:productAfter}]=await Promise.all([
      admin.from('orders').select('id',{count:'exact',head:true}).eq('instance_id',INSTANCE_ID),
      admin.from('products').select('id',{count:'exact',head:true}).eq('instance_id',INSTANCE_ID),
    ]);
    if(orderAfter!==orderBefore||productAfter!==productBefore)throw new Error('A4_BUSINESS_DATA_BOUNDARY_CHANGED');

    cleanupEvidence=await cleanup(admin,{supportEmail,newsletterEmail,startedAt});
    if(cleanupEvidence.supportCount!==0||cleanupEvidence.newsletterCount!==0||cleanupEvidence.storefrontPageCount!==0)throw new Error('A4_CLEANUP_FAILED');

    return NextResponse.json({
      ok:true,
      evidence:{
        environment:'preview-staging',
        branch:process.env.VERCEL_GIT_COMMIT_REF,
        commit:process.env.VERCEL_GIT_COMMIT_SHA??null,
        support:{firstStatus:supportFirst.status,secondStatus:supportSecond.status,ticketNumber:supportFirstBody.ticketNumber??null,duplicateResponse:supportSecondBody.error??null,instanceId:publicInstanceId,oneTicket:true},
        newsletter:{firstStatus:newsletterFirst.status,secondStatus:newsletterSecond.status,firstDuplicate:newsletterFirstBody.duplicate,secondDuplicate:newsletterSecondBody.duplicate,instanceId:publicInstanceId,oneConsent:true},
        storefront:{v19:{pageCount:v19Evidence.pageCount,publishedCount:v19Evidence.publishedCount,mutationScope:v19Result.mutationScope??null},v20:{pageCount:v20Evidence.pageCount,publishedCount:v20Evidence.publishedCount,revisions:v20Evidence.revisions,mutationScope:v20Result.mutationScope??null}},
        boundary:{ordersBefore:orderBefore??0,ordersAfter:orderAfter??0,productsBefore:productBefore??0,productsAfter:productAfter??0},
        cleanup:cleanupEvidence,
      },
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    try{cleanupEvidence=await cleanup(admin,{supportEmail,newsletterEmail,startedAt})}catch{}
    return NextResponse.json({ok:false,errorCode:'A4_PLAYROOM_ACCEPTANCE_FAILED',detail:errorMessage(error).slice(0,300),cleanup:cleanupEvidence},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
