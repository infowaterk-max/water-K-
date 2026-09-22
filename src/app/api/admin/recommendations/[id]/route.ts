import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const schema=z.object({
  priority:z.number().int().min(0).max(10000).optional(),
  active:z.boolean().optional(),
  headline:z.string().trim().max(120).nullable().optional(),
}).refine(v=>Object.keys(v).length>0,'Nincs módosítás.');

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen azonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen módosítás.'},{status:400});

  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_mutate_product_recommendation_v2',{
    p_instance_id:scope.instanceId,p_rule_id:id,p_actor:actor.id,p_action:'update',p_payload:parsed.data
  });
  if(error){
    if(error.message.includes('RECOMMENDATION_NOT_FOUND'))return NextResponse.json({error:'A szabály nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A módosítás nem sikerült. Egyetlen változás sem került alkalmazásra.'},{status:500});
  }
  if(!(data as{id?:string}|null)?.id)return NextResponse.json({error:'A módosítás eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true});
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen azonosító.'},{status:400});

  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_mutate_product_recommendation_v2',{
    p_instance_id:scope.instanceId,p_rule_id:id,p_actor:actor.id,p_action:'delete',p_payload:{}
  });
  if(error){
    if(error.message.includes('RECOMMENDATION_NOT_FOUND'))return NextResponse.json({error:'A szabály nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A törlés nem sikerült. A szabályt nem tekintjük töröltnek.'},{status:500});
  }
  if(!(data as{id?:string}|null)?.id)return NextResponse.json({error:'A törlés eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true});
}
