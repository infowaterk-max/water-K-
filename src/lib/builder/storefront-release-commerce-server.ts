import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {buildReleaseCommerceReadModel,type ReleaseCommerceCatalogItem,type ReleaseCommerceDefinition,type ReleaseCommerceReadModel} from '@/lib/commerce/release-commerce';

export type StorefrontReleaseOption={releaseKey:string;title:string;startsAt:string;endsAt:string|null};
export type StorefrontReleaseCatalogOption={productId:string;variantId:string;label:string};
export type StorefrontReleaseCommerceBundle={definitions:readonly ReleaseCommerceDefinition[];releases:readonly ReleaseCommerceReadModel[];options:readonly StorefrontReleaseOption[];dropProducts:readonly Record<string,unknown>[];releaseStatus:string};
type ReleaseRow={id:string;release_key:string;title:string;summary:string|null;starts_at:string;ends_at:string|null;active:boolean};
type ItemRow={release_id:string;item_key:string;product_id:string;variant_id:string;label:string|null;sort_order:number};
type ProductRow={id:string;slug:string;name:string;active:boolean;audience:string|null};
type VariantRow={id:string;product_id:string;label:string;gross_price_huf:number;stock_quantity:number;active:boolean};
type ChannelRow={product_id:string;visible:boolean;gross_price:number|null;discount_percent:number|null};

const applyDiscount=(value:number,discount:number|null)=>discount==null?value:Math.max(0,Math.round(value*(1-Math.min(100,Math.max(0,discount))/100)));
const money=(value:number)=>`${new Intl.NumberFormat('hu-HU').format(value)} Ft`;

export async function getStorefrontReleaseCatalogOptionsForInstance(instanceId:string):Promise<readonly StorefrontReleaseCatalogOption[]>{
  const admin=createAdminClient();
  const[productResult,variantResult]=await Promise.all([
    admin.from('products').select('id,name,active').eq('instance_id',instanceId).eq('active',true).order('name').limit(1000),
    admin.from('product_variants').select('id,product_id,label,active').eq('instance_id',instanceId).eq('active',true),
  ]);
  if(productResult.error)throw new Error(`RELEASE_COMMERCE_PRODUCT_OPTIONS_FAILED:${productResult.error.message}`);
  if(variantResult.error)throw new Error(`RELEASE_COMMERCE_VARIANT_OPTIONS_FAILED:${variantResult.error.message}`);
  const products=new Map((productResult.data??[]).map(row=>[row.id,String(row.name??'')]));
  return Object.freeze((variantResult.data??[]).flatMap(row=>{const productName=products.get(row.product_id);return productName?[{productId:row.product_id,variantId:row.id,label:[productName,String(row.label??'')].filter(Boolean).join(' · ')}]:[];}).sort((a,b)=>a.label.localeCompare(b.label,'hu')));
}

