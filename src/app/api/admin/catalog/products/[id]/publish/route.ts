import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';

const uuid=z.string().uuid();const body=z.object({variantIds:z.array(uuid).min(1).max(100).refine(ids=>new Set(ids).size===ids.length,'Duplikált variánsazonosító.')});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;if(!uuid.safeParse(id).success)return NextResponse.json({error:'Érvénytelen termékazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}const parsed=body.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'A publikálási adatok érvénytelenek.'},{status:400});
  const admin=createAdminClient();const{data,error}=await admin.rpc('publish_catalog_product_v1',{p_instance_id:scope.instanceId,p_product_id:id,p_actor:actor.id,p_variant_ids:parsed.data.variantIds});
  if(error){const message=String(error.message??'');if(message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});if(message.includes('PRODUCT_NOT_FOUND'))return NextResponse.json({error:'A termék nem található ebben a webshopban.'},{status:404});if(message.includes('CATALOG_PUBLISH_NOT_DRAFT'))return NextResponse.json({error:'Ez a termék már publikálva van.'},{status:409});if(message.includes('CATALOG_PUBLISH_VARIANTS_INVALID'))return NextResponse.json({error:'A publikáláshoz legalább egy, ehhez a termékhez tartozó variáns szükséges.'},{status:409});return NextResponse.json({error:'A termék publikálása nem sikerült. Egyetlen részleges állapot sem maradt hátra.'},{status:500})}
  const result=(data??{})as{productId?:string;published?:boolean;activeVariantCount?:number};if(result.productId!==id||result.published!==true)return NextResponse.json({error:'A publikálás eredménye nem igazolható.'},{status:500});return NextResponse.json(result);
}