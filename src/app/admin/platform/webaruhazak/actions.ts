'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { ADDONS, type AddonCode } from '@/lib/plans/addons';
import { isPlanCode } from '@/lib/plans/catalog';

const slugify=(value:string)=>value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roles=['owner','admin','staff'] as const;

export async function createWebshopInstanceAction(formData:FormData){
 await requirePlatformOperator();
 const name=String(formData.get('name')??'').trim().slice(0,100),slug=slugify(String(formData.get('slug')??name)),plan=String(formData.get('plan')??'pro');
 if(name.length<2||slug.length<2||!isPlanCode(plan))return;
 const admin=createAdminClient();
 await admin.from('webshop_instances').insert({name,slug,subscription_plan:plan,status:'pilot'});
 revalidatePath('/admin/platform/webaruhazak');
}

export async function updateWebshopInstanceAction(formData:FormData){
 await requirePlatformOperator();
 const id=String(formData.get('id')??''),plan=String(formData.get('plan')??''),status=String(formData.get('status')??'');
 if(!uuid.test(id)||!isPlanCode(plan)||!['pilot','active','suspended','archived'].includes(status))return;
 const admin=createAdminClient();
 await admin.from('webshop_instances').update({subscription_plan:plan,status,updated_at:new Date().toISOString()}).eq('id',id);
 revalidatePath('/admin/platform/webaruhazak');
}

export async function toggleWebshopAddonAction(formData:FormData){
 await requirePlatformOperator();
 const instanceId=String(formData.get('instanceId')??''),addon=String(formData.get('addon')??'') as AddonCode,enabled=String(formData.get('enabled')??'')==='true';
 if(!uuid.test(instanceId)||!(addon in ADDONS))return;
 const admin=createAdminClient();
 await admin.from('webshop_instance_addons').upsert({instance_id:instanceId,addon_code:addon,enabled,updated_at:new Date().toISOString()},{onConflict:'instance_id,addon_code'});
 revalidatePath('/admin/platform/webaruhazak');
}

export async function assignWebshopMemberAction(formData:FormData){
 await requirePlatformOperator();
 const instanceId=String(formData.get('instanceId')??''),email=String(formData.get('email')??'').trim().toLowerCase(),role=String(formData.get('role')??'admin');
 if(!uuid.test(instanceId)||!/^\S+@\S+\.\S+$/.test(email)||!roles.includes(role as typeof roles[number]))return;
 const admin=createAdminClient();
 const{data:profile}=await admin.from('profiles').select('id').ilike('email',email).maybeSingle();
 if(!profile?.id)return;
 await admin.from('webshop_instance_members').upsert({instance_id:instanceId,user_id:profile.id,role},{onConflict:'instance_id,user_id'});
 revalidatePath('/admin/platform/webaruhazak');
}

export async function inviteWebshopOwnerAction(formData:FormData){
 await requirePlatformOperator();
 const instanceId=String(formData.get('instanceId')??''),email=String(formData.get('email')??'').trim().toLowerCase(),fullName=String(formData.get('fullName')??'').trim().slice(0,100),companyName=String(formData.get('companyName')??'').trim().slice(0,120),role=String(formData.get('role')??'owner');
 if(!uuid.test(instanceId)||!/^\S+@\S+\.\S+$/.test(email)||!['owner','admin'].includes(role))redirect('/admin/platform/webaruhazak?invite=invalid');
 const admin=createAdminClient();
 const{data:existing}=await admin.from('profiles').select('id').ilike('email',email).maybeSingle();
 if(existing?.id){
   const{error}=await admin.from('webshop_instance_members').upsert({instance_id:instanceId,user_id:existing.id,role},{onConflict:'instance_id,user_id'});
   if(error)redirect('/admin/platform/webaruhazak?invite=error');
   revalidatePath('/admin/platform/webaruhazak');
   redirect('/admin/platform/webaruhazak?invite=existing-assigned');
 }
 const site=(process.env.NEXT_PUBLIC_SITE_URL??'').replace(/\/$/,'');
 const options={data:{full_name:fullName||undefined,company_name:companyName||undefined,webshop_instance_id:instanceId,webshop_role:role},...(site.startsWith('http://')||site.startsWith('https://')?{redirectTo:`${site}/fiokom?next=/admin`}:{})};
 const{data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,options);
 if(inviteError||!invited.user?.id)redirect('/admin/platform/webaruhazak?invite=error');
 const{error:membershipError}=await admin.from('webshop_instance_members').upsert({instance_id:instanceId,user_id:invited.user.id,role},{onConflict:'instance_id,user_id'});
 if(membershipError)redirect('/admin/platform/webaruhazak?invite=membership-error');
 revalidatePath('/admin/platform/webaruhazak');
 redirect('/admin/platform/webaruhazak?invite=sent');
}

export async function removeWebshopMemberAction(formData:FormData){
 await requirePlatformOperator();
 const instanceId=String(formData.get('instanceId')??''),userId=String(formData.get('userId')??'');
 if(!uuid.test(instanceId)||!uuid.test(userId))return;
 const admin=createAdminClient();
 await admin.from('webshop_instance_members').delete().eq('instance_id',instanceId).eq('user_id',userId);
 revalidatePath('/admin/platform/webaruhazak');
}
