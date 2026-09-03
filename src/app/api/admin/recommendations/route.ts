import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const schema=z.object({
  sourceVariantId:z.string().uuid().nullable(),
  recommendedVariantId:z.string().uuid(),
  placement:z.enum(['cart','post_purchase']),
  priority:z.number().int().min(0).max(10000).default(100),
  headline:z.string().trim().max(120).nullable().optional(),
}).refine(v=>v.sourceVariantId!==v.recommendedVariantId,'A termék nem ajánlhatja saját magát.');

export async function POST(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen ajánlási szabály.'},{status:400});

  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_mutate_product_recommendation_v2',{
    p_instance_id:scope.instanceId,
    p_rule_id:null,
    p_actor:actor.id,
    p_action:'create',
    p_payload:parsed.data
  });
  if(error){
    if(error.message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    if(/TENANT_MISMATCH|SELF_REFERENCE/.test(error.message))return NextResponse.json({error:'Az ajánlás csak az aktuális webshop különböző termékei között hozható létre.'},{status:409});
    return NextResponse.json({error:'A szabály mentése nem sikerült. Lehet, hogy ez a kapcsolat már létezik.'},{status:409});
  }
  const id=(data as{id?:string}|null)?.id;
  if(!id)return NextResponse.json({error:'A szabály mentése nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,id});
}
