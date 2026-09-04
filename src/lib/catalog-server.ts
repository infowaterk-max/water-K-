import type { Product } from '@/lib/catalog';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

type ProductAudience=Product['audience'];
type SalesChannelCode='b2c'|'b2b';
type VariantRow={id:string;sku:string;label:string;net_price_huf:number;gross_price_huf:number;reseller_net_price_huf:number|null;reseller_gross_price_huf:number|null;stock_quantity:number;weight_grams:number|null;minimum_order_quantity:number|null;order_multiple:number|null;product_id:string;instance_id:string|null;products:{slug:string;name:string;short_description:string|null;active:boolean;audience:string|null;featured:boolean|null;use_cases:string[]|null;highlights:string[]|null;instance_id:string|null}|null};
type ChannelRow={product_id:string;channel_code:SalesChannelCode;visible:boolean;gross_price:number|null;minimum_quantity:number;discount_percent:number|null};

const slugify=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const variantSlug=(productSlug:string,label:string,sku:string)=>{const suffix=slugify(label)||slugify(sku);return suffix?`${productSlug}-${suffix}`:productSlug};
const normalizeAudience=(value:string|null|undefined):ProductAudience=>value==='professional'?'professional':'retail';
const positiveInt=(value:number|null|undefined,fallback=1)=>{const numeric=Number(value);return Number.isFinite(numeric)&&numeric>0?Math.max(1,Math.floor(numeric)):fallback};
const normalizeMinimum=(minimum:number,multiple:number)=>Math.ceil(Math.max(1,minimum)/Math.max(1,multiple))*Math.max(1,multiple);
const deriveNet=(gross:number,baseGross:number,baseNet:number)=>baseGross>0?Math.max(0,Math.round(gross*(baseNet/baseGross))):Math.max(0,gross);
const normalizeDiscount=(discount:number|null|undefined)=>discount==null?null:Math.min(100,Math.max(0,Number(discount)));
const applyDiscount=(value:number,discount:number|null|undefined)=>discount==null?value:Math.max(0,Math.round(value*(1-Math.min(100,Math.max(0,Number(discount)))/100)));

export async function getProducts(options:{includeAllChannels?:boolean;throwOnError?:boolean}={}):Promise<Product[]>{
  try{
    const instance=await getCurrentWebshopInstance();
    if(!instance){if(options.throwOnError)throw new Error('webshop_instance_missing');return[];}
    const admin=createAdminClient(),includeAllChannels=options.includeAllChannels===true;
    let approvedReseller=false;
    if(!includeAllChannels){
      try{
        const supabase=await createClient();
        const{data:{user}}=await supabase.auth.getUser();
        if(user){
          const{data:relation}=await admin.from('customer_instance_roles').select('role,reseller_approved').eq('instance_id',instance.id).eq('user_id',user.id).maybeSingle();
          approvedReseller=relation?.role==='reseller'&&relation.reseller_approved===true;
          if(approvedReseller){
            const{data:channelState,error:channelError}=await admin.from('webshop_sales_channels').select('enabled').eq('instance_id',instance.id).eq('channel_code','b2b').maybeSingle();
            approvedReseller=!channelError&&channelState?.enabled===true;
          }
        }
      }catch{approvedReseller=false}
    }
    const channel:SalesChannelCode=approvedReseller?'b2b':'b2c';
    const{data,error}=await admin.from('product_variants')
      .select('id,sku,label,net_price_huf,gross_price_huf,reseller_net_price_huf,reseller_gross_price_huf,stock_quantity,weight_grams,minimum_order_quantity,order_multiple,product_id,instance_id,products!inner(slug,name,short_description,active,audience,featured,use_cases,highlights,instance_id)')
      .eq('instance_id',instance.id).eq('active',true).eq('products.instance_id',instance.id).eq('products.active',true).order('gross_price_huf');
    if(error){if(options.throwOnError)throw error;return[];}if(!data?.length)return[];
    const rows=data as unknown as VariantRow[],productIds=[...new Set(rows.map(row=>row.product_id))];
    let channelRows:ChannelRow[]=[];
    if(!includeAllChannels&&productIds.length){
      const{data:settings,error:settingsError}=await admin.from('product_channel_settings').select('product_id,channel_code,visible,gross_price,minimum_quantity,discount_percent').eq('instance_id',instance.id).eq('channel_code',channel).in('product_id',productIds);
      if(settingsError){if(options.throwOnError)throw settingsError;return[];}
      channelRows=(settings??[]) as ChannelRow[];
    }
    const settingByProduct=new Map(channelRows.map(row=>[row.product_id,row]));
    const activeCount=new Map<string,number>();for(const row of rows)activeCount.set(row.product_id,(activeCount.get(row.product_id)??0)+1);
    return rows.filter(row=>row.instance_id===instance.id&&row.products?.instance_id===instance.id).filter(row=>{
      if(includeAllChannels)return true;
      const setting=settingByProduct.get(row.product_id);
      if(channel==='b2b')return setting?.visible===true;
      return setting?setting.visible:normalizeAudience(row.products?.audience)!=='professional';
    }).map(row=>{
      const product=row.products,setting=includeAllChannels?undefined:settingByProduct.get(row.product_id),baseSlug=product?.slug||slugify(product?.name||row.sku)||row.id;
      const resellerBase=channel==='b2b'&&row.reseller_gross_price_huf!=null;
      const baseGross=resellerBase?Number(row.reseller_gross_price_huf):Number(row.gross_price_huf);
      const baseNet=resellerBase?(row.reseller_net_price_huf!=null?Number(row.reseller_net_price_huf):deriveNet(baseGross,Number(row.gross_price_huf),Number(row.net_price_huf))):Number(row.net_price_huf);
      const explicitChannelPrice=!includeAllChannels&&setting?.gross_price!=null&&(activeCount.get(row.product_id)??0)===1&&!resellerBase;
      let grossPrice=explicitChannelPrice?Math.max(0,Number(setting?.gross_price??baseGross)):baseGross;
      let netPrice=explicitChannelPrice?deriveNet(grossPrice,baseGross,baseNet):baseNet;
      const discountPercent=!explicitChannelPrice&&!includeAllChannels?normalizeDiscount(setting?.discount_percent):null;
      const originalGrossPrice=discountPercent!=null&&discountPercent>0?grossPrice:undefined;
      if(discountPercent!=null&&discountPercent>0){grossPrice=applyDiscount(grossPrice,discountPercent);netPrice=applyDiscount(netPrice,discountPercent);}
      const orderMultiple=positiveInt(row.order_multiple),minimumQuantity=normalizeMinimum(Math.max(positiveInt(row.minimum_order_quantity),positiveInt(setting?.minimum_quantity)),orderMultiple);
      return{id:row.id,sku:row.sku,slug:variantSlug(baseSlug,row.label,row.sku),name:[product?.name,row.label].filter(Boolean).join(' '),size:row.label,grossPrice,netPrice,originalGrossPrice,discountPercent:discountPercent??undefined,stock:row.stock_quantity,short:product?.short_description??'',featured:product?.featured??false,weightGrams:row.weight_grams??0,audience:normalizeAudience(product?.audience),useCases:product?.use_cases??[],highlights:product?.highlights??[],minimumQuantity,orderMultiple};
    });
  }catch(error){if(options.throwOnError)throw error;return[]}
}
