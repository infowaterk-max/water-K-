export type CommerceAutonomyMode='off'|'supervised'|'bounded';
export type CommerceRiskClass='low'|'medium'|'high'|'critical';
export type CommerceOptimizationActionKind=
  |'workflow.inventory-pressure'
  |'workflow.customer-value-risk'
  |'commerce.promotion-adjustment'
  |'commerce.inventory-adjustment'
  |'commerce.price-adjustment'
  |'commerce.merchandising-adjustment';
export type BoundedAutonomousActionKind=Extract<CommerceOptimizationActionKind,'workflow.inventory-pressure'|'workflow.customer-value-risk'>;

export const BOUNDED_AUTONOMOUS_ACTIONS:readonly BoundedAutonomousActionKind[]=['workflow.inventory-pressure','workflow.customer-value-risk'] as const;

export type PredictiveEvidence={label:string;value:string|number;source:string};
export type PredictiveGuardMetrics={
  marginPercent?:number;
  projectedInventoryQuantity?:number;
  discountPercent?:number;
  budgetSpendNetHuf?:number;
};
export type PredictiveCommerceSignal={
  key:string;
  kind:'inventory'|'promotion'|'commercial'|'customer'|'evidence-quality';
  title:string;
  summary:string;
  expectedOutcome:string;
  recommendation:string;
  confidence:number;
  riskScore:number;
  riskClass:CommerceRiskClass;
  expectedImpactNetHuf:number;
  observedAt:string;
  authority:string;
  actionKind:CommerceOptimizationActionKind;
  autonomousEvent?:'inventory.pressure.detected'|'customer.value_risk.detected';
  requiresHumanApproval:boolean;
  guardMetrics:PredictiveGuardMetrics;
  evidence:PredictiveEvidence[];
};

export type PredictiveVariant={id:string;sku:string;label:string|null;netPriceHuf:number|null;unitCostNetHuf:number|null;stockQuantity:number|null;active:boolean};
export type PredictiveOpportunity={id:string;priorityScore:number;expectedValueNetHuf:number|null;probabilityPercent:number|null;status:string;channel:string;kind:string};
export type PredictivePromotion={offerId:string;ok:boolean;safe?:boolean;marginPercent?:number;minimumMarginPercent:number;discountPercent:number;variantId:string};
export type PredictiveGrowth={atRiskCustomers:number;winbackCustomers:number;openCheckoutRecoveries:number};
export type PredictiveCommerceSnapshot={
  observedAt:string;
  variants:PredictiveVariant[];
  opportunities:PredictiveOpportunity[];
  promotions:PredictivePromotion[];
  growth:PredictiveGrowth;
};

export type CommerceAutonomyPolicy={
  mode:CommerceAutonomyMode;
  killSwitch:boolean;
  minConfidence:number;
  maxRiskScore:number;
  maxImpactNetHuf:number;
  marginFloorPercent:number;
  inventoryFloorQuantity:number;
  maxDiscountPercent:number;
  maxBudgetNetHuf:number;
  staleAfterMinutes:number;
  allowedActions:BoundedAutonomousActionKind[];
};
export type AutomationControlState={exists:boolean;globalPaused:boolean;circuitOpenUntil:string|null};
export type AutonomyDecision={decision:'blocked'|'supervised'|'approval_required'|'autonomous_allowed';reasons:string[]};

export const DEFAULT_COMMERCE_AUTONOMY_POLICY:CommerceAutonomyPolicy={
  mode:'off',killSwitch:true,minConfidence:0.9,maxRiskScore:20,maxImpactNetHuf:0,
  marginFloorPercent:0,inventoryFloorQuantity:0,maxDiscountPercent:0,maxBudgetNetHuf:0,
  staleAfterMinutes:15,allowedActions:[],
};

const n=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;
const boundedEvidence=(items:PredictiveEvidence[])=>items.slice(0,8).map(item=>({
  label:item.label.slice(0,100),value:typeof item.value==='string'?item.value.slice(0,180):item.value,source:item.source.slice(0,180),
}));
const riskClass=(risk:number):CommerceRiskClass=>risk>=90?'critical':risk>=70?'high':risk>=35?'medium':'low';
const iso=(value:string)=>Number.isNaN(Date.parse(value))?new Date(0).toISOString():new Date(value).toISOString();

