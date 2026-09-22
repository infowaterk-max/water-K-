import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import type {InteractiveSceneProductProjection,InteractiveSceneVariantProjection} from '@/lib/commerce/interactive-scene';
import type {StorefrontInteractiveSceneProductOption} from '@/lib/builder/storefront-interactive-scene';

export type StorefrontInteractiveSceneCatalog={
  products:readonly InteractiveSceneProductProjection[];
  options:readonly StorefrontInteractiveSceneProductOption[];
};

type ProductRow={id:string;slug:string;name:string;active:boolean;audience:string|null;template_demo_image_url:string|null};
type VariantRow={id:string;product_id:string;label:string;gross_price_huf:number;stock_quantity:number;active:boolean;primary_media_id:string|null};
type MediaRow={id:string;storage_path:string};
type ChannelRow={product_id:string;visible:boolean;gross_price:number|null;discount_percent:number|null};
const formatHuf=(value:number)=>`${new Intl.NumberFormat('hu-HU').format(value)} Ft`;
const applyDiscount=(value:number,discount:number|null)=>discount==null?value:Math.max(0,Math.round(value*(1-Math.min(100,Math.max(0,discount))/100)));

/** Internal tenant-scoped read model. Callers must supply an already-authorized instance id. */
export async function getStorefrontInteractiveSceneCatalogForInstance(instanceId:string):Promise<StorefrontInteractiveSceneCatalog>{
  const admin=createAdminClient();
  const[productResult,variantResult,channelResult]=await Promise.all([
    admin.from('products').select('id,slug,name,active,audience,template_demo_image_url').eq('instance_id',instanceId).eq('active',true).order('name').limit(500),
    admin.from('product_variants').select('id,product_id,label,gross_price_huf,stock_quantity,active,primary_media_id').eq('instance_id',instanceId).eq('active',true),
    admin.from('product_channel_settings').select('product_id,visible,gross_price,discount_percent').eq('instance_id',instanceId).eq('channel_code','b2c'),
  ]);
  if(productResult.error)throw new Error(`INTERACTIVE_SCENE_PRODUCTS_FAILED:${productResult.error.message}`);
  if(variantResult.error)throw new Error(`INTERACTIVE_SCENE_VARIANTS_FAILED:${variantResult.error.message}`);
  if(channelResult.error)throw new Error(`INTERACTIVE_SCENE_CHANNEL_FAILED:${channelResult.error.message}`);
  const products=(productResult.data??[]) as ProductRow[];
  const variants=(variantResult.data??[]) as VariantRow[];
  const primaryMediaIds=[...new Set(variants.flatMap(variant=>variant.primary_media_id?[variant.primary_media_id]:[]))];
  const mediaUrlById=new Map<string,string>();
  if(primaryMediaIds.length){
    const{data:media,error:mediaError}=await admin.from('product_media').select('id,storage_path').eq('instance_id',instanceId).in('id',primaryMediaIds);
    if(mediaError)throw new Error(`INTERACTIVE_SCENE_PRODUCT_MEDIA_FAILED:${mediaError.message}`);
    for(const item of(media??[]) as MediaRow[])mediaUrlById.set(item.id,admin.storage.from('product-media').getPublicUrl(item.storage_path).data.publicUrl);
  }
  const channels=new Map(((channelResult.data??[]) as ChannelRow[]).map(row=>[row.product_id,row]));
  const variantsByProduct=new Map<string,VariantRow[]>();
  for(const row of variants){const list=variantsByProduct.get(row.product_id)??[];list.push(row);variantsByProduct.set(row.product_id,list);}
  const projections:InteractiveSceneProductProjection[]=products.map(product=>{
    const productVariants=variantsByProduct.get(product.id)??[];
    const channel=channels.get(product.id);
    const channelVisible=channel?channel.visible:product.audience!=='professional';
    const activeVariantCount=productVariants.filter(variant=>variant.active).length;
    const variantProjections:InteractiveSceneVariantProjection[]=productVariants.map(variant=>{
      const explicit=channel?.gross_price!=null&&activeVariantCount===1;
      const base=explicit?Math.max(0,Number(channel?.gross_price)):Math.max(0,Number(variant.gross_price_huf));
      const gross=explicit?base:applyDiscount(base,channel?.discount_percent==null?null:Number(channel.discount_percent));
      const stock=Math.max(0,Number(variant.stock_quantity));
      return{
        variantId:variant.id,
        label:String(variant.label??'').trim()||'Alapértelmezett változat',
        eligible:Boolean(product.active&&variant.active),
        channelVisible,
        price:{amountMinor:gross,currency:'HUF',display:formatHuf(gross),source:'shared-pricing-authority'},
        stock:{available:stock>0,statusLabel:stock>0?'Készleten':'Jelenleg nem készleten'},
      };
    });
    const visible=variantProjections.filter(variant=>variant.eligible&&variant.channelVisible);
    const prices=visible.map(variant=>variant.price.amountMinor);
    const minPrice=prices.length?Math.min(...prices):null;
    const maxPrice=prices.length?Math.max(...prices):null;
    const stockAvailable=visible.some(variant=>variant.stock.available);
    const primaryMediaId=productVariants.find(variant=>variant.active&&variant.primary_media_id)?.primary_media_id??productVariants.find(variant=>variant.primary_media_id)?.primary_media_id??null;
    const imageUrl=primaryMediaId?mediaUrlById.get(primaryMediaId)??product.template_demo_image_url??null:product.template_demo_image_url??null;
    const slug=typeof product.slug==='string'?product.slug.trim():'';
    return{
      productId:product.id,
      label:product.name,
      href:slug?`/termek/${encodeURIComponent(slug)}`:'#',
      eligible:Boolean(product.active&&visible.length&&slug),
      priceDisplay:minPrice===null?null:minPrice===maxPrice?formatHuf(minPrice):`${formatHuf(minPrice)}-tól`,
      stockLabel:visible.length?(stockAvailable?'Készleten':'Jelenleg nem készleten'):null,
      imageUrl,
      variants:Object.freeze(variantProjections),
    } satisfies InteractiveSceneProductProjection;
  });
  return{
    products:Object.freeze(projections),
    options:Object.freeze(projections.filter(product=>product.eligible).map(product=>({
      productId:product.productId,
      label:product.label,
      variants:Object.freeze((product.variants??[]).filter(variant=>variant.eligible&&variant.channelVisible).map(variant=>({
        variantId:variant.variantId,
        label:variant.label,
        priceDisplay:variant.price.display,
        stockLabel:variant.stock.statusLabel,
        available:variant.stock.available,
      }))),
    }))),
  };
}

/** Tenant-scoped Builder read model. It owns no commerce state. */
export async function getCurrentStorefrontInteractiveSceneCatalog():Promise<StorefrontInteractiveSceneCatalog>{
  const scope=await requireCurrentStoreContext('store.read');
  return getStorefrontInteractiveSceneCatalogForInstance(scope.instanceId);
}
