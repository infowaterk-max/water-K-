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


  it('compacts dense desktop navigation before the horizontal-scroll fallback is needed',()=>{
    const dense=structuredClone(page);
    const header=dense.sections[0];
    header.config.navTagline='JÁTÉK. KÖZÖSSÉG. ÉLMÉNY.';
    const navigation=header.children?.find(child=>child.componentKey==='system.navigation');
    if(!navigation)throw new Error('NAV_NODE_MISSING');
    navigation.config.items=Array.from({length:9},(_,index)=>({label:`Menüpont ${index+1}`,href:`/menu-${index+1}`}));
    const html=render('desktop',dense);
    expect(html).toContain('data-navigation-density="dense"');
    expect(html).not.toContain('JÁTÉK. KÖZÖSSÉG. ÉLMÉNY.');
  });

  it('enforces a readable protected-header floor even when a template requests compact desktop chrome',()=>{
    const compact=structuredClone(page);
    const header=compact.sections[0];
    header.config.showUtilityLabels=true;
    header.config.innerStyle={padding:'.35rem'};
    header.config.tagline='PLAYROOM';
    header.config.taglineStyle={fontSize:'.55rem'};
    const search=header.children?.find(child=>child.componentKey==='system.search');
    const navigation=header.children?.find(child=>child.componentKey==='system.navigation');
    if(!search||!navigation)throw new Error('HEADER_CHILD_MISSING');
    search.config.inputStyle={fontSize:'.62rem'};
    navigation.config.items=Array.from({length:9},(_,index)=>({label:`Menüpont ${index+1}`,href:`/menu-${index+1}`}));
    const html=render('desktop',compact);
    expect(html).toContain('min-height:2.85rem');
    expect(html).toContain('font-size:.94rem');
    expect(html).toContain('min-height:3.65rem');
    expect(html).toContain('font-size:.88rem');
    expect(html).toContain('font-size:.78rem');
  });

  it('keeps the optional navigation tagline for sparse desktop commerce headers',()=>{
    const sparse=structuredClone(page);
    sparse.sections[0].config.navTagline='VÁLOGATOTT KÍNÁLAT';
    const html=render('desktop',sparse);
    expect(html).not.toContain('data-navigation-density="dense"');
    expect(html).toContain('VÁLOGATOTT KÍNÁLAT');
  });

  it('preserves recognizable utility icon semantics after preview route rewriting changes hrefs',()=>{
    const rewritten=structuredClone(page);
    const header=rewritten.sections[0];
    header.config.utilityItems=[
      {label:'Kedvenceim',href:'/storefront-template-preview?template=gaming.playroom&version=20&page=account&viewport=mobile',symbol:'♡'},
      {label:'Fiókom',href:'/storefront-template-preview?template=gaming.playroom&version=20&page=account&viewport=mobile',symbol:'♙'},
      {label:'Kosár',href:'/storefront-template-preview?template=gaming.playroom&version=20&page=cart&viewport=mobile',symbol:'⌑'},
    ];
    const html=render('mobile',rewritten);
    expect(html).toContain('data-storefront-utility-icon="favorites"');
    expect(html).toContain('data-storefront-utility-icon="account"');
    expect(html).toContain('data-storefront-utility-icon="cart"');
    expect(html).not.toContain('data-storefront-utility-icon="custom">⌑');
  });

  it('renders the shared mobile navigation behind a real hamburger disclosure',()=>{
    const html=render('mobile');
    expect(html).toContain('Mit keresel?');
    expect(html).toContain('data-storefront-mobile-menu="true"');
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
    expect(html).toContain('Mobil navigáció megnyitása');
    expect(html).toContain('Menü');
    expect(html).toContain('Játékok');
    expect(html).toContain('data-storefront-component="system.navigation"');
  });

  it('centers an icon-only search action inside a compact fixed-height template root without child overflow',()=>{
    const compact=structuredClone(page);
    const header=compact.sections[0];
    const search=header.children?.find(child=>child.componentKey==='system.search');
    if(!search)throw new Error('SEARCH_NODE_MISSING');
    search.config.buttonLabel='🔍';
    search.config.style={height:'2.24rem',overflow:'hidden'};
    search.config.buttonStyle={padding:'.34rem .7rem'};
    const html=render('desktop',compact);
    expect(html).toContain('height:2.24rem');
    expect(html).toContain('min-height:0');
    expect(html).toContain('height:auto');
    expect(html).toContain('position:relative');
    expect(html).toContain('left:50%');
    expect(html).toContain('top:50%');
    expect(html).toContain('transform:translate(-50%,-50%)');
    expect(html).not.toContain('min-height:2.75rem');
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
