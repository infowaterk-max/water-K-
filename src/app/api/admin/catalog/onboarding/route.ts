import{createHash}from'node:crypto';
import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{slugifyCatalogValue}from'@/lib/catalog-import';

const attributes=z.record(z.string().max(500)).default({});
const onboardingVariant=z.object({sku:z.string().trim().min(1).max(120),label:z.string().trim().min(1).max(200),netPrice:z.number().int().min(0).max(10000000),grossPrice:z.number().int().min(0).max(10000000),stock:z.number().int().min(0).max(100000).default(0),active:z.boolean().default(true)});
const body=z.object({
  idempotencyKey:z.string().trim().min(16).max(120),name:z.string().trim().min(1).max(200),slug:z.string().trim().max(120).optional(),
  sku:z.string().trim().min(1).max(120),variantLabel:z.string().trim().max(200).optional(),netPrice:z.number().int().min(0).max(10000000),grossPrice:z.number().int().min(0).max(10000000),stock:z.number().int().min(0).max(100000).default(0),
  category:z.string().trim().max(120).optional(),attributes,shortDescription:z.string().trim().max(1000).optional(),description:z.string().trim().max(20000).optional(),
  seoTitle:z.string().trim().max(200).optional(),seoDescription:z.string().trim().max(500).optional(),b2cVisible:z.boolean().default(true),b2bVisible:z.boolean().default(false),
  variants:z.array(onboardingVariant).min(1).max(100).optional()
});

export async function POST(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=body.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'A termékadatok érvénytelenek.'},{status:400});
  const slug=slugifyCatalogValue(parsed.data.slug||parsed.data.name);if(!slug)return NextResponse.json({error:'A terméknévből nem képezhető érvényes slug.'},{status:400});
  const cleanAttributes=Object.fromEntries(Object.entries(parsed.data.attributes).map(([key,value])=>[key.trim(),value.trim()]).filter(([key,value])=>key&&value));
  if(Object.keys(cleanAttributes).some(key=>key.length>120))return NextResponse.json({error:'Az attribútumnév legfeljebb 120 karakter lehet.'},{status:400});
  const product={name:parsed.data.name,slug,sku:parsed.data.sku,variantLabel:parsed.data.variantLabel||parsed.data.name,netPrice:parsed.data.netPrice,grossPrice:parsed.data.grossPrice,stock:parsed.data.stock,category:parsed.data.category||undefined,categorySlug:parsed.data.category?slugifyCatalogValue(parsed.data.category):undefined,attributes:cleanAttributes,shortDescription:parsed.data.shortDescription||undefined,description:parsed.data.description||undefined,seoTitle:parsed.data.seoTitle||undefined,seoDescription:parsed.data.seoDescription||undefined,b2cVisible:parsed.data.b2cVisible,b2bVisible:parsed.data.b2bVisible};
  const variants=parsed.data.variants?.map(item=>({sku:item.sku.trim(),label:item.label.trim(),netPrice:item.netPrice,grossPrice:item.grossPrice,stock:item.stock,active:item.active}));
  if(variants){const normalized=variants.map(item=>item.sku.toLocaleLowerCase('hu-HU'));if(new Set(normalized).size!==normalized.length)return NextResponse.json({error:'A variánsok között duplikált SKU található.'},{status:409})}
  const payloadHash=createHash('sha256').update(JSON.stringify(variants?{product,variants}:product)).digest('hex');const admin=createAdminClient();
  const call=variants?admin.rpc('create_catalog_draft_v2',{p_instance_id:scope.instanceId,p_actor:actor.id,p_idempotency_key:parsed.data.idempotencyKey,p_payload_hash:payloadHash,p_product:product,p_variants:variants}):admin.rpc('create_catalog_draft_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_idempotency_key:parsed.data.idempotencyKey,p_payload_hash:payloadHash,p_product:product});
  const{data,error}=await call;
  if(error){const message=String(error.message??'');if(message.includes('CATALOG_ONBOARDING_IDEMPOTENCY_CONFLICT'))return NextResponse.json({error:'Az idempotenciakulcs már más termékhez tartozik.'},{status:409});if(message.includes('CATALOG_VARIANTS_INVALID')||message.includes('CATALOG_VARIANT_SKU_DUPLICATE'))return NextResponse.json({error:'A variánsmátrix érvénytelen vagy duplikált SKU-t tartalmaz.'},{status:409});if(message.includes('products_instance_slug_uidx'))return NextResponse.json({error:'Ez a termék-slug már létezik ebben a webshopban.'},{status:409});if(message.includes('product_variants_instance_sku_uidx'))return NextResponse.json({error:'Legalább egy SKU már létezik ebben a webshopban.'},{status:409});if(message.includes('CATALOG_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});return NextResponse.json({error:'A termékpiszkozat nem hozható létre biztonságosan.'},{status:409})}
  const result=(data??{})as{productId?:string;variantId?:string;variantIds?:string[];draft?:boolean;updatedAt?:string};const hasVerifiedVariants=variants?Array.isArray(result.variantIds)&&result.variantIds.length===variants.length:Boolean(result.variantId);
  if(!result.productId||!hasVerifiedVariants||result.draft!==true)return NextResponse.json({error:'A termékpiszkozat eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,...result});
}