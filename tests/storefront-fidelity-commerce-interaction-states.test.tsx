import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontCoreCommerceRendererRegistry} from '@/components/builder/storefront-commerce';
import {createStorefrontCoreCommerceComponentRegistry} from '@/lib/builder/storefront-commerce';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {storefrontInteractionTargetsForComponent} from '@/lib/builder/storefront-fidelity-interaction-state';

const page=():StorefrontPageDocument=>({
  schemaVersion:1,
  pageKey:'interaction.product',
  pageType:'product',
  templateKey:'reference.interaction',
  templateVersion:1,
  sections:[{
    id:'interaction-section',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'m'},children:[
      {id:'grid',componentKey:'commerce.product-grid',componentVersion:1,config:{products:[{id:'p1',name:'Termék',href:'/termek/p1',image:'/p1.jpg',price:1000}],showCta:true,styleSlots:{cardLinkHover:{desktop:{color:'#006644',textDecoration:'underline'}}}}},
      {id:'gallery',componentKey:'commerce.product-gallery',componentVersion:1,config:{images:[{src:'/p1.jpg',alt:'Termék'}],presentation:'editorial-thumbnails',styleSlots:{thumbnailFocus:{desktop:{boxShadow:'0 0 0 3px #55aaff'}}}}},
      {id:'variant',componentKey:'commerce.variant-swatches',componentVersion:1,config:{presentation:'chips',options:[{id:'v1',label:'Készlet',href:'/termek/p1?v=v1',available:true},{id:'v2',label:'Elfogyott',available:false}],styleSlots:{optionHover:{desktop:{transform:'translateY(-1px)'}},optionDisabled:{desktop:{opacity:.2}}}}},
      {id:'tabs',componentKey:'commerce.content-tabs',componentVersion:1,config:{tabs:[{id:'details',label:'Részletek',title:'Részletek',copy:'Leírás'}],styleSlots:{tabActive:{desktop:{backgroundColor:'#eeeeee'}}}}},
    ],
  }],
});

describe('Storefront commerce interaction state bridge',()=>{
  it('declares Builder targets from the same shared interaction contract used by Runtime',()=>{
    expect(storefrontInteractionTargetsForComponent('commerce.content-tabs')).toEqual([{slot:'tab',label:'Tartalmi tab',runtime:'descendants'}]);
    expect(storefrontInteractionTargetsForComponent('commerce.variant-swatches')[0]?.slot).toBe('option');
    expect(storefrontInteractionTargetsForComponent('commerce.size-selector')).toEqual([]);
  });

  it('decorates commerce interactive descendants without changing commerce data authority',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
      page={page()}
      viewport="desktop"
      bindingContext={{}}
      componentRegistry={createStorefrontCoreCommerceComponentRegistry()}
      rendererRegistry={createStorefrontCoreCommerceRendererRegistry()}
      capability={{plan:'alap',features:['catalog','inventory']}}
    />);
    expect(html).toContain('--shoporation-interaction-hover-color:#006644');
    expect(html).toContain('--shoporation-interaction-hover-text-decoration:underline');
    expect(html).toContain('--shoporation-interaction-focus-box-shadow:0 0 0 3px #55aaff');
    expect(html).toContain('--shoporation-interaction-hover-transform:translateY(-1px)');
    expect(html).toContain('--shoporation-interaction-disabled-opacity:0.2');
    expect(html).toContain('--shoporation-interaction-active-background-color:#eeeeee');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('/termek/p1?v=v1');
  });
});
