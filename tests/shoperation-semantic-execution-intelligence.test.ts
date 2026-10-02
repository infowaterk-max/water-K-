import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  buildCodebaseAtlas,
  buildExecutionRoute,
  classifyAtlasPath,
  impactForAtlasPattern,
  reconcileAuthorityDependencies,
  resolveAtlasArchitectureForPath,
  validateCodebaseAtlas,
} from '../scripts/lib/shoperation-codebase-atlas-runtime.mjs';
import {
  evaluateCandidateConsumers,
  extractReferenceCandidatesFromLine,
  reconcileReferenceRelocations,
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

  it('falls back unowned public presentation paths to storefront without stealing explicit authority',()=>{
    const publicPage=classifyAtlasPath('src/app/oldal/[slug]/page.tsx');
    expect(publicPage.domains).toEqual(['DOMAIN-STOREFRONT']);
    expect(publicPage.authorities).toEqual(['shared-storefront']);
    expect(publicPage.route).toEqual({path:'/oldal/:slug',kind:'page'});

    const sitemap=classifyAtlasPath('src/app/sitemap.ts');
    expect(sitemap.domains).toEqual(['DOMAIN-STOREFRONT']);
    expect(sitemap.authorities).toEqual(['shared-storefront']);
    expect(sitemap.route).toBeNull();

    const admin=classifyAtlasPath('src/app/admin/orders/page.tsx');
    expect(admin.domains).toEqual(['DOMAIN-ADMIN']);
    expect(admin.authorities).toEqual(['admin-operations']);

    const builder=classifyAtlasPath('src/app/storefront-template-preview/page.tsx');
    expect(builder.domains).toEqual(['DOMAIN-BUILDER']);
    expect(builder.authorities).toEqual(['builder-template-system']);

    const api=classifyAtlasPath('src/app/api/orders/route.ts');
    expect(api.domains).toEqual(['DOMAIN-COMMERCE']);
    expect(api.authorities).toEqual(['commerce-core-authority']);
    expect(api.route?.kind).toBe('api');
  });

  it('keeps materialized Atlas, impact and resolver classification coherent with the canonical path classifier',()=>{
    const atlas:any=buildCodebaseAtlas();
    const paths=[
      'src/app/oldal/[slug]/page.tsx',
      'src/app/sitemap.ts',
      'src/app/storefront-preview/[token]/page.tsx',
      'scripts/lib/shoperation-codebase-atlas-runtime.mjs',
    ];
    for(const path of paths){
      const node=atlas.nodes.find((item:any)=>item.path===path);
      expect(node).toBeTruthy();
      const expected=classifyAtlasPath(path);
      expect({
        route:node.route,
        subsystems:[...node.subsystems].sort(),
        surfaces:[...node.surfaces].sort(),
        domains:[...node.domains].sort(),
        authorities:[...node.authorities].sort(),
        truthKeys:[...node.truthKeys].sort(),
      }).toEqual({
        route:expected.route,
        subsystems:[...expected.subsystems].sort(),
        surfaces:[...expected.surfaces].sort(),
        domains:[...expected.domains].sort(),
        authorities:[...expected.authorities].sort(),
        truthKeys:[...expected.truthKeys].sort(),
      });
    }

    const qualityHelper=classifyAtlasPath('scripts/lib/shoperation-codebase-atlas-runtime.mjs');
    expect(qualityHelper.surfaces).toContain('quality-system');
    expect(qualityHelper.domains).toEqual(['DOMAIN-QUALITY']);
    expect(qualityHelper.authorities).toEqual(['quality-knowledge-system']);

    const preview=classifyAtlasPath('src/app/storefront-preview/[token]/page.tsx');
    expect(preview.domains).toEqual(['DOMAIN-BUILDER']);
    expect(preview.authorities).toEqual(['builder-template-system']);

    const b2bPage=readFileSync('src/app/fiokom/b2b/page.tsx','utf8');
    expect(b2bPage).not.toContain('B2B_ACCOUNT_BUILDER_MANIFEST');
    expect(b2bPage).not.toContain("@/lib/commerce/b2b-account-builder");

    const cleanIssues=validateCodebaseAtlas(atlas).issues.filter((issue:any)=>
      issue.code==='ATLAS_CLASSIFICATION_DIVERGENCE'
      ||issue.code==='ATLAS_PO_ROUTE_AUTHORITY_CONFLICT'
      ||issue.code==='ATLAS_AUTHORITY_DEPENDENCY_DRIFT'
    );
    expect(cleanIssues).toEqual([]);

    const publicPath='src/app/oldal/[slug]/page.tsx';
    const inconsistent:any={
      ...atlas,
      nodes:atlas.nodes.map((node:any)=>node.path===publicPath
        ?{...node,domains:[],authorities:[],truthKeys:[]}
        :node),
    };
    const divergence=validateCodebaseAtlas(inconsistent).issues.filter((issue:any)=>issue.code==='ATLAS_CLASSIFICATION_DIVERGENCE');
    expect(divergence.map((issue:any)=>issue.field)).toEqual(expect.arrayContaining(['domains','authorities']));

    const resolved=resolveAtlasArchitectureForPath(inconsistent,publicPath);
    expect(resolved.pathDerived).toEqual({
      domains:['DOMAIN-STOREFRONT'],
      authorities:['shared-storefront'],
    });
    const impact=impactForAtlasPattern(inconsistent,publicPath);
    expect(impact.domains).toContain('DOMAIN-STOREFRONT');
    expect(impact.authorities).toContain('shared-storefront');
  });

  it('blocks structured active PO route-authority conflicts without inferring from prose',()=>{
    const atlas:any=buildCodebaseAtlas();
    const required={
      id:'PO-REQ-CONFLICT',
      lifecycle:'active',
      supersededBy:null,
      positiveRequirement:'Expose the required route as its own public authority.',
      affectedPatterns:['src/app/**'],
      affectedRoutes:['/coherence-conflict'],
      forbiddenStates:[],
    };
    const forbidden={
      id:'PO-FORBID-CONFLICT',
      lifecycle:'active',
      supersededBy:null,
      positiveRequirement:'Keep the legacy state removed.',
      affectedPatterns:['src/app/**'],
      affectedRoutes:[],
      forbiddenStates:['route:/coherence-conflict'],
    };
    const conflictAtlas={...atlas,poInstructions:[required,forbidden]};
    const conflicts=validateCodebaseAtlas(conflictAtlas).issues.filter((issue:any)=>issue.code==='ATLAS_PO_ROUTE_AUTHORITY_CONFLICT');
    expect(conflicts).toEqual([expect.objectContaining({
      route:'/coherence-conflict',
      requiredInstructionId:'PO-REQ-CONFLICT',
      forbiddenInstructionId:'PO-FORBID-CONFLICT',
    })]);

    const inactiveAtlas={...atlas,poInstructions:[required,{...forbidden,lifecycle:'inactive'}]};
    expect(validateCodebaseAtlas(inactiveAtlas).issues.filter((issue:any)=>issue.code==='ATLAS_PO_ROUTE_AUTHORITY_CONFLICT')).toEqual([]);

    const supersededAtlas={...atlas,poInstructions:[required,{...forbidden,supersededBy:'PO-NEW'}]};
    expect(validateCodebaseAtlas(supersededAtlas).issues.filter((issue:any)=>issue.code==='ATLAS_PO_ROUTE_AUTHORITY_CONFLICT')).toEqual([]);

    const proseOnlyAtlas={...atlas,poInstructions:[
      required,
      {...forbidden,id:'PO-PROSE-ONLY',forbiddenStates:[],positiveRequirement:'Do not expose /coherence-conflict.'},
    ]};
    expect(validateCodebaseAtlas(proseOnlyAtlas).issues.filter((issue:any)=>issue.code==='ATLAS_PO_ROUTE_AUTHORITY_CONFLICT')).toEqual([]);
  });

  it('retains only Git-proven deleted planned paths as execution-route tombstones',()=>{
    const atlas:any={
      nodes:[
        {path:'src/live.ts',subsystems:[],surfaces:[],domains:[],literalKeys:[],exports:[],referenceTerms:[],route:null,kind:'code'},
      ],
      reverseImports:{},
      semanticGraph:{reverseFileEdges:{},unknowns:[]},
      poInstructions:[],
      unresolvedInternalImports:[],
    };
    const deleted='src/app/szallitas-es-fizetes/page.tsx';
    const withDeletion=buildExecutionRoute(atlas,[deleted],{tombstones:[deleted]});
    expect(withDeletion.MUST_EDIT).toContain(deleted);
    expect(withDeletion.TOMBSTONES).toEqual([deleted]);

    const merelyAbsent=buildExecutionRoute(atlas,[deleted],{tombstones:[]});
    expect(merelyAbsent.MUST_EDIT).not.toContain(deleted);
    expect(merelyAbsent.TOMBSTONES).toEqual([]);
  });

  it('separates path domain, deleted route and PO instruction authority for forbidden route tombstones',()=>{
    const deleted='src/app/szallitas-es-fizetes/page.tsx';
    const instruction={
      id:'PO-INSTRUCTION-SHIPPING-PAYMENT-SEPARATE',
      lifecycle:'active',
      affectedPatterns:['src/app/**'],
      affectedDomains:['DOMAIN-BUILDER','DOMAIN-STOREFRONT'],
      affectedRoutes:['/szallitas','/fizetes'],
      forbiddenStates:['route:/szallitas-es-fizetes'],
    };
    const atlas:any={
      nodes:[],
      reverseImports:{},
      semanticGraph:{reverseFileEdges:{},unknowns:[]},
      unresolvedInternalImports:[],
      poInstructions:[instruction],
    };

    const route=buildExecutionRoute(atlas,[deleted],{tombstones:[deleted]});
    expect(route.INSTRUCTION_REQUIRED).toContain(deleted);
    expect(route.FORBIDDEN_ROUTE_TOMBSTONES).toEqual([deleted]);
    expect(route.INSTRUCTION_REQUIREMENTS[0]).toEqual(expect.objectContaining({
      instructionId:instruction.id,
      forbiddenRouteTombstones:[deleted],
    }));

    const resolved=resolveAtlasArchitectureForPath(atlas,deleted,{tombstones:[deleted],executionRoute:route});
    expect(resolved.pathDerived.domains).toEqual(['DOMAIN-STOREFRONT']);
    expect(resolved.pathDerived.authorities).toEqual(['shared-storefront']);
    expect(resolved.routeAuthority).toEqual({path:'/szallitas-es-fizetes',kind:'page',state:'deleted-tombstone'});
    expect(resolved.poInstructionAuthority).toEqual({instructionIds:[instruction.id],governsDeletion:true});
    expect(resolved.resolved).toBe(true);

    const noGitRoute=buildExecutionRoute(atlas,[deleted],{tombstones:[]});
    const noGit=resolveAtlasArchitectureForPath(atlas,deleted,{tombstones:[],executionRoute:noGitRoute});
    expect(noGit.pathDerived.domains).toEqual(['DOMAIN-STOREFRONT']);
    expect(noGit.poInstructionAuthority.governsDeletion).toBe(false);
    expect(noGit.routeAuthority).toEqual({path:'/szallitas-es-fizetes',kind:'page',state:'current-or-planned'});
    expect(noGit.resolved).toBe(true);

    const unrelated='src/app/legacy-payment/page.tsx';
    const unrelatedRoute=buildExecutionRoute(atlas,[unrelated],{tombstones:[unrelated]});
    const unrelatedEvidence=resolveAtlasArchitectureForPath(atlas,unrelated,{tombstones:[unrelated],executionRoute:unrelatedRoute});
    expect(unrelatedRoute.FORBIDDEN_ROUTE_TOMBSTONES).toEqual([]);
    expect(unrelatedEvidence.routeAuthority).toEqual({path:'/legacy-payment',kind:'page',state:'deleted-tombstone'});
    expect(unrelatedEvidence.pathDerived.domains).toEqual(['DOMAIN-STOREFRONT']);
    expect(unrelatedEvidence.poInstructionAuthority.instructionIds).toEqual([]);
    expect(unrelatedEvidence.poInstructionAuthority.governsDeletion).toBe(false);
    expect(unrelatedEvidence.resolved).toBe(true);
  });

  it('authorizes only active PO-governed planned static deletion without treating intent as Git proof',()=>{
    const deleted='src/app/szallitas-es-fizetes/page.tsx';
    const instruction={
      id:'PO-INSTRUCTION-SHIPPING-PAYMENT-SEPARATE',
      lifecycle:'active',
      affectedPatterns:['src/app/**'],
      affectedDomains:['DOMAIN-BUILDER','DOMAIN-STOREFRONT'],
      affectedRoutes:['/szallitas','/fizetes'],
      forbiddenStates:['route:/szallitas-es-fizetes'],
    };
    const atlas:any={nodes:[],reverseImports:{},semanticGraph:{reverseFileEdges:{},unknowns:[]},unresolvedInternalImports:[],poInstructions:[instruction]};

    const plannedRoute=buildExecutionRoute(atlas,[deleted],{plannedDeletions:[deleted]});
    expect(plannedRoute.TOMBSTONES).toEqual([]);
    expect(plannedRoute.PLANNED_DELETIONS).toEqual([deleted]);
    expect(plannedRoute.FORBIDDEN_ROUTE_TOMBSTONES).toEqual([]);
    expect(plannedRoute.PLANNED_FORBIDDEN_ROUTE_DELETIONS).toEqual([deleted]);
    const planned=resolveAtlasArchitectureForPath(atlas,deleted,{plannedDeletions:[deleted],executionRoute:plannedRoute});
    expect(planned.routeAuthority).toEqual({path:'/szallitas-es-fizetes',kind:'page',state:'planned-deletion'});
    expect(planned.poInstructionAuthority).toEqual({instructionIds:[instruction.id],governsDeletion:false,authorizesPlannedDeletion:true});
    expect(planned.resolved).toBe(true);

    const actualWithoutGit=resolveAtlasArchitectureForPath(atlas,deleted,{tombstones:[],executionRoute:plannedRoute});
    expect(actualWithoutGit.routeAuthority).toEqual({path:'/szallitas-es-fizetes',kind:'page',state:'current-or-planned'});
    expect(actualWithoutGit.poInstructionAuthority.governsDeletion).toBe(false);
    expect(actualWithoutGit.pathDerived.domains).toEqual(['DOMAIN-STOREFRONT']);
    expect(actualWithoutGit.poInstructionAuthority.authorizesPlannedDeletion).toBeUndefined();
    expect(actualWithoutGit.resolved).toBe(true);

    const unrelated='src/app/unrelated-legacy/page.tsx';
    const unrelatedRoute=buildExecutionRoute(atlas,[unrelated],{plannedDeletions:[unrelated]});
    expect(unrelatedRoute.PLANNED_FORBIDDEN_ROUTE_DELETIONS).toEqual([]);
    const unrelatedPlanned=resolveAtlasArchitectureForPath(atlas,unrelated,{plannedDeletions:[unrelated],executionRoute:unrelatedRoute});
    expect(unrelatedPlanned.pathDerived.domains).toEqual(['DOMAIN-STOREFRONT']);
    expect(unrelatedPlanned.poInstructionAuthority.authorizesPlannedDeletion).toBeUndefined();
    expect(unrelatedPlanned.resolved).toBe(true);

    const inactiveAtlas:any={...atlas,poInstructions:[{...instruction,lifecycle:'inactive'}]};
    const inactiveRoute=buildExecutionRoute(inactiveAtlas,[deleted],{plannedDeletions:[deleted]});
    expect(inactiveRoute.PLANNED_FORBIDDEN_ROUTE_DELETIONS).toEqual([]);
    const inactivePlanned=resolveAtlasArchitectureForPath(inactiveAtlas,deleted,{plannedDeletions:[deleted],executionRoute:inactiveRoute});
    expect(inactivePlanned.pathDerived.domains).toEqual(['DOMAIN-STOREFRONT']);
    expect(inactivePlanned.poInstructionAuthority.authorizesPlannedDeletion).toBeUndefined();
    expect(inactivePlanned.resolved).toBe(true);
  });

  it('does not classify Git CLI long options as CSS-variable contracts',()=>{
    const cli=extractReferenceCandidatesFromLine("git(['diff','--name-only','--diff-filter=ACMR',base,head])",'scripts/lib/shoperation-development-runtime.mjs');
    expect(cli.filter((item:any)=>item.kind==='css-variable')).toEqual([]);

    const cssUse=extractReferenceCandidatesFromLine('color:var(--brand-accent);','src/app/demo.css');
    const cssDeclaration=extractReferenceCandidatesFromLine('--brand-accent:#35e9ff;','src/app/demo.css');
    const cssom=extractReferenceCandidatesFromLine("style.setProperty('--brand-accent',value)",'src/app/demo.ts');
    for(const candidates of [cssUse,cssDeclaration,cssom]){
      expect(candidates).toContainEqual(expect.objectContaining({kind:'css-variable',value:'--brand-accent'}));
    }
  });

  it('extracts display-text and component-key contracts instead of relying on generic grep expressions',()=>{
    const display=extractReferenceCandidatesFromLine('<h1>Termékfeltöltő Központ</h1>','src/app/admin/page.tsx');
    const component=extractReferenceCandidatesFromLine("componentKey:'commerce.product-grid'",'src/lib/builder/page.ts');
    expect(display).toContainEqual(expect.objectContaining({kind:'display-text',value:'Termékfeltöltő Központ'}));
    expect(component).toContainEqual(expect.objectContaining({kind:'component-key',value:'commerce.product-grid'}));
  });

  it('treats an explicit typed diff-side move as relocation without suppressing genuine removals',()=>{
    const moved:any={kind:'display-text',value:'Rendelés után',severity:'block',originFile:'src/app/old.tsx'};
    const genuine:any={kind:'component-key',value:'commerce.legacy-card',severity:'block',originFile:'src/lib/provider.ts'};
    const sameFile:any={kind:'display-text',value:'Ugyanott marad',severity:'block',originFile:'src/app/same.tsx'};
    const crossKind:any={kind:'route-literal',value:'/szallitas',severity:'review',originFile:'src/app/routes.ts'};

    const result=reconcileReferenceRelocations(
      [moved,genuine,sameFile,crossKind],
      [
        {kind:'display-text',value:'Rendelés után',severity:'block',originFile:'src/components/new.tsx'},
        {kind:'display-text',value:'Ugyanott marad',severity:'block',originFile:'src/app/same.tsx'},
        {kind:'display-text',value:'/szallitas',severity:'block',originFile:'src/components/label.tsx'},
      ] as any,
    );

    expect(result.relocations).toEqual([
      {kind:'display-text',value:'Rendelés után',fromFile:'src/app/old.tsx',toFiles:['src/components/new.tsx']},
    ]);
    expect(result.remaining).toEqual(expect.arrayContaining([genuine,sameFile,crossKind]));
    expect(result.remaining).not.toContain(moved);

    const stale=evaluateCandidateConsumers(
      result.remaining,
      [],
      [{file:'tests/legacy-consumer.test.ts',line:1,text:"expect(key).toBe('commerce.legacy-card')",source:'lexical'}] as any,
    ).flatMap(item=>item.staleConsumers);
    expect(stale).toContainEqual(expect.objectContaining({file:'tests/legacy-consumer.test.ts'}));
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

  it('keeps the real repository authority graph reconciled and exposes the typed execution vocabulary',()=>{
    const atlas:any=buildCodebaseAtlas();
    const reality=reconcileAuthorityDependencies(atlas);
    expect(reality.discrepancies,JSON.stringify(reality.discrepancies.slice(0,20),null,2)).toEqual([]);
    expect(reality.decision).toBe('PASS');

    const shippingRoute=buildExecutionRoute(atlas,['src/lib/builder/storefront-template-route-integrity.ts']);
    expect(shippingRoute.PO_INSTRUCTIONS).toContain('PO-INSTRUCTION-SHIPPING-PAYMENT-SEPARATE');
    expect(shippingRoute.INSTRUCTION_REQUIRED).toEqual(expect.arrayContaining([
      'src/lib/builder/storefront-template-route-integrity.ts',
      'src/app/szallitas-es-fizetes/page.tsx',
      'src/app/szallitas/page.tsx',
      'src/app/fizetes/page.tsx',
    ]));
    expect(shippingRoute.INSTRUCTION_REQUIREMENTS.find((item:any)=>item.instructionId==='PO-INSTRUCTION-SHIPPING-PAYMENT-SEPARATE')).toEqual(expect.objectContaining({
      requiredRouteFiles:expect.arrayContaining(['src/app/szallitas/page.tsx','src/app/fizetes/page.tsx']),
    }));

    for(const edge of reality.edges.filter((item:any)=>item.classification==='allowed-execution-edge')){
      expect(edge.reconciled).toBe(true);
      expect(edge.transfersTruthOwnership).toBe(false);
      expect(edge.policyId).toMatch(/^EXEC-/);
    }

    const policy=JSON.parse(readFileSync('quality/knowledge/codebase-atlas-policy.v2.json','utf8')) as any;
    const requiredNodeKinds=[
      'file','module','export','imported-symbol','function','method','class','react-component','hook','context','provider',
      'route','server-action','api-handler','rpc','schema-type','config-key','registry-key','component-key',
      'page-schema-component','template-preset','design-token','css-variable','test','proof','authority','po-instruction','known-failure',
    ];
    const requiredEdgeKinds=[
      'imports','exports','references','calls','renders','wraps','adapts','passes-prop','uses-hook','provides-context',
      'consumes-context','reads-state','writes-state','uses-schema','invokes-rpc','resolves-route','registers','styles',
      'inherits-token','overrides','implements','proves','authority-of','instruction-applies-to',
    ];
    expect(policy.semanticGraph.nodeKinds).toEqual(expect.arrayContaining(requiredNodeKinds));
    expect(policy.semanticGraph.edgeKinds).toEqual(expect.arrayContaining(requiredEdgeKinds));

    const actualNodeKinds=new Set(atlas.semanticGraph.nodes.map((item:any)=>item.kind));
    for(const kind of [
      'module','imported-symbol','react-component','context','provider','route','api-handler','rpc','schema-type',
      'config-key','component-key','page-schema-component','template-preset','design-token','css-variable','test','proof',
      'authority','po-instruction','known-failure',
    ])expect(actualNodeKinds.has(kind),`missing semantic node kind ${kind}`).toBe(true);

    const actualEdgeKinds=new Set(atlas.semanticGraph.edges.map((item:any)=>item.type));
    for(const kind of [
      'imports','exports','references','calls','renders','passes-prop','uses-hook','provides-context','consumes-context',
      'reads-state','writes-state','uses-schema','invokes-rpc','resolves-route','registers','styles','inherits-token',
      'implements','proves','authority-of','instruction-applies-to','shares-contract',
    ])expect(actualEdgeKinds.has(kind),`missing semantic edge kind ${kind}`).toBe(true);

    expect(atlas.summary.typeCheckerAvailable).toBe(true);
    expect(atlas.summary.semanticNodes).toBeGreaterThan(atlas.summary.indexedNodes);
    expect(atlas.summary.semanticEdges).toBeGreaterThan(atlas.summary.importEdges);
  },60000);
});
