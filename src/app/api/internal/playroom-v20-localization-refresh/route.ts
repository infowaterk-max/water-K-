import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {composeStorefrontDigitalCommerceTemplatePackage} from '@/lib/builder/storefront-digital-commerce-composition';
import {planStorefrontTemplateInstallation,type StorefrontExistingTemplatePage} from '@/lib/builder/storefront-template-installation';
import {hashStorefrontPageDocument} from '@/lib/builder/storefront-persistence';
import {getStorefrontRuntimeCapabilityForInstance} from '@/lib/builder/storefront-runtime-capability-server';
import {getStorefrontGlobalStyleState,setStorefrontGlobalStyleState,storefrontGlobalStyleStatesEqual} from '@/lib/builder/storefront-global-styles';
import {assertSafeStorefrontFidelityDocument} from '@/lib/builder/storefront-fidelity-security';
import {assertStorefrontPerformance} from '@/lib/builder/storefront-performance-contract';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const dynamic='force-dynamic';

const EXPECTED_STAGING_URL='https://rfuvzgumbardvbvqjxdq.supabase.co';
const EXPECTED_BRANCH='feature/playroom-v20-functional-acceptance';
const INSTANCE_ID='6027c79a-e5f3-4c9c-a8d0-b6090958efde';
const ACTOR_ID='f6ee71eb-8c50-4d85-bcd9-743a3cc8a7ef';
const TEMPLATE_KEY='gaming.playroom';
const TEMPLATE_VERSION=20;

type RevisionRow={id:string;revision_number:number;kind:string;template_key:string;template_version:number;document_sha256:string;document:StorefrontPageDocument};

const errorMessage=(error:unknown)=>error instanceof Error?error.message:error&&typeof error==='object'?JSON.stringify(error):String(error);

async function businessSnapshot(admin:ReturnType<typeof createAdminClient>){
  const[{data:orders,error:orderError},{data:products,error:productError}]=await Promise.all([
    admin.from('orders').select('id').eq('instance_id',INSTANCE_ID).order('id'),
    admin.from('products').select('id').eq('instance_id',INSTANCE_ID).order('id'),
  ]);
  if(orderError||productError)throw orderError??productError??new Error('L10N_BUSINESS_SNAPSHOT_FAILED');
  return{orders:(orders??[]).map(row=>row.id),products:(products??[]).map(row=>row.id)};
}

async function readState(admin:ReturnType<typeof createAdminClient>){
  const{data:pages,error}=await admin.from('storefront_pages')
    .select('id,page_key,page_type,draft_revision_id,published_revision_id')
    .eq('instance_id',INSTANCE_ID).order('page_key');
  if(error)throw error;
  const draftIds=(pages??[]).map(page=>page.draft_revision_id).filter((value):value is string=>typeof value==='string');
  const{data:rawRevisions,error:revisionError}=draftIds.length
    ?await admin.from('storefront_page_revisions')
      .select('id,revision_number,kind,template_key,template_version,document_sha256,document')
      .eq('instance_id',INSTANCE_ID).in('id',draftIds)
    :{data:[],error:null};
  if(revisionError)throw revisionError;
  const revisions=(rawRevisions??[]) as RevisionRow[];
  const byId=new Map(revisions.map(row=>[row.id,row]));
  const existing:StorefrontExistingTemplatePage[]=(pages??[]).map(page=>{
    const draft=page.draft_revision_id?byId.get(page.draft_revision_id):undefined;
    return{
      pageKey:page.page_key,
      pageType:page.page_type as StorefrontExistingTemplatePage['pageType'],
      draftRevision:draft?.revision_number??null,
      draftTemplateKey:draft?.template_key??null,
      draftTemplateVersion:draft?.template_version??null,
      publishedTemplateKey:null,
      publishedTemplateVersion:null,
    };
  });
  return{
    rawPages:pages??[],
    existing,
    draftByPageKey:new Map((pages??[]).map(page=>[page.page_key,page.draft_revision_id?byId.get(page.draft_revision_id):undefined])),
  };
}

