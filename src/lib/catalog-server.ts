import type { Product } from '@/lib/catalog';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

type ProductAudience = Product['audience'];
type VariantRow={id:string;sku:string;label:string;net_price_huf:number;gross_price_huf:number;reseller_gross_price_huf:number|null;stock_quantity:number;weight_grams:number|null;product_id:string;instance_id:string|null;products:{slug:string;name:string;short_description:string|null;active:boolean;audience:string|null;featured:boolean|null;use_cases:string[]|null;highlights:string[]|null;instance_id:string|null}|null};
const slugify=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const variantSlug=(productSlug:string,label:string,sku:string)=>{const suffix=slugify(label)||slugify(sku);return suffix?`${productSlug}-${suffix}`:productSlug};
const normalizeAudience=(value:string|null|undefined):ProductAudience=>value==='professional'?'professional':'retail';
const resellerNetPrice=(row:VariantRow)=>{const gross=row.reseller_gross_price_huf;if(gross==null)return row.net_price_huf;if(row.gross_price_huf<=0)return gross;return Math.round(gross*(row.net_price_huf/row.gross_price_huf))};

export async function getProducts():Promise<Product[]>{
  try{
    const instance=await getCurrentWebshopInstance();
    if(!instance)return[];
    const admin=createAdminClient();
    let approvedReseller=false;
    try{
      const supabase=await createClient();
      const{data:{user}}=await supabase.auth.getUser();
      if(user){
        const{data:relation}=await admin.from('customer_instance_roles').select('role,reseller_approved').eq('instance_id',instance.id).eq('user_id',user.id).maybeSingle();
        approvedReseller=relation?.role==='reseller'&&relation.reseller_approved===true;
      }
    }catch{}
    // Storefront catalogue is resolved server-side with the service client. Direct anonymous table
    // enumeration remains blocked; channel visibility and price are reduced to the safe Product DTO.
    const{data,error}=await admin.from('product_variants')
      .select('id,sku,label,net_price_huf,gross_price_huf,reseller_gross_price_huf,stock_quantity,weight_grams,product_id,instance_id,products!inner(slug,name,short_description,active,audience,featured,use_cases,highlights,instance_id)')
      .eq('instance_id',instance.id).eq('active',true).eq('products.instance_id',instance.id).eq('products.active',true).order('gross_price_huf');
    if(error||!data?.length)return[];
    return(data as unknown as VariantRow[])
      .filter(row=>row.instance_id===instance.id&&row.products?.instance_id===instance.id)
      .filter(row=>approvedReseller||normalizeAudience(row.products?.audience)!=='professional')
      .map(row=>{
        const product=row.products,baseSlug=product?.slug||slugify(product?.name||row.sku)||row.id;
        const grossPrice=approvedReseller&&row.reseller_gross_price_huf!=null?row.reseller_gross_price_huf:row.gross_price_huf;
        const netPrice=approvedReseller?resellerNetPrice(row):row.net_price_huf;
        return{id:row.id,sku:row.sku,slug:variantSlug(baseSlug,row.label,row.sku),name:[product?.name,row.label].filter(Boolean).join(' '),size:row.label,grossPrice,netPrice,stock:row.stock_quantity,short:product?.short_description??'',featured:product?.featured??false,weightGrams:row.weight_grams??0,audience:normalizeAudience(product?.audience),useCases:product?.use_cases??[],highlights:product?.highlights??[]};
      });
  }catch{return[]}
}
