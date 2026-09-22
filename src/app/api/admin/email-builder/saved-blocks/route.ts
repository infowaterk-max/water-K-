import {NextResponse}from'next/server';
import {z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{emailBlockSchema}from'@/lib/email-builder/types';

const createSchema=z.object({name:z.string().trim().min(1).max(120),block:emailBlockSchema}).strict();
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};
async function access(){const actor=await getAdminRequestUser('marketing.manage');if(!actor)return null;try{return{actor,scope:await requireCurrentStoreContext('marketing.manage')}}catch{return null}}

export async function GET(){
  const auth=await access();if(!auth)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const admin=createAdminClient();
  const{data,error}=await admin.from('email_saved_blocks').select('id,name,block_type,schema_version,block,created_at,updated_at').eq('instance_id',auth.scope.instanceId).order('updated_at',{ascending:false}).limit(100);
  if(error)return NextResponse.json({error:'A saját blokkok nem tölthetők be.'},{status:500});
  return NextResponse.json({savedBlocks:data??[]},{headers:{'cache-control':'no-store'}});
}

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const auth=await access();if(!auth)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const body=await request.json().catch(()=>null),parsed=createSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen saját blokk.',details:parsed.error.flatten()},{status:400});
  const admin=createAdminClient(),input=parsed.data;
  const{data:id,error}=await admin.rpc('save_email_saved_block_v1',{p_instance_id:auth.scope.instanceId,p_actor:auth.actor.id,p_name:input.name,p_block:input.block});
  if(error||typeof id!=='string')return NextResponse.json({error:'A saját blokk nem menthető.'},{status:500});
  const{data:evidence,error:evidenceError}=await admin.from('email_saved_blocks').select('id,name,block_type,schema_version,block,created_at,updated_at').eq('instance_id',auth.scope.instanceId).eq('id',id).maybeSingle();
  if(evidenceError||!evidence)return NextResponse.json({error:'A saját blokk mentésének bizonyítéka hiányzik.'},{status:500});
  return NextResponse.json({savedBlock:evidence},{status:201});
}