async function assertAcceptanceAuthority(admin:ReturnType<typeof createAdminClient>){
  const{data:instance,error:instanceError}=await admin.from('webshop_instances')
    .select('id,organization_id,status,subscription_plan').eq('id',INSTANCE_ID).maybeSingle();
  if(instanceError||!instance||instance.status!=='pilot'||instance.subscription_plan!=='alap'||!instance.organization_id)throw new Error('L10N_TENANT_PREFLIGHT_FAILED');
  const{data:bindings,error:bindingError}=await admin.from('role_bindings')
    .select('role_code,organization_id,instance_id,valid_from,valid_until,revoked_at').eq('user_id',ACTOR_ID);
  if(bindingError)throw bindingError;
  const now=Date.now();
  const allowed=(bindings??[]).some(binding=>{
    const validFrom=typeof binding.valid_from==='string'?Date.parse(binding.valid_from):NaN;
    const validUntil=typeof binding.valid_until==='string'?Date.parse(binding.valid_until):null;
    return binding.revoked_at===null
      &&binding.organization_id===instance.organization_id
      &&(binding.instance_id===INSTANCE_ID||binding.instance_id===null)
      &&(binding.role_code==='owner'||binding.role_code==='admin')
      &&Number.isFinite(validFrom)&&validFrom<=now
      &&(validUntil===null||(Number.isFinite(validUntil)&&validUntil>now));
  });
  if(!allowed)throw new Error('L10N_OWNER_BINDING_REQUIRED');
}

