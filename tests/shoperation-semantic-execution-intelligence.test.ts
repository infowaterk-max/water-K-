import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  buildCodebaseAtlas,
  impactForAtlasPattern,
  reconcileAuthorityDependencies,
} from '../scripts/lib/shoperation-codebase-atlas-runtime.mjs';
import {
  evaluateCandidateConsumers,
  extractReferenceCandidatesFromLine,
} from '../scripts/lib/shoperation-reference-sync-runtime.mjs';

describe('Semantic Execution Intelligence adversarial closure',()=>{
  it('discovers a semantic consumer with no direct import edge',()=>{
    const atlas:any={
      nodes:[
        {path:'src/provider.ts',subsystems:[],surfaces:[],domains:[],literalKeys:['commerce.shared-contract'],exports:['sharedContract'],referenceTerms:['sharedContract'],route:null,kind:'code'},
        {path:'src/consumer.ts',subsystems:[],surfaces:[],domains:[],literalKeys:['commerce.shared-contract'],exports:[],referenceTerms:['sharedContract'],route:null,kind:'code'},
      ],
      reverseImports:{},
      literalIndex:{'commerce.shared-contract':['src/provider.ts','src/consumer.ts']},
      exportIndex:{sharedContract:['src/provider.ts']},
      referenceIndex:{sharedContract:['src/provider.ts','src/consumer.ts']},
      semanticGraph:{reverseFileEdges:{},unknowns:[]},
      knownFailureIndex:{},
    };
    expect(impactForAtlasPattern(atlas,'src/provider.ts').consumers).toContain('src/consumer.ts');
  });

  it('extracts display-text and component-key contracts instead of relying on generic grep expressions',()=>{
    const display=extractReferenceCandidatesFromLine('<h1>Termékfeltöltő Központ</h1>','src/app/admin/page.tsx');
    const component=extractReferenceCandidatesFromLine("componentKey:'commerce.product-grid'",'src/lib/builder/page.ts');
    expect(display).toContainEqual(expect.objectContaining({kind:'display-text',value:'Termékfeltöltő Központ'}));
    expect(component).toContainEqual(expect.objectContaining({kind:'component-key',value:'commerce.product-grid'}));
  });

  it('blocks stale cross-file display-text and component-key consumers while preserving semantic source evidence',()=>{
    const candidates:any[]=[
      {kind:'display-text',value:'Termékfeltöltő Központ',severity:'block',originFile:'src/app/admin/page.tsx'},
      {kind:'component-key',value:'commerce.product-grid',severity:'block',originFile:'src/lib/builder/registry.ts'},
    ];
    const after:any[]=[
      {file:'tests/admin-title.test.ts',line:12,text:"expect(source).toContain('Termékfeltöltő Központ')",source:'lexical'},
      {file:'src/lib/builder/schema-consumer.ts',line:0,text:'[semantic:component-key] commerce.product-grid',source:'semantic'},
    ];
    const stale=evaluateCandidateConsumers(candidates,[],after).flatMap(item=>item.staleConsumers);
    expect(stale).toContainEqual(expect.objectContaining({file:'tests/admin-title.test.ts'}));
    expect(stale).toContainEqual(expect.objectContaining({file:'src/lib/builder/schema-consumer.ts',source:'semantic'}));
  });

  it('turns unreconciled authority edges into reviewable semantic-learning records without auto-promotion',()=>{
    const atlas:any={
      nodes:[
        {path:'src/a.ts',domains:['DOMAIN-COMMERCE'],imports:['src/b.ts']},
        {path:'src/b.ts',domains:['DOMAIN-ADMIN'],imports:[]},
      ],
    };
    const reality=reconcileAuthorityDependencies(atlas);
    expect(reality.decision).toBe('BLOCK');
    expect(reality.learningMode).toBe('reviewable-not-auto-promoted');
    expect(reality.learningCandidates).toContainEqual(expect.objectContaining({
      missingEdge:{from:'src/a.ts',to:'src/b.ts'},
      edgeType:'missing-authority-edge',
      reviewRequired:true,
      confidence:0.95,
    }));
    expect(reality.learningCandidates[0].extractionStrategy).toMatch(/domain DAG|executionDependencyPolicies/);
  });

  it('keeps durable Product Owner decisions as canonical machine-readable authority',()=>{
    const registry=JSON.parse(readFileSync('quality/knowledge/po-instructions.v1.json','utf8')) as any;
    const instruction=registry.instructions.find((item:any)=>item.id==='PO-INSTRUCTION-SHIPPING-PAYMENT-SEPARATE');
    expect(registry.contract).toBe('shoporation.po-instructions.v1');
    expect(instruction.lifecycle).toBe('active');
    expect(instruction.affectedRoutes).toEqual(['/szallitas','/fizetes']);
    expect(instruction.forbiddenStates).toEqual(expect.arrayContaining([
      'route:/szallitas-es-fizetes',
      'route-key:shipping-payment',
      'display-label:Szállítás és fizetés',
    ]));
  });

  it('keeps the real repository authority graph fail-closed until every actual dependency is reconciled',()=>{
    const atlas:any=buildCodebaseAtlas();
    const reality=reconcileAuthorityDependencies(atlas);
    for(const edge of reality.edges.filter((item:any)=>item.classification==='allowed-execution-edge')){
      expect(edge.reconciled).toBe(true);
      expect(edge.transfersTruthOwnership).toBe(false);
      expect(edge.policyId).toMatch(/^EXEC-/);
    }
    for(const issue of reality.discrepancies)expect(['missing-authority-edge','ambiguous-mapping','illegal-dependency']).toContain(issue.classification);
  });
});
