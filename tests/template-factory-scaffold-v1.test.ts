import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import {STOREFRONT_GLOBAL_STYLES_VERSION} from '@/lib/builder/storefront-global-styles';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';
import {
  assertStorefrontTemplateFactoryProductOwnerReady,
  buildStorefrontTemplateFactoryCandidate,
  type StorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory';

const clone=<T>(value:T):T=>structuredClone(value);

function sanitizePage(pageType:StorefrontBuilderPageType){
  const source=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType===pageType);
  if(!source)throw new Error(`missing source page ${pageType}`);
  const serialized=JSON.stringify(source)
    .replaceAll('/storefront/playroom/','/factory/canary/')
    .replaceAll('PLAYROOM','FACTORY CANARY')
    .replaceAll('Playroom','Factory Canary');
  return JSON.parse(serialized) as typeof source;
}

function setFirstImage(page:ReturnType<typeof sanitizePage>,src:string){
  const walk=(nodes:typeof page.sections):boolean=>{
    for(const node of nodes){
      if(node.componentKey==='content.image'){
        node.config={...node.config,src};
        return true;
      }
      if(node.children&&walk(node.children))return true;
    }
    return false;
  };
  if(!walk(page.sections))throw new Error('canary image target missing');
  return page;
}

function recipe(input:{allPages:boolean;reviewPassed:boolean}):StorefrontTemplateFactoryRecipe{
  const home=setFirstImage(sanitizePage('home'),'/factory/canary/hero.jpg');
  const pageOverrides:Partial<Record<StorefrontBuilderPageType,ReturnType<typeof sanitizePage>>>=input.allPages
    ? Object.fromEntries(STOREFRONT_PAGE_TYPES.map(pageType=>[pageType,pageType==='home'?home:sanitizePage(pageType)])) as Partial<Record<StorefrontBuilderPageType,ReturnType<typeof sanitizePage>>>
    : {home};

  return{
    category:'gaming',
    templateKey:'gaming.factory-canary',
    displayName:'Factory Canary',
    templateVersion:1,
    minPlan:'alap',
    requiredFeatures:[],
    demoNamespace:'gaming-factory-canary',
    globalStyles:{
      version:STOREFRONT_GLOBAL_STYLES_VERSION,
      tokens:{
        background:'#111111',
        surface:'#1b1b1b',
        surfaceMuted:'#242424',
        text:'#f7f1e7',
        mutedText:'#b8b1a7',
        border:'#3a3834',
        primary:'#c08b4d',
        primaryContrast:'#111111',
        accent:'#d8a45f',
        headingFont:'editorial-serif',
        bodyFont:'system-sans',
        spacingScale:'comfortable',
        radiusScale:'soft',
      },
    },
    shell:{
      header:{
        brandLabel:'FACTORY CANARY',
        tagline:'FACTORY TEST',
        logoUrl:'/factory/canary/brand.png',
        logoAlt:'Factory Canary jel',
      },
    },
    pageOverrides,
    demoFixtures:[
      {entityType:'product',entityKey:'factory-product',payload:{name:'Factory Product',image:'/factory/canary/hero.jpg',demo:true}},
    ],
    media:{
      assets:[
        {key:'hero',state:'ready',role:'hero',src:'/factory/canary/hero.jpg',alt:'Factory Canary hero',pageTypes:['home'],representative:true,aspectRatio:'16:9'},
      ],
      requiredRoles:['hero'],
      requirements:[{role:'hero',minCount:1,aspectRatio:'16:9'}],
      minimumRepresentativeMedia:1,
      forbidPlaceholderSvg:false,
    },
    reference:{
      key:'gaming.factory-canary.reference-v1',
      approved:true,
      requiredPageTypes:['home','catalog','product'],
    },
    productOwnerReview:{internalVisualReviewPassed:input.reviewPassed},
  };
}

