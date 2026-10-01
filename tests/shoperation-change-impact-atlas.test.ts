import {readFileSync} from 'node:fs';
import {beforeAll,describe,expect,it} from 'vitest';
import {buildCodebaseAtlas,impactForAtlasPattern,reconcileAuthorityDependencies} from '../scripts/lib/shoperation-codebase-atlas-runtime.mjs';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Atlas 2.0 Change Impact / Release Closure integration',()=>{
  let realAtlas:any;
  beforeAll(()=>{realAtlas=buildCodebaseAtlas();},60000);
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
  it('ADVERSARIAL: discovers semantic contract consumers even without a direct import edge',()=>{
    const atlas:any={
      nodes:[
        {path:'src/stress/provider.ts',subsystems:[],surfaces:[],domains:[],literalKeys:['commerce.shared-contract'],exports:['sharedContract'],referenceTerms:['sharedContract'],route:null,kind:'code'},
        {path:'src/stress/consumer.ts',subsystems:[],surfaces:[],domains:[],literalKeys:['commerce.shared-contract'],exports:[],referenceTerms:['sharedContract'],route:null,kind:'code'},
      ],
      reverseImports:{},
      literalIndex:{'commerce.shared-contract':['src/stress/provider.ts','src/stress/consumer.ts']},
      referenceIndex:{sharedContract:['src/stress/provider.ts','src/stress/consumer.ts']},
      knownFailureIndex:{},
    };
    const impact=impactForAtlasPattern(atlas,'src/stress/provider.ts');
    expect(impact.consumers).toContain('src/stress/consumer.ts');
  });

  it('ADVERSARIAL: actual cross-domain imports are explicitly reconciled against authority DAG or execution-edge policy',()=>{
    const reality=reconcileAuthorityDependencies(realAtlas);
    expect(reality.contract).toBe('shoporation.authority-dependency-reconciliation.v2');
    expect(reality.discrepancies,JSON.stringify(reality.discrepancies.slice(0,30),null,2)).toEqual([]);
    expect(reality.decision).toBe('PASS');
    expect(reality.edges.some((edge:any)=>edge.classification==='allowed-execution-edge')).toBe(true);
  });

  it('ADVERSARIAL: an undeclared cross-domain import remains a missing authority edge and blocks reconciliation',()=>{
    const atlas:any={
      nodes:[
        {path:'src/a.ts',domains:['DOMAIN-COMMERCE'],imports:['src/b.ts']},
        {path:'src/b.ts',domains:['DOMAIN-ADMIN'],imports:[]},
      ],
    };
    const reality=reconcileAuthorityDependencies(atlas);
    expect(reality.decision).toBe('BLOCK');
    expect(reality.discrepancies).toContainEqual(expect.objectContaining({
      classification:'missing-authority-edge',
      from:'src/a.ts',
      to:'src/b.ts',
      sourceDomain:'DOMAIN-COMMERCE',
      targetDomain:'DOMAIN-ADMIN',
    }));
  });

  it('maps canonical path ownership by specificity instead of broad-directory overlap',()=>{
    const byPath=new Map(realAtlas.nodes.map((node:any)=>[node.path,node]));
    expect(byPath.get('src/lib/builder/storefront-runtime.ts')?.domains).toEqual(['DOMAIN-STOREFRONT']);
    expect(byPath.get('src/lib/builder/storefront-template-catalog.ts')?.domains).toEqual(['DOMAIN-BUILDER']);
    expect(byPath.get('src/lib/auth/admin-api.ts')?.domains).toEqual(['DOMAIN-IDENTITY']);
    expect(byPath.get('src/lib/storefront/pilot-access.ts')?.domains).toEqual(['DOMAIN-TENANCY']);
  });

});
