import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontEditorialRendererRegistry} from '@/components/builder/storefront-editorial';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontEditorialComponentRegistry} from '@/lib/builder/storefront-editorial';
import {
  MONARCHE_ENGINE_CONTRACT,
  MONARCHE_HOME_PAGE,
  MONARCHE_HOME_SECTION_ORDER,
  MONARCHE_PRODUCT_PAGE,
  MONARCHE_TEMPLATE_KEY,
  MONARCHE_TEMPLATE_PACKAGE,
  MONARCHE_TEMPLATE_VERSION,
} from '@/lib/builder/templates/monarche';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};

const productBindingContext={
  brand:{name:'Atelier Demo',homeHref:'/',copyright:'© Atelier Demo'},
  navigation:{
    primary:[{label:'Újdonságok',href:'/webaruhaz'},{label:'Journal',href:'/journal'}],
    footer:[{id:'shop',title:'Shop',items:[{label:'Kollekciók',href:'/webaruhaz'}]}],
  },
  product:{
    eyebrow:'The Essential Line',
    name:'Sculpted Wool Coat',
    description:'Tiszta szabás, puha gyapjú és időtálló arányok.',
    gallery:[
      {src:'https://example.com/coat-1.jpg',alt:'Gyapjú kabát elölről'},
      {src:'https://example.com/coat-2.jpg',alt:'Gyapjú kabát részlet'},
    ],
    badges:['New','Wool'],
  },
  pricing:{displayPrice:'89 900 Ft',compareAtPrice:'99 900 Ft'},
  inventory:{stockLabel:'Raktáron'},
  variant:{
    colorLabel:'Szín',
    colorOptions:[
      {id:'black',label:'Fekete',swatch:'#171717',selected:true,available:true,href:'/termek/coat?color=black'},
      {id:'stone',label:'Stone',swatch:'#d8d1c7',selected:false,available:false,href:'javascript:alert(1)'},
    ],
    sizeLabel:'Méret',
    sizeOptions:[
      {id:'s',label:'S',selected:false,available:true,href:'/termek/coat?size=s'},
      {id:'m',label:'M',selected:true,available:true,href:'/termek/coat?size=m'},
      {id:'l',label:'L',selected:false,available:false,href:'/termek/coat?size=l'},
    ],
  },
  commerce:{purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase'},
  reviews:{summary:{rating:4.8,count:37,label:'37 értékelés'}},
  recommendations:{products:[]},
};

describe('Golden #1 Monarche template package',()=>{
  it('keeps the agreed template identity and engine contract without implementing deferred engines inside the template',()=>{
    expect(MONARCHE_TEMPLATE_KEY).toBe('fashion.monarche');
    expect(MONARCHE_TEMPLATE_VERSION).toBe(1);
    expect(MONARCHE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E13']);
    expect(MONARCHE_ENGINE_CONTRACT.optional).toEqual(['E7']);
    expect(MONARCHE_ENGINE_CONTRACT.wave1Integration).toMatchObject({
      E1:'runtime-implemented',
      E2:'product-discovery-binding-contract',
      E13:'checkout-binding-contract',
      E7:'optional-later-structured-product-info',
    });
  });

  it('ships one preset for every declared Monarche page type and passes the Template Capability Gate on Alap',()=>{
    const componentRegistry=createStorefrontEditorialComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({
      template:MONARCHE_TEMPLATE_PACKAGE,
      componentRegistry,
      capability,
    });
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(MONARCHE_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(MONARCHE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);

    for(const page of MONARCHE_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,componentRegistry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the approved Home composition order in Page Schema metadata',()=>{
    expect(MONARCHE_HOME_PAGE.metadata?.sectionOrder).toEqual(MONARCHE_HOME_SECTION_ORDER);
    expect(MONARCHE_HOME_SECTION_ORDER).toEqual([
      'Editorial Hero',
      'Collection Navigation',
      'New Arrivals',
      'Editorial Split Feature',
      'Product Story Grid',
      'Featured Collection',
      'Social Proof/Reviews',
      'Journal Preview',
      'Newsletter',
      'Footer',
    ]);
  });

  it('renders the editorial Home through the common registry with real collection/product/content bindings',()=>{
    const html=renderToStaticMarkup(
      <StorefrontRuntimeRenderer
        page={MONARCHE_HOME_PAGE}
        viewport="desktop"
        bindingContext={{
          brand:{name:'Atelier Demo',homeHref:'/',copyright:'© Atelier Demo'},
          navigation:{primary:[{label:'Shop',href:'/webaruhaz'}],footer:[]},
          content:{
            monarcheHero:{title:'Quiet forms. Strong presence.',image:'https://example.com/hero.jpg'},
            collectionNavigation:{title:'Shop by edit'},
            newArrivals:{title:'New Arrivals'},
            productStory:{title:'Wear it your way'},
            featuredCollection:{title:'Featured'},
            journal:{title:'Journal',items:[{title:'The Quiet Edit',href:'/journal/quiet-edit',excerpt:'Anyag, forma és arány.'}]},
            newsletter:{title:'Monarche Notes'},
          },
          collection:{navigation:[{label:'Women',href:'/webaruhaz?collection=women'},{label:'Essentials',href:'/webaruhaz?collection=essentials'}],featured:{title:'The Essential Line'}},
          catalog:{
            newArrivals:[{id:'coat',name:'Sculpted Wool Coat',href:'/termek/coat',price:'89 900 Ft',stockLabel:'Raktáron'}],
            productStory:[{id:'dress',name:'Silk Column Dress',href:'/termek/dress',price:'69 900 Ft'}],
            featured:[{id:'trouser',name:'Tailored Wide Trouser',href:'/termek/trouser',price:'49 900 Ft'}],
          },
          reviews:{summary:{rating:4.9,count:120,label:'120 értékelés'}},
        }}
        componentRegistry={createStorefrontEditorialComponentRegistry()}
        rendererRegistry={createStorefrontEditorialRendererRegistry()}
        capability={capability}
      />,
    );
    expect(html).toContain('data-storefront-editorial="hero"');
    expect(html).toContain('data-storefront-commerce="collection-navigation"');
    expect(html).toContain('data-storefront-commerce="product-grid"');
    expect(html).toContain('Quiet forms. Strong presence.');
    expect(html).toContain('Sculpted Wool Coat');
    expect(html).toContain('The Quiet Edit');
    expect(html).toContain('Atelier Demo');
  });

  it('renders generic attribute variants with sold-out values still visible but disabled and blocks unsafe option URLs',()=>{
    const desktop=renderToStaticMarkup(
      <StorefrontRuntimeRenderer
        page={MONARCHE_PRODUCT_PAGE}
        viewport="desktop"
        bindingContext={productBindingContext}
        componentRegistry={createStorefrontEditorialComponentRegistry()}
        rendererRegistry={createStorefrontEditorialRendererRegistry()}
        capability={capability}
      />,
    );
    const mobile=renderToStaticMarkup(
      <StorefrontRuntimeRenderer
        page={MONARCHE_PRODUCT_PAGE}
        viewport="mobile"
        bindingContext={productBindingContext}
        componentRegistry={createStorefrontEditorialComponentRegistry()}
        rendererRegistry={createStorefrontEditorialRendererRegistry()}
        capability={capability}
      />,
    );

    expect(desktop).toContain('Sculpted Wool Coat');
    expect(desktop).toContain('data-storefront-commerce="variant-swatches"');
    expect(desktop).toContain('data-storefront-commerce="size-selector"');
    expect(desktop).toContain('aria-disabled="true"');
    expect(desktop).toContain('text-decoration:line-through');
    expect(desktop).not.toContain('javascript:');
    expect(desktop).toContain('span 7 / span 7');
    expect(mobile).toContain('span 12 / span 12');
  });

  it('materializes Monarche as draft-only presentation documents and namespaces demo fixtures',()=>{
    const plan=planStorefrontTemplateInstallation({
      template:MONARCHE_TEMPLATE_PACKAGE,
      componentRegistry:createStorefrontEditorialComponentRegistry(),
      capability,
    });
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.pages.map(page=>page.pageKey)).toEqual(expect.arrayContaining(['home','catalog','product','checkout']));
    expect(plan.mutationBoundary.storefrontPageDrafts).toBe(true);
    expect(plan.mutationBoundary.products).toBe(false);
    expect(plan.mutationBoundary.variants).toBe(false);
    expect(plan.mutationBoundary.customers).toBe(false);
    expect(plan.mutationBoundary.orders).toBe(false);
    expect(plan.mutationBoundary.b2b).toBe(false);
    expect(plan.demoLifecycle.install.length).toBeGreaterThan(0);
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='fashion-monarche')).toBe(true);
    expect(plan.demoLifecycle.install.every(record=>record.namespacedKey.startsWith('fashion-monarche:'))).toBe(true);
  });

  it('keeps checkout page as an E13 binding surface and does not embed payment-provider behavior',()=>{
    const checkout=MONARCHE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout');
    expect(checkout?.metadata?.engineBinding).toBe('E13');
    const source=JSON.stringify(checkout);
    expect(source).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
    expect(source).toContain('commerce.checkout-summary');
  });
});
