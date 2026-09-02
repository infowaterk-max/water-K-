import{NextResponse}from'next/server';import{z}from'zod';import{getAdminRequestUser}from'@/lib/auth/admin-api';import{createAdminClient}from'@/lib/supabase/admin';import{recordAdminAudit}from'@/lib/admin/audit';import{requireCurrentStoreContext}from'@/lib/instances/scope';
const bodySchema=z.object({role:z.enum(['customer','reseller']).optional(),resellerApproved:z.boolean().optional()}).refine(value=>Object.keys(value).length>0,'Nincs módosítás.');
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await getAdminRequestUser('sales.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let scope;try{scope=await requireCurrentStoreContext('sales.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
 const{id}=await params;if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen ügyfélazonosító.'},{status:400});
 let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const parsed=bodySchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen ügyféladat.'},{status:400});
 const admin=createAdminClient();
 const{data:link}=await admin.from('customer_commercial_metrics').select('customer_id').eq('instance_id',scope.instanceId).eq('customer_id',id).limit(1).maybeSingle();
 if(!link)return NextResponse.json({error:'Az ügyfél nem tartozik ehhez a webshophoz.'},{status:404});
 const{data:current,error:currentError}=await admin.from('profiles').select('role,reseller_approved,email,full_name').eq('id',id).maybeSingle();
 if(currentError||!current)return NextResponse.json({error:'Az ügyfél nem található.'},{status:404});
 if(current.role==='admin')return NextResponse.json({error:'Admin profil ezen a felületen nem módosítható.'},{status:409});
 const update:Record<string,unknown>={updated_at:new Date().toISOString()};if(parsed.data.role!==undefined)update.role=parsed.data.role;if(parsed.data.resellerApproved!==undefined)update.reseller_approved=parsed.data.resellerApproved;
 const{data:updated,error}=await admin.from('profiles').update(update).eq('id',id).neq('role','admin').select('role,reseller_approved,email,full_name').maybeSingle();
 if(error||!updated)return NextResponse.json({error:'Az ügyfél módosítása nem sikerült.'},{status:500});
 await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:'customer.access_updated',entityType:'customer_profile',entityId:id,summary:`${updated.email??updated.full_name??id} jogosultsága módosítva`,beforeState:current,afterState:updated,metadata:{fields:Object.keys(parsed.data),tenantLinked:true}});
 return NextResponse.json({ok:true});
}
