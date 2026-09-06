'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { ADDONS, type AddonCode } from '@/lib/plans/addons';
import { isPlanCode } from '@/lib/plans/catalog';
import { getServerPublicSiteUrl } from '@/lib/runtime/public-site-url';

const slugify=(value:string)=>value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roles=['owner','admin','staff'] as const;
const optional=(value:FormDataEntryValue|null,max:number)=>{const text=String(value??'').trim().slice(0,max);return text||null};
const safeUrl=(value:FormDataEntryValue|null)=>{const text=optional(value,500);if(!text)return null;try{const url=new URL(text);return ['http:','https:'].includes(url.protocol)?url.toString():null}catch{return null}};
const textField=(formData:FormData,key:string,max=240)=>String(formData.get(key)??'').trim().slice(0,max);
const jsonObject=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const platformWriteFailed=(operation:string,error?:{message?:string}|null):never=>{console.error(`platform webshop ${operation} failed`,error?.message??'missing database evidence');throw new Error('A platformmódosítás nem menthető. Az állapotot nem tekintjük módosítottnak.')};
const platformMutationEvidence=(data:unknown,instanceId:string,operation:string)=>{const result=(data??{})as{id?:string};if(result.id!==instanceId)platformWriteFailed(operation);return result};

export async function createWebshopInstanceAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const name=String(formData.get('name')??'').trim().slice(0,100);
  const slug=slugify(String(formData.get('slug')??name));
  const ownerEmail=String(formData.get('ownerEmail')??'').trim().toLowerCase();
  if(name.length<2||slug.length<2||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))redirect('/admin/platform/webaruhazak?create=invalid');
  const admin=createAdminClient();
  const{data:owner,error:ownerError}=await admin.from('profiles').select('id').ilike('email',ownerEmail).maybeSingle();
  if(ownerError||!owner?.id)redirect('/admin/platform/webaruhazak?create=owner-missing');
  const storefrontConfig={heroEyebrow:name,heroTitle:`Fedezd fel a ${name} kínálatát.`,heroLead:'Modern, gyors és átlátható vásárlási élmény.',primaryCtaLabel:'Irány a webáruház',secondaryCtaLabel:'További információ',introEyebrow:'Miért minket?',introTitle:'Egyszerűbb választás. Jobb vásárlási élmény.',introLead:'A termékek, információk és rendelési folyamat egy helyen, átláthatóan.',finalEyebrow:name,finalTitle:'Nézd meg a teljes kínálatot.'};
  const{error}=await admin.rpc('provision_webshop_tenant_v1',{p_name:name,p_slug:slug,p_owner_user_id:owner.id,p_actor_user_id:actor.id,p_storefront_config:storefrontConfig});
  if(error){console.error('atomic tenant provisioning failed',error.message);redirect('/admin/platform/webaruhazak?create=error')}
  revalidatePath('/admin/platform/webaruhazak');redirect('/admin/platform/webaruhazak?create=created');
}

export async function updateWebshopInstanceAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const id=String(formData.get('id')??''),plan=String(formData.get('plan')??''),status=String(formData.get('status')??'');
  if(!uuid.test(id)||!isPlanCode(plan)||!['pilot','active','suspended','archived'].includes(status))return;
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('platform_mutate_webshop_config_v3',{p_instance_id:id,p_actor:actor.id,p_action:'plan_status',p_payload:{plan,status}});
  if(error)platformWriteFailed('plan/status update',error);platformMutationEvidence(data,id,'plan/status update');
  revalidatePath('/admin/platform/webaruhazak');
}

export async function updateWebshopBrandingAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const id=String(formData.get('id')??''),brandName=String(formData.get('brandName')??'').trim().slice(0,100),primaryColor=optional(formData.get('primaryColor'),7),supportEmail=optional(formData.get('supportEmail'),254);
  if(!uuid.test(id)||brandName.length<2)return;
  if(primaryColor&&!/^#[0-9A-Fa-f]{6}$/.test(primaryColor))return;
  if(supportEmail&&!/^\S+@\S+\.\S+$/.test(supportEmail))return;
  const admin=createAdminClient();
  const payload={brandName,brandTagline:optional(formData.get('brandTagline'),180),logoUrl:safeUrl(formData.get('logoUrl')),primaryColor,supportEmail,supportPhone:optional(formData.get('supportPhone'),50),publicSiteUrl:safeUrl(formData.get('publicSiteUrl')),emailFromName:optional(formData.get('emailFromName'),100)};
  const{data,error}=await admin.rpc('platform_mutate_webshop_config_v3',{p_instance_id:id,p_actor:actor.id,p_action:'branding',p_payload:payload});
  if(error)platformWriteFailed('branding update',error);platformMutationEvidence(data,id,'branding update');
  revalidatePath('/admin/platform/webaruhazak');
}

