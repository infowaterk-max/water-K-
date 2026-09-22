import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateEmailDocumentForActivation } from '@/lib/email-builder/validation';

const uuid=z.string().uuid();
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const actor=await getAdminRequestUser('marketing.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('marketing.manage')}catch{return NextResponse.json({error:'Nincs aktív webshop kontextus.'},{status:403})}
  const{id}=await params;if(!uuid.safeParse(id).success)return NextResponse.json({error:'Érvénytelen sablonazonosító.'},{status:400});
  const admin=createAdminClient();
  const{data:template,error:loadError}=await admin.from('email_templates').select('id,status,draft_document').eq('instance_id',scope.instanceId).eq('id',id).maybeSingle();
  if(loadError)return NextResponse.json({error:'A sablon nem tölthető be.'},{status:500});
  if(!template)return NextResponse.json({error:'A sablon nem található.'},{status:404});
  if(template.status==='archived')return NextResponse.json({error:'Archivált sablon nem aktiválható.'},{status:409});
  const validation=validateEmailDocumentForActivation(template.draft_document);
  if(!validation.ok)return NextResponse.json({error:'A sablon nem aktiválható.',details:validation.errors,warnings:validation.warnings},{status:400});
  const{data:result,error}=await admin.rpc('activate_email_template_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_template_id:id});
  if(error||!result||typeof result!=='object')return NextResponse.json({error:'A sablon aktiválása sikertelen.'},{status:500});
  const versionId=String((result as Record<string,unknown>).versionId??''),versionNumber=Number((result as Record<string,unknown>).versionNumber??0);
  if(!uuid.safeParse(versionId).success||!Number.isInteger(versionNumber)||versionNumber<1)return NextResponse.json({error:'Az aktiválás bizonyítéka hiányzik.'},{status:500});
  const{data:evidence,error:evidenceError}=await admin.from('email_templates').select('id,status,active_version_id').eq('instance_id',scope.instanceId).eq('id',id).eq('active_version_id',versionId).maybeSingle();
  if(evidenceError||!evidence||evidence.status!=='active')return NextResponse.json({error:'Az aktív verzió bizonyítéka hiányzik.'},{status:500});
  return NextResponse.json({activeVersion:{id:versionId,versionNumber},warnings:validation.warnings});
}
