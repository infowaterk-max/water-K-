import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_TEMPLATE_FACTORY_RECIPES,buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {TEMPLATE_FACTORY_AUTHORITY_GRAPH,TEMPLATE_FACTORY_KNOWN_FAILURES} from '@/lib/builder/template-factory/knowledge-registry';
import {createTemplateFactoryAcceptanceProof,evaluateTemplateFactoryPreflight,isRecurringFailureSharedFixRequired,replayTemplateFactoryKnownFailures} from '@/lib/builder/template-factory/procedural-memory';

describe('Template Factory procedural memory',()=>{
  it('keeps streamed browser proof and handoff assertions bound to settled visible state',()=>{
    const harness=fs.readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    const handoff=fs.readFileSync('scripts/template-factory-product-owner-handoff.mjs','utf8');
    expect(harness).toContain("await runtimeRoot.waitFor({state:'visible',timeout:10000})");
    expect(harness).toContain("errors:caseErrors");
    expect(handoff).toContain("waitForURL(url=>url.pathname==='/storefront-template-preview-login',{timeout:10000})");
    expect(handoff).toContain("await shell.waitFor({state:'visible',timeout:10000})");
    expect(handoff).toContain('[data-storefront-auth-surface="true"]:visible');
    expect(handoff).toContain('JOURNEY_EXCEPTION:');
    expect(handoff.indexOf('}catch(error){')).toBeLessThan(handoff.indexOf('const proof={'));
    expect(TEMPLATE_FACTORY_KNOWN_FAILURES.find(item=>item.id==='TF-KF-007')?.remediationPolicy).toBe('shared-root-cause-required');
    expect(TEMPLATE_FACTORY_KNOWN_FAILURES.some(item=>item.id==='TF-KF-012')).toBe(true);
    expect(TEMPLATE_FACTORY_KNOWN_FAILURES.some(item=>item.id==='TF-KF-013')).toBe(true);
  });

  it('never labels the default canary selection as a full browser matrix proof',()=>{
    const harness=fs.readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    expect(harness).toContain("selected.mode==='full'?manifest.pageTypes:manifest.pageTypes.filter");
    expect(harness).toContain("mode:selected.mode");
    expect(harness).toContain("selection:scope.reasons");
    expect(harness).not.toContain("browserMatrixPassed:true");
    expect(TEMPLATE_FACTORY_AUTHORITY_GRAPH.some(item=>item.id==='TF-AUTH-011')).toBe(true);
    expect(TEMPLATE_FACTORY_KNOWN_FAILURES.some(item=>item.id==='TF-KF-009')).toBe(true);
  });

  it('keeps Product Owner handoff wired to exact-head deployment and protected preview authority',()=>{
    const workflow=fs.readFileSync('.github/workflows/template-factory-quality-gate.yml','utf8');
    const handoff=fs.readFileSync('scripts/template-factory-product-owner-handoff.mjs','utf8');
    expect(workflow).toContain('github.rest.repos.listDeployments');
    expect(workflow).toContain('github.rest.repos.listDeploymentStatuses');
    expect(workflow).toContain('const sha=context.payload.pull_request?.head?.sha??context.sha;');
    expect(workflow).toContain('PRODUCT_OWNER_SOURCE_COMMIT: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(workflow).toContain('VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}');
    expect(workflow).toContain('node scripts/template-factory-product-owner-handoff.mjs');
    expect(workflow).toContain("github.ref_name == 'feature/template-factory-vercel-automation-bypass'");
    expect(workflow).toContain("github.head_ref == 'feature/template-factory-storefront-contract-hardening'");
    expect(handoff).toContain("'x-vercel-protection-bypass':vercelAutomationBypassSecret");
    expect(handoff).toContain('VERCEL_AUTOMATION_BYPASS_SECRET_REQUIRED');
    for(const id of ['TF-KF-010','TF-KF-011','TF-KF-014','TF-KF-015'])expect(TEMPLATE_FACTORY_KNOWN_FAILURES.some(item=>item.id===id)).toBe(true);
  });

  it('keeps every known failure bound to a real invariant and regression authority',()=>{
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

  it('runs deterministic preflight for every registered recipe without pretending incomplete candidates are accepted',()=>{
    for(const recipe of STOREFRONT_TEMPLATE_FACTORY_RECIPES){
      const preflight=evaluateTemplateFactoryPreflight(recipe);
      expect(preflight.knownFailureIds).toHaveLength(TEMPLATE_FACTORY_KNOWN_FAILURES.length);
      expect(preflight.authorityRuleIds).toHaveLength(TEMPLATE_FACTORY_AUTHORITY_GRAPH.length);
      expect(preflight.issues.every(issue=>issue.code.startsWith('TF_PREFLIGHT_'))).toBe(true);
      expect(preflight.ok).toBe(preflight.issues.length===0);
    }
  });

  it('replays candidate-level failures deterministically and catches legacy identity regression',()=>{
    const recipe=STOREFRONT_TEMPLATE_FACTORY_RECIPES[0]!;
    const build=buildRegisteredStorefrontTemplateFactoryCandidate(recipe.templateKey);
    const replay=replayTemplateFactoryKnownFailures(build);
    expect(new Set(replay.map(item=>item.failureId)).size).toBe(replay.length);
    for(const item of replay){
      expect(typeof item.passed).toBe('boolean');
      expect(item.evidence.length,item.failureId).toBeGreaterThan(0);
    }
    const regressed=structuredClone(build);
    regressed.package.manifest.templateVersion=recipe.templateVersion-1;
    expect(replayTemplateFactoryKnownFailures(regressed).find(item=>item.failureId==='TF-KF-001')?.passed).toBe(false);
  });

  it('never promotes a candidate to handoff-ready while known-failure replay blockers remain',()=>{
    const recipe=STOREFRONT_TEMPLATE_FACTORY_RECIPES[0]!;
    const build=buildRegisteredStorefrontTemplateFactoryCandidate(recipe.templateKey);
    const journey={sourceCommit:'deadbeef',exactHeadBuildPassed:true,browserMatrixPassed:true,factoryPackageIdentityPassed:true,templateAwareAuthPassed:true,returnTargetPreserved:true,deploymentReady:true,handedOffUrlMatchesProvenance:true,navigationCompletenessPassed:true,routeConvergencePassed:true,presentationContinuityPassed:true,accountSurfacePassed:true,engineDemoIntegrationPassed:true,placeholderContentPassed:true};
    const proof=createTemplateFactoryAcceptanceProof({build,referenceKey:recipe.reference.key,journey});
    const failed=proof.failureReplays.filter(item=>!item.passed);
    if(failed.length){
      expect(proof.handoffReady).toBe(false);
      for(const item of failed)expect(proof.maturity.blockers).toContain(`REPLAY:${item.failureId}`);
    }else{
      expect(['journey-proven','product-owner-ready','accepted']).toContain(proof.maturity.stage);
    }
  });
});
