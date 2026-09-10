import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{slugifyCatalogValue}from'@/lib/catalog-import';

const uuid=z.string().uuid();
const attributes=z.record(z.string().max(500)).default({});
const variant=z.object({id:uuid.optional(),sku:z.string().trim().min(1).max(120),label:z.string().trim().min(1).max(200),netPrice:z.number().int().min(0).max(10000000),grossPrice:z.number().int().min(0).max(10000000),stock:z.number().int().min(0).max(100000),active:z.boolean(),mediaId:uuid.nullable().optional()});
const body=z.object({expectedUpdatedAt:z.string().datetime({offset:true}),name:z.string().trim().min(1).max(200),slug:z.string().trim().max(120).optional(),shortDescription:z.string().trim().max(1000).optional(),description:z.string().trim().max(20000).optional(),seoTitle:z.string().trim().max(200).optional(),seoDescription:z.string().trim().max(500).optional(),category:z.string().trim().max(120).optional(),attributes,channels:z.object({b2c:z.boolean(),b2b:z.boolean()}),variants:z.array(variant).min(1).max(100)});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;if(!uuid.safeParse(id).success)return NextResponse.json({error:'Érvénytelen termékazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=body.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'A termékpiszkozat adatai érvénytelenek.'},{status:400});
  const slug=slugifyCatalogValue(parsed.data.slug||parsed.data.name);if(!slug)return NextResponse.json({error:'A terméknévből nem képezhető érvényes slug.'},{status:400});
  const cleanAttributes=Object.fromEntries(Object.entries(parsed.data.attributes).map(([key,value])=>[key.trim(),value.trim()]).filter(([key,value])=>key&&value));
  if(Object.keys(cleanAttributes).some(key=>key.length>120))return NextResponse.json({error:'Az attribútumnév legfeljebb 120 karakter lehet.'},{status:400});
  const normalizedSkus=parsed.data.variants.map(item=>item.sku.toLocaleLowerCase('hu-HU'));if(new Set(normalizedSkus).size!==normalizedSkus.length)return NextResponse.json({error:'A variánsok között duplikált SKU található.'},{status:409});
  const ids=parsed.data.variants.flatMap(item=>item.id?[item.id]:[]);if(new Set(ids).size!==ids.length)return NextResponse.json({error:'A variánslista duplikált azonosítót tartalmaz.'},{status:409});
  const product={name:parsed.data.name,slug,shortDescription:parsed.data.shortDescription||undefined,description:parsed.data.description||undefined,seoTitle:parsed.data.seoTitle||undefined,seoDescription:parsed.data.seoDescription||undefined,category:parsed.data.category||undefined,categorySlug:parsed.data.category?slugifyCatalogValue(parsed.data.category):undefined,attributes:cleanAttributes};
  const variants=parsed.data.variants.map(item=>({id:item.id,sku:item.sku.trim(),label:item.label.trim(),netPrice:item.netPrice,grossPrice:item.grossPrice,stock:item.stock,active:item.active,mediaId:item.mediaId??null}));
  const admin=createAdminClient();const{data,error}=await admin.rpc('update_catalog_draft_v1',{p_instance_id:scope.instanceId,p_product_id:id,p_actor:actor.id,p_expected_updated_at:parsed.data.expectedUpdatedAt,p_product:product,p_variants:variants,p_channels:parsed.data.channels});
  if(error){const message=String(error.message??'');if(message.includes('CATALOG_DRAFT_STALE'))return NextResponse.json({error:'A piszkozat időközben egy másik ablakban módosult. Töltsd újra az oldalt, hogy ne írjuk felül a frissebb változatot.',code:'stale'},{status:409});if(message.includes('PRODUCT_NOT_FOUND'))return NextResponse.json({error:'A termék nem található ebben a webshopban.'},{status:404});if(message.includes('CATALOG_DRAFT_ALREADY_PUBLISHED'))return NextResponse.json({error:'Ez a termék már publikálva van; a piszkozat-szerkesztő nem írhatja felül.'},{status:409});if(message.includes('CATALOG_MEDIA_FOREIGN')||message.includes('CATALOG_VARIANT_FOREIGN'))return NextResponse.json({error:'A variáns vagy a kép nem ehhez a termékhez és webshophoz tartozik.'},{status:409});if(message.includes('CATALOG_VARIANT_SKU_DUPLICATE')||message.includes('product_variants_instance_sku'))return NextResponse.json({error:'A variánsok között vagy a webshopban már létezik ez az SKU.'},{status:409});if(message.includes('products_instance_slug'))return NextResponse.json({error:'Ez a termék-slug már létezik ebben a webshopban.'},{status:409});if(message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});return NextResponse.json({error:'A piszkozat atomi mentése nem sikerült; részleges állapot nem maradt hátra.'},{status:409})}
  const result=(data??{})as{productId?:string;variantIds?:string[];variantCount?:number;draft?:boolean;updatedAt?:string};if(result.productId!==id||result.draft!==true||!result.updatedAt||!Array.isArray(result.variantIds)||result.variantIds.length!==parsed.data.variants.length)return NextResponse.json({error:'A mentés eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,...result});
}