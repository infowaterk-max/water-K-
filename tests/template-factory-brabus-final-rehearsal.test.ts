import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_TEMPLATE_FACTORY_RECIPES,
  buildRegisteredStorefrontTemplateFactoryCandidate,
} from '@/lib/builder/template-factory/recipe-registry';
import {evaluateStorefrontTemplateProductionMaturity} from '@/lib/builder/template-factory/production-maturity';
import {
  STOREFRONT_ENGINE_BRABUS_REVALIDATION,
  STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY,
} from '@/lib/builder/template-factory/engine-functional-proof-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  planStorefrontSmartIntent,
  applyStorefrontSmartIntentPlan,
} from '@/lib/builder/storefront-smart-intent';
import {inspectStorefrontPublishReadiness} from '@/lib/builder/storefront-publish-readiness';
import {
  planStorefrontSmartAutoFix,
  applyStorefrontSmartAutoFixPlan,
} from '@/lib/builder/storefront-smart-autofix';
import {setStorefrontDesignGuardMode} from '@/lib/builder/storefront-fidelity-builder-operations';

const registry=createStorefrontVisualBuilderComponentRegistry();
const capability={plan:'pro' as const,features:[...PLANS.pro.features]};

describe('Template Production final Brabus end-to-end rehearsal',()=>{
  it('composes the canonical Loot Vault production chain without creating Template #3',async()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const originalPackage=JSON.stringify(build.package);
    const readiness=build.report.generatorReadiness;

    expect(readiness).toMatchObject({
      declared:true,
      ready:true,
      blueprintIdentity:'gaming.loot-vault@2',
      template3AuthoringReady:true,
      issues:[],
    });
    expect(readiness.productionMaturity).toMatchObject({
      valid:true,
      template3AuthoringReady:true,
      blockingCapabilityIds:[],
    });
    expect(readiness.genomeValidation.valid).toBe(true);
    expect(readiness.typeSystemValidation.valid).toBe(true);
    expect(readiness.typeCompatibility.valid).toBe(true);
    expect(readiness.constraintPlanning.valid).toBe(true);
    expect(readiness.mediaPlanning.valid).toBe(true);
    expect(readiness.mediaPlanning.technicalFulfilled).toBe(true);
    expect(readiness.productionLineage?.valid).toBe(true);
    expect(readiness.distinctness.valid).toBe(true);
    expect(readiness.productionCompiler).toMatchObject({required:true,valid:true,issues:[]});

    expect(STOREFRONT_TEMPLATE_FACTORY_RECIPES.map(recipe=>recipe.templateKey)).toEqual(['gaming.loot-vault']);
    expect(build.package.manifest.pageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect([...new Set(build.package.pages.map(page=>page.pageType))].sort()).toEqual([...STOREFRONT_PAGE_TYPES].sort());
    expect(build.package.pages).toHaveLength(STOREFRONT_PAGE_TYPES.length);
    expect(build.package.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(STOREFRONT_VIEWPORTS).toEqual(['desktop','tablet','mobile']);

    const home=structuredClone(build.package.pages.find(page=>page.pageType==='home'));
    if(!home)throw new Error('FINAL_REHEARSAL_HOME_MISSING');
    const homeValidation=validateStorefrontPageDocument(home,registry,capability);
    expect(homeValidation.violations.filter(issue=>issue.severity==='error')).toEqual([]);

    const intent=await planStorefrontSmartIntent({
      document:home,
      rawText:'Nagyobb cím mobilon',
      nodeId:'loot-vault-loot-v2-hero-title',
      viewport:'mobile',
      registry,
      capability,
    });
    expect(intent.status).toBe('READY');
    expect(intent.family).toBe('typography');
    expect(intent.operations).toEqual([
      expect.objectContaining({
        kind:'typography',
        authority:'storefront-fidelity-builder-operations',
        nodeId:'loot-vault-loot-v2-hero-title',
        viewport:'mobile',
      }),
    ]);

    const intentApplied=await applyStorefrontSmartIntentPlan({
      document:home,
      plan:intent,
      registry,
      capability,
    });
    expect(validateStorefrontPageDocument(intentApplied.document,registry,capability).violations.filter(issue=>issue.severity==='error')).toEqual([]);
    await expect(applyStorefrontSmartIntentPlan({
      document:intentApplied.document,
      plan:intent,
      registry,
      capability,
    })).rejects.toThrow('SMART_INTENT_PLAN_STALE');

    const localReadiness=inspectStorefrontPublishReadiness({document:intentApplied.document});
    expect(localReadiness.decision).not.toBe('PASS');
    expect(localReadiness.findings.some(finding=>finding.state==='UNKNOWN')).toBe(true);

    const guardOff=setStorefrontDesignGuardMode(intentApplied.document,'off');
    const guardSourceSnapshot=JSON.stringify(guardOff);
    const guardReadiness=inspectStorefrontPublishReadiness({document:guardOff});
    const guardFinding=guardReadiness.findings.find(finding=>
      finding.evidence.code==='PUBLISH_READINESS_DESIGN_GUARD_OFF'
    );
    expect(guardFinding).toBeTruthy();
    if(!guardFinding)throw new Error('FINAL_REHEARSAL_DESIGN_GUARD_FINDING_MISSING');

    const repair=await planStorefrontSmartAutoFix({document:guardOff,finding:guardFinding});
    expect(repair).toMatchObject({
      status:'READY',
      repairKey:'design-guard-warn',
      operations:[expect.objectContaining({kind:'set-design-guard',mode:'warn'})],
    });
    const repaired=await applyStorefrontSmartAutoFixPlan({
      document:guardOff,
      plan:repair,
      registry,
      capability,
    });
    expect(JSON.stringify(guardOff)).toBe(guardSourceSnapshot);
    expect(validateStorefrontPageDocument(repaired.document,registry,capability).violations.filter(issue=>issue.severity==='error')).toEqual([]);
    const repairedReadiness=inspectStorefrontPublishReadiness({document:repaired.document});
    expect(repairedReadiness.findings.some(finding=>finding.evidence.code==='PUBLISH_READINESS_DESIGN_GUARD_OFF')).toBe(false);
    expect(repairedReadiness.decision).not.toBe('PASS');

    const maturity=evaluateStorefrontTemplateProductionMaturity();
    expect(maturity).toMatchObject({valid:true,template3AuthoringReady:true,blockingCapabilityIds:[]});
    expect(STOREFRONT_ENGINE_BRABUS_REVALIDATION).toHaveLength(12);
    expect(STOREFRONT_ENGINE_BRABUS_REVALIDATION.every(row=>row.state==='PROVEN'&&Boolean(row.proofProducer))).toBe(true);
    const e13=STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY.find(row=>row.engineId==='E13');
    expect(e13).toMatchObject({
      proofClass:'browser-journey',
      proofProducer:'scripts/template-factory-product-owner-handoff.mjs#proveSharedE13FunctionalEngine',
      browserRequired:true,
      networkRequired:true,
      productionMutationAllowed:false,
    });

    expect(JSON.stringify(build.package)).toBe(originalPackage);
  });
});
