import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailDesignOverrideSchema } from '@/lib/email-builder/types';

const httpUrl=z.string().url().refine(value=>{const protocol=new URL(value).protocol;return protocol==='http:'||protocol==='https:';},'Only http/https URLs are allowed');
const companyDetails=z.object({companyName:z.string().max(240).optional(),address:z.string().max(1000).optional(),taxNumber:z.string().max(120).optional(),phone:z.string().max(120).optional(),email:z.string().email().max(320).optional()}).strict().default({});
const socialLinks=z.object({facebook:httpUrl.optional(),instagram:httpUrl.optional(),linkedin:httpUrl.optional(),youtube:httpUrl.optional(),tiktok:httpUrl.optional()}).strict().default({});
const saveSchema=z.object({name:z.string().trim().min(1).max(120),logoUrl:httpUrl.nullable().optional(),tokens:emailDesignOverrideSchema,companyDetails,socialLinks}).strict();
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};
async function access(){const actor=await getAdminRequestUser('marketing.manage');if(!actor)return null;try{return{actor,scope:await requireCurrentStoreContext('marketing.manage')}}catch{return null}}

export async function GET(){
  const auth=await access();if(!auth)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const admin=createAdminClient();
  const{data,error}=await admin.from('email_brand_kits').select('id,name,is_default,logo_url,tokens,company_details,social_links,created_at,updated_at').eq('instance_id',auth.scope.instanceId).eq('is_default',true).maybeSingle();
  if(error)return NextResponse.json({error:'A Brand Kit nem tölthető be.'},{status:500});
  return NextResponse.json({brandKit:data??null},{headers:{'cache-control':'no-store'}});
}

export async function PUT(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const auth=await access();if(!auth)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const body=await request.json().catch(()=>null),parsed=saveSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen Brand Kit adat.',details:parsed.error.flatten()},{status:400});
  const input=parsed.data,admin=createAdminClient();
  const{data:id,error}=await admin.rpc('save_default_email_brand_kit_v1',{p_instance_id:auth.scope.instanceId,p_actor:auth.actor.id,p_name:input.name,p_logo_url:input.logoUrl??null,p_tokens:input.tokens,p_company_details:input.companyDetails,p_social_links:input.socialLinks});
  if(error||typeof id!=='string')return NextResponse.json({error:'A Brand Kit nem menthető.'},{status:500});
  const{data:evidence,error:evidenceError}=await admin.from('email_brand_kits').select('id,name,is_default,logo_url,tokens,company_details,social_links,updated_at').eq('instance_id',auth.scope.instanceId).eq('id',id).eq('is_default',true).maybeSingle();
  if(evidenceError||!evidence)return NextResponse.json({error:'A Brand Kit mentésének bizonyítéka hiányzik.'},{status:500});
  return NextResponse.json({brandKit:evidence});
}
