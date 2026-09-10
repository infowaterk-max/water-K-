import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeWorkflowEvidence } from '@/lib/automation/event-driven-workflows';
import type { GrowthRow,MerchantDecisionSnapshot as DecisionSnapshot,OpportunityRow,PromotionPreview,ProposalRow,VariantRow } from './merchant-intelligence-core';
export { buildMerchantDecisionCards,deterministicDecisionExplanation } from './merchant-intelligence-core';
export type { DecisionEvidence,MerchantDecisionCard,MerchantDecisionSnapshot } from './merchant-intelligence-core';

export const MERCHANT_DECISIONING_VERSION='block18.v1';
const n=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;

export async function loadMerchantDecisionSnapshot(instanceId:string):Promise<DecisionSnapshot>{
  const admin=createAdminClient();
  const[growthResult,opportunityResult,offerResult,proposalResult,variantResult]=await Promise.all([
    admin.from('v9_growth_dashboard_v2').select('at_risk_customers,winback_customers,open_checkout_recoveries,due_journey_steps,overdue_resellers,due_soon_resellers').eq('instance_id',instanceId).maybeSingle(),
    admin.from('commercial_opportunities').select('id,channel,kind,status,priority_score,expected_value_net_huf,probability_percent,due_at').eq('instance_id',instanceId).in('status',['open','in_progress']).order('priority_score',{ascending:false}).limit(100),
    admin.from('commercial_offers').select('id,status,variant_id,discount_percent,minimum_margin_percent').eq('instance_id',instanceId).in('status',['draft','approved','sent']).order('created_at',{ascending:false}).limit(25),
    admin.from('action_proposals').select('id,status,action_kind,impact_class,risk_score,expires_at').eq('instance_id',instanceId).in('status',['proposed','simulated','approved']).order('risk_score',{ascending:false}).limit(25),
    admin.from('product_variants').select('id,sku,label,net_price_huf,unit_cost_net_huf,stock_quantity,active').eq('instance_id',instanceId).eq('active',true).order('sku').limit(500),
  ]);
  const loadError=growthResult.error||opportunityResult.error||offerResult.error||proposalResult.error||variantResult.error;
  if(loadError)throw new Error(`BLOCK18_DECISION_EVIDENCE_LOAD_FAILED:${loadError.message}`);

  const offers=(offerResult.data??[])as Array<{id:string;status:string;variant_id:string;discount_percent:number;minimum_margin_percent:number}>;
  const promotionPreviews:PromotionPreview[]=await Promise.all(offers.map(async offer=>{
    const{data,error}=await admin.rpc('preview_promotion_margin_v2',{p_instance_id:instanceId,p_variant_id:offer.variant_id,p_discount_percent:n(offer.discount_percent),p_min_margin_percent:n(offer.minimum_margin_percent)});
    if(error||!data||typeof data!=='object')return{offerId:offer.id,ok:false,minimumMarginPercent:n(offer.minimum_margin_percent),discountPercent:n(offer.discount_percent),variantId:offer.variant_id};
    const preview=sanitizeWorkflowEvidence(data as Record<string,unknown>);
    return{
      offerId:offer.id,ok:typeof preview.safe==='boolean',safe:typeof preview.safe==='boolean'?preview.safe:undefined,
      marginPercent:Number.isFinite(Number(preview.marginPercent))?Number(preview.marginPercent):undefined,
      minimumMarginPercent:n(offer.minimum_margin_percent),discountPercent:n(offer.discount_percent),variantId:offer.variant_id,
    };
  }));

  return{
    growth:(growthResult.data??null)as GrowthRow|null,
    opportunities:(opportunityResult.data??[])as OpportunityRow[],
    proposals:(proposalResult.data??[])as ProposalRow[],
    variants:(variantResult.data??[])as VariantRow[],
    promotionPreviews,
  };
}