export function buildPredictiveCommerceSignals(snapshot:PredictiveCommerceSnapshot):PredictiveCommerceSignal[]{
  const signals:PredictiveCommerceSignal[]=[];
  const observedAt=iso(snapshot.observedAt);
  const variants=new Map(snapshot.variants.map(v=>[v.id,v]));

  for(const variant of snapshot.variants.filter(v=>v.active&&n(v.stockQuantity)<=2).slice(0,5)){
    const stock=n(variant.stockQuantity),risk=stock<=0?30:20;
    signals.push({
      key:`inventory:${variant.id}`,kind:'inventory',title:stock<=0?'Készletkifogyási kockázat':'Alacsony készlet várható nyomást okozhat',
      summary:`A ${variant.sku} jelenlegi készlete ${stock} db. A rendszer csak kontrollált készletnyomás-runbookot indíthat; készletet nem ír át.`,
      expectedOutcome:'Korábbi operatív jelzés és emberi utánpótlási döntés; közvetlen készletmutáció nélkül.',
      recommendation:'Ellenőrizd az utánpótlást és a készletbiztonsági szintet.',confidence:0.98,riskScore:risk,riskClass:riskClass(risk),expectedImpactNetHuf:0,
      observedAt,authority:'product_variants',actionKind:'workflow.inventory-pressure',autonomousEvent:'inventory.pressure.detected',requiresHumanApproval:false,
      guardMetrics:{projectedInventoryQuantity:stock},evidence:boundedEvidence([{label:'SKU',value:variant.sku,source:`product_variants:${variant.id}`},{label:'Készlet',value:stock,source:`product_variants:${variant.id}`}]),
    });
  }

  for(const promotion of snapshot.promotions.filter(p=>p.ok&&p.safe===false).slice(0,5)){
    const variant=variants.get(promotion.variantId),risk=92;
    signals.push({
      key:`promotion:${promotion.offerId}`,kind:'promotion',title:'Promóciós optimalizáció emberi jóváhagyást igényel',
      summary:`A canonical margin preview szerint a ${variant?.sku??'kiválasztott variáns'} ajánlata sérti a minimum árrés-korlátot.`,
      expectedOutcome:'A kedvezmény csökkentése vagy az ajánlat módosítása javíthatná az árrést, de Block 19 ezt unattended módban nem hajthatja végre.',
      recommendation:'Készíts jóváhagyott kereskedelmi döntést az Intézkedési központban.',confidence:0.99,riskScore:risk,riskClass:riskClass(risk),expectedImpactNetHuf:0,
      observedAt,authority:'preview_promotion_margin_v2',actionKind:'commerce.promotion-adjustment',requiresHumanApproval:true,
      guardMetrics:{marginPercent:promotion.marginPercent,discountPercent:promotion.discountPercent},
      evidence:boundedEvidence([{label:'Kedvezmény',value:`${promotion.discountPercent}%`,source:`commercial_offers:${promotion.offerId}`},{label:'Minimum árrés',value:`${promotion.minimumMarginPercent}%`,source:'preview_promotion_margin_v2'},...(promotion.marginPercent===undefined?[]:[{label:'Várható árrés',value:`${promotion.marginPercent.toFixed(1)}%`,source:'preview_promotion_margin_v2'}])]),
    });
  }

  for(const opportunity of snapshot.opportunities.filter(o=>['open','in_progress'].includes(o.status)).slice(0,5)){
    const probability=Math.max(0,Math.min(100,n(opportunity.probabilityPercent))),expected=n(opportunity.expectedValueNetHuf),weighted=Math.round(expected*probability/100);
    const risk=weighted>500000?75:45;
    signals.push({
      key:`commercial:${opportunity.id}`,kind:'commercial',title:'Várható kereskedelmi kimenet',
      summary:`A meglévő opportunity evidence alapján a súlyozott várható nettó érték ${weighted.toLocaleString('hu-HU')} Ft.`,
      expectedOutcome:`Becsült súlyozott nettó kimenet: ${weighted.toLocaleString('hu-HU')} Ft.`,
      recommendation:'A merchandising/ajánlati döntést emberi felülvizsgálattal hozd meg; a rendszer nem publikál és nem áraz át automatikusan.',
      confidence:probability>0&&expected>0?0.9:0.6,riskScore:risk,riskClass:riskClass(risk),expectedImpactNetHuf:weighted,observedAt,
      authority:'commercial_opportunities',actionKind:'commerce.merchandising-adjustment',requiresHumanApproval:true,guardMetrics:{},
      evidence:boundedEvidence([{label:'Várható nettó érték',value:expected,source:`commercial_opportunities:${opportunity.id}`},{label:'Becsült valószínűség',value:`${probability}%`,source:`commercial_opportunities:${opportunity.id}`},{label:'Súlyozott várható érték',value:weighted,source:'block19-deterministic-forecast'}]),
    });
  }

  const customerRisk=n(snapshot.growth.atRiskCustomers)+n(snapshot.growth.winbackCustomers);
  if(customerRisk>0){
    const risk=20;
    signals.push({
      key:'customer:value-risk',kind:'customer',title:'Ügyfélérték-kockázat várható megtartási hatással',
      summary:`${customerRisk} ügyfél igényelhet megtartási vagy win-back figyelmet a jelenlegi lifecycle evidence alapján.`,
      expectedOutcome:'Korábbi kontrollált customer-value runbook; marketingüzenet vagy consent-mutatió nélkül.',
      recommendation:'Indíts kontrollált customer-value felülvizsgálatot. Kommunikáció csak a meglévő consent/suppression authorityn keresztül történhet.',
      confidence:0.97,riskScore:risk,riskClass:riskClass(risk),expectedImpactNetHuf:0,observedAt,
      authority:'v9_growth_dashboard_v2',actionKind:'workflow.customer-value-risk',autonomousEvent:'customer.value_risk.detected',requiresHumanApproval:false,guardMetrics:{},
      evidence:boundedEvidence([{label:'At-risk ügyfelek',value:n(snapshot.growth.atRiskCustomers),source:'v9_growth_dashboard_v2'},{label:'Win-back ügyfelek',value:n(snapshot.growth.winbackCustomers),source:'v9_growth_dashboard_v2'}]),
    });
  }

  const missingCost=snapshot.variants.filter(v=>v.active&&(v.unitCostNetHuf===null||n(v.unitCostNetHuf)<=0));
  if(missingCost.length>0)signals.push({
    key:'evidence:missing-cost',kind:'evidence-quality',title:'Prediktív árazás blokkolva hiányos költségadat miatt',
    summary:`${missingCost.length} aktív variánsnál nincs használható költségalap.`,expectedOutcome:'Nincs megbízható price/promotion optimalizáció, ezért a rendszer fail-closed marad.',
    recommendation:'Pótold a canonical termékköltséget; Block 19 nem becsül hiányzó cost adatot.',confidence:1,riskScore:100,riskClass:'critical',expectedImpactNetHuf:0,observedAt,
    authority:'product_variants',actionKind:'commerce.price-adjustment',requiresHumanApproval:true,guardMetrics:{},
    evidence:boundedEvidence([{label:'Hiányos költségű variánsok',value:missingCost.length,source:'product_variants'}]),
  });

  return signals.sort((a,b)=>b.riskScore-a.riskScore||b.expectedImpactNetHuf-a.expectedImpactNetHuf||a.key.localeCompare(b.key)).slice(0,20);
}