export async function GET(request:Request){
  if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!==EXPECTED_BRANCH)return new NextResponse(null,{status:404});
  if((process.env.NEXT_PUBLIC_SUPABASE_URL??'').replace(/\/$/,'')!==EXPECTED_STAGING_URL)return new NextResponse(null,{status:404});
  const commitProof=request.headers.get('x-shoperation-acceptance-proof')??'';
  if(!/^[a-f0-9]{40}$/.test(commitProof)||commitProof!==(process.env.VERCEL_GIT_COMMIT_SHA??''))return new NextResponse(null,{status:404});

  const admin=createAdminClient();
  try{
    await assertAcceptanceAuthority(admin);
    const before=await readState(admin);
    if(before.rawPages.length!==14||before.existing.length!==14)throw new Error('L10N_PAGE_CARDINALITY_INVALID');
    if(before.rawPages.some(page=>page.published_revision_id!==null))throw new Error('L10N_PUBLISHED_STATE_PRESENT');
    if(before.existing.some(page=>page.draftTemplateKey!==TEMPLATE_KEY||page.draftTemplateVersion!==TEMPLATE_VERSION||page.draftRevision===null))throw new Error('L10N_CURRENT_TEMPLATE_STATE_INVALID');

    const beforeKeys=before.existing.map(page=>page.pageKey);
    const beforeRevisions=before.existing.map(page=>page.draftRevision as number);
    const currentDocuments=beforeKeys.map(key=>before.draftByPageKey.get(key)?.document).filter((value):value is StorefrontPageDocument=>Boolean(value));
    if(currentDocuments.length!==14)throw new Error('L10N_CURRENT_DOCUMENTS_MISSING');
    const globalStyles=getStorefrontGlobalStyleState(currentDocuments[0]!);
    if(currentDocuments.slice(1).some(document=>!storefrontGlobalStyleStatesEqual(globalStyles,getStorefrontGlobalStyleState(document))))throw new Error('L10N_GLOBAL_STYLES_DRIFT');

    const businessBefore=await businessSnapshot(admin);
    const capability=await getStorefrontRuntimeCapabilityForInstance(INSTANCE_ID,'alap');
    if(!capability||capability.plan!=='alap')throw new Error('L10N_CAPABILITY_UNAVAILABLE');

    const template=composeStorefrontDigitalCommerceTemplatePackage(PLAYROOM_V20_TEMPLATE_PACKAGE);
    const plan=planStorefrontTemplateInstallation({
      template,
      componentRegistry:createStorefrontVisualBuilderComponentRegistry(),
      capability,
      existingPages:before.existing,
    });
    if(!plan.gate.ok||plan.mode!=='refresh'||plan.pages.length!==14||plan.templateKey!==TEMPLATE_KEY||plan.templateVersion!==TEMPLATE_VERSION)throw new Error('L10N_REFRESH_PLAN_INVALID');
    const plannedKeys=plan.pages.map(page=>page.pageKey).sort();
    const persistedKeys=[...beforeKeys].sort();
    if(JSON.stringify(plannedKeys)!==JSON.stringify(persistedKeys))throw new Error('L10N_PAGE_KEYS_CHANGED');

    const materialized=plan.pages.map(page=>{
      const document=setStorefrontGlobalStyleState(page.document,globalStyles);
      assertSafeStorefrontFidelityDocument(document);
      assertStorefrontPerformance(document);
      return{...page,document,documentSha256:hashStorefrontPageDocument(document)};
    });
    const expectedHashes=new Map(materialized.map(page=>[page.pageKey,page.documentSha256]));
    const tag=commitProof.slice(0,12);
    const{data,error}=await admin.rpc('save_storefront_template_drafts_v1',{
      p_instance_id:INSTANCE_ID,
      p_actor_user_id:ACTOR_ID,
      p_template_key:plan.templateKey,
      p_template_version:plan.templateVersion,
      p_pages:materialized.map(page=>({
        pageKey:page.pageKey,
        pageType:page.pageType,
        schemaVersion:page.document.schemaVersion,
        document:page.document,
        documentSha256:page.documentSha256,
        expectedDraftRevision:page.expectedDraftRevision,
      })),
      p_operation_key:`phase4-l10n-${tag}-refresh`,
    });
    if(error)throw error;
    const result=(data??{}) as Record<string,unknown>;
    if(result.mutationScope!=='storefront_page_drafts_only')throw new Error('L10N_MUTATION_SCOPE_INVALID');

    const after=await readState(admin);
    const afterKeys=after.existing.map(page=>page.pageKey);
    const afterRevisions=after.existing.map(page=>page.draftRevision as number);
    const revisionStepOk=afterRevisions.every((value,index)=>value===beforeRevisions[index]!+1);
    const exactDocuments=afterKeys.every(key=>after.draftByPageKey.get(key)?.document_sha256===expectedHashes.get(key));
    const allV20=after.existing.every(page=>page.draftTemplateKey===TEMPLATE_KEY&&page.draftTemplateVersion===TEMPLATE_VERSION);
    const publishedCount=after.rawPages.filter(page=>page.published_revision_id!==null).length;
    const businessAfter=await businessSnapshot(admin);
    const boundaryUnchanged=JSON.stringify(businessBefore)===JSON.stringify(businessAfter);

    if(afterKeys.length!==14||JSON.stringify(afterKeys)!==JSON.stringify(beforeKeys)||!revisionStepOk||!exactDocuments||!allV20||publishedCount!==0||!boundaryUnchanged){
      throw new Error('L10N_POSTFLIGHT_FAILED');
    }

    return NextResponse.json({
      ok:true,
      evidence:{
        environment:'preview-staging',
        branch:process.env.VERCEL_GIT_COMMIT_REF,
        commit:process.env.VERCEL_GIT_COMMIT_SHA??null,
        tenant:{id:INSTANCE_ID,plan:'alap',status:'pilot'},
        refresh:{mode:plan.mode,pageCount:afterKeys.length,pageKeys:afterKeys,revisionsBefore:beforeRevisions,revisionsAfter:afterRevisions,revisionStepOk,exactDocuments,allV20,publishedCount,mutationScope:result.mutationScope},
        boundary:{unchanged:boundaryUnchanged,orders:businessAfter.orders.length,products:businessAfter.products.length},
      },
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    return NextResponse.json({ok:false,errorCode:'PLAYROOM_LOCALIZATION_REFRESH_FAILED',detail:errorMessage(error).slice(0,500)},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
