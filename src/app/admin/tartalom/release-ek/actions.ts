'use server';

import {revalidatePath} from 'next/cache';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {getFeatureEntitlementDecision} from '@/lib/entitlements/access';
import {validateReleaseCommerceDefinition,type ReleaseCommerceDefinition} from '@/lib/commerce/release-commerce';

export type ReleaseCommerceDraft=Omit<ReleaseCommerceDefinition,'tenantId'|'version'>;
async function access(){const actor=await getAdminRequestUser('catalog.manage');if(!actor)throw new Error('Nincs jogosultság a release-ek kezeléséhez.');const scope=await requireCurrentStoreContext('catalog.manage');const entitlement=await getFeatureEntitlementDecision(scope.instanceId,'releaseCommerce');if(entitlement?.enabled!==true)throw new Error('A Release Commerce funkció nincs engedélyezve ennél a webshopnál.');return{actor,scope,admin:createAdminClient()};}
function refresh(){revalidatePath('/admin/tartalom/release-ek');revalidatePath('/admin/tartalom/builder');revalidatePath('/');}
export async function saveReleaseCommerceAction(input:ReleaseCommerceDraft){const{actor,scope,admin}=await access();const candidate={...structuredClone(input),version:1 as const,tenantId:scope.instanceId} satisfies ReleaseCommerceDefinition;let violations;try{violations=validateReleaseCommerceDefinition(candidate);}catch{throw new Error('A release adatszerkezete érvénytelen.');}if(violations.length)throw new Error(violations[0]?.message??'A release nem menthető.');const{data,error}=await admin.rpc('save_release_commerce_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_release:candidate});if(error)throw new Error(`A release mentése nem sikerült: ${error.message}`);const result=(data??{}) as{releaseKey?:string;releaseId?:string};if(result.releaseKey!==candidate.releaseKey||typeof result.releaseId!=='string')throw new Error('A release mentése nem igazolható.');refresh();return{releaseKey:result.releaseKey,releaseId:result.releaseId};}
export async function deleteReleaseCommerceAction(releaseKey:string){if(!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(releaseKey))throw new Error('Érvénytelen release azonosító.');const{actor,scope,admin}=await access();const{data:row,error:lookup}=await admin.from('release_definitions').select('id').eq('instance_id',scope.instanceId).eq('release_key',releaseKey).maybeSingle();if(lookup||!row)throw new Error('A release nem található.');const{data,error}=await admin.rpc('delete_release_commerce_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_release_id:row.id});if(error||data!==true)throw new Error('A release törlése nem sikerült.');refresh();return{deleted:true as const,releaseKey};}