export async function getReleaseCommerceDefinitionsForInstance(instanceId:string,includeInactive=false):Promise<readonly ReleaseCommerceDefinition[]>{
  const admin=createAdminClient();
  let query=admin.from('release_definitions').select('id,release_key,title,summary,starts_at,ends_at,active').eq('instance_id',instanceId).order('starts_at',{ascending:true}).limit(200);
  if(!includeInactive)query=query.eq('active',true);
  const{data,error}=await query;if(error)throw new Error(`RELEASE_COMMERCE_RELEASES_FAILED:${error.message}`);
  const rows=(data??[]) as ReleaseRow[];if(!rows.length)return[];
  const ids=rows.map(row=>row.id);
  const itemResult=await admin.from('release_items').select('release_id,item_key,product_id,variant_id,label,sort_order').eq('instance_id',instanceId).in('release_id',ids).order('sort_order');
  if(itemResult.error)throw new Error(`RELEASE_COMMERCE_ITEMS_FAILED:${itemResult.error.message}`);
  const byRelease=new Map<string,ItemRow[]>();for(const item of(itemResult.data??[]) as ItemRow[]{const list=byRelease.get(item.release_id)??[];list.push(item);byRelease.set(item.release_id,list);}
  return Object.freeze(rows.map(row=>({version:1 as const,tenantId:instanceId,releaseKey:row.release_key,title:row.title,summary:row.summary,startsAt:row.starts_at,endsAt:row.ends_at,active:row.active,items:(byRelease.get(row.id)??[]).map(item=>({itemId:item.item_key,productId:item.product_id,variantId:item.variant_id,label:item.label??undefined}))})));
}

export async function getStorefrontReleaseCommerceBundleForInstance(instanceId:string):Promise<StorefrontReleaseCommerceBundle>{
  const definitions=await getReleaseCommerceDefinitionsForInstance(instanceId,false);
  if(!definitions.length)return{definitions:[],releases:[],options:[],dropProducts:[],releaseStatus:'Nincs aktív release státusz.'};
  const mapped=definitions.flatMap(release=>release.items),productIds=[...new Set(mapped.map(item=>item.productId))];
  const admin=createAdminClient();
  const[productResult,variantResult,channelResult]=productIds.length?await Promise.all([
    admin.from('products').select('id,slug,name,active,audience').eq('instance_id',instanceId).in('id',productIds),
    admin.from('product_variants').select('id,product_id,label,gross_price_huf,stock_quantity,active').eq('instance_id',instanceId).in('product_id',productIds),
    admin.from('product_channel_settings').select('product_id,visible,gross_price,discount_percent').eq('instance_id',instanceId).eq('channel_code','b2c').in('product_id',productIds),
  ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}];
  if(productResult.error)throw new Error(`RELEASE_COMMERCE_PRODUCTS_FAILED:${productResult.error.message}`);if(variantResult.error)throw new Error(`RELEASE_COMMERCE_VARIANTS_FAILED:${variantResult.error.message}`);if(channelResult.error)throw new Error(`RELEASE_COMMERCE_CHANNEL_FAILED:${channelResult.error.message}`);
  const products=new Map(((productResult.data??[]) as ProductRow[]).map(item=>[item.id,item]));
  const variants=(variantResult.data??[]) as VariantRow[],variantsById=new Map(variants.map(item=>[item.id,item])),activeVariantCount=new Map<string,number>();
  for(const variant of variants)if(variant.active)activeVariantCount.set(variant.product_id,(activeVariantCount.get(variant.product_id)??0)+1);
  const channels=new Map(((channelResult.data??[]) as ChannelRow[]).map(item=>[item.product_id,item]));
  const catalog:ReleaseCommerceCatalogItem[]=[];
  for(const mapping of mapped){
    const variant=variantsById.get(mapping.variantId),product=products.get(mapping.productId);if(!variant||!product||variant.product_id!==product.id)continue;
    const channel=channels.get(product.id),channelVisible=channel?channel.visible:product.audience!=='professional',explicit=channel?.gross_price!=null&&(activeVariantCount.get(product.id)??0)===1;
    const base=explicit?Math.max(0,Number(channel?.gross_price)):Math.max(0,Number(variant.gross_price_huf)),gross=explicit?base:applyDiscount(base,channel?.discount_percent==null?null:Number(channel.discount_percent));
    catalog.push({productId:product.id,variantId:variant.id,id:variant.id,name:[product.name,variant.label].filter(Boolean).join(' · '),href:`/termek/${encodeURIComponent(product.slug)}`,image:null,imageAlt:product.name,price:gross,compareAtPrice:null,badge:'',stockLabel:variant.stock_quantity>0?'Készleten':'Jelenleg nem készleten',subtitle:'',eligible:product.active&&variant.active,channelVisible,stockQuantity:Math.max(0,Number(variant.stock_quantity)),priceSource:'shared-pricing-authority',stockSource:'shared-inventory-authority'});
  }
  const now=new Date(),models=definitions.map(release=>buildReleaseCommerceReadModel({release,catalog,now}));
  const live=models.filter(item=>item.state==='live').sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt));
  const upcoming=models.filter(item=>item.state==='scheduled').sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  const ended=models.filter(item=>item.state==='ended').sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt));
  const ordered=Object.freeze([...live,...upcoming,...ended]),primary=live[0]??upcoming[0]??ended[0]??null;
  const releaseStatus=primary?`${primary.title} · ${primary.statusLabel}${primary.state==='scheduled'?` · ${new Date(primary.startsAt).toISOString()}`:''}`:'Nincs aktív release státusz.';
  const dropProducts=primary?.state==='live'?Object.freeze(primary.items.map(item=>({id:item.id,name:item.name,href:item.href,image:item.image,imageAlt:item.imageAlt,price:item.price,compareAtPrice:item.compareAtPrice,badge:item.stockQuantity>0?'LIVE':'ELFOGYOTT',stockLabel:item.stockLabel,subtitle:item.subtitle}))):[];
  return{definitions,releases:ordered,options:Object.freeze(definitions.map(item=>({releaseKey:item.releaseKey,title:item.title,startsAt:item.startsAt,endsAt:item.endsAt??null}))),dropProducts,releaseStatus};
}

export async function getCurrentStorefrontReleaseCommerceBundle(){const scope=await requireCurrentStoreContext('store.read');return getStorefrontReleaseCommerceBundleForInstance(scope.instanceId);}
export async function getCurrentStorefrontReleaseCatalogOptions(){const scope=await requireCurrentStoreContext('catalog.manage');return getStorefrontReleaseCatalogOptionsForInstance(scope.instanceId);}
