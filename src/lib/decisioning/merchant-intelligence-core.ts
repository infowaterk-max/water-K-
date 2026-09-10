export type DecisionEvidence={label:string;value:string|number;source:string};
export type MerchantDecisionCard={
  key:string;
  kind:'approval'|'promotion-margin'|'reseller-reorder'|'customer-value-risk'|'checkout-recovery'|'evidence-quality'|'status';
  priority:number;
  title:string;
  summary:string;
  rationale:string;
  recommendation:string;
  confidence:'high'|'medium'|'low';
  authority:string;
  href:string;
  evidence:DecisionEvidence[];
  proposalId?:string;
};

export type GrowthRow={at_risk_customers?:number;winback_customers?:number;open_checkout_recoveries?:number;due_journey_steps?:number;overdue_resellers?:number;due_soon_resellers?:number};
export type OpportunityRow={id:string;channel:string;kind:string;status:string;priority_score:number;expected_value_net_huf:number|null;probability_percent:number|null;due_at:string|null};
export type ProposalRow={id:string;status:string;action_kind:string;impact_class:string;risk_score:number;expires_at:string|null};
export type VariantRow={id:string;sku:string;label:string|null;net_price_huf:number|null;unit_cost_net_huf:number|null;stock_quantity:number|null;active:boolean};
export type PromotionPreview={offerId:string;ok:boolean;safe?:boolean;marginPercent?:number;minimumMarginPercent:number;discountPercent:number;variantId:string};
export type MerchantDecisionSnapshot={growth:GrowthRow|null;opportunities:OpportunityRow[];proposals:ProposalRow[];variants:VariantRow[];promotionPreviews:PromotionPreview[]};

const n=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;
const huf=(value:number)=>new Intl.NumberFormat('hu-HU',{style:'currency',currency:'HUF',maximumFractionDigits:0}).format(value);
const boundedEvidence=(items:DecisionEvidence[])=>items.slice(0,8).map(item=>({label:item.label.slice(0,100),value:typeof item.value==='string'?item.value.slice(0,180):item.value,source:item.source.slice(0,180)}));