export async function updateWebshopStorefrontAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const id=String(formData.get('id')??'');if(!uuid.test(id))return;
  const admin=createAdminClient();
  const{data:existing,error:loadError}=await admin.from('webshop_instances').select('storefront_config').eq('id',id).maybeSingle();
  if(loadError)platformWriteFailed('storefront config load',loadError);
  if(!existing)platformWriteFailed('storefront config load');
  // Builder Foundation: existing navigation/template/page-schema keys survive the legacy content editor.
  const config={...jsonObject(existing!.storefront_config),heroEyebrow:textField(formData,'heroEyebrow',120),heroTitle:textField(formData,'heroTitle',160),heroLead:textField(formData,'heroLead',320),primaryCtaLabel:textField(formData,'primaryCtaLabel',80),secondaryCtaLabel:textField(formData,'secondaryCtaLabel',80),introEyebrow:textField(formData,'introEyebrow',120),introTitle:textField(formData,'introTitle',160),introLead:textField(formData,'introLead',320),benefit1Title:textField(formData,'benefit1Title',100),benefit1Text:textField(formData,'benefit1Text',240),benefit2Title:textField(formData,'benefit2Title',100),benefit2Text:textField(formData,'benefit2Text',240),benefit3Title:textField(formData,'benefit3Title',100),benefit3Text:textField(formData,'benefit3Text',240),finalEyebrow:textField(formData,'finalEyebrow',120),finalTitle:textField(formData,'finalTitle',180)};
  const{data,error}=await admin.rpc('platform_mutate_webshop_config_v3',{p_instance_id:id,p_actor:actor.id,p_action:'storefront',p_payload:{storefrontConfig:config}});
  if(error)platformWriteFailed('storefront update',error);platformMutationEvidence(data,id,'storefront update');
  revalidatePath('/admin/platform/webaruhazak');revalidatePath('/');
}

export async function toggleWebshopAddonAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const instanceId=String(formData.get('instanceId')??''),addon=String(formData.get('addon')??'') as AddonCode,enabled=String(formData.get('enabled')??'')==='true';
  if(!uuid.test(instanceId)||!(addon in ADDONS))return;
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('platform_mutate_webshop_config_v3',{p_instance_id:instanceId,p_actor:actor.id,p_action:'addon',p_payload:{addon,enabled}});
  if(error)platformWriteFailed('addon update',error);platformMutationEvidence(data,instanceId,'addon update');
  revalidatePath('/admin/platform/webaruhazak');
}

export async function assignWebshopMemberAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const instanceId=String(formData.get('instanceId')??''),email=String(formData.get('email')??'').trim().toLowerCase(),role=String(formData.get('role')??'admin');
  if(!uuid.test(instanceId)||!/^\S+@\S+\.\S+$/.test(email)||!roles.includes(role as typeof roles[number]))redirect('/admin/platform/webaruhazak?member=invalid');
  const admin=createAdminClient();
  const{data:profile,error:profileError}=await admin.from('profiles').select('id').ilike('email',email).maybeSingle();
  if(profileError||!profile?.id)redirect('/admin/platform/webaruhazak?member=not-found');
  const{error}=await admin.rpc('platform_set_webshop_member_v2',{p_instance_id:instanceId,p_user_id:profile.id,p_role:role,p_actor_id:actor.id});
  if(error)redirect('/admin/platform/webaruhazak?member='+(error.message.includes('LAST_WEBSHOP_OWNER')?'last-owner':'error'));
  revalidatePath('/admin/platform/webaruhazak');redirect('/admin/platform/webaruhazak?member=saved');
}

export async function inviteWebshopOwnerAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const instanceId=String(formData.get('instanceId')??''),email=String(formData.get('email')??'').trim().toLowerCase(),fullName=String(formData.get('fullName')??'').trim().slice(0,100),companyName=String(formData.get('companyName')??'').trim().slice(0,120),role=String(formData.get('role')??'owner');
  if(!uuid.test(instanceId)||!/^\S+@\S+\.\S+$/.test(email)||!['owner','admin'].includes(role))redirect('/admin/platform/webaruhazak?invite=invalid');
  const admin=createAdminClient();
  const{data:existing,error:existingError}=await admin.from('profiles').select('id').ilike('email',email).maybeSingle();
  if(existingError)redirect('/admin/platform/webaruhazak?invite=error');
  if(existing?.id){
    const{error}=await admin.rpc('platform_set_webshop_member_v2',{p_instance_id:instanceId,p_user_id:existing.id,p_role:role,p_actor_id:actor.id});
    if(error)redirect('/admin/platform/webaruhazak?invite=error');
    revalidatePath('/admin/platform/webaruhazak');redirect('/admin/platform/webaruhazak?invite=existing-assigned');
  }
  const site=getServerPublicSiteUrl();
  if(!site){console.error('platform webshop invite failed: public site URL unavailable');redirect('/admin/platform/webaruhazak?invite=error')}
  const options={data:{full_name:fullName||undefined,company_name:companyName||undefined,webshop_instance_id:instanceId,webshop_role:role},redirectTo:`${site}/fiokom?auth_flow=invite&next=/admin`};
  const{data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,options);
  if(inviteError||!invited.user?.id)redirect('/admin/platform/webaruhazak?invite=error');
  const{error:membershipError}=await admin.rpc('platform_set_webshop_member_v2',{p_instance_id:instanceId,p_user_id:invited.user.id,p_role:role,p_actor_id:actor.id});
  if(membershipError)redirect('/admin/platform/webaruhazak?invite=membership-error');
  revalidatePath('/admin/platform/webaruhazak');redirect('/admin/platform/webaruhazak?invite=sent');
}

export async function removeWebshopMemberAction(formData:FormData){
  const actor=await requirePlatformOperator();
  const instanceId=String(formData.get('instanceId')??''),userId=String(formData.get('userId')??'');
  if(!uuid.test(instanceId)||!uuid.test(userId))redirect('/admin/platform/webaruhazak?member=invalid');
  const admin=createAdminClient();
  const{error}=await admin.rpc('platform_remove_webshop_member_v2',{p_instance_id:instanceId,p_user_id:userId,p_actor_id:actor.id});
  if(error)redirect('/admin/platform/webaruhazak?member='+(error.message.includes('LAST_WEBSHOP_OWNER')?'last-owner':'error'));
  revalidatePath('/admin/platform/webaruhazak');redirect('/admin/platform/webaruhazak?member=removed');
}
