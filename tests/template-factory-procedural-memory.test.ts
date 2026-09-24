import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_TEMPLATE_FACTORY_RECIPES,buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {
  TEMPLATE_FACTORY_AUTHORITY_GRAPH,
  TEMPLATE_FACTORY_KNOWN_FAILURES,
} from '@/lib/builder/template-factory/knowledge-registry';
import {
  assertTemplateFactoryProceduralMemory,
  classifyTemplateFactoryQualitySystemDefects,
  createTemplateFactoryAcceptanceProof,
  evaluateTemplateFactoryPreflight,
  isRecurringFailureSharedFixRequired,
  replayTemplateFactoryKnownFailures,
} from '@/lib/builder/template-factory/procedural-memory';

describe('Template Factory procedural memory',()=>{
  it('keeps browser proof assertions synchronized with streamed screenshot state',()=>{
    const harness=fs.readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    expect(harness).toContain("await runtimeRoot.waitFor({state:'visible',timeout:10000})");
    expect(harness).toContain("await demoWarning.waitFor({state:'visible',timeout:5000})");
    expect(harness).toContain("errors:caseErrors");
  });

  it('never lets a Factory canary subset satisfy full browser-matrix acceptance',()=>{
    const harness=fs.readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    expect(harness).toContain("const mode=template.factoryCandidate?'full':'canary'");
    expect(harness).toContain("const fullBrowserMatrixComplete=");
    expect(harness).toContain("browserMatrixComplete:fullBrowserMatrixComplete");
    expect(harness).toContain("browserMatrixExpectedCaseCount:expectedMatrixKeys.size");
    expect(TEMPLATE_FACTORY_AUTHORITY_GRAPH.some(item=>item.id==='TF-AUTH-011')).toBe(true);
    expect(TEMPLATE_FACTORY_KNOWN_FAILURES.some(item=>item.id==='TF-KF-009')).toBe(true);
  });

  it('keeps every known failure bound to a real invariant and regression test',()=>{
    const authorityIds=new Set(TEMPLATE_FACTORY_AUTHORITY_GRAPH.map(item=>item.id));
    expect(new Set(TEMPLATE_FACTORY_KNOWN_FAILURES.map(item=>item.id)).size).toBe(TEMPLATE_FACTORY_KNOWN_FAILURES.length);
    for(const failure of TEMPLATE_FACTORY_KNOWN_FAILURES){
      expect(failure.invariantIds.length).toBeGreaterThan(0);
      expect(failure.regressionTests.length).toBeGreaterThan(0);
      for(const invariantId of failure.invariantIds)expect(authorityIds.has(invariantId),`${failure.id} missing ${invariantId}`).toBe(true);
      for(const regressionTest of failure.regressionTests)expect(fs.existsSync(regressionTest),`${failure.id} missing ${regressionTest}`).toBe(true);
      if(failure.occurrences>=2){
        expect(failure.remediationPolicy).toBe('shared-root-cause-required');
        expect(isRecurringFailureSharedFixRequired(failure.id)).toBe(true);
        expect(failure.regressionTests.some(test=>!/(playroom|loot-vault)/i.test(test)),`${failure.id} needs a shared regression authority`).toBe(true);
      }
    }
  });

  it('runs knowledge preflight before every registered Factory recipe',()=>{
    for(const recipe of STOREFRONT_TEMPLATE_FACTORY_RECIPES){
      const preflight=evaluateTemplateFactoryPreflight(recipe);
      expect(preflight.knownFailureIds.length).toBe(TEMPLATE_FACTORY_KNOWN_FAILURES.length);
      expect(preflight.authorityRuleIds.length).toBe(TEMPLATE_FACTORY_AUTHORITY_GRAPH.length);
      expect(preflight.ok,`${recipe.templateKey}: ${JSON.stringify(preflight.issues)}`).toBe(true);
    }
  });

  it('replays prior Factory failures against every registered candidate',()=>{
    for(const recipe of STOREFRONT_TEMPLATE_FACTORY_RECIPES){
      const build=buildRegisteredStorefrontTemplateFactoryCandidate(recipe.templateKey);
      expect(build.report.provenance).toMatchObject({
        compileSource:'template-factory',
        recipeIdentity:`${recipe.templateKey}@${recipe.templateVersion}`,
        targetTemplateKey:recipe.templateKey,
        targetTemplateVersion:recipe.templateVersion,
      });
      for(const page of build.package.pages){
        expect(page.metadata?.templateFactory).toMatchObject({
          compileSource:'template-factory',
          recipeIdentity:`${recipe.templateKey}@${recipe.templateVersion}`,
          targetTemplateKey:recipe.templateKey,
          targetTemplateVersion:recipe.templateVersion,
        });
      }
      const replays=replayTemplateFactoryKnownFailures(build);
      expect(replays.every(item=>item.passed),`${recipe.templateKey}: ${JSON.stringify(replays)}`).toBe(true);
      expect(classifyTemplateFactoryQualitySystemDefects(build)).toEqual([]);
      expect(()=>assertTemplateFactoryProceduralMemory(build)).not.toThrow();
    }
  });

  it('fails the replay when candidate identity regresses to a legacy version',()=>{
    const recipe=STOREFRONT_TEMPLATE_FACTORY_RECIPES[0]!;
    const build=structuredClone(buildRegisteredStorefrontTemplateFactoryCandidate(recipe.templateKey));
    build.package.manifest.templateVersion=recipe.templateVersion-1;
    const replay=replayTemplateFactoryKnownFailures(build).find(item=>item.failureId==='TF-KF-001');
    expect(replay?.passed).toBe(false);
    expect(()=>assertTemplateFactoryProceduralMemory(build)).toThrow(/TF-KF-001/);
  });

  it('separates visual readiness from Product Owner journey proof and handoff',()=>{
    const recipe=STOREFRONT_TEMPLATE_FACTORY_RECIPES[0]!;
    const build=buildRegisteredStorefrontTemplateFactoryCandidate(recipe.templateKey);
    const baseJourney={
      sourceCommit:'deadbeef',
      exactHeadBuildPassed:true,
      browserMatrixPassed:true,
      factoryPackageIdentityPassed:true,
      templateAwareAuthPassed:true,
      returnTargetPreserved:true,
      deploymentReady:true,
      handedOffUrlMatchesProvenance:true,
    };
    const ready=createTemplateFactoryAcceptanceProof({build,referenceKey:recipe.reference.key,journey:baseJourney});
    expect(ready.maturity.stage).toBe('product-owner-ready');
    expect(ready.handoffReady).toBe(true);
    expect(ready.provenance).toMatchObject({templateKey:recipe.templateKey,templateVersion:recipe.templateVersion,sourceCommit:'deadbeef'});

    const broken=createTemplateFactoryAcceptanceProof({
      build,
      referenceKey:recipe.reference.key,
      journey:{...baseJourney,handedOffUrlMatchesProvenance:false},
    });
    expect(broken.maturity.stage).toBe('visually-ready');
    expect(broken.handoffReady).toBe(false);
    expect(broken.maturity.blockers).toContain('PRODUCT_OWNER_JOURNEY_NOT_PROVEN');
  });
});
