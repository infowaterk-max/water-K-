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
    const byId=new Map(registry.guards.map((item:any)=>[item.id,item]));
    expect(byId.get('GUARD-KNOWLEDGE-PREFLIGHT').consumesEvidenceFrom).toContain('GUARD-INSTRUCTION-COMPLIANCE');
    expect(byId.get('GUARD-PLAN-BEFORE-CODE').consumesEvidenceFrom).toEqual(expect.arrayContaining(['GUARD-INSTRUCTION-COMPLIANCE','GUARD-KNOWLEDGE-PREFLIGHT']));
    expect(byId.get('GUARD-EDIT-TIME').consumesEvidenceFrom).toEqual(expect.arrayContaining(['GUARD-INSTRUCTION-COMPLIANCE','GUARD-KNOWLEDGE-PREFLIGHT','GUARD-PLAN-BEFORE-CODE']));
    expect(byId.get('GUARD-INCREMENTAL-REPLAY').consumesEvidenceFrom).toEqual(expect.arrayContaining(['GUARD-INSTRUCTION-COMPLIANCE','GUARD-KNOWLEDGE-PREFLIGHT','GUARD-PLAN-BEFORE-CODE','GUARD-EDIT-TIME']));
  });

  it('builds one context containing global, domain and Template Factory authorities',()=>{
    execFileSync(process.execPath,['scripts/shoperation-instruction-compliance.mjs','--check'],{stdio:'pipe'});
    expect(existsSync('artifacts/shoperation-development-guard/guard-context.json')).toBe(true);
    const context=json('artifacts/shoperation-development-guard/guard-context.json');
    expect(context.contract).toBe('shoporation.guard-context.v1');
    expect(context.authorities.templateFactory.some((rule:any)=>rule.id==='TF-AUTH-005'&&rule.owner==='platform')).toBe(true);
    expect(context.authorities.global.some((rule:any)=>rule.id==='SQ-AUTH-021')).toBe(true);
    expect(context.currentGuard.id).toBe('GUARD-INSTRUCTION-COMPLIANCE');
    expect(context.currentGuard.decision).toBe('PASS');
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
