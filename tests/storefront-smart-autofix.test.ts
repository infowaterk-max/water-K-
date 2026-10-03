import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {
  applyStorefrontSmartAutoFixPlan,
  planStorefrontSmartAutoFix,
  STOREFRONT_SMART_AUTOFIX_VERSION,
} from '@/lib/builder/storefront-smart-autofix';
import {
  setStorefrontResponsiveChildOrder,
  setStorefrontDesignGuardMode,
} from '@/lib/builder/storefront-fidelity-builder-operations';
import {
  readStorefrontFidelityMetadata,
  writeStorefrontFidelityMetadata,
} from '@/lib/builder/storefront-fidelity-engine';
import {setStorefrontResponsiveGridPlacement} from '@/lib/builder/storefront-fidelity-layout';
import {
  inspectStorefrontResponsiveInheritance,
  setStorefrontResponsiveGridContainerLayout,
  setStorefrontResponsiveVisibility,
} from '@/lib/builder/storefront-responsive-layout-depth';
import {
  inspectStorefrontPublishReadiness,
  type StorefrontPublishReadinessFinding,
} from '@/lib/builder/storefront-publish-readiness';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const registry=createStorefrontVisualBuilderComponentRegistry();
const capability={plan:'pro' as const,features:[...PLANS.pro.features]};
const clone=<T>(value:T):T=>structuredClone(value);
const fresh=()=>clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);

function readinessFinding(document:StorefrontPageDocument,code:string,dimension?:string){
  const finding=inspectStorefrontPublishReadiness({document}).findings.find(item=>
    item.evidence.code===code&&(!dimension||item.location.path===`responsive.${dimension}`)
  );
  if(!finding)throw new Error(`TEST_READINESS_FINDING_MISSING:${code}:${dimension??''}`);
  return finding;
}

function manualFinding(document:StorefrontPageDocument,overrides:Partial<StorefrontPublishReadinessFinding>={}):StorefrontPublishReadinessFinding{
  return{
    id:'readiness:test-manual',
    category:'accessibility',
    state:'BLOCK',
    severity:'error',
    reason:'Semantic merchant content is missing.',
    repairability:'structured-diagnostic',
    location:{pageKey:document.pageKey,pageType:document.pageType,nodeId:'reference-title'},
    evidence:{authority:'builder-template-system',source:'storefront-fidelity-accessibility',code:'ACCESSIBILITY_IMAGE_ALT_MISSING'},
    ...overrides,
  };
}

