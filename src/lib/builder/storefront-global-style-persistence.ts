import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {getCurrentStorefrontBuilderCapability} from '@/lib/builder/storefront-builder-server';
import {validateStorefrontBuilderSchemaStructure} from '@/lib/builder/storefront-builder-schema-policy';
import {assertSafeStorefrontFidelityDocument} from '@/lib/builder/storefront-fidelity-security';
import {assertStorefrontPerformance} from '@/lib/builder/storefront-performance-contract';
import {
  EMPTY_STOREFRONT_GLOBAL_STYLE_STATE,
  getStorefrontGlobalStyleState,
  parseStorefrontGlobalStyleState,
  setStorefrontGlobalStyleState,
  storefrontGlobalStyleStatesEqual,
  type StorefrontGlobalStyleState,
} from '@/lib/builder/storefront-global-styles';
import {
  hashStorefrontPageDocument,
  type StorefrontPersistedRevision,
} from '@/lib/builder/storefront-persistence';
import {validateStorefrontPageDocument,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const OPERATION_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,111}$/;
const asRecord=(value:unknown,code:string):Record<string,unknown>=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(code);
  return value as Record<string,unknown>;
};
const requiredString=(record:Record<string,unknown>,key:string,code:string)=>{
  const value=record[key];if(typeof value!=='string'||!value)throw new Error(code);return value;
};
const requiredNumber=(record:Record<string,unknown>,key:string,code:string)=>{
  const value=record[key];if(typeof value!=='number'||!Number.isInteger(value)||value<1)throw new Error(code);return value;
};

const requireActor=async()=>{
  const supabase=await createClient();
  const{data:{user},error}=await supabase.auth.getUser();
  if(error||!user)throw new Error('STOREFRONT_AUTH_REQUIRED');
  return user.id;
};

type PageRow={id:string;page_key:string;page_type:string;draft_revision_id:string|null;published_revision_id:string|null};
type RevisionRow={id:string;revision_number:number;kind:string;document:unknown};
type PageBase={pageId:string;pageKey:string;pageType:string;draftRevision:number|null;document:StorefrontPageDocument};

function parseDocument(value:unknown):StorefrontPageDocument{
  const record=asRecord(value,'STOREFRONT_GLOBAL_STYLES_DOCUMENT_INVALID');
  if(typeof record.pageKey!=='string'||typeof record.pageType!=='string'||typeof record.templateKey!=='string')throw new Error('STOREFRONT_GLOBAL_STYLES_DOCUMENT_IDENTITY_INVALID');
  if(!Number.isInteger(record.schemaVersion)||!Number.isInteger(record.templateVersion)||!Array.isArray(record.sections))throw new Error('STOREFRONT_GLOBAL_STYLES_DOCUMENT_IDENTITY_INVALID');
  return structuredClone(record) as StorefrontPageDocument;
}

async function loadCurrentPageBases(permission:'store.read'|'store.manage'='store.read'):Promise<{instanceId:string;pages:PageBase[]}>{
  const scope=await requireCurrentStoreContext(permission);
  const admin=createAdminClient();
  const{data:rawPages,error:pageError}=await admin.from('storefront_pages')
    .select('id,page_key,page_type,draft_revision_id,published_revision_id')
    .eq('instance_id',scope.instanceId).order('page_key');
  if(pageError)throw new Error(`STOREFRONT_GLOBAL_STYLES_PAGE_LIST_FAILED:${pageError.message}`);
  const pages=(rawPages??[]) as PageRow[];
  if(pages.length>32)throw new Error('STOREFRONT_GLOBAL_STYLES_PAGE_LIMIT_EXCEEDED');
  const revisionIds=[...new Set(pages.flatMap(page=>[page.draft_revision_id,page.published_revision_id]).filter((value):value is string=>typeof value==='string'))];
  const{data:rawRevisions,error:revisionError}=revisionIds.length?await admin.from('storefront_page_revisions')
    .select('id,revision_number,kind,document').eq('instance_id',scope.instanceId).in('id',revisionIds):{data:[],error:null};
  if(revisionError)throw new Error(`STOREFRONT_GLOBAL_STYLES_REVISION_LIST_FAILED:${revisionError.message}`);
  const byId=new Map(((rawRevisions??[]) as RevisionRow[]).map(row=>[row.id,row]));
  return{
    instanceId:scope.instanceId,
    pages:pages.map(page=>{
      const draft=page.draft_revision_id?byId.get(page.draft_revision_id):undefined;
      const published=page.published_revision_id?byId.get(page.published_revision_id):undefined;
      const source=draft??published;
      if(!source)throw new Error(`STOREFRONT_GLOBAL_STYLES_PAGE_BASE_REQUIRED:${page.page_key}`);
      if(draft&&draft.kind!=='draft')throw new Error('STOREFRONT_GLOBAL_STYLES_DRAFT_KIND_INVALID');
      if(!draft&&published?.kind!=='published')throw new Error('STOREFRONT_GLOBAL_STYLES_PUBLISHED_KIND_INVALID');
      return{pageId:page.id,pageKey:page.page_key,pageType:page.page_type,draftRevision:draft?.revision_number??null,document:parseDocument(source.document)};
    }),
  };
}

