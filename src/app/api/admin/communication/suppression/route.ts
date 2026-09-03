import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { hasCurrentPlanFeature } from '@/lib/plans/access';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Body={action?:'block'|'release';email?:string;suppressionId?:string;note?:string};
export async function POST(request:Request){
 const actor=await getAdminRequestUser('marketing.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let scope;try{scope=await requireCurrentStoreContext('marketing.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
 if(!(await hasCurrentPlanFeature('officeCommunication')))return NextResponse.json({error:'A Digitális iroda kommunikáció a Pro csomag része.'},{status:403});
 let body:Body;try{body=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const admin=createAdminClient();
 if(body.action==='block'){
  const email=(body.email??'').trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'Érvénytelen e-mail cím.'},{status:400});
  const{data,error}=await admin.rpc('admin_block_communication_email_v2',{p_instance_id:scope.instanceId,p_email:email,p_actor:actor.id,p_note:body.note??null});
  if(error)return NextResponse.json({error:'A cím nem tiltható le.'},{status:409});
  if(typeof data!=='string'||!uuid.test(data))return NextResponse.json({error:'A tiltás létrehozásának eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,id:data});
 }
 if(body.action==='release'){
  if(!body.suppressionId)return NextResponse.json({error:'Hiányzó tiltásazonosító.'},{status:400});
  const{data,error}=await admin.rpc('admin_release_communication_suppression_v2',{p_instance_id:scope.instanceId,p_suppression_id:body.suppressionId,p_actor:actor.id,p_note:body.note??null});
  if(error||data!==true)return NextResponse.json({error:'A tiltás nem oldható fel.'},{status:409});return NextResponse.json({ok:true});
 }
 return NextResponse.json({error:'Érvénytelen művelet.'},{status:400});
}
