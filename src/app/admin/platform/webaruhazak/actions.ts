'use server';

import { revalidatePath } from 'next/cache';
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

export async function removeWebshopMemberAction(formData:FormData){
 await requirePlatformOperator();
 const instanceId=String(formData.get('instanceId')??''),userId=String(formData.get('userId')??'');
 if(!uuid.test(instanceId)||!uuid.test(userId))return;
 const admin=createAdminClient();
 await admin.from('webshop_instance_members').delete().eq('instance_id',instanceId).eq('user_id',userId);
 revalidatePath('/admin/platform/webaruhazak');
}