export async function getCurrentStorefrontGlobalStyleState():Promise<StorefrontGlobalStyleState>{
  const{pages}=await loadCurrentPageBases('store.read');
  if(!pages.length)return structuredClone(EMPTY_STOREFRONT_GLOBAL_STYLE_STATE);
  const first=getStorefrontGlobalStyleState(pages[0]!.document);
  for(const page of pages.slice(1)){
    if(!storefrontGlobalStyleStatesEqual(first,getStorefrontGlobalStyleState(page.document)))throw new Error('STOREFRONT_GLOBAL_STYLES_DRIFT_DETECTED');
  }
  return first;
}

function parseMutation(value:unknown):StorefrontPersistedRevision{
  const record=asRecord(value,'STOREFRONT_GLOBAL_STYLES_RESULT_PAGE_INVALID');
  if(record.kind!=='draft')throw new Error('STOREFRONT_GLOBAL_STYLES_RESULT_KIND_INVALID');
  return{
    pageId:requiredString(record,'pageId','STOREFRONT_GLOBAL_STYLES_RESULT_PAGE_ID_MISSING'),
    revisionId:requiredString(record,'revisionId','STOREFRONT_GLOBAL_STYLES_RESULT_REVISION_ID_MISSING'),
    revisionNumber:requiredNumber(record,'revisionNumber','STOREFRONT_GLOBAL_STYLES_RESULT_REVISION_NUMBER_MISSING'),
    kind:'draft',
    documentSha256:requiredString(record,'documentSha256','STOREFRONT_GLOBAL_STYLES_RESULT_HASH_MISSING'),
    replayed:record.replayed===true,
  };
}

export async function saveCurrentStorefrontGlobalStyleDrafts(input:{
  currentDocument:StorefrontPageDocument;
  expectedDraftRevision:number|null;
  state:StorefrontGlobalStyleState;
  operationKey:string;
}):Promise<StorefrontPersistedRevision>{
  if(!OPERATION_KEY_PATTERN.test(input.operationKey))throw new Error('STOREFRONT_GLOBAL_STYLES_OPERATION_KEY_INVALID');
  const state=parseStorefrontGlobalStyleState(input.state);
  const[{instanceId,pages},actorUserId,capability]=await Promise.all([
    loadCurrentPageBases('store.manage'),requireActor(),getCurrentStorefrontBuilderCapability(),
  ]);
  if(!pages.length)throw new Error('STOREFRONT_GLOBAL_STYLES_PAGES_REQUIRED');
  const current=pages.find(page=>page.pageKey===input.currentDocument.pageKey);
  if(!current)throw new Error('STOREFRONT_GLOBAL_STYLES_CURRENT_PAGE_NOT_FOUND');
  if(current.draftRevision!==input.expectedDraftRevision)throw new Error('BUILDER_DRAFT_REVISION_STALE');

  const registry=createStorefrontVisualBuilderComponentRegistry();
  const materialized=pages.map(page=>{
    const source=page.pageKey===input.currentDocument.pageKey?input.currentDocument:page.document;
    if(source.pageKey!==page.pageKey)throw new Error('STOREFRONT_GLOBAL_STYLES_PAGE_IDENTITY_MISMATCH');
    const document=setStorefrontGlobalStyleState(source,state);
    assertSafeStorefrontFidelityDocument(document);
    assertStorefrontPerformance(document);
    validateStorefrontBuilderSchemaStructure({document,registry});
    const validation=validateStorefrontPageDocument(document,registry,capability);
    const failure=validation.violations.find(item=>item.severity==='error');
    if(failure)throw new Error(`STOREFRONT_GLOBAL_STYLES_PAGE_INVALID:${failure.code}`);
    return{
      pageKey:page.pageKey,
      pageType:document.pageType,
      schemaVersion:document.schemaVersion,
      templateKey:document.templateKey,
      templateVersion:document.templateVersion,
      document,
      documentSha256:hashStorefrontPageDocument(document),
      expectedDraftRevision:page.draftRevision,
    };
  });

  const admin=createAdminClient();
  const{data,error}=await admin.rpc('save_storefront_global_style_drafts_v1',{
    p_instance_id:instanceId,
    p_actor_user_id:actorUserId,
    p_global_styles:state,
    p_pages:materialized,
    p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_GLOBAL_STYLES_SAVE_FAILED:${error.message}`);
  const record=asRecord(data,'STOREFRONT_GLOBAL_STYLES_RESULT_INVALID');
  const rawPages=record.pages;if(!Array.isArray(rawPages))throw new Error('STOREFRONT_GLOBAL_STYLES_RESULT_PAGES_INVALID');
  const results=rawPages.map(parseMutation);
  const currentIndex=materialized.findIndex(page=>page.pageKey===input.currentDocument.pageKey);
  const result=results[currentIndex];
  if(!result)throw new Error('STOREFRONT_GLOBAL_STYLES_CURRENT_RESULT_MISSING');
  return result;
}
