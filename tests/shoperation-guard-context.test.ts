import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(file:string)=>readFileSync(file,'utf8');
const json=(file:string)=>JSON.parse(read(file));

describe('shared cross-gate context',()=>{
  it('chains blocking development guards instead of letting them operate as isolated islands',()=>{
    const registry=json('quality/knowledge/guard-registry.v1.json');
    expect(registry.principles.crossGuardContextRequired).toBe(true);
    expect(registry.principles.laterGuardsMustConsumePriorBlockingEvidence).toBe(true);
    expect(registry.principles.authorityRulesOverrideLocalEvidenceShape).toBe(true);
    const byId=new Map<string,any>(registry.guards.map((item:any)=>[item.id,item]));
    expect(byId.get('GUARD-KNOWLEDGE-PREFLIGHT').consumesEvidenceFrom).toContain('GUARD-INSTRUCTION-COMPLIANCE');
    expect(byId.get('GUARD-PLAN-BEFORE-CODE').consumesEvidenceFrom).toEqual(expect.arrayContaining(['GUARD-INSTRUCTION-COMPLIANCE','GUARD-KNOWLEDGE-PREFLIGHT']));
    expect(byId.get('GUARD-EDIT-TIME').consumesEvidenceFrom).toEqual(expect.arrayContaining(['GUARD-INSTRUCTION-COMPLIANCE','GUARD-KNOWLEDGE-PREFLIGHT','GUARD-PLAN-BEFORE-CODE']));
    expect(byId.get('GUARD-INCREMENTAL-REPLAY').consumesEvidenceFrom).toEqual(expect.arrayContaining(['GUARD-INSTRUCTION-COMPLIANCE','GUARD-KNOWLEDGE-PREFLIGHT','GUARD-PLAN-BEFORE-CODE','GUARD-EDIT-TIME']));
    expect(byId.get('GUARD-RELEASE-RISK').consumesEvidenceFrom).toEqual(expect.arrayContaining(['GUARD-INSTRUCTION-COMPLIANCE','GUARD-KNOWLEDGE-PREFLIGHT','GUARD-PLAN-BEFORE-CODE','GUARD-EDIT-TIME','GUARD-INCREMENTAL-REPLAY']));
    expect(read('scripts/release-risk-budget.mjs')).toContain("predecessorIssues('GUARD-RELEASE-RISK')");
  });

  it('builds one context containing global, domain and Template Factory authorities',()=>{
    execFileSync(process.execPath,['scripts/shoperation-instruction-compliance.mjs','--check'],{stdio:'pipe'});
    expect(existsSync('artifacts/shoperation-development-guard/guard-context.json')).toBe(true);
    const context=json('artifacts/shoperation-development-guard/guard-context.json');
    expect(context.contract).toBe('shoporation.guard-context.v2');
    expect(context.authorities.templateFactory.some((rule:any)=>rule.id==='TF-AUTH-005'&&rule.owner==='platform')).toBe(true);
    expect(context.authorities.templateFactory.some((rule:any)=>rule.id==='TF-AUTH-018')).toBe(true);
    expect(context.authorities.templateFactory).toHaveLength(24);
    expect(context.authorityHierarchy.issues).toEqual([]);
    expect(context.authorities.global.some((rule:any)=>rule.id==='SQ-AUTH-021')).toBe(true);
    expect(context.currentGuard.id).toBe('GUARD-INSTRUCTION-COMPLIANCE');
    expect(context.currentGuard.decision).toBe('PASS');
    expect(context.controlPlane).toBeDefined();
    expect(context.intelligencePolicy.mode).toBe('deterministic-control-plane-first');
    expect(context.authorityConflictContracts.some((item:any)=>item.authorityRuleId==='TF-AUTH-005')).toBe(true);
  });

  it('uses one canonical capability authority source and constitutional precedence',()=>{
    const authority=json('quality/knowledge/template-factory-authority.v1.json');
    const contextRuntime=read('scripts/lib/shoperation-guard-context.mjs');
    const registry=json('quality/knowledge/guard-registry.v1.json');
    expect(authority.authorityLevel).toBe('capability-contract');
    expect(authority.rules).toHaveLength(24);
    expect(authority.rules.find((rule:any)=>rule.id==='TF-AUTH-018')).toBeTruthy();
    expect(authority.rules.find((rule:any)=>rule.id==='TF-AUTH-010').precedenceMode).toBe('scope-specialization');
    expect(authority.rules.find((rule:any)=>rule.id==='TF-AUTH-010').scopeBoundary.length).toBeGreaterThan(40);
    expect(authority.rules.every((rule:any)=>rule.higherAuthorityRuleIds.length>0&&rule.domainIds.length>0)).toBe(true);
    expect(contextRuntime).not.toContain('parseTemplateFactoryAuthorities');
    expect(contextRuntime).toContain('authorityHierarchyIssues');
    expect(registry.principles.authorityPrecedenceFollowsConstitution).toBe(true);
    expect(registry.principles.lowerAuthorityMayRefineButNotOverride).toBe(true);
  });

  it('uses one global authority-conflict mechanism instead of a checkout-specific gate',()=>{
    const registry=json('quality/knowledge/guard-registry.v1.json');
    expect(registry.principles.authorityConflictDetectionIsGlobal).toBe(true);
    expect(registry.authorityConflictContracts.some((item:any)=>item.id==='AUTH-CONFLICT-TF-AUTH-005-CHECKOUT')).toBe(true);
    expect(registry.guards.some((guard:any)=>/checkout/i.test(guard.id))).toBe(false);
    const compliance=read('scripts/shoperation-instruction-compliance.mjs');
    expect(compliance).toContain('authorityConflictIssues');
    expect(compliance).not.toContain('const PROTECTED=');
  });

  it('returns external specialist results to the same shared evidence bus',()=>{
    const contextRuntime=read('scripts/lib/shoperation-guard-context.mjs');
    const runner=read('scripts/shoperation-specialist-runner.mjs');
    expect(contextRuntime).toContain('specialistEvidencePath');
    expect(contextRuntime).toContain("guard?.execution?.mode==='external-specialist'");
    expect(runner).toContain('publishGuardContext(guardId,evidence)');
  });

  it('requires checkout instruction proof to preserve shared E13 authority rather than a template-local replica',()=>{
    const ledger=json('quality/development/instruction-ledger.v1.json');
    const item=ledger.instructions.find((row:any)=>row.id==='PO-2026-09-27-CHECKOUT-TASK-FIRST');
    expect(item.authorityRuleIds).toContain('TF-AUTH-005');
    expect(item.checks.filter((check:any)=>check.kind==='authority-source-contains').length).toBeGreaterThanOrEqual(4);
    expect(item.checks.some((check:any)=>check.kind==='template-node-present'&&/form-preview|field-|shipping-methods/i.test(check.nodeId??''))).toBe(false);
    const pkg=read('src/lib/builder/templates/gaming/playroom/v20/canonical-package.json');
    expect(pkg).not.toContain('playroom-checkout-form-preview');
    expect(pkg).not.toContain('playroom-checkout-field-name');
    expect(read('src/app/penztar/page.tsx')).toContain('<CheckoutForm');
    expect(read('src/components/checkout/storefront-checkout-shell.tsx')).toContain('data-storefront-live-checkout="shared-e13"');
  });

  it('detects authority conflicts through one global evaluator instead of checkout-specific gate logic',()=>{
    const registry=json('quality/knowledge/guard-registry.v1.json');
    expect(registry.principles.authorityConflictDetectionIsGlobal).toBe(true);
    expect(registry.authorityConflictContracts.map((item:any)=>item.authorityRuleId)).toEqual(expect.arrayContaining(['TF-AUTH-005']));
    expect(registry.authorityConflictContracts.map((item:any)=>item.id)).toEqual(expect.arrayContaining([
      'AUTH-CONFLICT-TF-AUTH-005-CHECKOUT',
      'AUTH-CONFLICT-TF-AUTH-005-CART',
      'AUTH-CONFLICT-TF-AUTH-005-ACCOUNT',
    ]));
    const compliance=read('scripts/shoperation-instruction-compliance.mjs');
    const context=read('scripts/lib/shoperation-guard-context.mjs');
    expect(compliance).toContain('authorityConflictIssues(item)');
    expect(compliance).not.toContain('const PROTECTED=');
    expect(context).toContain('export function authorityConflictIssues');
    expect(context).toContain('CONTROL_PLANE_AUTHORITY_CONFLICT');
    const checkout=registry.authorityConflictContracts.find((item:any)=>item.id==='AUTH-CONFLICT-TF-AUTH-005-CHECKOUT');
    expect(checkout.requiredAuthorityEvidence).toHaveLength(4);
  });

  it('forces Product Owner handoff to consume the same cross-gate evidence bus',()=>{
    const handoff=read('scripts/template-factory-product-owner-handoff.mjs');
    expect(handoff).toContain("artifacts/shoperation-development-guard/guard-context.json");
    expect(handoff).toContain("GUARD-INSTRUCTION-COMPLIANCE");
    expect(handoff).toContain("GUARD-INCREMENTAL-REPLAY");
    expect(handoff).toContain("CROSS_GUARD_EVIDENCE_NOT_PASS");
    expect(handoff).toContain("SHARED_COMMERCE_AUTHORITY_CONTEXT_MISSING");
  });

  it('records the checkout regression as recurrence, not a new disconnected failure class',()=>{
    const knowledge=json('quality/knowledge/shoperation-quality-knowledge.v1.json');
    const globalFailure=knowledge.knownFailures.find((item:any)=>item.id==='SQ-KF-025');
    expect(globalFailure.occurrences).toBeGreaterThanOrEqual(2);
    expect(globalFailure.remediationPolicy).toBe('shared-root-cause-required');
    const factory=read('src/lib/builder/template-factory/knowledge-registry.ts');
    expect(factory).toMatch(/id:'TF-KF-019'[\s\S]*?occurrences:2[\s\S]*?remediationPolicy:'shared-root-cause-required'/);
  });
});