describe('VX Smart Auto-Fix Brabus Core',()=>{
  it('repairs only the exact redundant responsive dimension and preserves sibling overrides',async()=>{
    let document=fresh();
    document=setStorefrontResponsiveVisibility(document,'reference-grid','mobile',false);
    document=setStorefrontResponsiveGridPlacement(document,'reference-grid','mobile',{span:12});
    document=setStorefrontResponsiveGridContainerLayout(document,'reference-grid','mobile',{gap:'m'});
    document=setStorefrontResponsiveChildOrder(document,'reference-grid','mobile',['reference-grid-left','reference-grid-right']);
    const before=clone(document);
    const finding=readinessFinding(document,'RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE','visibility');

    const plan=await planStorefrontSmartAutoFix({document,finding});
    expect(plan.contract).toBe(STOREFRONT_SMART_AUTOFIX_VERSION);
    expect(plan.status).toBe('READY');
    expect(plan.repairKey).toBe('responsive-redundant-reset');
    expect(plan.operations).toEqual([
      expect.objectContaining({kind:'reset-responsive-dimension',nodeId:'reference-grid',viewport:'mobile',dimension:'visibility'}),
    ]);
    expect(Object.isFrozen(plan)).toBe(true);

    const applied=await applyStorefrontSmartAutoFixPlan({document,plan,registry,capability});
    const state=inspectStorefrontResponsiveInheritance(applied.document,'reference-grid').viewports.mobile;
    expect(state.visibility.direct).toBeNull();
    expect(Object.keys(state.gridPlacement.direct).length).toBeGreaterThan(0);
    expect(Object.keys(state.container.direct).length).toBeGreaterThan(0);
    expect(state.childOrder.direct).not.toBeNull();
    expect(document).toEqual(before);
  });

  it('repairs Design Guard off to warn while preserving fidelity metadata',async()=>{
    let document=fresh();
    document=writeStorefrontFidelityMetadata(document,{
      editMode:'expert',
      sectionOrder:{},
      nodeOrder:{},
      designGuard:{mode:'off',presetId:'brabus-proof',baselineVersion:7,protectedNodeIds:['reference-title']},
    });
    const finding=readinessFinding(document,'PUBLISH_READINESS_DESIGN_GUARD_OFF');
    const plan=await planStorefrontSmartAutoFix({document,finding});
    expect(plan.status).toBe('READY');
    expect(plan.operations).toEqual([expect.objectContaining({kind:'set-design-guard',mode:'warn'})]);

    const applied=await applyStorefrontSmartAutoFixPlan({document,plan,registry,capability});
    const metadata=readStorefrontFidelityMetadata(applied.document);
    expect(metadata?.editMode).toBe('expert');
    expect(metadata?.designGuard).toEqual({
      mode:'warn',
      presetId:'brabus-proof',
      baselineVersion:7,
      protectedNodeIds:['reference-title'],
    });
  });

  it('keeps semantic, pixel-only and foreign-authority findings non-executable',async()=>{
    const document=fresh();
    const semantic=await planStorefrontSmartAutoFix({document,finding:manualFinding(document)});
    expect(semantic.status).toBe('MANUAL');
    expect(semantic.operations).toEqual([]);

    const visual=await planStorefrontSmartAutoFix({
      document,
      finding:manualFinding(document,{
        id:'readiness:pixel',
        category:'visual-drift',
        repairability:'structured-diagnostic',
        evidence:{
          authority:'builder-template-system',
          source:'storefront-visual-diff-intelligence',
          code:'VISUAL_PIXEL_DRIFT',
          provenance:{structuredCause:false},
        },
      }),
    });
    expect(visual.status).toBe('MANUAL');
    expect(visual.operations).toEqual([]);

    const foreign=await planStorefrontSmartAutoFix({
      document,
      finding:manualFinding(document,{
        id:'readiness:foreign',
        category:'responsive-inheritance',
        location:{pageKey:document.pageKey,pageType:document.pageType,viewport:'mobile',nodeId:'reference-grid',path:'responsive.visibility'},
        evidence:{authority:'foreign-system',source:'storefront-responsive-inheritance',code:'RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE'},
      }),
    });
    expect(foreign.status).toBe('MANUAL');
    expect(foreign.operations).toEqual([]);
  });

  it('requires exact safe-registry localization instead of trusting a matching code alone',async()=>{
    let document=fresh();
    document=setStorefrontDesignGuardMode(document,'off');
    const finding=readinessFinding(document,'PUBLISH_READINESS_DESIGN_GUARD_OFF');
    const forged={...finding,location:{...finding.location,path:'metadata.other'}} as StorefrontPublishReadinessFinding;
    const plan=await planStorefrontSmartAutoFix({document,finding:forged});
    expect(plan.status).toBe('BLOCK');
    expect(plan.issue?.code).toBe('SMART_AUTOFIX_LOCALIZATION_INVALID');
    expect(plan.operations).toEqual([]);
  });

  it('blocks a stale source finding before mutation and rejects unrelated document drift by fingerprint',async()=>{
    let document=fresh();
    document=setStorefrontResponsiveVisibility(document,'reference-grid','mobile',false);
    const finding=readinessFinding(document,'RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE','visibility');
    const plan=await planStorefrontSmartAutoFix({document,finding});
    expect(plan.status).toBe('READY');

    const sourceFixed=setStorefrontResponsiveVisibility(document,'reference-grid','mobile',null);
    await expect(applyStorefrontSmartAutoFixPlan({document:sourceFixed,plan,registry,capability}))
      .rejects.toThrow('SMART_AUTOFIX_SOURCE_STALE');

    const unrelated=setStorefrontResponsiveVisibility(document,'reference-grid-right','tablet',true);
    await expect(applyStorefrontSmartAutoFixPlan({document:unrelated,plan,registry,capability}))
      .rejects.toThrow('SMART_AUTOFIX_PLAN_STALE');
  });

  it('rejects a tampered preview plan before any operation executes',async()=>{
    let document=fresh();
    document=setStorefrontResponsiveVisibility(document,'reference-grid','mobile',false);
    const finding=readinessFinding(document,'RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE','visibility');
    const plan=await planStorefrontSmartAutoFix({document,finding});
    const tampered=structuredClone(plan);
    if(tampered.operations[0])tampered.operations[0].reason='tampered after preview';
    await expect(applyStorefrontSmartAutoFixPlan({document,plan:tampered,registry,capability}))
      .rejects.toThrow('SMART_AUTOFIX_PLAN_HASH_INVALID');
  });

  it('fails closed when a finding becomes UNKNOWN or is localized to another page',async()=>{
    const document=fresh();
    const unknown=await planStorefrontSmartAutoFix({
      document,
      finding:manualFinding(document,{state:'UNKNOWN',severity:'unknown'}),
    });
    expect(unknown.status).toBe('UNKNOWN');
    expect(unknown.operations).toEqual([]);

    const crossPage=await planStorefrontSmartAutoFix({
      document,
      finding:manualFinding(document,{location:{pageKey:'another-page',pageType:document.pageType}}),
    });
    expect(crossPage.status).toBe('MANUAL');
    expect(crossPage.operations).toEqual([]);
  });

  it('keeps Auto-Fix outside AI, Smart Intent, persistence, publish and pixel-causality modules',()=>{
    const source=readFileSync('src/lib/builder/storefront-smart-autofix.ts','utf8');
    expect(source).not.toContain("from '@/lib/builder/storefront-smart-intent'");
    expect(source).not.toContain('ai-gateway');
    expect(source).not.toContain('storefront-ai-generator');
    expect(source).not.toContain('publishVisualBuilderPageAction');
    expect(source).not.toContain('saveVisualBuilderDraftAction');
    expect(source).not.toMatch(/from ['"]@\/lib\/builder\/storefront-visual-diff-intelligence['"]/);
    expect(source).not.toContain('supabase');
  });
});
