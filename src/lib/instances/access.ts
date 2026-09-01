import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlanCode, type PlanCode } from '@/lib/plans/catalog';

export type StorefrontConfig={
  heroEyebrow?:string;heroTitle?:string;heroLead?:string;primaryCtaLabel?:string;secondaryCtaLabel?:string;
  introEyebrow?:string;introTitle?:string;introLead?:string;finalEyebrow?:string;finalTitle?:string;
  benefit1Title?:string;benefit1Text?:string;benefit2Title?:string;benefit2Text?:string;benefit3Title?:string;benefit3Text?:string;
};
export type WebshopInstance={
  id:string;organizationId:string|null;slug:string;name:string;subscriptionPlan:PlanCode;status:'pilot'|'active'|'suspended'|'archived';
  brand:{name:string;tagline:string|null;logoUrl:string|null;primaryColor:string|null;supportEmail:string|null;supportPhone:string|null;publicSiteUrl:string|null;emailFromName:string|null;};
  storefront:StorefrontConfig;
};
type InstanceRow={id:string;organization_id:string|null;slug:string;name:string;subscription_plan:string;status:WebshopInstance['status'];brand_name:string|null;brand_tagline:string|null;logo_url:string|null;primary_color:string|null;support_email:string|null;support_phone:string|null;public_site_url:string|null;email_from_name:string|null;storefront_config:unknown};
const SELECT='id,organization_id,slug,name,subscription_plan,status,brand_name,brand_tagline,logo_url,primary_color,support_email,support_phone,public_site_url,email_from_name,storefront_config';
const normalizeConfig=(value:unknown):StorefrontConfig=>value&&typeof value==='object'&&!Array.isArray(value)?value as StorefrontConfig:{};
const normalize=(row:InstanceRow|null):WebshopInstance|null=>row&&isPlanCode(row.subscription_plan)?{id:row.id,organizationId:row.organization_id,slug:row.slug,name:row.name,subscriptionPlan:row.subscription_plan,status:row.status,brand:{name:row.brand_name?.trim()||row.name,tagline:row.brand_tagline,logoUrl:row.logo_url,primaryColor:row.primary_color,supportEmail:row.support_email,supportPhone:row.support_phone,publicSiteUrl:row.public_site_url,emailFromName:row.email_from_name},storefront:normalizeConfig(row.storefront_config)}:null;

export async function getCurrentWebshopInstance():Promise<WebshopInstance|null>{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return null;
  let admin:ReturnType<typeof createAdminClient>;try{admin=createAdminClient()}catch{return null}
  const configuredSlug=process.env.WEBSHOP_INSTANCE_SLUG?.trim().toLowerCase();
  if(configuredSlug){const{data}=await admin.from('webshop_instances').select(SELECT).eq('slug',configuredSlug).in('status',['pilot','active']).maybeSingle();return normalize(data as unknown as InstanceRow|null)}
  const supabase=await createClient(),{data:auth}=await supabase.auth.getUser();if(!auth.user)return null;
  const{data:memberships}=await admin.from('webshop_instance_members').select('instance_id').eq('user_id',auth.user.id).limit(2);if(!memberships||memberships.length!==1)return null;
  const{data}=await admin.from('webshop_instances').select(SELECT).eq('id',memberships[0].instance_id).in('status',['pilot','active']).maybeSingle();return normalize(data as unknown as InstanceRow|null);
}
