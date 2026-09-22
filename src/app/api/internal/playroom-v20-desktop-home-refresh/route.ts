import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {composeStorefrontDigitalCommerceTemplatePackage} from '@/lib/builder/storefront-digital-commerce-composition';
import {planStorefrontTemplateInstallation,type StorefrontExistingTemplatePage} from '@/lib/builder/storefront-template-installation';
import {hashStorefrontPageDocument} from '@/lib/builder/storefront-persistence';
import {getStorefrontRuntimeCapabilityForInstance} from '@/lib/builder/storefront-runtime-capability-server';
import {getStorefrontGlobalStyleState,setStorefrontGlobalStyleState} from '@/lib/builder/storefront-global-styles';
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
type RevisionRow={id:string;revision_number:number;template_key:string;template_version:number;document_sha256:string;document:StorefrontPageDocument};

async function businessSnapshot(admin:ReturnType<typeof createAdminClient>){
  const[{data:orders,error:orderError},{data:products,error:productError}]=await Promise.all([
    admin.from('orders').select('id').eq('instance_id',INSTANCE_ID).order('id'),
    admin.from('products').select('id').eq('instance_id',INSTANCE_ID).order('id'),
  ]);
  if(orderError||productError)throw orderError??productError??new Error('HOME_DESKTOP_BUSINESS_SNAPSHOT_FAILED');
  return{orders:(orders??[]).map(row=>row.id),products:(products??[]).map(row=>row.id)};
}
async function readState(admin:ReturnType<typeof createAdminClient>){
  const{data:pages,error}=await admin.from('storefront_pages').select('id,page_key,page_type,draft_revision_id,published_revision_id').eq('instance_id',INSTANCE_ID).order('page_key');
  if(error)throw error;
  const draftIds=(pages??[]).map(page=>page.draft_revision_id).filter((value):value is string=>typeof value==='string');
  const{data:rawRevisions,error:revisionError}=draftIds.length
    ?await admin.from('storefront_page_revisions').select('id,revision_number,template_key,template_version,document_sha256,document').eq('instance_id',INSTANCE_ID).in('id',draftIds)
    :{data:[],error:null};
  if(revisionError)throw revisionError;
  const revisions=(rawRevisions??[]) as RevisionRow[];
  const byId=new Map(revisions.map(row=>[row.id,row]));
  const existing:StorefrontExistingTemplatePage[]=(pages??[]).map(page=>{
    const draft=page.draft_revision_id?byId.get(page.draft_revision_id):undefined;
    return{pageKey:page.page_key,pageType:page.page_type as StorefrontExistingTemplatePage['pageType'],draftRevision:draft?.revision_number??null,draftTemplateKey:draft?.template_key??null,draftTemplateVersion:draft?.template_version??null,publishedTemplateKey:null,publishedTemplateVersion:null};
  });
  return{pages:pages??[],existing,draftByPageKey:new Map((pages??[]).map(page=>[page.page_key,page.draft_revision_id?byId.get(page.draft_revision_id):undefined]))};
}
async function assertAuthority(admin:ReturnType<typeof createAdminClient>){
  const{data:instance,error}=await admin.from('webshop_instances').select('id,organization_id,status,subscription_plan').eq('id',INSTANCE_ID).maybeSingle();
  if(error||!instance||instance.status!=='pilot'||instance.subscription_plan!=='alap'||!instance.organization_id)throw new Error('HOME_DESKTOP_TENANT_PREFLIGHT_FAILED');
  const{data:bindings,error:bindingError}=await admin.from('role_bindings').select('role_code,organization_id,instance_id,valid_from,valid_until,revoked_at').eq('user_id',ACTOR_ID);
  if(bindingError)throw bindingError;
  const now=Date.now();
  const allowed=(bindings??[]).some(binding=>{
    const validFrom=typeof binding.valid_from==='string'?Date.parse(binding.valid_from):NaN;
    const validUntil=typeof binding.valid_until==='string'?Date.parse(binding.valid_until):null;
    return binding.revoked_at===null&&binding.organization_id===instance.organization_id&&(binding.instance_id===INSTANCE_ID||binding.instance_id===null)&&(binding.role_code==='owner'||binding.role_code==='admin')&&Number.isFinite(validFrom)&&validFrom<=now&&(validUntil===null||(Number.isFinite(validUntil)&&validUntil>now));
  });
  if(!allowed)throw new Error('HOME_DESKTOP_OWNER_BINDING_REQUIRED');
}

