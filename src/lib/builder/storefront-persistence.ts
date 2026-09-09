import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';

const OPERATION_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TEMPLATE_KEY_PATTERN=/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const PREVIEW_TOKEN_PATTERN=/^[A-Za-z0-9_-]{40,128}$/;
const PAGE_TYPE_SET=new Set<string>(STOREFRONT_PAGE_TYPES);

export type StorefrontPersistedRevision={
  pageId:string;
  revisionId:string;
  revisionNumber:number;
  kind:'draft'|'published';
  documentSha256?:string;
  replayed:boolean;
  rolledBackFrom?:number;
  targetHistoricalRevision?:number;
};

export type StorefrontPreviewCapability={
  sessionId:string;
  pageId:string;
  revisionId:string;
  revisionNumber:number;
  token:string;
  expiresAt:string;
  replayed:boolean;
};

export type StorefrontPersistedPageState={
  pageId:string;
  pageKey:string;
  pageType:StorefrontBuilderPageType;
  draft:StorefrontPersistedRevisionWithDocument|null;
  published:StorefrontPersistedRevisionWithDocument|null;
};

export type StorefrontPersistedRevisionWithDocument={
  revisionId:string;
  revisionNumber:number;
  kind:'draft'|'published';
  documentSha256:string;
  document:StorefrontPageDocument;
  createdAt:string;
};

const canonicalize=(value:unknown):unknown=>{
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==='object'){
    const source=value as Record<string,unknown>;
    return Object.fromEntries(
      Object.keys(source).sort().filter(key=>source[key]!==undefined).map(key=>[key,canonicalize(source[key])]),
    );
  }
  return value;
};

export function hashStorefrontPageDocument(document:StorefrontPageDocument):string{
  return createHash('sha256').update(JSON.stringify(canonicalize(document))).digest('hex');
}

const assertOperationKey=(value:string)=>{
  if(!OPERATION_KEY_PATTERN.test(value))throw new Error('STOREFRONT_OPERATION_KEY_INVALID');
};

const assertDocumentIdentity=(document:StorefrontPageDocument)=>{
  if(!Number.isInteger(document.schemaVersion)||document.schemaVersion<1)throw new Error('STOREFRONT_DOCUMENT_SCHEMA_INVALID');
  if(!PAGE_KEY_PATTERN.test(document.pageKey))throw new Error('STOREFRONT_DOCUMENT_PAGE_KEY_INVALID');
  if(!PAGE_TYPE_SET.has(document.pageType))throw new Error('STOREFRONT_DOCUMENT_PAGE_TYPE_INVALID');
  if(!TEMPLATE_KEY_PATTERN.test(document.templateKey))throw new Error('STOREFRONT_DOCUMENT_TEMPLATE_KEY_INVALID');
  if(!Number.isInteger(document.templateVersion)||document.templateVersion<1)throw new Error('STOREFRONT_DOCUMENT_TEMPLATE_VERSION_INVALID');
  if(!Array.isArray(document.sections))throw new Error('STOREFRONT_DOCUMENT_SECTIONS_INVALID');
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
  if(typeof value!=='number'||!Number.isInteger(value)||value<1)throw new Error(code);
  return value;
};

const parseMutationResult=(value:unknown):StorefrontPersistedRevision=>{
  const record=asRecord(value,'STOREFRONT_PERSISTENCE_RESULT_INVALID');
  const kind=record.kind;
  if(kind!=='draft'&&kind!=='published')throw new Error('STOREFRONT_PERSISTENCE_KIND_INVALID');
  return{
    pageId:requiredString(record,'pageId','STOREFRONT_PERSISTENCE_PAGE_ID_MISSING'),
    revisionId:requiredString(record,'revisionId','STOREFRONT_PERSISTENCE_REVISION_ID_MISSING'),
    revisionNumber:requiredNumber(record,'revisionNumber','STOREFRONT_PERSISTENCE_REVISION_NUMBER_MISSING'),
    kind,
    documentSha256:typeof record.documentSha256==='string'?record.documentSha256:undefined,
    replayed:record.replayed===true,
    rolledBackFrom:typeof record.rolledBackFrom==='number'?record.rolledBackFrom:undefined,
    targetHistoricalRevision:typeof record.targetHistoricalRevision==='number'?record.targetHistoricalRevision:undefined,
  };
};

