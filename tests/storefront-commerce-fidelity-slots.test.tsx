import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontCoreCommerceRendererRegistry} from '@/components/builder/storefront-commerce';
import {createStorefrontCoreCommerceComponentRegistry} from '@/lib/builder/storefront-commerce';
import {PLANS} from '@/lib/plans/catalog';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const page:StorefrontPageDocument={schemaVersion:1,pageKey:'commerce-fidelity.home',pageType:'home',templateKey:'reference.commerce-fidelity',templateVersion:1,sections:[{id:'section',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'none',width:'full'},children:[{id:'products',componentKey:'commerce.product-grid',componentVersion:1,config:{title:'Népszerű formulák',columns:2,presentation:'beauty-lab',showBadges:true,showCta:true,products:[{id:'serum',name:'Niacinamide 10% Serum',href:'/termek/serum',image:'/serum.jpg',price:'8 990 Ft',badge:'Bestseller',subtitle:'Tisztább bőrkép'}],styleSlots:{root:{base:{backgroundColor:'#fffafd'}},title:{base:{fontSize:'2.75rem'}},card:{base:{gap:'0.25rem'}},media:{base:{aspectRatio:'1 / 1'}},name:{base:{fontSize:'1.25rem'}},price:{base:{fontWeight:800}},cta:{base:{borderRadius:'0px'}}}}}]}]};

describe('Commerce fidelity style slots',()=>{
  it('styles product-grid internals without a template-specific renderer',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={page} viewport="desktop" bindingContext={{}} componentRegistry={createStorefrontCoreCommerceComponentRegistry()} rendererRegistry={createStorefrontCoreCommerceRendererRegistry()} capability={capability}/>);
    expect(html).toContain('background-color:#fffafd');
    expect(html).toContain('font-size:2.75rem');
    expect(html).toContain('aspect-ratio:1 / 1');
    expect(html).toContain('font-size:1.25rem');
    expect(html).toContain('font-weight:800');
    expect(html).toContain('border-radius:0px');
    expect(html).toContain('Niacinamide 10% Serum');
    expect(html).toContain('8 990 Ft');
  });
});
