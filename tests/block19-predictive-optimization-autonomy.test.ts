import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';
import { buildPredictiveCommerceSignals,evaluateAutonomyGuardrails,DEFAULT_COMMERCE_AUTONOMY_POLICY,type CommerceAutonomyPolicy,type PredictiveCommerceSnapshot } from '../src/lib/optimization/predictive-commerce-core';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const observedAt='2026-09-11T03:00:00.000Z';
const snapshot=(patch:Partial<PredictiveCommerceSnapshot>={}):PredictiveCommerceSnapshot=>({
  observedAt,
  variants:[{id:'v1',sku:'SKU-1',label:'Teszt',netPriceHuf:10000,unitCostNetHuf:4000,stockQuantity:1,active:true}],
  opportunities:[],promotions:[],growth:{atRiskCustomers:0,winbackCustomers:0,openCheckoutRecoveries:0},...patch,
});
const bounded:CommerceAutonomyPolicy={...DEFAULT_COMMERCE_AUTONOMY_POLICY,mode:'bounded',killSwitch:false,minConfidence:0.9,maxRiskScore:25,maxImpactNetHuf:0,inventoryFloorQuantity:0,allowedActions:['workflow.inventory-pressure']};
const control={exists:true,globalPaused:false,circuitOpenUntil:null};

