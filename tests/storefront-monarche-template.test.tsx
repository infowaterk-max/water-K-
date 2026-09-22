import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontEditorialRendererRegistry} from '@/components/builder/storefront-editorial';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontEditorialComponentRegistry} from '@/lib/builder/storefront-editorial';
import {MONARCHE_DESIGN_TOKENS,MONARCHE_ENGINE_CONTRACT,MONARCHE_HEADER_CONTRACT,MONARCHE_HOME_PAGE,MONARCHE_HOME_SECTION_ORDER,MONARCHE_PRODUCT_PAGE,MONARCHE_TEMPLATE_KEY,MONARCHE_TEMPLATE_PACKAGE,MONARCHE_TEMPLATE_VERSION,MONARCHE_VISUAL_DNA} from '@/lib/builder/templates/monarche';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(item=>[item,...walk(item.children??[])]);

describe('Scale-out Wave 24 Golden #1 Monarche',()=>{
  it('preserves the accepted balanced modern premium fashion identity',()=>{
    expect(MONARCHE_TEMPLATE_KEY).toBe('fashion.monarche');
    expect(MONARCHE_TEMPLATE_VERSION).toBe(1);
    expect(MONARCHE_VISUAL_DNA.character).toBe('modern-editorial-luxury-commerce');
    expect(MONARCHE_VISUAL_DNA.position).toBe('balanced-modern-premium-mainstream');
    expect(MONARCHE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['editorial-atelier-asymmetry-clone','street-drop-culture-clone','fabricated-price-stock-rating-or-product-claim']));
    expect(MONARCHE_DESIGN_TOKENS['--shoporation-color-background']).toBe('#f5f1eb');
    expect(MONARCHE_DESIGN_TOKENS['--shoporation-color-text']).toBe('#171717');
    expect(MONARCHE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('var(--merchant-accent');
  });

  it('locks the protected header direction without a template-specific utility child hack',()=>{
    expect(MONARCHE_HEADER_CONTRACT.primaryNavigation.map(item=>item.label)).toEqual(['Újdonságok','Női','Férfi','Kollekciók','Journal']);
    expect(MONARCHE_HEADER_CONTRACT.utilityLabels).toEqual(['Keresés','Fiók','Kedvencek']);
    expect(MONARCHE_HEADER_CONTRACT.utilityBoundary).toBe('shared-header-extension-required-no-template-specific-child-hack');
    const header=MONARCHE_HOME_PAGE.sections[0];
    expect(header.componentKey).toBe('system.header');
    expect(header.children?.every(child=>child.componentKey==='system.navigation')).toBe(true);
  });

  it('uses current shared engine authority and does not add a fashion-specific engine',()=>{
    expect(MONARCHE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(MONARCHE_ENGINE_CONTRACT.optional).toEqual(['E7']);
    expect(MONARCHE_ENGINE_CONTRACT.scaleOutIntegration).toMatchObject({E1:'shared-page-schema-runtime',E2:'catalog-search-product-eligibility-authority',E10:'editorial-journal-story-authority',E13:'provider-neutral-cart-checkout-authority'});
    expect(MONARCHE_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-price-stock-rating/);
  });

  it('ships 14 Alap-compatible presets and passes fail-closed page validation',()=>{
    const registry=createStorefrontEditorialComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:MONARCHE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(MONARCHE_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(MONARCHE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of MONARCHE_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the approved Home sequence and separately editable hero/split layers',()=>{
    expect(MONARCHE_HOME_PAGE.metadata?.sectionOrder).toEqual(MONARCHE_HOME_SECTION_ORDER);
    expect(MONARCHE_HOME_SECTION_ORDER).toEqual(['Editorial Hero','Collection Navigation','New Arrivals','Editorial Split Feature','Product Story Grid','Featured Collection','Social Proof/Reviews','Journal Preview','Newsletter','Footer']);
    expect(MONARCHE_HOME_PAGE.metadata?.builderLayers).toMatchObject({hero:['image','eyebrow','title','copy','primaryLabel','primaryHref','secondaryLabel','secondaryHref'],split:['image','eyebrow','title','copy','ctaLabel','ctaHref'],responsive:['desktop','tablet','mobile']});
    const hero=walk(MONARCHE_HOME_PAGE.sections).find(item=>item.id==='monarche-hero')!;
    expect(Object.keys(hero.bindings??{})).toEqual(expect.arrayContaining(['image','eyebrow','title','copy','primaryLabel','primaryHref','secondaryLabel','secondaryHref']));
  });

  it('renders the Monarche Home with the accepted default navigation and real bound commerce/editorial data',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={MONARCHE_HOME_PAGE} viewport="desktop" bindingContext={{brand:{name:'Monarche Demo',homeHref:'/'},content:{monarcheHero:{title:'Quiet forms. Strong presence.'},journal:{title:'Journal',items:[{title:'The Quiet Edit',href:'/blog/quiet-edit',excerpt:'Forma és arány.'}]}},collection:{navigation:[{label:'Női',href:'/webaruhaz?collection=women'}],featured:{title:'The Essential Line'}},catalog:{newArrivals:[{id:'coat',name:'Sculpted Wool Coat',href:'/termek/coat'}],productStory:[],featured:[]},reviews:{summary:{rating:4.8,count:37,label:'37 értékelés'}}}} componentRegistry={createStorefrontEditorialComponentRegistry()} rendererRegistry={createStorefrontEditorialRendererRegistry()} capability={capability}/>);
    expect(html).toContain('Quiet forms. Strong presence.');
    expect(html).toContain('Sculpted Wool Coat');
    expect(html).toContain('The Quiet Edit');
    expect(html).toContain('Újdonságok');
    expect(html).toContain('Női');
    expect(html).toContain('Férfi');
    expect(html).toContain('Kollekciók');
    expect(html).toContain('Journal');
  });

  it('does not fabricate Home ratings or demo price/stock/product authority',()=>{
    const review=walk(MONARCHE_HOME_PAGE.sections).find(item=>item.id==='monarche-review-summary')!;
    expect(review.config.rating).toBe(0);
    expect(review.config.count).toBe(0);
    expect(review.bindings?.rating?.fallback).toBe(0);
    const demo=JSON.stringify(MONARCHE_TEMPLATE_PACKAGE.demoFixtures??[]);
    expect(demo).not.toMatch(/priceLabel|displayPrice|compareAtPrice|stockLabel|rating|reviewCount|materialClaim|durability|guaranteed/i);
    const home=JSON.stringify(MONARCHE_HOME_PAGE);
    expect(home).not.toMatch(/rating":4\.9|fallback":4\.9/);
  });

  it('keeps the accepted 7/12 + 5/12 fashion PDP and sold-out variant behavior',()=>{
    const context={brand:{name:'Monarche Demo',homeHref:'/'},navigation:{primary:[],footer:[]},product:{name:'Sculpted Wool Coat',description:'Szerkesztett termékleírás.',gallery:[{src:'https://example.com/coat.jpg',alt:'Kabát'}],badges:[]},pricing:{displayPrice:'89 900 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},variant:{colorLabel:'Szín',colorOptions:[{id:'black',label:'Fekete',swatch:'#171717',available:true,selected:true,href:'/termek/coat?color=black'}],sizeLabel:'Méret',sizeOptions:[{id:'m',label:'M',available:true,selected:true,href:'/termek/coat?size=m'},{id:'l',label:'L',available:false,selected:false,href:'/termek/coat?size=l'}]},commerce:{purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase'},reviews:{summary:{rating:4.8,count:37,label:'37 értékelés'}},recommendations:{products:[]}};
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={MONARCHE_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={createStorefrontEditorialComponentRegistry()} rendererRegistry={createStorefrontEditorialRendererRegistry()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={MONARCHE_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={createStorefrontEditorialComponentRegistry()} rendererRegistry={createStorefrontEditorialRendererRegistry()} capability={capability}/>);
    expect(desktop).toContain('span 7 / span 7');
    expect(desktop).toContain('span 5 / span 5');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('aria-disabled="true"');
    expect(desktop).toContain('text-decoration:line-through');
  });

  it('keeps template installation draft-only and namespaced',()=>{
    const plan=planStorefrontTemplateInstallation({template:MONARCHE_TEMPLATE_PACKAGE,componentRegistry:createStorefrontEditorialComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='fashion-monarche')).toBe(true);
  });

  it('keeps checkout provider-neutral and E13-authoritative',()=>{
    const checkout=MONARCHE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});