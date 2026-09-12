import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_SCHEMA_VERSION,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {STOREFRONT_PRIMITIVE_DEFINITIONS} from '@/lib/builder/storefront-primitives';
import {createStorefrontPrimitiveRendererRegistry} from '@/components/builder/storefront-primitives';
import type {StorefrontPageDocument,StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';
import {
  sanitizeStorefrontHeaderScrolledStyle,
  sanitizeStorefrontStickyHeaderBehavior,
  setStorefrontNodeBehavior,
} from '@/lib/builder/storefront-fidelity-behavior';

const page:StorefrontPageDocument={schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey:'sticky.home',pageType:'home',templateKey:'sticky.reference',templateVersion:1,metadata:{test:true},sections:[]};
const resolvedNode=(config:Record<string,unknown>):StorefrontResolvedComponentNode=>({id:'sticky-header',componentKey:'system.header',componentVersion:1,config,children:[],resolved:{hidden:false,gridSpan:12}});
const renderHeader=(config:Record<string,unknown>,viewport:StorefrontViewport='desktop')=>{
  const renderer=createStorefrontPrimitiveRendererRegistry().get('system.header',1);
  if(!renderer)throw new Error('TEST_HEADER_RENDERER_MISSING');
  const node=resolvedNode(config);
  return renderToStaticMarkup(<>{renderer({node,config,children:<nav>Nav</nav>,page,viewport})}</>);
};

describe('Visual Builder sticky header scroll-state contract',()=>{
  it('fails closed, clamps thresholds and restricts scrolled styles to the dedicated visual allowlist',()=>{
    expect(sanitizeStorefrontStickyHeaderBehavior({enabled:'yes',threshold:-200})).toEqual({enabled:false,threshold:1});
    expect(sanitizeStorefrontStickyHeaderBehavior({enabled:true,threshold:999})).toEqual({enabled:true,threshold:320});
    expect(sanitizeStorefrontHeaderScrolledStyle({backgroundColor:'rgba(255,255,255,.9)',padding:'.5rem',position:'sticky',zIndex:999,pointerEvents:'none',boxShadow:'0 8px 20px rgba(0,0,0,.08)'})).toEqual({backgroundColor:'rgba(255,255,255,.9)',padding:'.5rem',boxShadow:'0 8px 20px rgba(0,0,0,.08)'});
  });

  it('exposes behavior only through the shared protected header registry contract',()=>{
    const header=STOREFRONT_PRIMITIVE_DEFINITIONS.find(definition=>definition.manifest.componentKey==='system.header');
    const navigation=STOREFRONT_PRIMITIVE_DEFINITIONS.find(definition=>definition.manifest.componentKey==='system.navigation');
    expect(header?.manifest.configurable).toContain('behavior');
    expect(navigation?.manifest.configurable).not.toContain('behavior');
  });

  it('keeps the existing sticky header server markup path when scroll behavior is absent',()=>{
    const html=renderHeader({brandLabel:'Beauty Lab',brandHref:'/',tone:'background',sticky:true,presentation:'editorial-lab'});
    expect(html).toContain('position:sticky');
    expect(html).toContain('top:0');
    expect(html).not.toContain('data-storefront-scroll-state');
  });

  it('hydrates only when sticky scroll behavior is explicitly enabled and starts from the top state',()=>{
    const html=renderHeader({
      brandLabel:'Beauty Lab',brandHref:'/',tone:'background',sticky:true,presentation:'editorial-lab',
      behavior:{enabled:true,threshold:32},
      styleSlots:{rootScrolled:{desktop:{boxShadow:'0 8px 20px rgba(0,0,0,.08)'}},innerScrolled:{desktop:{padding:'.4rem 1rem'}}},
    });
    expect(html).toContain('data-storefront-scroll-state="top"');
    expect(html).toContain('position:sticky');
    expect(html).not.toContain('0 8px 20px rgba(0,0,0,.08)');
    expect(html).not.toContain('padding:.4rem 1rem');
  });

  it('ignores an enabled scroll behavior when the header itself is not sticky',()=>{
    const html=renderHeader({brandLabel:'Static',brandHref:'/',sticky:false,behavior:{enabled:true,threshold:10}});
    expect(html).not.toContain('data-storefront-scroll-state');
    expect(html).toContain('position:relative');
  });

  it('writes sanitized sticky behavior immutably and reset removes the explicit override',()=>{
    const document:StorefrontPageDocument={...page,sections:[{id:'header',componentKey:'system.header',componentVersion:1,config:{brandLabel:'Header',sticky:true}}]};
    const changed=setStorefrontNodeBehavior(document,'header',{enabled:true,threshold:500});
    expect(document.sections[0].config.behavior).toBeUndefined();
    expect(changed.sections[0].config.behavior).toEqual({enabled:true,threshold:320});
    const reset=setStorefrontNodeBehavior(changed,'header',null);
    expect(reset.sections[0].config.behavior).toBeUndefined();
  });
});