export async function GET(request:Request){
  if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!==EXPECTED_BRANCH)return new NextResponse(null,{status:404});
  if((process.env.NEXT_PUBLIC_SUPABASE_URL??'').replace(/\/$/,'')!==EXPECTED_STAGING_URL)return new NextResponse(null,{status:404});
  const proof=new URL(request.url).searchParams.get('proof')??'';
  if(!/^[a-f0-9]{40}$/.test(proof)||proof!==(process.env.VERCEL_GIT_COMMIT_SHA??''))return new NextResponse(null,{status:404});
  const admin=createAdminClient();
  try{
    await assertAuthority(admin);
    const before=await readState(admin);
    if(before.pages.length!==14||before.existing.length!==14)throw new Error('HOME_DESKTOP_PAGE_CARDINALITY_INVALID');
    if(before.pages.some(page=>page.published_revision_id!==null))throw new Error('HOME_DESKTOP_PUBLISHED_STATE_PRESENT');
    if(before.existing.some(page=>page.draftTemplateKey!==TEMPLATE_KEY||page.draftTemplateVersion!==TEMPLATE_VERSION||page.draftRevision===null))throw new Error('HOME_DESKTOP_TEMPLATE_STATE_INVALID');
    const homeBefore=before.draftByPageKey.get('home');
    if(!homeBefore)throw new Error('HOME_DESKTOP_CURRENT_HOME_MISSING');
    const globalStyles=getStorefrontGlobalStyleState(homeBefore.document);
    const businessBefore=await businessSnapshot(admin);
    const pagePointersBefore=new Map(before.pages.map(page=>[page.page_key,page.draft_revision_id]));

    const capability=await getStorefrontRuntimeCapabilityForInstance(INSTANCE_ID,'alap');
    if(!capability||capability.plan!=='alap')throw new Error('HOME_DESKTOP_CAPABILITY_UNAVAILABLE');
    const template=composeStorefrontDigitalCommerceTemplatePackage(PLAYROOM_V20_TEMPLATE_PACKAGE);
    const plan=planStorefrontTemplateInstallation({template,componentRegistry:createStorefrontVisualBuilderComponentRegistry(),capability,existingPages:before.existing});
    if(!plan.gate.ok||plan.mode!=='refresh'||plan.pages.length!==14)throw new Error('HOME_DESKTOP_REFRESH_PLAN_INVALID');
    const plannedHome=plan.pages.find(page=>page.pageKey==='home'&&page.pageType==='home');
    if(!plannedHome)throw new Error('HOME_DESKTOP_PLANNED_HOME_MISSING');
    const document=setStorefrontGlobalStyleState(plannedHome.document,globalStyles);
    assertSafeStorefrontFidelityDocument(document);
    assertStorefrontPerformance(document);
    const expectedHash=hashStorefrontPageDocument(document);

    const{data,error}=await admin.rpc('save_storefront_page_draft_v1',{
      p_instance_id:INSTANCE_ID,p_actor_user_id:ACTOR_ID,p_page_key:'home',p_page_type:'home',p_schema_version:document.schemaVersion,
      p_template_key:TEMPLATE_KEY,p_template_version:TEMPLATE_VERSION,p_document:document,p_document_sha256:expectedHash,
      p_expected_draft_revision:homeBefore.revision_number,p_operation_key:`playroom-desktop-only-${proof.slice(0,12)}`,
    });
    if(error)throw error;
    const result=(data??{}) as Record<string,unknown>;

    const after=await readState(admin);
    const homeAfter=after.draftByPageKey.get('home');
    if(!homeAfter)throw new Error('HOME_DESKTOP_POST_HOME_MISSING');
    const otherPointersStable=after.pages.filter(page=>page.page_key!=='home').every(page=>page.draft_revision_id===pagePointersBefore.get(page.page_key));
    const publishedCount=after.pages.filter(page=>page.published_revision_id!==null).length;
    const businessAfter=await businessSnapshot(admin);
    const businessStable=JSON.stringify(businessBefore)===JSON.stringify(businessAfter);
    const ok=homeAfter.revision_number===homeBefore.revision_number+1&&homeAfter.document_sha256===expectedHash&&homeAfter.template_key===TEMPLATE_KEY&&homeAfter.template_version===TEMPLATE_VERSION&&otherPointersStable&&publishedCount===0&&businessStable;
    if(!ok)throw new Error('HOME_DESKTOP_POSTFLIGHT_FAILED');

    return NextResponse.json({ok:true,evidence:{commit:proof,home:{revisionBefore:homeBefore.revision_number,revisionAfter:homeAfter.revision_number,expectedHash,actualHash:homeAfter.document_sha256},otherPagesUnchanged:otherPointersStable,publishedCount,businessBoundaryUnchanged:businessStable,orders:businessAfter.orders.length,products:businessAfter.products.length,replayed:result.replayed===true}},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    const detail=error instanceof Error?error.message:String(error);
    return NextResponse.json({ok:false,errorCode:'PLAYROOM_DESKTOP_HOME_REFRESH_FAILED',detail:detail.slice(0,500)},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
