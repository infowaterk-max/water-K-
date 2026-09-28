import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Atlas 2.0 Change Impact / Release Closure integration',()=>{
  it('projects Atlas closure during the existing Knowledge Before Build preflight',()=>{
    const preflight=read('scripts/shoperation-knowledge-preflight.mjs');
    expect(preflight).toContain('releaseClosureForAtlasPatterns');
    expect(preflight).toContain("contract:'shoporation.change-impact.v1'");
    expect(preflight).toContain('directDomains');
    expect(preflight).toContain('directAuthorities');
    expect(preflight).toContain('SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED');
    expect(preflight).toContain("artifacts/shoperation-quality/change-impact.json");
    expect(preflight).toContain('changeObligationsForAtlasPatterns');
    expect(preflight).toContain('changePlan');
  });

  it('makes domain and authority impact part of Plan Before Code rather than a new standalone gate',()=>{
    const planGate=read('scripts/shoperation-plan-before-code.mjs');
    expect(planGate).toContain('DEV_PLAN_EXPECTED_DOMAINS_REQUIRED');
    expect(planGate).toContain('DEV_PLAN_EXPECTED_AUTHORITIES_REQUIRED');
    expect(planGate).toContain('DEV_PLAN_DOMAIN_SCOPE_DRIFT');
    expect(planGate).toContain('DEV_PLAN_AUTHORITY_SCOPE_DRIFT');
    expect(planGate).toContain('architectureImpact');
    expect(planGate).toContain('DEV_PLAN_CHANGE_OBLIGATIONS_REQUIRED');
    expect(planGate).toContain('DEV_PLAN_CHANGE_OBLIGATION_SCOPE_DRIFT');
    expect(planGate).toContain('DEV_PLAN_UNPLANNED_CHANGE_OBLIGATION');
    expect(planGate).toContain('DEV_PLAN_PROTECTED_COMPANION_CHANGED_WITHOUT_PO_APPROVAL');
    expect(planGate).toContain('changePlan:{planned:plannedChangePlan,actual:actualChangePlan}');
    const workflow=read('.github/workflows/ci.yml');
    expect(workflow).toContain('Shoperation Control Plane');
    expect(workflow).toContain('scripts/shoperation-control-plane.mjs');
    expect(workflow).not.toContain('Knowledge Before Build preflight');
    expect(workflow).not.toContain('Plan Before Code Gate');
    expect(workflow).not.toContain('Atlas Change Impact Gate');
    const controlPlane=read('scripts/shoperation-control-plane.mjs');
    expect(controlPlane).toContain('control-plane-managed');
  });

  it('classifies Control Plane-owned Template Factory proof scripts under Quality authority',()=>{
    const domains=JSON.parse(read('quality/knowledge/domain-foundations.v1.json')) as {domains:Array<{id:string;canonicalPaths:string[]}>};
    const quality=domains.domains.find(item=>item.id==='DOMAIN-QUALITY');
    expect(quality?.canonicalPaths).toContain('scripts/template-factory-**');
    const scope=JSON.parse(read('quality/knowledge/knowledge-scope-policy.v1.json')) as {knowledgeInfrastructurePrefixes:string[]};
    expect(scope.knowledgeInfrastructurePrefixes).toContain('scripts/template-factory-');
    const plan=JSON.parse(read('quality/development/active-plan.json')) as {plannedFilePatterns:string[];expectedDomains:string[];expectedAuthorities:string[]};
    expect(plan.plannedFilePatterns).toContain('scripts/template-factory-external-specialist.mjs');
    expect(plan.expectedDomains).toContain('DOMAIN-QUALITY');
    expect(plan.expectedAuthorities).toContain('quality-knowledge-system');
  });

  it('requires exact-head Atlas closure evidence without relaxing the Release Risk Budget',()=>{
    const risk=read('scripts/release-risk-budget.mjs');
    const policy=JSON.parse(read('deploy/release-risk-policy.json')) as {maxPoints:number;maxSubsystems:number;riskWeights:{high:number}};
    expect(policy.maxPoints).toBe(5);
    expect(policy.maxSubsystems).toBe(3);
    expect(policy.riskWeights.high).toBe(5);
    expect(risk).toContain('Atlas change-impact evidence unavailable');
    expect(risk).toContain('Atlas change-impact file set does not match the release diff');
    expect(risk).toContain('Atlas change-impact source SHA');
    expect(risk).toContain('atlasClosure');
  });
  it('models A direct files and B companion lifecycle obligations before implementation',()=>{
    const policy=JSON.parse(read('quality/knowledge/codebase-atlas-policy.v2.json')) as {changeObligationRules:Array<{id:string;kind:string;timing:string;mutationPolicy:string;targetPatterns?:string[]}>};
    const golden=policy.changeObligationRules.find(item=>item.id==='ATLAS-OBL-005');
    expect(golden?.kind).toBe('deferred-golden-baseline-promotion');
    expect(golden?.timing).toBe('after-explicit-product-owner-visual-acceptance');
    expect(golden?.mutationPolicy).toBe('forbidden-before-explicit-product-owner-acceptance');
    expect(golden?.targetPatterns).toContain('tests/visual-baselines/**');
    const guard=read('scripts/shoperation-development-guard.mjs');
    expect(guard).toContain('## A/B Change Plan');
    expect(guard).toContain('expectedChangeObligationIds');
  });

});
