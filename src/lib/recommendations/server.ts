import type { Product } from '@/lib/catalog';
import { createAdminClient } from '@/lib/supabase/admin';

export type RecommendationPlacement='cart'|'post_purchase';
export type RecommendationRule={id:string;sourceVariantId:string|null;recommendedVariantId:string;placement:RecommendationPlacement;priority:number;active:boolean;headline:string|null};

type RuleRow={id:string;source_variant_id:string|null;recommended_variant_id:string;placement:RecommendationPlacement;priority:number;active:boolean;headline:string|null};

export async function getRecommendationRules(placement?:RecommendationPlacement):Promise<RecommendationRule[]>{
 try{const admin=createAdminClient();let query=admin.from('product_recommendation_rules').select('id,source_variant_id,recommended_variant_id,placement,priority,active,headline').order('priority',{ascending:true});if(placement)query=query.eq('placement',placement);const{data,error}=await query;if(error)return[];return((data??[])as RuleRow[]).map(row=>({id:row.id,sourceVariantId:row.source_variant_id,recommendedVariantId:row.recommended_variant_id,placement:row.placement,priority:row.priority,active:row.active,headline:row.headline}));}catch{return[];}
}

export async function getConfiguredRecommendations(products:Product[],placement:RecommendationPlacement):Promise<{rules:RecommendationRule[];fallback:Product[]}>{
 const rules=(await getRecommendationRules(placement)).filter(rule=>rule.active);return{rules,fallback:products.filter(product=>product.stock>0)};
}
