import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {hashStorefrontPageDocument} from '@/lib/builder/storefront-persistence';
import {assertSafeStorefrontFidelityDocument} from '@/lib/builder/storefront-fidelity-security';
import {assertStorefrontPerformance} from '@/lib/builder/storefront-performance-contract';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const dynamic='force-dynamic';

const EXPECTED_STAGING_URL='https://rfuvzgumbardvbvqjxdq.supabase.co';
const EXPECTED_BRANCH='feature/playroom-v20-functional-acceptance';
const INSTANCE_ID='6027c79a-e5f3-4c9c-a8d0-b6090958efde';
const ACTOR_ID='f6ee71eb-8c50-4d85-bcd9-743a3cc8a7ef';
const TEMPLATE_KEY='gaming.playroom';
const TEMPLATE_VERSION=20;
const EXPECTED_REVISION=26;
const RESPONSIVE_AUTHORITY='shoporation.storefront-responsive-authority.v2';

type RevisionRow={
  id:string;
  revision_number:number;
  template_key:string;
  template_version:number;
  document_sha256:string;
  document:StorefrontPageDocument;
};

const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const stable=(value:unknown):string=>{
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object'){
    const source=value as Record<string,unknown>;
    return `{${Object.keys(source).sort().map(key=>`${JSON.stringify(key)}:${stable(source[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
function findNode(nodes:readonly StorefrontComponentNode[],id:string):StorefrontComponentNode|undefined{
  for(const node of nodes){
    if(node.id===id)return node;
    const child=findNode(node.children??[],id);
    if(child)return child;
  }
  return undefined;
}
function materializeLegacyStyle(node:StorefrontComponentNode){
  const style=record(node.config.style);
  const desktop=record(style.desktop);
  const tablet=record(style.tablet);
  const mobile=record(style.mobile);
  node.config.style={
    ...style,
    tablet:{...desktop,...tablet},
    mobile:{...desktop,...tablet,...mobile},
  };
}
function siblingDependencies(value:unknown,path='$',issues:string[]=[]):string[]{
  if(Array.isArray(value)){value.forEach((item,index)=>siblingDependencies(item,`${path}[${index}]`,issues));return issues;}
  if(!value||typeof value!=='object')return issues;
  const source=value as Record<string,unknown>;
  const hasViewport=['desktop','tablet','mobile'].some(key=>Object.prototype.hasOwnProperty.call(source,key));
  const slotShape=['base','desktop','tablet','mobile'].every(key=>source[key]===undefined||Boolean(source[key])&&typeof source[key]==='object'&&!Array.isArray(source[key]));
  if(hasViewport&&slotShape){
    const base=record(source.base),desktop=record(source.desktop),tablet=record(source.tablet),mobile=record(source.mobile);
    const oldTablet={...base,...desktop,...tablet};
    const exactTablet={...base,...tablet};
    const oldMobile={...base,...desktop,...tablet,...mobile};
    const exactMobile={...base,...mobile};
    if(stable(oldTablet)!==stable(exactTablet))issues.push(`${path}:tablet`);
    if(stable(oldMobile)!==stable(exactMobile))issues.push(`${path}:mobile`);
  }
  for(const[key,item]of Object.entries(source))siblingDependencies(item,`${path}.${key}`,issues);
  return issues;
}

async function businessSnapshot(admin:ReturnType<typeof createAdminClient>){
  const[{data:orders,error:orderError},{data:products,error:productError}]=await Promise.all([
    admin.from('orders').select('id').eq('instance_id',INSTANCE_ID).order('id'),
    admin.from('products').select('id').eq('instance_id',INSTANCE_ID).order('id'),
  ]);
  if(orderError||productError)throw orderError??productError??new Error('RESPONSIVE_AUTHORITY_BUSINESS_SNAPSHOT_FAILED');
  return{orders:(orders??[]).map(row=>row.id),products:(products??[]).map(row=>row.id)};
}
async function readState(admin:ReturnType<typeof createAdminClient>){
  const{data:pages,error}=await admin.from('storefront_pages')
    .select('id,page_key,page_type,draft_revision_id,published_revision_id')
    .eq('instance_id',INSTANCE_ID).order('page_key');
  if(error)throw error;
  const draftIds=(pages??[]).map(page=>page.draft_revision_id).filter((value):value is string=>typeof value==='string');
  const{data:raw,error:revisionError}=draftIds.length
    ?await admin.from('storefront_page_revisions')
      .select('id,revision_number,template_key,template_version,document_sha256,document')
      .eq('instance_id',INSTANCE_ID).in('id',draftIds)
    :{data:[],error:null};
  if(revisionError)throw revisionError;
  const revisions=(raw??[]) as RevisionRow[];
  const byId=new Map(revisions.map(row=>[row.id,row]));
  return{
    pages:pages??[],
    draftByPageKey:new Map((pages??[]).map(page=>[page.page_key,page.draft_revision_id?byId.get(page.draft_revision_id):undefined])),
  };
}
async function assertAuthority(admin:ReturnType<typeof createAdminClient>){
  const{data:instance,error}=await admin.from('webshop_instances')
    .select('id,organization_id,status,subscription_plan').eq('id',INSTANCE_ID).maybeSingle();
  if(error||!instance||instance.status!=='pilot'||instance.subscription_plan!=='alap'||!instance.organization_id){
    throw new Error('RESPONSIVE_AUTHORITY_TENANT_PREFLIGHT_FAILED');
  }
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
  if(!allowed)throw new Error('RESPONSIVE_AUTHORITY_OWNER_BINDING_REQUIRED');
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
    if(before.pages.length!==14)throw new Error('RESPONSIVE_AUTHORITY_PAGE_CARDINALITY_INVALID');
    if(before.pages.some(page=>page.published_revision_id!==null))throw new Error('RESPONSIVE_AUTHORITY_PUBLISHED_STATE_PRESENT');
    const homeBefore=before.draftByPageKey.get('home');
    if(!homeBefore)throw new Error('RESPONSIVE_AUTHORITY_HOME_MISSING');
    if(homeBefore.revision_number!==EXPECTED_REVISION)throw new Error(`RESPONSIVE_AUTHORITY_REVISION_CHANGED:${homeBefore.revision_number}`);
    if(homeBefore.template_key!==TEMPLATE_KEY||homeBefore.template_version!==TEMPLATE_VERSION)throw new Error('RESPONSIVE_AUTHORITY_TEMPLATE_MISMATCH');
    if(homeBefore.document.metadata?.responsiveAuthorityVersion)throw new Error('RESPONSIVE_AUTHORITY_ALREADY_MIGRATED');

    const pagePointersBefore=new Map(before.pages.map(page=>[page.page_key,page.draft_revision_id]));
    const businessBefore=await businessSnapshot(admin);
    const document=structuredClone(homeBefore.document);
    const layout=findNode(document.sections,'playroom-compatibility-layout');
    const statusWrap=findNode(document.sections,'playroom-compatibility-status-wrap');
    if(!layout||!statusWrap)throw new Error('RESPONSIVE_AUTHORITY_TARGET_NODE_MISSING');

    materializeLegacyStyle(layout);
    materializeLegacyStyle(statusWrap);
    document.metadata={...(document.metadata??{}),responsiveAuthorityVersion:RESPONSIVE_AUTHORITY};

    const remaining=siblingDependencies(document);
    if(remaining.length)throw new Error(`RESPONSIVE_AUTHORITY_DEPENDENCY_REMAINS:${remaining.slice(0,8).join('|')}`);
    if(document.metadata?.fidelity&&typeof document.metadata.fidelity==='object'){
      const fidelity=document.metadata.fidelity as Record<string,unknown>;
      if(fidelity.sectionOrder||fidelity.nodeOrder)throw new Error('RESPONSIVE_AUTHORITY_UNEXPECTED_ORDER_AUTHORITY');
    }

    assertSafeStorefrontFidelityDocument(document);
    assertStorefrontPerformance(document);
    const expectedHash=hashStorefrontPageDocument(document);
    const{data,error}=await admin.rpc('save_storefront_page_draft_v1',{
      p_instance_id:INSTANCE_ID,
      p_actor_user_id:ACTOR_ID,
      p_page_key:document.pageKey,
      p_page_type:document.pageType,
      p_schema_version:document.schemaVersion,
      p_template_key:document.templateKey,
      p_template_version:document.templateVersion,
      p_document:document,
      p_document_sha256:expectedHash,
      p_expected_draft_revision:EXPECTED_REVISION,
      p_operation_key:`playroom-responsive-authority-v2-${proof.slice(0,12)}`,
    });
    if(error)throw error;

    const after=await readState(admin);
    const homeAfter=after.draftByPageKey.get('home');
    if(!homeAfter)throw new Error('RESPONSIVE_AUTHORITY_POST_HOME_MISSING');
    const otherPointersStable=after.pages.filter(page=>page.page_key!=='home').every(page=>page.draft_revision_id===pagePointersBefore.get(page.page_key));
    const publishedCount=after.pages.filter(page=>page.published_revision_id!==null).length;
    const businessAfter=await businessSnapshot(admin);
    const businessStable=JSON.stringify(businessBefore)===JSON.stringify(businessAfter);
    const dependenciesAfter=siblingDependencies(homeAfter.document);
    const ok=homeAfter.revision_number===EXPECTED_REVISION+1
      &&homeAfter.document_sha256===expectedHash
      &&homeAfter.document.metadata?.responsiveAuthorityVersion===RESPONSIVE_AUTHORITY
      &&dependenciesAfter.length===0
      &&otherPointersStable&&publishedCount===0&&businessStable;
    if(!ok)throw new Error('RESPONSIVE_AUTHORITY_POSTFLIGHT_FAILED');

    return NextResponse.json({
      ok:true,
      evidence:{
        commit:proof,
        home:{
          revisionBefore:EXPECTED_REVISION,
          revisionAfter:homeAfter.revision_number,
          hashBefore:homeBefore.document_sha256,
          hashAfter:homeAfter.document_sha256,
          responsiveAuthority:homeAfter.document.metadata?.responsiveAuthorityVersion,
        },
        nodes:['playroom-compatibility-layout','playroom-compatibility-status-wrap'],
        remainingSiblingDependencies:dependenciesAfter.length,
        otherPagesUnchanged:otherPointersStable,
        publishedCount,
        businessBoundaryUnchanged:businessStable,
        orders:businessAfter.orders.length,
        products:businessAfter.products.length,
        replayed:Boolean((data as Record<string,unknown>|null)?.replayed),
      },
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    const detail=error instanceof Error?error.message:String(error);
    return NextResponse.json({ok:false,errorCode:'PLAYROOM_RESPONSIVE_AUTHORITY_V2_FAILED',detail:detail.slice(0,700)},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
