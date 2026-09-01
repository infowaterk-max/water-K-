import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasCurrentPlanFeature } from '@/lib/plans/access';

type Body={action?:'block'|'release';email?:string;suppressionId?:string;note?:string};
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();if(profile?.role!=='admin')return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 if(!(await hasCurrentPlanFeature('officeCommunication')))return NextResponse.json({error:'A Digitális iroda kommunikáció a Pro csomag része.'},{status:403});
 let body:Body;try{body=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
 const admin=createAdminClient();
 if(body.action==='block'){
  const email=(body.email??'').trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'Érvénytelen e-mail cím.'},{status:400});
  const {data,error}=await admin.rpc('admin_block_communication_email',{p_email:email,p_actor:user.id,p_note:body.note??null});if(error||!data)return NextResponse.json({error:'A cím nem tiltható le.'},{status:409});return NextResponse.json({ok:true,id:data});
 }
 if(body.action==='release'){
  if(!body.suppressionId)return NextResponse.json({error:'Hiányzó tiltásazonosító.'},{status:400});
  const {data,error}=await admin.rpc('admin_release_communication_suppression',{p_suppression_id:body.suppressionId,p_actor:user.id,p_note:body.note??null});if(error||data!==true)return NextResponse.json({error:'A tiltás nem oldható fel.'},{status:409});return NextResponse.json({ok:true});
 }
 return NextResponse.json({error:'Érvénytelen művelet.'},{status:400});
}
