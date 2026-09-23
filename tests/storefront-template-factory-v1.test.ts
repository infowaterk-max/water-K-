import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import {
  buildStorefrontTemplateFromFactory,
  evaluateStorefrontFactoryReadiness,
  type StorefrontFactoryDefinition,
} from '@/lib/builder/storefront-template-factory';
import {GAMING_STOREFRONT_FACTORY_RECIPE} from '@/lib/builder/storefront-template-factory-recipes';

const media=[
  {id:'hero',role:'hero' as const,src:'/demo/hero.jpg',alt:'Hero'},
  {id:'editorial',role:'editorial' as const,src:'/demo/editorial.jpg',alt:'Editorial'},
  ...Array.from({length:4},(_,i)=>({id:`category-${i}`,role:'category' as const,src:`/demo/category-${i}.jpg`,alt:`Kategória ${i}`})),
  ...Array.from({length:8},(_,i)=>({id:`product-${i}`,role:'product' as const,src:`/demo/product-${i}.jpg`,alt:`Termék ${i}`})),
];

const definition:StorefrontFactoryDefinition={
  templateKey:'gaming.factory-fixture',
  templateVersion:1,
  displayName:'Factory Fixture',
  demoNamespace:'gaming-factory-fixture',
  minPlan:'alap',
  requiredFeatures:PLANS.alap.features,
  category:GAMING_STOREFRONT_FACTORY_RECIPE,
  dna:{
    character:'fixture',
    tokens:{
      background:'#05070a',surface:'#10151c',surfaceMuted:'#171e27',text:'#ffffff',mutedText:'#aab4c0',border:'#243140',
      primary:'#10151c',primaryContrast:'#ffffff',accent:'#ff9a3c',accentSecondary:'#66d9ff',accentTertiary:'#d86cff',
      headingFont:'system-sans',bodyFont:'system-sans',spacingScale:'comfortable',radiusScale:'soft',
    },
  },
  reference:{referenceKey:'fixture.reference',requiredMediaRoles:['hero','category','product','editorial'],mediaRequirements:[{role:'hero',minCount:1,aspectRatio:'16:9'},{role:'category',minCount:4,aspectRatio:'4:5'},{role:'product',minCount:8,aspectRatio:'4:5'},{role:'editorial',minCount:1,aspectRatio:'3:2'}],minimumRepresentativeMedia:14,forbidPlaceholderSvg:true},
  media,
  copy:{
    tagline:'Gaming',
    heroEyebrow:'Factory',
    heroTitle:'Kész storefront alap.',
    heroCopy:'A Factoryból generált működő kiindulópont.',
    heroCta:'Felfedezem',
    catalogTitle:'Termékek',
    catalogCopy:'A teljes kínálat.',
    productEyebrow:'Factory Fixture',
    editorialEyebrow:'Történet',
    editorialTitle:'Vizuális szerkesztői blokk',
    editorialCopy:'Referencia és média által vezérelt tartalom.',
    editorialCta:'Tovább',
  },
  navigation:{
    primary:[{label:'Kínálat',href:'/webaruhaz'},{label:'Magazin',href:'/blog'},{label:'Kapcsolat',href:'/kapcsolat'}],
    footer:[{id:'shop',title:'Vásárlás',items:[{label:'Kínálat',href:'/webaruhaz'}]}],
  },
};

describe('Template Factory v1',()=>{
  it('builds one complete 14-page package from one factory definition',()=>{
    const template=buildStorefrontTemplateFromFactory(definition);
    expect(template.pages).toHaveLength(14);
    expect(new Set(template.pages.map(page=>page.pageType))).toEqual(new Set(STOREFRONT_PAGE_TYPES));
    expect(template.pages.every(page=>page.sections[0]?.componentKey==='system.commerce-header')).toBe(true);
    expect(template.pages.every(page=>page.sections.at(-1)?.componentKey==='layout.section')).toBe(true);
  });

  it('materializes explicit desktop/tablet/mobile authority before the package leaves the factory',()=>{
    const template=buildStorefrontTemplateFromFactory(definition);
    const serialized=JSON.stringify(template);
    expect(serialized).toContain('shoporation.storefront-responsive-authority.v2');
    const catalog=template.pages.find(page=>page.pageType==='catalog')!;
    const layout=JSON.stringify(catalog);
    expect(layout).toContain('"desktop"');
    expect(layout).toContain('"tablet"');
    expect(layout).toContain('"mobile"');
  });

  it('does not mark an incomplete media/reference pack Product Owner ready',()=>{
    const incomplete={...definition,media:definition.media.slice(0,2)};
    const readiness=evaluateStorefrontFactoryReadiness(incomplete);
    expect(readiness.productOwnerReady).toBe(false);
    expect(readiness.reasons).toContain('representative-media-count');
    expect(readiness.reasons.some(reason=>reason.startsWith('missing-media-role:'))).toBe(true);
  });

  it('marks a complete factory definition review-ready before Product Owner exposure',()=>{
    const readiness=evaluateStorefrontFactoryReadiness(definition);
    expect(readiness).toMatchObject({
      technicalScaffoldComplete:true,
      referenceContractComplete:true,
      representativeMediaComplete:true,
      productOwnerReady:true,
    });
  });
});
