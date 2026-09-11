import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';

const uuid=z.string().uuid();
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};
async function access(){const actor=await getAdminRequestUser('marketing.manage');if(!actor)return null;try{return{actor,scope:await requireCurrentStoreContext('marketing.manage')}}catch{return null}}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const auth=await access();if(!auth)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const{id}=await params;if(!uuid.safeParse(id).success)return NextResponse.json({error:'Érvénytelen saját blokk azonosító.'},{status:400});
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('delete_email_saved_block_v1',{p_instance_id:auth.scope.instanceId,p_actor:auth.actor.id,p_saved_block_id:id});
  if(error||data!==true)return NextResponse.json({error:'A saját blokk nem törölhető.'},{status:error?.message?.includes('NOT_FOUND')?404:500});
  const{data:evidence,error:evidenceError}=await admin.from('email_saved_blocks').select('id').eq('instance_id',auth.scope.instanceId).eq('id',id).maybeSingle();
  if(evidenceError||evidence)return NextResponse.json({error:'A saját blokk törlésének bizonyítéka hiányzik.'},{status:500});
  return NextResponse.json({ok:true});
}
