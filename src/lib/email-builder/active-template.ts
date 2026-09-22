import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailDesignOverrideSchema, emailDocumentSchema, type EmailDesignOverride, type EmailDocument } from './types';

export type ActiveEmailTemplate={
  templateId:string;
  versionId:string;
  versionNumber:number;
  document:EmailDocument;
  brandKit:{id:string;logoUrl:string|null}|null;
};

function mergeDesign(base:EmailDesignOverride,override:EmailDesignOverride):EmailDesignOverride{
  return {
    colors:{...(base.colors??{}),...(override.colors??{})},
    typography:{...(base.typography??{}),...(override.typography??{})},
    spacing:{...(base.spacing??{}),...(override.spacing??{})},
    radius:{...(base.radius??{}),...(override.radius??{})},
    container:{...(base.container??{}),...(override.container??{})},
  };
}

export function applyEmailBrandDesign(document:EmailDocument,brandTokens:unknown):EmailDocument{
  const brand=emailDesignOverrideSchema.parse(brandTokens??{});
  return emailDocumentSchema.parse({...document,design:mergeDesign(brand,document.design)});
}

export async function resolveActiveEmailTemplate(instanceId:string,templateKey:string):Promise<ActiveEmailTemplate|null>{
  const admin=createAdminClient();
  const{data:template,error:templateError}=await admin.from('email_templates')
    .select('id,template_key,family,purpose,status,brand_kit_id,active_version_id')
    .eq('instance_id',instanceId).eq('template_key',templateKey).maybeSingle();
  if(templateError)throw new Error(`EMAIL_TEMPLATE_RESOLUTION_FAILED:${templateError.message}`);
  if(!template||template.status!=='active')return null;
  if(!template.active_version_id)throw new Error('EMAIL_ACTIVE_VERSION_REQUIRED');

  const{data:version,error:versionError}=await admin.from('email_template_versions')
    .select('id,version_number,schema_version,document')
    .eq('instance_id',instanceId).eq('template_id',template.id).eq('id',template.active_version_id).maybeSingle();
  if(versionError)throw new Error(`EMAIL_TEMPLATE_VERSION_RESOLUTION_FAILED:${versionError.message}`);
  if(!version)throw new Error('EMAIL_ACTIVE_VERSION_NOT_FOUND');
  const parsed=emailDocumentSchema.safeParse(version.document);
  if(!parsed.success)throw new Error('EMAIL_ACTIVE_DOCUMENT_INVALID');
  if(parsed.data.templateKey!==template.template_key||parsed.data.family!==template.family||parsed.data.purpose!==template.purpose)throw new Error('EMAIL_ACTIVE_DOCUMENT_IDENTITY_MISMATCH');
  if(version.schema_version!==parsed.data.schemaVersion)throw new Error('EMAIL_ACTIVE_SCHEMA_VERSION_MISMATCH');

  let brandKit:{id:string;logo_url:string|null;tokens:unknown}|null=null;
  if(template.brand_kit_id){
    const{data,error}=await admin.from('email_brand_kits').select('id,logo_url,tokens').eq('instance_id',instanceId).eq('id',template.brand_kit_id).maybeSingle();
    if(error)throw new Error(`EMAIL_BRAND_KIT_RESOLUTION_FAILED:${error.message}`);
    if(!data)throw new Error('EMAIL_BRAND_KIT_NOT_FOUND');
    brandKit=data;
  }else{
    const{data,error}=await admin.from('email_brand_kits').select('id,logo_url,tokens').eq('instance_id',instanceId).eq('is_default',true).maybeSingle();
    if(error)throw new Error(`EMAIL_BRAND_KIT_RESOLUTION_FAILED:${error.message}`);
    brandKit=data??null;
  }

  const document=brandKit?applyEmailBrandDesign(parsed.data,brandKit.tokens):parsed.data;
  return{templateId:template.id,versionId:version.id,versionNumber:version.version_number,document,brandKit:brandKit?{id:brandKit.id,logoUrl:brandKit.logo_url}:null};
}