export function buildMerchantDecisionCards(snapshot:MerchantDecisionSnapshot):MerchantDecisionCard[]{
  const cards:MerchantDecisionCard[]=[];
  const variants=new Map(snapshot.variants.map(v=>[v.id,v]));

  for(const proposal of snapshot.proposals.filter(p=>p.impact_class==='high_impact'||n(p.risk_score)>=80).slice(0,2)){
    cards.push({
      key:`approval:${proposal.id}`,kind:'approval',priority:Math.min(100,Math.max(80,n(proposal.risk_score))),
      title:'Jóváhagyást igénylő kereskedelmi döntés',
      summary:'A meglévő governance-rendszer magas kockázatú intézkedési javaslatot tart nyitva.',
      rationale:`Az intézkedés kockázati pontszáma ${n(proposal.risk_score)}/100, státusza: ${proposal.status}, hatásosztálya: ${proposal.impact_class}.`,
      recommendation:'Vizsgáld meg a bizonyítékot az Intézkedési központban; az AI nem hagyhatja jóvá és nem hajthatja végre helyetted.',
      confidence:'high',authority:'action_proposals',href:'/admin/intezkedesek',proposalId:proposal.id,
      evidence:boundedEvidence([
        {label:'Kockázati pontszám',value:n(proposal.risk_score),source:`action_proposals:${proposal.id}`},
        {label:'Hatásosztály',value:proposal.impact_class,source:`action_proposals:${proposal.id}`},
        {label:'Státusz',value:proposal.status,source:`action_proposals:${proposal.id}`},
      ]),
    });
  }

  for(const preview of snapshot.promotionPreviews.filter(p=>p.ok&&p.safe===false).slice(0,3)){
    const variant=variants.get(preview.variantId);
    cards.push({
      key:`promotion-margin:${preview.offerId}`,kind:'promotion-margin',priority:95,
      title:'Promóciós árrés-korlát sérülne',
      summary:`A ${variant?.sku??'kiválasztott variáns'} ajánlatának ${preview.discountPercent}% kedvezménye nem fér bele a meglévő minimum árrés szabályba.`,
      rationale:`A canonical promotion-margin authority a jelenlegi adatokkal unsafe eredményt adott${preview.marginPercent===undefined?'':`, számított árrés: ${preview.marginPercent.toFixed(1)}%`}.`,
      recommendation:'Ne hagyd jóvá ezt az ajánlatot változtatás nélkül; a kedvezményt vagy az ajánlati feltételeket a meglévő kereskedelmi felületen vizsgáld felül.',
      confidence:'high',authority:'preview_promotion_margin_v2',href:'/admin/ertekesites',
      evidence:boundedEvidence([
        {label:'Kedvezmény',value:`${preview.discountPercent}%`,source:`commercial_offers:${preview.offerId}`},
        {label:'Minimum árrés',value:`${preview.minimumMarginPercent}%`,source:`commercial_offers:${preview.offerId}`},
        ...(preview.marginPercent===undefined?[]:[{label:'Számított árrés',value:`${preview.marginPercent.toFixed(1)}%`,source:'preview_promotion_margin_v2'}]),
      ]),
    });
  }

  for(const opportunity of snapshot.opportunities.filter(o=>o.kind==='reseller'||o.channel==='b2b'||o.channel==='reseller').slice(0,3)){
    const expected=n(opportunity.expected_value_net_huf),probability=n(opportunity.probability_percent);
    cards.push({
      key:`reseller-reorder:${opportunity.id}`,kind:'reseller-reorder',priority:Math.min(94,Math.max(50,n(opportunity.priority_score))),
      title:'B2B újrarendelési lehetőség',
      summary:`A meglévő kereskedelmi planner ${huf(expected)} várható nettó értékű partnerlehetőséget azonosított.`,
      rationale:`A lehetőség prioritása ${n(opportunity.priority_score)}/100${probability?`, becsült sikeressége ${probability.toFixed(0)}%`:''}. A Block 18 ezt értelmezi, nem hoz létre új reseller authority-t.`,
      recommendation:'Tekintsd át a partner újrarendelési előzményeit a CRM-ben és emberi döntéssel válaszd ki a következő kereskedelmi lépést.',
      confidence:expected>0?'high':'medium',authority:'commercial_opportunities',href:'/admin/ertekesites',
      evidence:boundedEvidence([
        {label:'Prioritás',value:n(opportunity.priority_score),source:`commercial_opportunities:${opportunity.id}`},
        {label:'Várható nettó érték',value:huf(expected),source:`commercial_opportunities:${opportunity.id}`},
        {label:'Becsült esély',value:`${probability.toFixed(0)}%`,source:`commercial_opportunities:${opportunity.id}`},
      ]),
    });
  }

  const atRisk=n(snapshot.growth?.at_risk_customers),winback=n(snapshot.growth?.winback_customers);
  if(atRisk+winback>0)cards.push({
    key:'customer-value-risk',kind:'customer-value-risk',priority:78,
    title:'Ügyfélérték-kockázat figyelmet kér',
    summary:`${atRisk} kockázatban lévő és ${winback} visszanyerendő ügyfél látható a jelenlegi lifecycle-adatokban.`,
    rationale:'A jelzés a meglévő V9 customer-value és retention aggregátumokra épül, nem AI által kitalált ügyfélszegmentációra.',
    recommendation:'Vizsgáld át a megtartási és win-back folyamatokat; kommunikáció csak a meglévő consent/suppression authority szerint indítható.',
    confidence:'high',authority:'v9_growth_dashboard_v2',href:'/admin/vezetoi',
    evidence:boundedEvidence([{label:'At-risk ügyfelek',value:atRisk,source:'v9_growth_dashboard_v2'},{label:'Win-back ügyfelek',value:winback,source:'v9_growth_dashboard_v2'}]),
  });

  const recoveries=n(snapshot.growth?.open_checkout_recoveries);
  if(recoveries>0)cards.push({
    key:'checkout-recovery',kind:'checkout-recovery',priority:64,
    title:'Nyitott checkout-visszaállítási lehetőség',summary:`${recoveries} aktív, még visszaállítható checkout van nyitva.`,
    rationale:'A jelzés a meglévő checkout recovery authority által nyilvántartott aktuális állapotból származik.',
    recommendation:'A meglévő recovery és kommunikációs folyamatokon keresztül kezeld; marketingüzenetnél a consent/suppression szabályok változatlanul kötelezők.',
    confidence:'high',authority:'checkout_recovery_intents',href:'/admin/vezetoi',
    evidence:boundedEvidence([{label:'Nyitott recovery',value:recoveries,source:'v9_growth_dashboard_v2'}]),
  });

  const missingCost=snapshot.variants.filter(v=>v.active&&(v.unit_cost_net_huf===null||n(v.unit_cost_net_huf)<=0));
  if(missingCost.length>0)cards.push({
    key:'margin-evidence-quality',kind:'evidence-quality',priority:86,
    title:'Hiányos fedezeti bizonyíték',summary:`${missingCost.length} aktív variánsnál nincs használható nettó beszerzési költség.`,
    rationale:'Megbízható contribution-margin és promóciós döntéstámogatás csak valós költségadattal adható.',
    recommendation:'Egészítsd ki a költségadatokat a canonical katalógus/beszerzési authority-n keresztül; a Block 18 nem becsül és nem ír termékadatot.',
    confidence:'high',authority:'product_variants',href:'/admin/termekek',
    evidence:boundedEvidence([{label:'Hiányos költségű aktív variánsok',value:missingCost.length,source:'product_variants'},{label:'Aktív variánsok összesen',value:snapshot.variants.length,source:'product_variants'}]),
  });

  if(cards.length===0)cards.push({
    key:'decisioning-status',kind:'status',priority:10,title:'Nincs sürgős döntési jelzés',
    summary:'A jelenlegi, elérhető commerce és operational bizonyítékok alapján nincs kiemelt Block 18 javaslat.',
    rationale:'Ez nem jelent automatikus üzleti optimalitást; csak azt, hogy a jelenlegi szabályozott bizonyítékhalmaz nem adott sürgős jelzést.',
    recommendation:'Folytasd a normál üzleti monitorozást. A rendszer új adatoknál ismét bizonyíték-alapú javaslatokat mutat.',
    confidence:'medium',authority:'block18-decisioning',href:'/admin/vezetoi',evidence:[],
  });

  return cards.sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key)).slice(0,10);
}

export function deterministicDecisionExplanation(card:MerchantDecisionCard){
  return{summary:card.summary,why:card.rationale,nextSteps:[card.recommendation,`A forrásbizonyítékot a(z) ${card.authority} authority alapján ellenőrizd.`]};
}
