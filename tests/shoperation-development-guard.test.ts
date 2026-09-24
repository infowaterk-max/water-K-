import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {SHOPERATION_KNOWN_FAILURES,evaluateShoperationKnowledgeIntegrity} from '@/lib/quality-system/shoperation-knowledge';
import {resolveShoperationKnowledgeScope} from '@/lib/quality-system/scope-resolver';
const policy=JSON.parse(readFileSync('quality/knowledge/development-guard-policy.v1.json','utf8')) as {intentMatchers:{pattern:string;subsystems:string[]}[];directives:Record<string,{preventiveDirective:string;forbiddenApproaches:string[];requiredBeforeEdit:string[]}>;editRules:{id:string;severity:string;failureIds:string[]}[];negativeKnowledgeApplicability:Record<string,string[]>;};
const scopePolicy=JSON.parse(readFileSync('quality/knowledge/knowledge-scope-policy.v1.json','utf8')) as {dependencies:Record<string,string[]>;knowledgeInfrastructurePrefixes:string[]};
describe('Shoperation Development-Time Known Failure Guard',()=>{
  it('requires a preventive directive for every global and Template Factory Known Failure',()=>{const integrity=evaluateShoperationKnowledgeIntegrity();expect(integrity.ok,JSON.stringify(integrity.issues)).toBe(true);const ids=SHOPERATION_KNOWN_FAILURES.map(item=>item.id);expect(Object.keys(policy.directives).sort()).toEqual([...ids].sort());for(const id of ids){const directive=policy.directives[id];expect(directive.preventiveDirective.length,id).toBeGreaterThan(20);expect(directive.forbiddenApproaches.length,id).toBeGreaterThan(0);expect(directive.requiredBeforeEdit.length,id).toBeGreaterThan(0);}});
  it('keeps the preventive-development failure in the always-on global baseline',()=>{const k=JSON.parse(readFileSync('quality/knowledge/shoperation-quality-knowledge.v1.json','utf8')) as {globalBaselineFailureIds:string[]};expect(k.globalBaselineFailureIds).toContain('SQ-KF-022');const shipping=resolveShoperationKnowledgeScope({changedFiles:['src/lib/shipping/dpd-provider.ts']});expect(shipping.activeFailureIds).toContain('SQ-KF-022');expect(shipping.activeFailureIds).not.toContain('TF-KF-003');});
  it('bounds short provider tokens so unrelated words cannot expand development scope',()=>{const shipping=policy.intentMatchers.find(item=>item.subsystems.includes('inventory-fulfillment-authority'));expect(shipping).toBeTruthy();const matcher=new RegExp(shipping!.pattern,'i');expect(matcher.test('implementation details')).toBe(false);expect(matcher.test('MPL carrier integration')).toBe(true);});
  it('does not treat bug-report wording as login intent',()=>{const auth=policy.intentMatchers.find(item=>item.subsystems.includes('auth-access-authority'));expect(auth).toBeTruthy();const matcher=new RegExp(auth!.pattern,'i');expect(matcher.test('hibabejelentő felület')).toBe(false);expect(matcher.test('vásárlói bejelentkezés')).toBe(true);expect(matcher.test('login flow')).toBe(true);});
  it('does not let auth match authority',()=>{const auth=policy.intentMatchers.find(item=>item.subsystems.includes('auth-access-authority'));expect(auth).toBeTruthy();const matcher=new RegExp(auth!.pattern,'i');expect(matcher.test('shared Incident Intelligence authority')).toBe(false);expect(matcher.test('auth flow')).toBe(true);expect(matcher.test('authentication flow')).toBe(true);expect(matcher.test('authorization rule')).toBe(true);});
  it('uses one canonical dependency graph for TypeScript and Node development tooling',()=>{expect(scopePolicy.dependencies['inventory-fulfillment-authority']).toContain('payment-checkout-order-authority');expect(scopePolicy.dependencies['payment-checkout-order-authority']).toContain('customer-account');expect(scopePolicy.knowledgeInfrastructurePrefixes).toContain('quality/knowledge/');expect(scopePolicy.knowledgeInfrastructurePrefixes).toContain('scripts/shoperation-codebase-atlas.mjs');expect(scopePolicy.knowledgeInfrastructurePrefixes).toContain('scripts/shoperation-support-history-backfill.mjs');expect(scopePolicy.knowledgeInfrastructurePrefixes).toContain('scripts/template-factory-product-owner-handoff.mjs');const runtime=readFileSync('scripts/lib/shoperation-development-runtime.mjs','utf8');expect(runtime).toContain('{knowledgeInfrastructureChanged=true;continue;}');});
  it('has edit-time prevention for the strongest known unsafe implementation patterns',()=>{const blockIds=policy.editRules.filter(rule=>rule.severity==='block').map(rule=>rule.id);expect(blockIds).toEqual(expect.arrayContaining(['DEV-BLOCK-001','DEV-BLOCK-002','DEV-BLOCK-003']));expect(policy.editRules.some(rule=>rule.failureIds.includes('SQ-KF-016'))).toBe(true);expect(policy.editRules.some(rule=>rule.failureIds.includes('SQ-KF-017'))).toBe(true);});
  it('pins plan, knowledge preflight and edit-time guard to one change transaction authority',()=>{
    const runtime=readFileSync('scripts/lib/shoperation-development-runtime.mjs','utf8'),plan=readFileSync('scripts/shoperation-plan-before-code.mjs','utf8'),preflight=readFileSync('scripts/shoperation-knowledge-preflight.mjs','utf8'),edit=readFileSync('scripts/shoperation-edit-time-guard.mjs','utf8');
    expect(runtime).toContain('export function resolveDevelopmentBase');
    expect(plan).toContain('getChangedFiles({baseSha:plan.changeBaseSha})');
    expect(edit).toContain('getChangedFiles({baseSha:plan.changeBaseSha})');
    expect(preflight).toContain("import {resolveDevelopmentBase} from './lib/shoperation-development-runtime.mjs'");
    expect(preflight).toContain('resolveDevelopmentBase({changeBaseSha:developmentPlan.changeBaseSha})');
    expect(preflight).not.toContain("developmentPlan.changeBaseSha?.trim()||process.env.QUALITY_BASE_SHA");
  });
  it('prevents plan-only or metadata commits from shrinking the active development transaction',()=>{
    const runtime=readFileSync('scripts/lib/shoperation-development-runtime.mjs','utf8'),plan=readFileSync('scripts/shoperation-plan-before-code.mjs','utf8');
    expect(runtime).toContain("git(['diff','--name-only','--diff-filter=ACMR',base,head])");
    expect(runtime).toContain('const base=resolveDevelopmentBase({changeBaseSha:explicit})');
    expect(plan).toContain("diff.files.filter(file=>file!=='quality/development/active-plan.json')");
    expect(plan).not.toContain("getChangedFiles()");
  });

  it('makes the preventive protocol repository-level instructions for coding agents',()=>{const agents=readFileSync('AGENTS.md','utf8');expect(agents).toContain('BEFORE THE FIRST IMPLEMENTATION EDIT');expect(agents).toContain('development-guard.md');expect(agents).toContain('Plan Before Code');expect(agents).toContain('shoperation-incremental-replay.mjs --check');});
});
