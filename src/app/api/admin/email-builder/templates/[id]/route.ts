import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailDocumentSchema } from '@/lib/email-builder/types';
import { validateEmailDocument } from '@/lib/email-builder/validation';

const uuid=z.string().uuid();
const saveSchema=z.object({document:emailDocumentSchema}).strict();
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};
async function access(){const actor=await getAdminRequestUser('marketing.manage');if(!actor)return null;try{return{actor,scope:await requireCurrentStoreContext('marketing.manage')}}catch{return null}}

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await access();if(!auth)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const{id}=await params;if(!uuid.safeParse(id).success)return NextResponse.json({error:'Érvénytelen sablonazonosító.'},{status:400});
  const admin=createAdminClient();
  const{data,error}=await admin.from('email_templates').select('id,template_key,name,family,purpose,status,brand_kit_id,draft_schema_version,draft_document,active_version_id,created_at,updated_at').eq('instance_id',auth.scope.instanceId).eq('id',id).maybeSingle();
  if(error)return NextResponse.json({error:'A sablon nem tölthető be.'},{status:500});
  if(!data)return NextResponse.json({error:'A sablon nem található.'},{status:404});
  let activeVersion=null;
  if(data.active_version_id){
    const{data:version,error:versionError}=await admin.from('email_template_versions').select('id,version_number,schema_version,created_at,activated_at').eq('instance_id',auth.scope.instanceId).eq('template_id',id).eq('id',data.active_version_id).maybeSingle();
    if(versionError)return NextResponse.json({error:'Az aktív sablonverzió nem tölthető be.'},{status:500});
    activeVersion=version;
  }
  return NextResponse.json({template:data,activeVersion},{headers:{'cache-control':'no-store'}});
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const auth=await access();if(!auth)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const{id}=await params;if(!uuid.safeParse(id).success)return NextResponse.json({error:'Érvénytelen sablonazonosító.'},{status:400});
  const body=await request.json().catch(()=>null),parsed=saveSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen sablonadat.',details:parsed.error.flatten()},{status:400});
  const validation=validateEmailDocument(parsed.data.document);
  if(!validation.ok)return NextResponse.json({error:'A sablon dokumentuma hibás.',details:validation.errors},{status:400});
  const admin=createAdminClient();
  const{data:saved,error}=await admin.rpc('save_email_template_draft_v1',{p_instance_id:auth.scope.instanceId,p_actor:auth.actor.id,p_template_id:id,p_document:parsed.data.document});
  if(error||saved!==true){
    const notFound=error?.message?.includes('EMAIL_TEMPLATE_NOT_FOUND');
    return NextResponse.json({error:notFound?'A sablon nem található.':'A piszkozat nem menthető.'},{status:notFound?404:500});
  }
  const{data:evidence,error:evidenceError}=await admin.from('email_templates').select('id,draft_schema_version,draft_document,updated_at').eq('instance_id',auth.scope.instanceId).eq('id',id).maybeSingle();
  if(evidenceError||!evidence)return NextResponse.json({error:'A mentés bizonyítéka hiányzik.'},{status:500});
  return NextResponse.json({template:evidence,warnings:validation.warnings});
}