const parseStoredDocument=(value:unknown):StorefrontPageDocument=>{
  const record=asRecord(value,'STOREFRONT_STORED_DOCUMENT_INVALID');
  const pageType=record.pageType;
  if(typeof pageType!=='string'||!PAGE_TYPE_SET.has(pageType))throw new Error('STOREFRONT_STORED_PAGE_TYPE_INVALID');
  const document={
    ...record,
    pageType:pageType as StorefrontBuilderPageType,
  } as StorefrontPageDocument;
  assertDocumentIdentity(document);
  return document;
};

const requireActor=async()=>{
  const supabase=await createClient();
  const{data:{user},error}=await supabase.auth.getUser();
  if(error||!user)throw new Error('STOREFRONT_AUTH_REQUIRED');
  return user.id;
};

export async function saveCurrentStorefrontPageDraft(input:{
  document:StorefrontPageDocument;
  expectedDraftRevision:number|null;
  operationKey:string;
}):Promise<StorefrontPersistedRevision>{
  assertDocumentIdentity(input.document);
  assertOperationKey(input.operationKey);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('save_storefront_page_draft_v1',{
    p_instance_id:scope.instanceId,
    p_actor_user_id:actorUserId,
    p_page_key:input.document.pageKey,
    p_page_type:input.document.pageType,
    p_schema_version:input.document.schemaVersion,
    p_template_key:input.document.templateKey,
    p_template_version:input.document.templateVersion,
    p_document:input.document,
    p_document_sha256:hashStorefrontPageDocument(input.document),
    p_expected_draft_revision:input.expectedDraftRevision,
    p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_DRAFT_SAVE_FAILED:${error.message}`);
  return parseMutationResult(data);
}

export async function publishCurrentStorefrontPage(input:{
  pageId:string;
  expectedDraftRevision:number;
  operationKey:string;
}):Promise<StorefrontPersistedRevision>{
  assertOperationKey(input.operationKey);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('publish_storefront_page_v1',{
    p_instance_id:scope.instanceId,
    p_actor_user_id:actorUserId,
    p_page_id:input.pageId,
    p_expected_draft_revision:input.expectedDraftRevision,
    p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_PUBLISH_FAILED:${error.message}`);
  return parseMutationResult(data);
}

export async function rollbackCurrentStorefrontPage(input:{
  pageId:string;
  targetPublishedRevision:number;
  expectedCurrentPublishedRevision:number;
  operationKey:string;
}):Promise<StorefrontPersistedRevision>{
  assertOperationKey(input.operationKey);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('rollback_storefront_page_v1',{
    p_instance_id:scope.instanceId,
    p_actor_user_id:actorUserId,
    p_page_id:input.pageId,
    p_target_published_revision:input.targetPublishedRevision,
    p_expected_current_published_revision:input.expectedCurrentPublishedRevision,
    p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_ROLLBACK_FAILED:${error.message}`);
  return parseMutationResult(data);
}

export async function createCurrentStorefrontPreview(input:{
  pageId:string;
  revisionNumber:number;
  ttlMinutes?:number;
  operationKey:string;
}):Promise<StorefrontPreviewCapability>{
  assertOperationKey(input.operationKey);
  const ttlMinutes=input.ttlMinutes??30;
  if(!Number.isInteger(ttlMinutes)||ttlMinutes<1||ttlMinutes>1440)throw new Error('STOREFRONT_PREVIEW_TTL_INVALID');
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const token=randomBytes(32).toString('base64url');
  const tokenHash=createHash('sha256').update(token).digest('hex');
  const expiresAt=new Date(Date.now()+ttlMinutes*60_000).toISOString();
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('create_storefront_preview_session_v1',{
    p_instance_id:scope.instanceId,
    p_actor_user_id:actorUserId,
    p_page_id:input.pageId,
    p_revision_number:input.revisionNumber,
    p_token_hash:tokenHash,
    p_expires_at:expiresAt,
    p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_PREVIEW_CREATE_FAILED:${error.message}`);
  const record=asRecord(data,'STOREFRONT_PREVIEW_RESULT_INVALID');
  return{
    sessionId:requiredString(record,'sessionId','STOREFRONT_PREVIEW_SESSION_ID_MISSING'),
    pageId:requiredString(record,'pageId','STOREFRONT_PREVIEW_PAGE_ID_MISSING'),
    revisionId:requiredString(record,'revisionId','STOREFRONT_PREVIEW_REVISION_ID_MISSING'),
    revisionNumber:requiredNumber(record,'revisionNumber','STOREFRONT_PREVIEW_REVISION_NUMBER_MISSING'),
    token,
    expiresAt:requiredString(record,'expiresAt','STOREFRONT_PREVIEW_EXPIRY_MISSING'),
    replayed:record.replayed===true,
  };
}

export async function revokeCurrentStorefrontPreview(input:{sessionId:string;operationKey:string}){
  assertOperationKey(input.operationKey);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('revoke_storefront_preview_session_v1',{
    p_instance_id:scope.instanceId,
    p_actor_user_id:actorUserId,
    p_session_id:input.sessionId,
    p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_PREVIEW_REVOKE_FAILED:${error.message}`);
  return asRecord(data,'STOREFRONT_PREVIEW_REVOKE_RESULT_INVALID');
}

export async function resolveStorefrontPreviewToken(token:string):Promise<StorefrontPageDocument|null>{
  if(!PREVIEW_TOKEN_PATTERN.test(token))return null;
  const tokenHash=createHash('sha256').update(token).digest('hex');
  const admin=createAdminClient();
  const now=new Date().toISOString();
  const{data:session,error:sessionError}=await admin.from('storefront_preview_sessions')
    .select('instance_id,page_id,revision_id,expires_at,revoked_at')
    .eq('token_hash',tokenHash).is('revoked_at',null).gt('expires_at',now).maybeSingle();
  if(sessionError||!session)return null;
  const{data:revision,error:revisionError}=await admin.from('storefront_page_revisions')
    .select('document,kind').eq('instance_id',session.instance_id).eq('page_id',session.page_id)
    .eq('id',session.revision_id).maybeSingle();
  if(revisionError||!revision||revision.kind!=='draft')return null;
  try{return parseStoredDocument(revision.document);}catch{return null;}
}

export async function getPublishedStorefrontPage(instanceId:string,pageKey:string):Promise<StorefrontPageDocument|null>{
  if(!PAGE_KEY_PATTERN.test(pageKey))return null;
  const admin=createAdminClient();
  const{data:page,error:pageError}=await admin.from('storefront_pages')
    .select('id,published_revision_id').eq('instance_id',instanceId).eq('page_key',pageKey).maybeSingle();
  if(pageError||!page?.published_revision_id)return null;
  const{data:revision,error:revisionError}=await admin.from('storefront_page_revisions')
    .select('document,kind').eq('instance_id',instanceId).eq('page_id',page.id)
    .eq('id',page.published_revision_id).maybeSingle();
  if(revisionError||!revision||revision.kind!=='published')return null;
  try{return parseStoredDocument(revision.document);}catch{return null;}
}

export async function getCurrentStorefrontPageState(pageKey:string):Promise<StorefrontPersistedPageState|null>{
  if(!PAGE_KEY_PATTERN.test(pageKey))throw new Error('STOREFRONT_PAGE_KEY_INVALID');
  const scope=await requireCurrentStoreContext('store.read');
  const admin=createAdminClient();
  const{data:page,error:pageError}=await admin.from('storefront_pages')
    .select('id,page_key,page_type,draft_revision_id,published_revision_id')
    .eq('instance_id',scope.instanceId).eq('page_key',pageKey).maybeSingle();
  if(pageError)throw new Error(`STOREFRONT_PAGE_STATE_READ_FAILED:${pageError.message}`);
  if(!page)return null;

  const ids=[page.draft_revision_id,page.published_revision_id].filter((value):value is string=>typeof value==='string');
  const{data:revisions,error:revisionError}=ids.length
    ?await admin.from('storefront_page_revisions').select('id,revision_number,kind,document_sha256,document,created_at')
      .eq('instance_id',scope.instanceId).eq('page_id',page.id).in('id',ids)
    :{data:[],error:null};
  if(revisionError)throw new Error(`STOREFRONT_PAGE_REVISION_READ_FAILED:${revisionError.message}`);

  const byId=new Map((revisions??[]).map(row=>[row.id,row]));
  const parseRevision=(id:string|null):StorefrontPersistedRevisionWithDocument|null=>{
    if(!id)return null;
    const row=byId.get(id);
    if(!row||(row.kind!=='draft'&&row.kind!=='published'))return null;
    return{
      revisionId:row.id,
      revisionNumber:row.revision_number,
      kind:row.kind,
      documentSha256:row.document_sha256,
      document:parseStoredDocument(row.document),
      createdAt:row.created_at,
    };
  };

  if(typeof page.page_type!=='string'||!PAGE_TYPE_SET.has(page.page_type))throw new Error('STOREFRONT_STORED_PAGE_TYPE_INVALID');
  return{
    pageId:page.id,
    pageKey:page.page_key,
    pageType:page.page_type as StorefrontBuilderPageType,
    draft:parseRevision(page.draft_revision_id),
    published:parseRevision(page.published_revision_id),
  };
}
