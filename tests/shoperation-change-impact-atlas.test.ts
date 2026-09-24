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
  });

  it('makes domain and authority impact part of Plan Before Code rather than a new standalone gate',()=>{
    const planGate=read('scripts/shoperation-plan-before-code.mjs');
    expect(planGate).toContain('DEV_PLAN_EXPECTED_DOMAINS_REQUIRED');
    expect(planGate).toContain('DEV_PLAN_EXPECTED_AUTHORITIES_REQUIRED');
    expect(planGate).toContain('DEV_PLAN_DOMAIN_SCOPE_DRIFT');
    expect(planGate).toContain('DEV_PLAN_AUTHORITY_SCOPE_DRIFT');
    expect(planGate).toContain('architectureImpact');
    const workflow=read('.github/workflows/ci.yml');
    expect(workflow).toContain('Knowledge Before Build preflight');
    expect(workflow).toContain('Plan Before Code Gate');
    expect(workflow).not.toContain('Atlas Change Impact Gate');
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
});
