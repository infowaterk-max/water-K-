import{NextResponse}from'next/server';import{z}from'zod';import{getAdminRequestUser}from'@/lib/auth/admin-api';import{createAdminClient}from'@/lib/supabase/admin';import{recordAdminAudit}from'@/lib/admin/audit';import{requireCurrentStoreContext}from'@/lib/instances/scope';
const bodySchema=z.object({role:z.enum(['customer','reseller']).optional(),resellerApproved:z.boolean().optional()}).refine(value=>Object.keys(value).length>0,'Nincs módosítás.');
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await getAdminRequestUser('sales.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let scope;try{scope=await requireCurrentStoreContext('sales.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
 const{id}=await params;if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen ügyfélazonosító.'},{status:400});
 let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const parsed=bodySchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen ügyféladat.'},{status:400});
 const admin=createAdminClient();
 const{data:current,error:currentError}=await admin.from('customer_instance_roles').select('user_id,role,reseller_approved,reseller_requested_at,approved_at,approved_by,updated_at').eq('instance_id',scope.instanceId).eq('user_id',id).maybeSingle();
 if(currentError||!current)return NextResponse.json({error:'Az ügyfél nem tartozik ehhez a webshophoz.'},{status:404});
 const nextRole=parsed.data.role??current.role,nextApproved=nextRole==='reseller'?(parsed.data.resellerApproved??current.reseller_approved):false,now=new Date().toISOString();
 const update={role:nextRole,reseller_approved:nextApproved,reseller_requested_at:nextRole==='reseller'?(current.reseller_requested_at??now):null,approved_at:nextApproved?(current.approved_at??now):null,approved_by:nextApproved?actor.id:null,updated_at:now};
 const{data:updated,error}=await admin.from('customer_instance_roles').update(update).eq('instance_id',scope.instanceId).eq('user_id',id).eq('updated_at',current.updated_at).select('user_id,role,reseller_approved,reseller_requested_at,approved_at,approved_by,updated_at').maybeSingle();
 if(error)return NextResponse.json({error:'A partnerstátusz módosítása nem sikerült.'},{status:500});
 if(!updated)return NextResponse.json({error:'A partnerstátuszt időközben valaki más módosította. Frissítsd az oldalt.'},{status:409});
 const{data:profile}=await admin.from('profiles').select('email,full_name').eq('id',id).maybeSingle();
 await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:'customer.store_role_updated',entityType:'customer_instance_role',entityId:id,summary:`${profile?.email??profile?.full_name??id} webshop-szerepköre módosítva`,beforeState:current,afterState:updated,metadata:{fields:Object.keys(parsed.data)}});
 return NextResponse.json({ok:true,role:updated.role,resellerApproved:updated.reseller_approved});
}