describe('Template Factory Scaffold v1',()=>{
  it('builds a deterministic 14-page candidate from one category foundation and one recipe',()=>{
    const build=buildStorefrontTemplateFactoryCandidate(recipe({allPages:true,reviewPassed:true}));
    expect(build.package.pages).toHaveLength(14);
    expect(new Set(build.package.pages.map(page=>page.pageType))).toEqual(new Set(STOREFRONT_PAGE_TYPES));
    expect(build.package.manifest.templateKey).toBe('gaming.factory-canary');
    expect(build.package.manifest.templateVersion).toBe(1);
    expect(build.package.manifest.demoContent.namespace).toBe('gaming-factory-canary');
    expect(build.report.foundation).toMatchObject({templateKey:'gaming.playroom',templateVersion:20,category:'gaming'});
    expect(build.report.overriddenPageTypes).toHaveLength(14);
    expect(build.report.inheritedPageTypes).toHaveLength(0);
    expect(build.package.pages.every(page=>page.templateKey==='gaming.factory-canary'&&page.templateVersion===1)).toBe(true);
    expect(build.package.pages.every(page=>JSON.stringify(page).includes('shoporation.template-factory-scaffold.v1'))).toBe(true);
  });

  it('rewrites inherited node identity and applies one canonical shell recipe everywhere',()=>{
    const build=buildStorefrontTemplateFactoryCandidate(recipe({allPages:true,reviewPassed:true}));
    for(const page of build.package.pages){
      const serialized=JSON.stringify(page);
      expect(serialized).not.toContain('/storefront/playroom/');
      expect(serialized).not.toContain('PLAYROOM');
      expect(serialized).not.toContain('Playroom');
      expect(serialized).toContain('FACTORY CANARY');
      expect(serialized).toContain('/factory/canary/brand.png');
      expect(serialized).toContain('factory-canary-');
    }
  });

  it('auto-rebrands inherited foundation copy but still fails closed on foundation media, reference ownership and visual review',()=>{
    const build=buildStorefrontTemplateFactoryCandidate(recipe({allPages:false,reviewPassed:false}));
    expect(build.report.technicalReady).toBe(false);
    expect(build.report.productOwnerReady).toBe(false);
    expect(build.report.inheritedPageTypes.length).toBe(13);
    const account=build.package.pages.find(page=>page.pageType==='account')!;
    expect(JSON.stringify(account)).not.toContain('PLAYROOM');
    expect(JSON.stringify(account)).not.toContain('Playroom');
    expect(build.report.issues.map(item=>item.code)).toEqual(expect.arrayContaining([
      'FACTORY_REFERENCE_PAGE_NOT_OWNED',
      'FACTORY_FOUNDATION_MEDIA_LEAK',
      'FACTORY_INTERNAL_VISUAL_REVIEW_REQUIRED',
    ]));
    expect(()=>assertStorefrontTemplateFactoryProductOwnerReady(build)).toThrow(/TEMPLATE_FACTORY_PRODUCT_OWNER_NOT_READY/);
  });


  it('treats internal-reference media as technical proof only, never Product Owner-ready media',()=>{
    const draft=recipe({allPages:true,reviewPassed:true});
    const referenceSrc='https://images.example.test/reference.jpg';
    draft.pageOverrides={...draft.pageOverrides,home:setFirstImage(sanitizePage('home'),referenceSrc)};
    draft.media={...draft.media,assets:draft.media.assets.map(asset=>({...asset,state:'internal-reference' as const,src:referenceSrc}))};
    const build=buildStorefrontTemplateFactoryCandidate(draft);
    expect(build.report.technicalRepresentativeMediaCount).toBe(1);
    expect(build.report.internalReferenceMediaCount).toBe(1);
    expect(build.report.representativeMediaCount).toBe(0);
    expect(build.report.technicalReady).toBe(true);
    expect(build.report.productOwnerReady).toBe(false);
    expect(build.report.issues.map(issue=>issue.code)).toContain('FACTORY_MEDIA_FINALIZATION_REQUIRED');
    expect(()=>assertStorefrontTemplateFactoryProductOwnerReady(build)).toThrow(/FACTORY_MEDIA_FINALIZATION_REQUIRED/);
  });

  it('can become Product Owner-ready only after the recipe owns reference-critical pages, media and internal review',()=>{
    const build=buildStorefrontTemplateFactoryCandidate(recipe({allPages:true,reviewPassed:true}));
    expect(build.report.issues).toEqual([]);
    expect(build.report.technicalReady).toBe(true);
    expect(build.report.productOwnerReady).toBe(true);
    expect(()=>assertStorefrontTemplateFactoryProductOwnerReady(build)).not.toThrow();
  });
});
