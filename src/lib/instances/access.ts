import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlanCode, type PlanCode } from '@/lib/plans/catalog';

export type WebshopInstance={
  id:string;
  slug:string;
  name:string;
  subscriptionPlan:PlanCode;
  status:'pilot'|'active'|'suspended'|'archived';
};

type InstanceRow={id:string;slug:string;name:string;subscription_plan:string;status:WebshopInstance['status']};
const normalize=(row:InstanceRow|null):WebshopInstance|null=>row&&isPlanCode(row.subscription_plan)?{id:row.id,slug:row.slug,name:row.name,subscriptionPlan:row.subscription_plan,status:row.status}:null;

export async function getCurrentWebshopInstance():Promise<WebshopInstance|null>{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  let admin:ReturnType<typeof createAdminClient>;
  try{admin=createAdminClient()}catch{return null}
  const configuredSlug=process.env.WEBSHOP_INSTANCE_SLUG?.trim().toLowerCase();
  if(configuredSlug){
    const{data}=await admin.from('webshop_instances').select('id,slug,name,subscription_plan,status').eq('slug',configuredSlug).in('status',['pilot','active']).maybeSingle();
    return normalize(data as InstanceRow|null);
  }
  const supabase=await createClient();
  const{data:auth}=await supabase.auth.getUser();
  if(!auth.user)return null;
  const{data:memberships}=await admin.from('webshop_instance_members').select('instance_id').eq('user_id',auth.user.id).limit(2);
  if(!memberships||memberships.length!==1)return null;
  const{data}=await admin.from('webshop_instances').select('id,slug,name,subscription_plan,status').eq('id',memberships[0].instance_id).in('status',['pilot','active']).maybeSingle();
  return normalize(data as InstanceRow|null);
}
