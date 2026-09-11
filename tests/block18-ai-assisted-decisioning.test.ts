import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';
import { buildMerchantDecisionCards,deterministicDecisionExplanation,type MerchantDecisionSnapshot } from '../src/lib/decisioning/merchant-intelligence-core';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const provenBaselineHash='c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618';

function snapshot(overrides:Partial<MerchantDecisionSnapshot>={}):MerchantDecisionSnapshot{
  return{growth:null,opportunities:[],proposals:[],variants:[],promotionPreviews:[],...overrides};
}

describe('Roadmap Block 18 – AI-Assisted Decisioning & Merchandising Intelligence',()=>{
  test('builds evidence-based cards from existing governed authorities',()=>{
    const cards=buildMerchantDecisionCards(snapshot({
      growth:{at_risk_customers:3,winback_customers:2,open_checkout_recoveries:1},
      proposals:[{id:'11111111-1111-4111-8111-111111111111',status:'proposed',action_kind:'human_review',impact_class:'high_impact',risk_score:91,expires_at:null}],
      opportunities:[{id:'22222222-2222-4222-8222-222222222222',channel:'b2b',kind:'reseller',status:'open',priority_score:82,expected_value_net_huf:125000,probability_percent:70,due_at:null}],
      variants:[{id:'33333333-3333-4333-8333-333333333333',sku:'SKU-1',label:'Teszt',net_price_huf:10000,unit_cost_net_huf:6000,stock_quantity:10,active:true}],
      promotionPreviews:[{offerId:'44444444-4444-4444-8444-444444444444',ok:true,safe:false,marginPercent:12,minimumMarginPercent:20,discountPercent:30,variantId:'33333333-3333-4333-8333-333333333333'}],
    }));
    expect(cards.map(card=>card.kind)).toEqual(expect.arrayContaining(['approval','promotion-margin','reseller-reorder','customer-value-risk','checkout-recovery']));
    expect(cards.find(card=>card.kind==='approval')?.authority).toBe('action_proposals');
    expect(cards.find(card=>card.kind==='promotion-margin')?.authority).toBe('preview_promotion_margin_v2');
    expect(cards.find(card=>card.kind==='reseller-reorder')?.authority).toBe('commercial_opportunities');
    expect(cards.every(card=>card.evidence.length<=8)).toBe(true);
  });

  test('never invents a promotion-risk card when canonical margin evidence is unavailable or safe',()=>{
    const unavailable=buildMerchantDecisionCards(snapshot({promotionPreviews:[{offerId:'a',ok:false,minimumMarginPercent:20,discountPercent:10,variantId:'v'}]}));
    const safe=buildMerchantDecisionCards(snapshot({promotionPreviews:[{offerId:'b',ok:true,safe:true,marginPercent:35,minimumMarginPercent:20,discountPercent:10,variantId:'v'}]}));
    expect(unavailable.some(card=>card.kind==='promotion-margin')).toBe(false);
    expect(safe.some(card=>card.kind==='promotion-margin')).toBe(false);
  });

  test('flags missing cost evidence instead of estimating contribution margin',()=>{
    const cards=buildMerchantDecisionCards(snapshot({variants:[{id:'v1',sku:'NO-COST',label:null,net_price_huf:10000,unit_cost_net_huf:null,stock_quantity:3,active:true}]}));
    const card=cards.find(item=>item.kind==='evidence-quality');
    expect(card?.authority).toBe('product_variants');
    expect(card?.recommendation).toContain('nem becsül');
  });

  test('deterministic explanation is bounded to the recommendation and its authority',()=>{
    const card=buildMerchantDecisionCards(snapshot())[0];
    const explanation=deterministicDecisionExplanation(card);
    expect(explanation.summary).toBe(card.summary);
    expect(explanation.why).toBe(card.rationale);
    expect(explanation.nextSteps).toHaveLength(2);
    expect(explanation.nextSteps.join(' ')).toContain(card.authority);
  });

  test('server integration reuses tenant scope, Pro entitlement, rate limiting and canonical read/calculation authorities',()=>{
    const loader=read('src/lib/decisioning/merchant-intelligence.ts');
    const route=read('src/app/api/admin/decisioning/explain/route.ts');
    const page=read('src/app/admin/vezetoi/page.tsx');
    expect(loader).toContain("eq('instance_id',instanceId)");
    expect(loader).toContain("rpc('preview_promotion_margin_v2'");
    expect(loader).toContain('sanitizeWorkflowEvidence');
    expect(route).toContain("getAdminRequestUser('analytics.read')");
    expect(route).toContain("requireCurrentStoreContext('analytics.read')");
    expect(route).toContain("hasCurrentPlanFeature('executiveAnalytics')");
    expect(route).toContain("rpc('consume_security_rate_limit'");
    expect(route).toContain('ai-gateway.vercel.sh/v1/chat/completions');
    expect(route).toContain('AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN');
    expect(route).toContain('recordAdminAudit');
    expect(page).toContain('<MerchantDecisionPanel cards={decisionCards}/>');
  });

  test('AI layer remains advisory and does not create a second commerce authority',()=>{
    const route=read('src/app/api/admin/decisioning/explain/route.ts');
    const loader=read('src/lib/decisioning/merchant-intelligence.ts');
    const core=read('src/lib/decisioning/merchant-intelligence-core.ts');
    for(const forbidden of["from('products').update","from('product_variants').update","from('orders').update","from('commercial_offers').update","from('action_proposals').insert","execute_automation_step_v2","activate_automation_runbook_v2"]){expect(route+loader+core).not.toContain(forbidden);}
    expect(route).toMatch(/human-in-the-loop/i);
    expect(core).toContain('az AI nem hagyhatja jóvá és nem hajthatja végre helyetted');
  });

  test('adds no Block 18 migration and remains compatible with the later proven customer baseline',()=>{
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json')) as{status:string;freshInstallProofRequired:boolean;proofContractSha256:string|null;notes:string};
    expect(manifest.status).toBe('ready');
    expect(manifest.freshInstallProofRequired).toBe(false);
    expect(manifest.proofContractSha256).toBe(provenBaselineHash);
    expect(manifest.notes).toContain('0010');
    const migrations=fs.readdirSync(path.join(root,'supabase/migrations'));
    const customerMigrations=fs.readdirSync(path.join(root,'supabase/customer-baseline/migrations'));
    expect(migrations.some(name=>/block18/i.test(name))).toBe(false);
    expect(customerMigrations.some(name=>/block18/i.test(name))).toBe(false);
  });

  test('documents strict Block 18 versus Block 19/21/22 boundary',()=>{
    const docs=read('docs/ROADMAP_BLOCK18_AI_ASSISTED_DECISIONING_MERCHANDISING_INTELLIGENCE.md');
    expect(docs).toMatch(/AI-Assisted Decisioning & Merchandising Intelligence/);
    expect(docs).toMatch(/Block 19[\s\S]*autonomous/i);
    expect(docs).toMatch(/Block 21[\s\S]*Page Schema/i);
    expect(docs).toMatch(/Block 22[\s\S]*Visual Builder/i);
    expect(docs).toMatch(/action_proposals/);
    expect(docs).toMatch(/preview_promotion_margin_v2/);
    expect(docs).toMatch(/no SQL migration/i);
    expect(docs).toMatch(/VERCEL_OIDC_TOKEN/);
  });
});
