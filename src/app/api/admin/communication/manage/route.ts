import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { hasCurrentPlanFeature } from '@/lib/plans/access';

const actions=['cancel','reschedule','retry','approve'] as const;type Action=typeof actions[number];
export async function POST(request:Request){
 let body:{jobId?:string;action?:Action;scheduledAt?:string;note?:string};try{body=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 if(!body.jobId||!body.action||!actions.includes(body.action))return NextResponse.json({error:'Hiányzó adat.'},{status:400});
 const basicActor=await getAdminRequestUser('store.read');if(!basicActor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let basicScope;try{basicScope=await requireCurrentStoreContext('store.read')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
 if(!(await hasCurrentPlanFeature('officeCommunication')))return NextResponse.json({error:'A Digitális iroda kommunikáció a Pro csomag része.'},{status:403});
 const admin=createAdminClient(),{data:job}=await admin.from('communication_jobs').select('purpose,template_key').eq('id',body.jobId).eq('instance_id',basicScope.instanceId).maybeSingle();
 if(!job)return NextResponse.json({error:'Az üzenet nem található ebben a webshopban.'},{status:404});
 const permission=job.purpose==='marketing'?'marketing.manage':job.template_key==='support_reply'?'support.manage':'orders.manage';
 const actor=await getAdminRequestUser(permission);if(!actor)return NextResponse.json({error:'Nincs jogosultság ehhez a kommunikációhoz.'},{status:403});
 let scope;try{scope=await requireCurrentStoreContext(permission)}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
 if(body.action==='approve'){
  if(job.purpose!=='marketing')return NextResponse.json({error:'Csak marketingüzenet igényel kézi jóváhagyást.'},{status:409});
  const{data,error}=await admin.rpc('admin_approve_communication_job_v2',{p_instance_id:scope.instanceId,p_job_id:body.jobId,p_actor:actor.id,p_note:body.note??null});
  if(error||data!==true)return NextResponse.json({error:'A jóváhagyás nem hajtható végre. Ellenőrizd a hozzájárulást és az állapotot.'},{status:409});
  return NextResponse.json({ok:true});
 }
 let scheduledAt:string|null=null;if(body.scheduledAt){const date=new Date(body.scheduledAt);if(Number.isNaN(date.getTime()))return NextResponse.json({error:'Érvénytelen időpont.'},{status:400});scheduledAt=date.toISOString()}
 const{data,error}=await admin.rpc('admin_manage_communication_job_v2',{p_instance_id:scope.instanceId,p_job_id:body.jobId,p_actor:actor.id,p_action:body.action,p_scheduled_at:scheduledAt,p_note:body.note??null});
 if(error||data!==true)return NextResponse.json({error:'A művelet nem hajtható végre ebben az állapotban.'},{status:409});
 return NextResponse.json({ok:true});
}
