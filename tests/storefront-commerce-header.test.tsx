import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontCommerceHeaderRendererRegistry} from '@/components/builder/storefront-commerce-header';
import {createStorefrontCommerceHeaderComponentRegistry} from '@/lib/builder/storefront-commerce-header';
import {STOREFRONT_PAGE_SCHEMA_VERSION} from '@/lib/builder/storefront-foundation';
import {validateStorefrontPageDocument,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const page:StorefrontPageDocument={
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  pageKey:'commerce-header.test',pageType:'home',templateKey:'reference.commerce-header',templateVersion:1,
  metadata:{},
  sections:[{
    id:'commerce-header',componentKey:'system.commerce-header',componentVersion:1,
    config:{brandLabel:'Demo Shop',brandHref:'/',tagline:'Gaming store',sticky:true,presentation:'commerce-two-tier',utilityItems:[{label:'Fiók',href:'/fiokom',symbol:'◎'},{label:'Kedvencek',href:'/kedvencek',symbol:'♡'},{label:'Kosár',href:'/kosar',symbol:'▢'}]},
    bindings:{brandLabel:{path:'brand.name',fallback:'Demo Shop'},brandHref:{path:'brand.homeHref',fallback:'/'}},
    children:[
      {id:'store-search',componentKey:'system.search',componentVersion:1,config:{action:'/kereses',queryParam:'q',placeholder:'Mit keresel?',buttonLabel:'Keresés',ariaLabel:'Webshop keresés'}},
      {id:'primary-nav',componentKey:'system.navigation',componentVersion:1,config:{items:[{label:'Játékok',href:'/webaruhaz'},{label:'Ajándék',href:'/ajandek'}],ariaLabel:'Fő navigáció',layout:'horizontal'}},
    ],
  },{
    id:'body',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'m',width:'full'},children:[],
  }],
};

const render=(viewport:'desktop'|'tablet'|'mobile',document:StorefrontPageDocument=page)=>renderToStaticMarkup(<StorefrontRuntimeRenderer
  page={document} viewport={viewport} bindingContext={{brand:{name:'Merchant Gaming',homeHref:'/'}}}
  componentRegistry={createStorefrontCommerceHeaderComponentRegistry()}
  rendererRegistry={createStorefrontCommerceHeaderRendererRegistry()}
  capability={{plan:'alap',features:[]}}
/>);

describe('shared commerce header',()=>{
  it('validates protected two-tier header with native search and navigation children',()=>{
    const registry=createStorefrontCommerceHeaderComponentRegistry();
    expect(registry.get('system.commerce-header',1)?.protectedSystem).toBe(true);
    expect(registry.get('system.commerce-header',1)?.allowedChildren).toEqual(['system.search','system.navigation']);
    expect(registry.get('system.search',1)?.protectedSystem).not.toBe(true);
    expect(validateStorefrontPageDocument(page,registry,{plan:'alap',features:[]}).ok).toBe(true);
  });

  it('renders merchant brand, semantic search, utilities and navigation on desktop',()=>{
    const html=render('desktop');
    expect(html).toContain('data-storefront-component="system.commerce-header"');
    expect(html).toContain('data-storefront-protected-system="header"');
    expect(html).toContain('data-storefront-component="system.search"');
    expect(html).toContain('role="search"');
    expect(html).toContain('action="/kereses"');
    expect(html).toContain('name="q"');
    expect(html).toContain('Merchant Gaming');
    expect(html).toContain('Játékok');
    expect(html).toContain('aria-label="Webshop műveletek"');
  });

  it('keeps search and navigation present on mobile instead of a non-functional fake hamburger',()=>{
    const html=render('mobile');
    expect(html).toContain('Mit keresel?');
    expect(html).toContain('Játékok');
    expect(html).not.toContain('Mobil navigáció');
  });

  it('sanitizes unsafe search actions and query parameter names',()=>{
    const unsafe=structuredClone(page);
    const header=unsafe.sections[0];
    const search=header.children?.find(child=>child.componentKey==='system.search');
    if(!search)throw new Error('SEARCH_NODE_MISSING');
    search.config.action='javascript:alert(1)';
    search.config.queryParam='q[];bad';
    const html=render('desktop',unsafe);
    expect(html).not.toContain('javascript:');
    expect(html).toContain('action="/kereses"');
    expect(html).toContain('name="q"');
  });
});
