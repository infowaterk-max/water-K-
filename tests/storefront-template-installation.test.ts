import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
  createStorefrontPrimitiveComponentRegistry,
} from '@/lib/builder/storefront-primitives';
import {StorefrontComponentRegistry} from '@/lib/builder/storefront-runtime';
import {
  STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY,
  adoptStorefrontDemoContent,
  evaluateStorefrontTemplateCapabilityGate,
  materializeStorefrontDemoContent,
  planStorefrontTemplateInstallation,
  retireStorefrontDemoContent,
  type StorefrontDemoContentRecord,
  type StorefrontInstallableTemplatePackage,
} from '@/lib/builder/storefront-template-installation';

const demoPackage=():StorefrontInstallableTemplatePackage=>({
  ...STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
  demoFixtures:[
    {entityType:'product',entityKey:'hero-product',payload:{name:'Demo termék',priceLabel:'Demo'}},
    {entityType:'content',entityKey:'intro-story',payload:{title:'Demo történet'}},
  ],
});

describe('storefront template installation foundation',()=>{
  it('passes the Template Capability Gate for the neutral Alap reference package',()=>{
    const gate=evaluateStorefrontTemplateCapabilityGate({
      template:STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
      componentRegistry:createStorefrontPrimitiveComponentRegistry(),
      capability:{plan:'alap',features:[]},
    });
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
  });

  it('fails closed when plan/features or component runtime capabilities are missing',()=>{
    const proTemplate:StorefrontInstallableTemplatePackage={
      ...STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
      manifest:{
        ...STOREFRONT_NEUTRAL_REFERENCE_PACKAGE.manifest,
        minPlan:'pro',
        requiredFeatures:['advancedAnalytics'],
      },
    };
    const planGate=evaluateStorefrontTemplateCapabilityGate({
      template:proTemplate,
      componentRegistry:createStorefrontPrimitiveComponentRegistry(),
      capability:{plan:'alap',features:[]},
    });
    expect(planGate.ok).toBe(false);
    expect(planGate.violations.some(item=>item.code==='TEMPLATE_PLAN_REQUIRED')).toBe(true);
    expect(planGate.violations.some(item=>item.code==='TEMPLATE_FEATURE_REQUIRED')).toBe(true);

    const componentGate=evaluateStorefrontTemplateCapabilityGate({
      template:STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
      componentRegistry:new StorefrontComponentRegistry(),
      capability:{plan:'alap',features:[]},
    });
    expect(componentGate.ok).toBe(false);
    expect(componentGate.violations.some(item=>item.code==='COMPONENT_NOT_REGISTERED')).toBe(true);
  });

  it('requires every page type declared by the template manifest to have a preset',()=>{
    const incomplete:StorefrontInstallableTemplatePackage={
      ...STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
      manifest:{...STOREFRONT_NEUTRAL_REFERENCE_PACKAGE.manifest,pageTypes:['home','catalog']},
    };
    const gate=evaluateStorefrontTemplateCapabilityGate({
      template:incomplete,
      componentRegistry:createStorefrontPrimitiveComponentRegistry(),
      capability:{plan:'alap',features:[]},
    });
    expect(gate.ok).toBe(false);
    expect(gate.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({code:'TEMPLATE_PAGE_PRESET_MISSING',metadata:{pageType:'catalog'}}),
    ]));
  });

  it('materializes deterministic stable storefront page keys without mutating the source package',()=>{
    const sourcePageKey=STOREFRONT_NEUTRAL_REFERENCE_PACKAGE.pages[0]?.pageKey;
    const input={
      template:STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
      componentRegistry:createStorefrontPrimitiveComponentRegistry(),
      capability:{plan:'alap' as const,features:[] as const},
    };
    const first=planStorefrontTemplateInstallation(input);
    const second=planStorefrontTemplateInstallation(input);
    expect(first).toEqual(second);
    expect(first.mode).toBe('install');
    expect(first.pages).toHaveLength(1);
    expect(first.pages[0]?.pageKey).toBe('home');
    expect(first.pages[0]?.sourcePageKey).toBe('reference.home');
    expect(first.pages[0]?.document.pageKey).toBe('home');
    expect(first.pages[0]?.document.templateKey).toBe('reference.neutral');
    expect(first.pages[0]?.document.metadata).toMatchObject({
      templatePresetPageKey:'reference.home',
      demoNamespace:'reference-neutral',
    });
    expect(STOREFRONT_NEUTRAL_REFERENCE_PACKAGE.pages[0]?.pageKey).toBe(sourcePageKey);
  });

  it('plans a template switch by reusing stable existing page identity and optimistic draft revision',()=>{
    const plan=planStorefrontTemplateInstallation({
      template:STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
      componentRegistry:createStorefrontPrimitiveComponentRegistry(),
      capability:{plan:'alap',features:[]},
      existingPages:[{
        pageKey:'store.home',
        pageType:'home',
        draftRevision:7,
        draftTemplateKey:'legacy.template',
        draftTemplateVersion:3,
        publishedTemplateKey:'legacy.template',
        publishedTemplateVersion:3,
      }],
    });
    expect(plan.mode).toBe('switch');
    expect(plan.pages[0]?.pageKey).toBe('store.home');
    expect(plan.pages[0]?.expectedDraftRevision).toBe(7);
    expect(plan.pages[0]?.document.templateKey).toBe('reference.neutral');
    expect(plan.mutationBoundary).toEqual(STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY);
    expect(plan.mutationBoundary.products).toBe(false);
    expect(plan.mutationBoundary.customers).toBe(false);
    expect(plan.mutationBoundary.orders).toBe(false);
  });

  it('ignores unrelated page types when deciding whether the incoming template is an install or switch',()=>{
    const plan=planStorefrontTemplateInstallation({
      template:STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
      componentRegistry:createStorefrontPrimitiveComponentRegistry(),
      capability:{plan:'alap',features:[]},
      existingPages:[{
        pageKey:'legal',
        pageType:'legal',
        draftRevision:2,
        draftTemplateKey:'legacy.template',
        draftTemplateVersion:9,
      }],
    });
    expect(plan.mode).toBe('install');
    expect(plan.untouchedExistingPageKeys).toEqual(['legal']);
  });

  it('does not delete existing page heads that the incoming package does not materialize',()=>{
    const plan=planStorefrontTemplateInstallation({
      template:STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
      componentRegistry:createStorefrontPrimitiveComponentRegistry(),
      capability:{plan:'alap',features:[]},
      existingPages:[
        {pageKey:'home',pageType:'home',draftRevision:1,draftTemplateKey:'reference.neutral',draftTemplateVersion:1},
        {pageKey:'legal',pageType:'legal',draftRevision:4,draftTemplateKey:'other.template',draftTemplateVersion:2},
      ],
    });
    expect(plan.untouchedExistingPageKeys).toEqual(['legal']);
  });

  it('namespaces demo fixtures and requires explicit adoption before fixture retirement can preserve them',()=>{
    const records=materializeStorefrontDemoContent(demoPackage());
    expect(records.map(record=>record.namespacedKey)).toEqual([
      'reference-neutral:product:hero-product',
      'reference-neutral:content:intro-story',
    ]);
    expect(records.every(record=>record.state==='fixture')).toBe(true);

    const adopted=adoptStorefrontDemoContent(records,['reference-neutral:product:hero-product']);
    const retired=retireStorefrontDemoContent(adopted,'reference-neutral');
    expect(retired.find(record=>record.entityKey==='hero-product')?.state).toBe('adopted');
    expect(retired.find(record=>record.entityKey==='intro-story')?.state).toBe('retired');
  });

  it('preserves adopted target demo content and retires only stale fixture namespaces during planning',()=>{
    const currentDemo:StorefrontDemoContentRecord[]=[
      {namespace:'reference-neutral',namespacedKey:'reference-neutral:product:hero-product',entityType:'product',entityKey:'hero-product',state:'adopted',payload:{name:'Merchant-owned name'}},
      {namespace:'legacy-demo',namespacedKey:'legacy-demo:content:old-story',entityType:'content',entityKey:'old-story',state:'fixture',payload:{title:'Old fixture'}},
      {namespace:'legacy-demo',namespacedKey:'legacy-demo:product:kept',entityType:'product',entityKey:'kept',state:'adopted',payload:{name:'Kept'}},
    ];
    const plan=planStorefrontTemplateInstallation({
      template:demoPackage(),
      componentRegistry:createStorefrontPrimitiveComponentRegistry(),
      capability:{plan:'alap',features:[]},
      currentDemoContent:currentDemo,
    });
    expect(plan.demoLifecycle.install.map(record=>record.namespacedKey)).toEqual(['reference-neutral:content:intro-story']);
    expect(plan.demoLifecycle.retire).toEqual([
      expect.objectContaining({namespacedKey:'legacy-demo:content:old-story',state:'retired'}),
    ]);
    expect(plan.demoLifecycle.retire.some(record=>record.namespacedKey==='legacy-demo:product:kept')).toBe(false);
  });

  it('rejects duplicate demo fixture identities and unknown explicit adoption keys',()=>{
    const duplicate:StorefrontInstallableTemplatePackage={
      ...STOREFRONT_NEUTRAL_REFERENCE_PACKAGE,
      demoFixtures:[
        {entityType:'product',entityKey:'same',payload:{}},
        {entityType:'product',entityKey:'same',payload:{}},
      ],
    };
    const gate=evaluateStorefrontTemplateCapabilityGate({
      template:duplicate,
      componentRegistry:createStorefrontPrimitiveComponentRegistry(),
      capability:{plan:'alap',features:[]},
    });
    expect(gate.ok).toBe(false);
    expect(gate.violations.some(item=>item.code==='TEMPLATE_DEMO_ENTITY_DUPLICATE')).toBe(true);

    expect(()=>adoptStorefrontDemoContent(materializeStorefrontDemoContent(demoPackage()),['missing:key'])).toThrow('TEMPLATE_DEMO_ADOPTION_ENTITY_NOT_FOUND');
  });
});
