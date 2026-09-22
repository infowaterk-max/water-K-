import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailDocumentSchema,emailPurposes,emailTemplateFamilies } from '@/lib/email-builder/types';
import { validateEmailDocument } from '@/lib/email-builder/validation';

const createSchema=z.object({
  templateKey:z.string().regex(/^[a-z0-9][a-z0-9._-]{1,159}$/),
  name:z.string().trim().min(1).max(160),
  family:z.enum(emailTemplateFamilies),
  purpose:z.enum(emailPurposes),
  brandKitId:z.string().uuid().nullable().optional(),
  document:emailDocumentSchema,
}).strict();
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};

async function access(){
  const actor=await getAdminRequestUser('marketing.manage');if(!actor)return null;
  try{return{actor,scope:await requireCurrentStoreContext('marketing.manage')}}catch{return null}
}

export async function GET(){
  const auth=await access();if(!auth)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const admin=createAdminClient();
  const{data,error}=await admin.from('email_templates').select('id,template_key,name,family,purpose,status,brand_kit_id,draft_schema_version,active_version_id,created_at,updated_at').eq('instance_id',auth.scope.instanceId).order('updated_at',{ascending:false});
  if(error)return NextResponse.json({error:'Az e-mail sablonok nem tölthetők be.'},{status:500});
  return NextResponse.json({templates:data??[]},{headers:{'cache-control':'no-store'}});
}

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const auth=await access();if(!auth)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const body=await request.json().catch(()=>null),parsed=createSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen sablonadat.',details:parsed.error.flatten()},{status:400});
  const input=parsed.data,validation=validateEmailDocument(input.document);
  if(!validation.ok)return NextResponse.json({error:'A sablon dokumentuma hibás.',details:validation.errors},{status:400});
  if(input.document.templateKey!==input.templateKey||input.document.family!==input.family||input.document.purpose!==input.purpose)return NextResponse.json({error:'A sablon és a dokumentum azonosítói nem egyeznek.'},{status:400});
  const admin=createAdminClient();
  const{data:id,error}=await admin.rpc('create_email_template_v1',{p_instance_id:auth.scope.instanceId,p_actor:auth.actor.id,p_template_key:input.templateKey,p_name:input.name,p_family:input.family,p_purpose:input.purpose,p_document:input.document,p_brand_kit_id:input.brandKitId??null});
  if(error||typeof id!=='string'){
    const duplicate=error?.message?.toLowerCase().includes('duplicate')||error?.message?.toLowerCase().includes('unique');
    return NextResponse.json({error:duplicate?'Ilyen sablonkulcs már létezik.':'A sablon nem hozható létre.'},{status:duplicate?409:500});
  }
  const{data:created,error:evidenceError}=await admin.from('email_templates').select('id,template_key,name,family,purpose,status,draft_schema_version,active_version_id').eq('instance_id',auth.scope.instanceId).eq('id',id).maybeSingle();
  if(evidenceError||!created)return NextResponse.json({error:'A sablon létrehozásának bizonyítéka hiányzik.'},{status:500});
  return NextResponse.json({template:created,warnings:validation.warnings},{status:201});
}
