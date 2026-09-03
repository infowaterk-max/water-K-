import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const bodySchema=z.object({role:z.enum(['customer','reseller']).optional(),resellerApproved:z.boolean().optional()}).refine(value=>Object.keys(value).length>0,'Nincs módosítás.');

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('sales.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('sales.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen ügyfélazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=bodySchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen ügyféladat.'},{status:400});

  const admin=createAdminClient();
  const{data:current,error:currentError}=await admin.from('customer_instance_roles')
    .select('updated_at').eq('instance_id',scope.instanceId).eq('user_id',id).maybeSingle();
  if(currentError||!current)return NextResponse.json({error:'Az ügyfél nem tartozik ehhez a webshophoz.'},{status:404});

  const{data,error}=await admin.rpc('admin_update_customer_store_role_v2',{
    p_instance_id:scope.instanceId,
    p_user_id:id,
    p_actor:actor.id,
    p_expected_updated_at:current.updated_at,
    p_patch:parsed.data
  });
  if(error){
    if(error.message.includes('STALE_CUSTOMER_ROLE'))return NextResponse.json({error:'A partnerstátuszt időközben valaki más módosította. Frissítsd az oldalt.'},{status:409});
    if(error.message.includes('CUSTOMER_ROLE_NOT_FOUND'))return NextResponse.json({error:'Az ügyfél nem tartozik ehhez a webshophoz.'},{status:404});
    if(error.message.includes('SALES_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A partnerstátusz módosítása nem sikerült. Egyetlen változás sem került alkalmazásra.'},{status:500});
  }
  const result=(data??{})as{role?:string;resellerApproved?:boolean};
  if(!result.role)return NextResponse.json({error:'A partnerstátusz módosítása nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,role:result.role,resellerApproved:result.resellerApproved===true});
}