function minutesOld(observedAt:string,now:string){return Math.max(0,(Date.parse(now)-Date.parse(observedAt))/60000);}
export function evaluateAutonomyGuardrails(signal:PredictiveCommerceSignal,policy:CommerceAutonomyPolicy,control:AutomationControlState,now=new Date().toISOString()):AutonomyDecision{
  const reasons:string[]=[];
  if(policy.mode==='off')reasons.push('AUTONOMY_MODE_OFF');
  if(policy.killSwitch)reasons.push('TENANT_KILL_SWITCH_ENGAGED');
  if(!control.exists)reasons.push('AUTOMATION_CONTROL_MISSING');
  if(control.globalPaused)reasons.push('AUTOMATION_GLOBALLY_PAUSED');
  if(control.circuitOpenUntil&&Date.parse(control.circuitOpenUntil)>Date.parse(now))reasons.push('AUTOMATION_CIRCUIT_OPEN');
  if(minutesOld(signal.observedAt,now)>policy.staleAfterMinutes)reasons.push('PREDICTION_STALE');
  if(signal.confidence<policy.minConfidence)reasons.push('CONFIDENCE_BELOW_THRESHOLD');
  if(signal.riskScore>policy.maxRiskScore)reasons.push('RISK_ABOVE_THRESHOLD');
  if(Math.abs(signal.expectedImpactNetHuf)>policy.maxImpactNetHuf)reasons.push('IMPACT_ABOVE_LIMIT');
  if(signal.guardMetrics.marginPercent!==undefined&&signal.guardMetrics.marginPercent<policy.marginFloorPercent)reasons.push('MARGIN_FLOOR_BREACH');
  if(signal.guardMetrics.projectedInventoryQuantity!==undefined&&signal.guardMetrics.projectedInventoryQuantity<policy.inventoryFloorQuantity)reasons.push('INVENTORY_FLOOR_BREACH');
  if(signal.guardMetrics.discountPercent!==undefined&&signal.guardMetrics.discountPercent>policy.maxDiscountPercent)reasons.push('PROMOTION_LIMIT_BREACH');
  if(signal.guardMetrics.budgetSpendNetHuf!==undefined&&signal.guardMetrics.budgetSpendNetHuf>policy.maxBudgetNetHuf)reasons.push('BUDGET_GUARD_BREACH');
  if(signal.requiresHumanApproval||signal.riskClass==='high'||signal.riskClass==='critical')return{decision:'approval_required',reasons:[...reasons,'HUMAN_APPROVAL_REQUIRED']};
  if(policy.mode==='supervised')return{decision:'supervised',reasons:[...reasons,'SUPERVISED_MODE']};
  if(!BOUNDED_AUTONOMOUS_ACTIONS.includes(signal.actionKind as BoundedAutonomousActionKind))return{decision:'approval_required',reasons:[...reasons,'ACTION_NOT_AUTONOMOUS_ALLOWLIST']};
  if(!policy.allowedActions.includes(signal.actionKind as BoundedAutonomousActionKind))reasons.push('TENANT_ACTION_NOT_ALLOWED');
  return reasons.length?{decision:'blocked',reasons}:{decision:'autonomous_allowed',reasons:[]};
}
