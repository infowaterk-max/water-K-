import { NextResponse } from 'next/server';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { essentialOrderConfirmation } from '@/lib/email-builder/templates/essential/order-confirmation';
import { validateEmailDocument } from '@/lib/email-builder/validation';

const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};
const TEMPLATE_KEY='essential.order_confirmation';

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const actor=await getAdminRequestUser('marketing.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('marketing.manage')}catch{return NextResponse.json({error:'Nincs aktív webshop kontextus.'},{status:403})}
  const admin=createAdminClient();
  const loadExisting=()=>admin.from('email_templates').select('id,template_key,name,family,purpose,status,draft_schema_version,active_version_id,updated_at').eq('instance_id',scope.instanceId).eq('template_key',TEMPLATE_KEY).maybeSingle();
  const{data:existing,error:existingError}=await loadExisting();
  if(existingError)return NextResponse.json({error:'A sablon állapota nem ellenőrizhető.'},{status:500});
  if(existing)return NextResponse.json({template:existing,created:false},{headers:{'cache-control':'no-store'}});
  const validation=validateEmailDocument(essentialOrderConfirmation);
  if(!validation.ok)return NextResponse.json({error:'A rendszer Essential sablonja érvénytelen.',details:validation.errors},{status:500});
  const{data:id,error}=await admin.rpc('create_email_template_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_template_key:TEMPLATE_KEY,p_name:'Rendelés visszaigazolása',p_family:'essential',p_purpose:'transactional',p_document:essentialOrderConfirmation,p_brand_kit_id:null});
  if(error||typeof id!=='string'){
    const duplicate=error?.message?.toLowerCase().includes('duplicate')||error?.message?.toLowerCase().includes('unique');
    if(duplicate){const{data:raceWinner,error:raceError}=await loadExisting();if(!raceError&&raceWinner)return NextResponse.json({template:raceWinner,created:false},{headers:{'cache-control':'no-store'}});}
    return NextResponse.json({error:'Az Essential piszkozat nem hozható létre.'},{status:500});
  }
  const{data:evidence,error:evidenceError}=await admin.from('email_templates').select('id,template_key,name,family,purpose,status,draft_schema_version,active_version_id,updated_at').eq('instance_id',scope.instanceId).eq('id',id).eq('template_key',TEMPLATE_KEY).maybeSingle();
  if(evidenceError||!evidence)return NextResponse.json({error:'A sablon létrehozásának bizonyítéka hiányzik.'},{status:500});
  return NextResponse.json({template:evidence,created:true,warnings:validation.warnings},{status:201});
}
