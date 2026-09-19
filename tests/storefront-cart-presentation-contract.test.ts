import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,
  STOREFRONT_TEMPLATE_LAUNCH_TARGET,
} from '@/lib/builder/storefront-template-catalog';
import {
  normalizeStorefrontTemplateRuntimeComposition,
  storefrontCartPresentationViolations,
} from '@/lib/builder/storefront-template-runtime-normalization';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>
  nodes.flatMap(node=>[node,...walk(node.children??[])]);

const forbiddenCartComponents=new Set([
  'commerce.fulfillment-summary',
  'commerce.documents-center',
  'commerce.product-documents',
  'commerce.downloads-tile',
  'commerce.post-purchase-guidance',
]);

describe('Portfolio-wide cart customer-task contract',()=>{
  it('keeps every implemented template cart free of document/download and detached fulfillment surfaces',()=>{
    expect(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.length).toBeLessThanOrEqual(STOREFRONT_TEMPLATE_LAUNCH_TARGET);
    for(const template of STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES){
      const cart=template.pages.find(page=>page.pageType==='cart');
      expect(cart,template.manifest.templateKey).toBeTruthy();
      const nodes=walk(cart!.sections);
      const summaries=nodes.filter(node=>node.componentKey==='commerce.cart-summary');
      expect(summaries.length,template.manifest.templateKey).toBeGreaterThan(0);
      for(const summary of summaries){
        expect(summary.config.emptyCtaLabel,template.manifest.templateKey).toBe('Vásárlás folytatása');
        expect(summary.config.emptyCtaHref,template.manifest.templateKey).toBe('/webaruhaz');
      }
      for(const recommendation of nodes.filter(node=>node.componentKey==='commerce.recommendation-row')){
        expect(recommendation.config.hideWhenEmpty,template.manifest.templateKey).toBe(true);
      }
      for(const section of nodes.filter(node=>node.componentKey==='layout.section')){
        const descendants=walk(section.children??[]);
        if(descendants.some(node=>node.componentKey==='commerce.recommendation-row')
          &&descendants.every(node=>['layout.container','layout.grid','layout.stack','commerce.recommendation-row'].includes(node.componentKey))){
          expect(section.config.presentation,template.manifest.templateKey).toBe('flush');
        }
      }
      expect(nodes.filter(node=>forbiddenCartComponents.has(node.componentKey)),template.manifest.templateKey).toEqual([]);
      expect(storefrontCartPresentationViolations(cart!),template.manifest.templateKey).toEqual([]);
    }
  });

  it('removes internal assurance chrome and document surfaces without weakening the real cart summary',()=>{
    const page:StorefrontPageDocument={
      schemaVersion:1,
      pageKey:'test.cart',
      pageType:'cart',
      templateKey:'test.template',
      templateVersion:1,
      sections:[
        {
          id:'cart-body',
          componentKey:'layout.section',
          componentVersion:1,
          config:{},
          children:[
            {
              id:'cart-summary',
              componentKey:'commerce.cart-summary',
              componentVersion:1,
              config:{lines:[],subtotal:'',total:'',currency:'HUF',checkoutHref:'/penztar',checkoutLabel:'Tovább a pénztárhoz',emptyLabel:'A kosarad üres.'},
            },
            {
              id:'assurance',
              componentKey:'layout.stack',
              componentVersion:1,
              config:{},
              children:[
                {id:'stock-copy',componentKey:'content.text',componentVersion:1,config:{text:'Valós készlet'}},
                {id:'price-copy',componentKey:'content.text',componentVersion:1,config:{text:'Valós ár'}},
                {id:'final-copy',componentKey:'content.text',componentVersion:1,config:{text:'Végső ellenőrzés'}},
              ],
            },
          ],
        },
        {
          id:'cart-digital-commerce',
          componentKey:'layout.section',
          componentVersion:1,
          config:{},
          children:[
            {id:'cart-fulfillment',componentKey:'commerce.fulfillment-summary',componentVersion:1,config:{title:'Teljesítés a kosárban'}},
            {id:'cart-documents',componentKey:'commerce.documents-center',componentVersion:1,config:{title:'Dokumentumok és letöltések'}},
          ],
        },
      ],
    };

    const normalized=normalizeStorefrontTemplateRuntimeComposition(page);
    const nodes=walk(normalized.sections);
    const summary=nodes.find(node=>node.componentKey==='commerce.cart-summary');
    expect(summary).toBeTruthy();
    expect(summary?.config.emptyCtaLabel).toBe('Vásárlás folytatása');
    expect(summary?.config.emptyCtaHref).toBe('/webaruhaz');
    expect(nodes.some(node=>forbiddenCartComponents.has(node.componentKey))).toBe(false);
    expect(nodes.some(node=>['stock-copy','price-copy','final-copy','assurance','cart-digital-commerce'].includes(node.id))).toBe(false);
    expect(storefrontCartPresentationViolations(normalized)).toEqual([]);
  });

  it('does not reinterpret product/account download ownership while normalizing cart presentation',()=>{
    const product:StorefrontPageDocument={schemaVersion:1,pageKey:'p',pageType:'product',templateKey:'test',templateVersion:1,sections:[{
      id:'downloads',componentKey:'commerce.downloads-tile',componentVersion:1,config:{title:'Letöltések'},
    }]};
    const account:StorefrontPageDocument={schemaVersion:1,pageKey:'a',pageType:'account',templateKey:'test',templateVersion:1,sections:[{
      id:'library',componentKey:'commerce.documents-center',componentVersion:1,config:{title:'Letöltéseim'},
    }]};
    expect(normalizeStorefrontTemplateRuntimeComposition(product)).toEqual(product);
    expect(normalizeStorefrontTemplateRuntimeComposition(account)).toEqual(account);
  });
});