describe('Roadmap Block 19 — Predictive Optimization & Autonomous Commerce Guardrails',()=>{
  test('prediction is deterministic, evidence-first and separate from execution',()=>{
    const first=buildPredictiveCommerceSignals(snapshot()),second=buildPredictiveCommerceSignals(snapshot());
    expect(first).toEqual(second);
    expect(first[0]?.actionKind).toBe('workflow.inventory-pressure');
    expect(first[0]?.authority).toBe('product_variants');
    expect(first[0]?.expectedImpactNetHuf).toBe(0);
  });

  test('bounded autonomy requires explicit opt-in, allowlist and healthy automation control',()=>{
    const signal=buildPredictiveCommerceSignals(snapshot())[0]!;
    expect(evaluateAutonomyGuardrails(signal,DEFAULT_COMMERCE_AUTONOMY_POLICY,control,observedAt).decision).toBe('blocked');
    expect(evaluateAutonomyGuardrails(signal,bounded,control,observedAt)).toEqual({decision:'autonomous_allowed',reasons:[]});
    expect(evaluateAutonomyGuardrails(signal,{...bounded,allowedActions:[]},control,observedAt).reasons).toContain('TENANT_ACTION_NOT_ALLOWED');
    expect(evaluateAutonomyGuardrails(signal,bounded,{exists:true,globalPaused:true,circuitOpenUntil:null},observedAt).reasons).toContain('AUTOMATION_GLOBALLY_PAUSED');
    expect(evaluateAutonomyGuardrails(signal,bounded,{exists:false,globalPaused:true,circuitOpenUntil:null},observedAt).reasons).toContain('AUTOMATION_CONTROL_MISSING');
  });

  test('confidence, staleness, risk, impact and inventory boundary guards fail closed',()=>{
    const signal=buildPredictiveCommerceSignals(snapshot())[0]!;
    expect(evaluateAutonomyGuardrails({...signal,confidence:0.5},bounded,control,observedAt).reasons).toContain('CONFIDENCE_BELOW_THRESHOLD');
    expect(evaluateAutonomyGuardrails(signal,bounded,control,'2026-09-11T03:16:01.000Z').reasons).toContain('PREDICTION_STALE');
    expect(evaluateAutonomyGuardrails({...signal,riskScore:26},bounded,control,observedAt).reasons).toContain('RISK_ABOVE_THRESHOLD');
    expect(evaluateAutonomyGuardrails({...signal,expectedImpactNetHuf:1},bounded,control,observedAt).reasons).toContain('IMPACT_ABOVE_LIMIT');
    expect(evaluateAutonomyGuardrails({...signal,guardMetrics:{projectedInventoryQuantity:-1}},bounded,control,observedAt).reasons).toContain('INVENTORY_FLOOR_BREACH');
  });

  test('promotion and other commerce mutations can never become unattended autonomous actions',()=>{
    const promotion=buildPredictiveCommerceSignals(snapshot({promotions:[{offerId:'o1',ok:true,safe:false,marginPercent:4,minimumMarginPercent:20,discountPercent:30,variantId:'v1'}]})).find(x=>x.kind==='promotion')!;
    const permissive={...bounded,maxRiskScore:100,maxImpactNetHuf:1_000_000,marginFloorPercent:0,maxDiscountPercent:100};
    const decision=evaluateAutonomyGuardrails(promotion,permissive,control,observedAt);
    expect(decision.decision).toBe('approval_required');
    expect(promotion.actionKind).toBe('commerce.promotion-adjustment');
  });

  test('missing cost evidence blocks predictive pricing instead of fabricating cost or price',()=>{
    const signals=buildPredictiveCommerceSignals(snapshot({variants:[{id:'v1',sku:'SKU-1',label:null,netPriceHuf:10000,unitCostNetHuf:null,stockQuantity:8,active:true}]}));
    const quality=signals.find(x=>x.key==='evidence:missing-cost')!;
    expect(quality.riskClass).toBe('critical');
    expect(quality.requiresHumanApproval).toBe(true);
    expect(quality.summary).toMatch(/nincs használható költségalap/i);
  });

  test('database contract defaults production autonomy to off and kill-switch engaged',()=>{
    const sql=read('supabase/migrations/20260911050000_block19_predictive_autonomy_guardrails.sql');
    expect(sql).toContain("mode text not null default 'off'");
    expect(sql).toContain('kill_switch boolean not null default true');
    expect(sql).toContain("allowed_actions <@ array['workflow.inventory-pressure','workflow.customer-value-risk']");
    expect(sql).toContain('create_block19_action_proposal_v1');
    expect(sql).toContain('public.action_proposals');
    expect(sql).not.toMatch(/update public\.(products|product_variants|orders|customers|commercial_offers)/i);
  });

  test('execution reuses Block 17 and action_proposals authorities with idempotent tenant run keys',()=>{
    const server=read('src/lib/optimization/predictive-commerce.ts');
    const compensation=read('supabase/migrations/20260911050200_block19_compensation_task_cleanup.sql');
    expect(server).toContain('dispatchEventDrivenWorkflow');
    expect(server).toContain("rpc('create_block19_action_proposal_v1'");
    expect(server).toContain("eq('instance_id',instanceId).eq('run_key',runKey)");
    expect(server).toContain("rpc('compensate_block19_runbook_v1'");
    expect(compensation).toContain('transition_automation_instance_v2');
    expect(server).not.toMatch(/from\('(products|product_variants|orders|customers|commercial_offers)'\)\.update/);
    expect(compensation).not.toMatch(/update public\.(products|product_variants|orders|customers|commercial_offers)/i);
  });

  test('Block 19 prediction and guard evaluation remain deterministic during AI/model outage',()=>{
    const core=read('src/lib/optimization/predictive-commerce-core.ts');
    const server=read('src/lib/optimization/predictive-commerce.ts');
    expect(`${core}\n${server}`).not.toMatch(/ai\/gateway|generateText|AI_GATEWAY_API_KEY|VERCEL_OIDC_TOKEN/i);
    expect(buildPredictiveCommerceSignals(snapshot())).toHaveLength(1);
  });

  test('API is entitlement/RBAC scoped and exposes emergency stop',()=>{
    const api=read('src/app/api/admin/optimization/route.ts');
    expect(api).toContain("getAdminRequestUser('analytics.read')");
    expect(api).toContain("getAdminRequestUser('store.manage')");
    expect(api).toContain("hasCurrentPlanFeature('executiveAnalytics')");
    expect(api).toContain("hasCurrentPlanFeature('automation')");
    expect(api).toContain("set_store_automation_pause_v2");
    expect(api).not.toMatch(/body\.instanceId/);
  });

  test('Block 19 itself did not pull forward Blocks 20–22; later genuine proofs may advance the baseline contract',()=>{
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json')) as{status:string;freshInstallProofRequired:boolean;proofContractSha256:string|null};
    const docs=read('docs/ROADMAP_BLOCK19_PREDICTIVE_OPTIMIZATION_AUTONOMOUS_COMMERCE_GUARDRAILS.md');
    const block20=read('docs/ROADMAP_BLOCK20_PLATFORM_ECOSYSTEM_ENTERPRISE_EXTENSIBILITY.md');
    expect(manifest.status).toBe('ready');
    expect(manifest.freshInstallProofRequired).toBe(false);
    expect(manifest.proofContractSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(docs).toMatch(/Block 20.*Platform Ecosystem/s);expect(docs).toMatch(/Block 21.*Page Schema/s);expect(docs).toMatch(/Block 22.*Visual Builder/s);
    expect(docs).toMatch(/not included|non-scope/i);
    expect(block20).toContain('Block 21 Page Schema / Templates');expect(block20).toContain('Block 22 Visual Builder');
  });
});
