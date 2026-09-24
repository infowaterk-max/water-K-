import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_TEMPLATE_FACTORY_RECIPES,buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {TEMPLATE_FACTORY_AUTHORITY_GRAPH,TEMPLATE_FACTORY_KNOWN_FAILURES} from '@/lib/builder/template-factory/knowledge-registry';
import {createTemplateFactoryAcceptanceProof,evaluateTemplateFactoryPreflight,isRecurringFailureSharedFixRequired,replayTemplateFactoryKnownFailures} from '@/lib/builder/template-factory/procedural-memory';

describe('Template Factory procedural memory foundation',()=>{
  it('keeps every known failure bound to a real invariant and existing regression authority',()=>{
    const authorityIds=new Set(TEMPLATE_FACTORY_AUTHORITY_GRAPH.map(item=>item.id));
    expect(new Set(TEMPLATE_FACTORY_KNOWN_FAILURES.map(item=>item.id)).size).toBe(TEMPLATE_FACTORY_KNOWN_FAILURES.length);
    for(const failure of TEMPLATE_FACTORY_KNOWN_FAILURES){
      expect(failure.invariantIds.length,failure.id).toBeGreaterThan(0);
      expect(failure.regressionTests.length,failure.id).toBeGreaterThan(0);
      for(const invariantId of failure.invariantIds)expect(authorityIds.has(invariantId),`${failure.id} missing ${invariantId}`).toBe(true);
      for(const regressionTest of failure.regressionTests)expect(fs.existsSync(regressionTest),`${failure.id} missing ${regressionTest}`).toBe(true);
      if(failure.occurrences>=2){
        expect(failure.remediationPolicy,failure.id).toBe('shared-root-cause-required');
        expect(isRecurringFailureSharedFixRequired(failure.id),failure.id).toBe(true);
      }
    }
  });

  it('runs deterministic preflight for every registered recipe without equating preflight with acceptance',()=>{
    for(const recipe of STOREFRONT_TEMPLATE_FACTORY_RECIPES){
      const preflight=evaluateTemplateFactoryPreflight(recipe);
      expect(preflight.knownFailureIds).toHaveLength(TEMPLATE_FACTORY_KNOWN_FAILURES.length);
      expect(preflight.authorityRuleIds).toHaveLength(TEMPLATE_FACTORY_AUTHORITY_GRAPH.length);
      expect(preflight.issues.every(issue=>issue.code.startsWith('TF_PREFLIGHT_'))).toBe(true);
      expect(preflight.ok).toBe(preflight.issues.length===0);
    }
  });

  it('replays current candidate-level failure contracts deterministically and catches legacy identity regression',()=>{
    const recipe=STOREFRONT_TEMPLATE_FACTORY_RECIPES[0]!;
    const build=buildRegisteredStorefrontTemplateFactoryCandidate(recipe.templateKey);
    const replay=replayTemplateFactoryKnownFailures(build);
    expect(replay.length).toBeGreaterThan(0);
    expect(new Set(replay.map(item=>item.failureId)).size).toBe(replay.length);
    for(const item of replay){
      expect(typeof item.passed).toBe('boolean');
      expect(item.evidence.length,item.failureId).toBeGreaterThan(0);
    }
    const regressed=structuredClone(build);
    regressed.package.manifest.templateVersion=recipe.templateVersion-1;
    expect(replayTemplateFactoryKnownFailures(regressed).find(item=>item.failureId==='TF-KF-001')?.passed).toBe(false);
  });

  it('never marks handoff ready while deterministic known-failure replay still has blockers',()=>{
    const recipe=STOREFRONT_TEMPLATE_FACTORY_RECIPES[0]!;
    const build=buildRegisteredStorefrontTemplateFactoryCandidate(recipe.templateKey);
    const journey={sourceCommit:'deadbeef',exactHeadBuildPassed:true,browserMatrixPassed:true,factoryPackageIdentityPassed:true,templateAwareAuthPassed:true,returnTargetPreserved:true,deploymentReady:true,handedOffUrlMatchesProvenance:true,navigationCompletenessPassed:true,routeConvergencePassed:true,presentationContinuityPassed:true,accountSurfacePassed:true,engineDemoIntegrationPassed:true,placeholderContentPassed:true};
    const proof=createTemplateFactoryAcceptanceProof({build,referenceKey:recipe.reference.key,journey});
    const failed=proof.failureReplays.filter(item=>!item.passed);
    if(failed.length){
      expect(proof.handoffReady).toBe(false);
      for(const item of failed)expect(proof.maturity.blockers).toContain(`REPLAY:${item.failureId}`);
    }
  });
});
