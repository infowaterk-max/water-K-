import 'server-only';
import {hashStorefrontPageDocument} from '@/lib/builder/storefront-persistence';
import type {StorefrontTemplateInstallationPlan} from '@/lib/builder/storefront-template-installation';
import {assertSafeStorefrontFidelityDocument} from '@/lib/builder/storefront-fidelity-security';
import {assertStorefrontPerformance} from '@/lib/builder/storefront-performance-contract';
import {getCurrentStorefrontGlobalStyleState} from '@/lib/builder/storefront-global-style-persistence';
import {setStorefrontGlobalStyleState} from '@/lib/builder/storefront-global-styles';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';

const OPERATION_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,111}$/;

export type StorefrontTemplateDraftSaveResult={
  templateKey:string;
  templateVersion:number;
  pageCount:number;
  replayed:boolean;
  mutationScope:'storefront_page_drafts_only';
  pages:readonly{
    pageId:string;
    revisionId:string;
    revisionNumber:number;
    kind:'draft';
    documentSha256:string;
    replayed:boolean;
  }[];
};

const asRecord=(value:unknown,code:string):Record<string,unknown>=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(code);
  return value as Record<string,unknown>;
};

const requiredString=(record:Record<string,unknown>,key:string,code:string)=>{
  const value=record[key];
  if(typeof value!=='string'||!value)throw new Error(code);
  return value;
};

const requiredNumber=(record:Record<string,unknown>,key:string,code:string)=>{
  const value=record[key];
  if(typeof value!=='number'||!Number.isInteger(value)||value<0)throw new Error(code);
  return value;
};

const requireActor=async()=>{
  const supabase=await createClient();
  const{data:{user},error}=await supabase.auth.getUser();
  if(error||!user)throw new Error('STOREFRONT_AUTH_REQUIRED');
  return user.id;
};

export async function saveCurrentStorefrontTemplateDraftPlan(input:{
  plan:StorefrontTemplateInstallationPlan;
  operationKey:string;
}):Promise<StorefrontTemplateDraftSaveResult>{
  if(!input.plan.gate.ok)throw new Error('STOREFRONT_TEMPLATE_CAPABILITY_GATE_REQUIRED');
  if(!input.plan.pages.length)throw new Error('STOREFRONT_TEMPLATE_PAGES_REQUIRED');
  if(input.plan.pages.length>32)throw new Error('STOREFRONT_TEMPLATE_PAGE_LIMIT_EXCEEDED');
  if(!OPERATION_KEY_PATTERN.test(input.operationKey))throw new Error('STOREFRONT_TEMPLATE_OPERATION_KEY_INVALID');

  const globalStyles=await getCurrentStorefrontGlobalStyleState();
  const pages=input.plan.pages.map(page=>({...page,document:setStorefrontGlobalStyleState(page.document,globalStyles)}));
  for(const page of pages){
    assertSafeStorefrontFidelityDocument(page.document);
    assertStorefrontPerformance(page.document);
  }

  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('save_storefront_template_drafts_v1',{
    p_instance_id:scope.instanceId,
    p_actor_user_id:actorUserId,
    p_template_key:input.plan.templateKey,
    p_template_version:input.plan.templateVersion,
    p_pages:pages.map(page=>({
      pageKey:page.pageKey,
      pageType:page.pageType,
      schemaVersion:page.document.schemaVersion,
      document:page.document,
      documentSha256:hashStorefrontPageDocument(page.document),
      expectedDraftRevision:page.expectedDraftRevision,
    })),
    p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_TEMPLATE_DRAFT_SAVE_FAILED:${error.message}`);

  const record=asRecord(data,'STOREFRONT_TEMPLATE_SAVE_RESULT_INVALID');
  const rawPages=record.pages;
  if(!Array.isArray(rawPages))throw new Error('STOREFRONT_TEMPLATE_SAVE_PAGES_INVALID');
  const savedPages=rawPages.map(value=>{
    const page=asRecord(value,'STOREFRONT_TEMPLATE_SAVE_PAGE_INVALID');
    if(page.kind!=='draft')throw new Error('STOREFRONT_TEMPLATE_SAVE_PAGE_KIND_INVALID');
    return{
      pageId:requiredString(page,'pageId','STOREFRONT_TEMPLATE_SAVE_PAGE_ID_MISSING'),
      revisionId:requiredString(page,'revisionId','STOREFRONT_TEMPLATE_SAVE_REVISION_ID_MISSING'),
      revisionNumber:requiredNumber(page,'revisionNumber','STOREFRONT_TEMPLATE_SAVE_REVISION_NUMBER_MISSING'),
      kind:'draft' as const,
      documentSha256:requiredString(page,'documentSha256','STOREFRONT_TEMPLATE_SAVE_HASH_MISSING'),
      replayed:page.replayed===true,
    };
  });

  const templateKey=requiredString(record,'templateKey','STOREFRONT_TEMPLATE_SAVE_KEY_MISSING');
  const templateVersion=requiredNumber(record,'templateVersion','STOREFRONT_TEMPLATE_SAVE_VERSION_MISSING');
  const pageCount=requiredNumber(record,'pageCount','STOREFRONT_TEMPLATE_SAVE_COUNT_MISSING');
  if(templateKey!==input.plan.templateKey||templateVersion!==input.plan.templateVersion||pageCount!==savedPages.length){
    throw new Error('STOREFRONT_TEMPLATE_SAVE_IDENTITY_MISMATCH');
  }
  if(record.mutationScope!=='storefront_page_drafts_only')throw new Error('STOREFRONT_TEMPLATE_SAVE_SCOPE_INVALID');

  return{
    templateKey,
    templateVersion,
    pageCount,
    replayed:record.replayed===true,
    mutationScope:'storefront_page_drafts_only',
    pages:savedPages,
  };
}
