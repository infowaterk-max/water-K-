import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {
  collectStorefrontGrowthMarketingCouponCodes,
  type StorefrontGrowthMarketingSurface,
} from '@/lib/builder/storefront-growth-marketing';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export type StorefrontPromotionReadModel={
  code:string;
  description:string;
  discountLabel:string;
  minimumLabel:string;
  expiresAt:string|null;
  validityLabel:string;
  source:'canonical-coupon-authority';
};
export type StorefrontGrowthMarketingBundle={promotions:Readonly<Record<string,StorefrontPromotionReadModel>>};

type CouponRow={
  code:string;
  description:string|null;
  discount_type:'percent'|'fixed';
  discount_value:number;
  min_subtotal_huf:number;
  max_discount_huf:number|null;
  usage_limit:number|null;
  usage_count:number;
  starts_at:string|null;
  ends_at:string|null;
  active:boolean;
};

const huf=(value:number)=>`${new Intl.NumberFormat('hu-HU').format(Math.max(0,Math.round(value)))} Ft`;
const activeNow=(row:CouponRow,now:number)=>row.active
  &&(row.starts_at===null||Date.parse(row.starts_at)<=now)
  &&(row.ends_at===null||Date.parse(row.ends_at)>now)
  &&(row.usage_limit===null||Number(row.usage_count)<Number(row.usage_limit));

function toReadModel(row:CouponRow):StorefrontPromotionReadModel{
  const baseDiscount=row.discount_type==='percent'?`${row.discount_value}% kedvezmény`:`${huf(row.discount_value)} kedvezmény`;
  const discountLabel=row.discount_type==='percent'&&row.max_discount_huf!==null?`${baseDiscount} · legfeljebb ${huf(row.max_discount_huf)}`:baseDiscount;
  const minimumLabel=row.min_subtotal_huf>0?`${huf(row.min_subtotal_huf)} kosárértéktől`:'Nincs minimum kosárérték';
  const validityLabel=row.ends_at?`Érvényes: ${new Intl.DateTimeFormat('hu-HU',{dateStyle:'medium',timeZone:'Europe/Budapest'}).format(new Date(row.ends_at))}-ig`:'Visszavonásig érvényes';
  return{code:row.code,description:row.description??'',discountLabel,minimumLabel,expiresAt:row.ends_at,validityLabel,source:'canonical-coupon-authority'};
}

/**
 * Reads only coupon codes explicitly referenced by the Page Schema. An active
 * private coupon is therefore never exposed merely because it exists in the tenant.
 */
export async function getStorefrontGrowthMarketingBundleForInstance(instanceId:string,document:StorefrontPageDocument):Promise<StorefrontGrowthMarketingBundle>{
  const codes=collectStorefrontGrowthMarketingCouponCodes(document);
  if(!codes.length)return{promotions:Object.freeze({})};
  const admin=createAdminClient();
  const{data,error}=await admin.from('coupons')
    .select('code,description,discount_type,discount_value,min_subtotal_huf,max_discount_huf,usage_limit,usage_count,starts_at,ends_at,active')
    .eq('instance_id',instanceId)
    .in('code',[...codes])
    .limit(codes.length);
  if(error)return{promotions:Object.freeze({})};
  const now=Date.now(),promotions:Record<string,StorefrontPromotionReadModel>={};
  for(const row of(data??[]) as CouponRow[])if(codes.includes(row.code)&&activeNow(row,now))promotions[row.code]=toReadModel(row);
  return{promotions:Object.freeze(promotions)};
}

// Type-only anchor documents that this server projection belongs to the Wave 8 surface catalogue.
export type StorefrontGrowthMarketingServerSurface=StorefrontGrowthMarketingSurface;
