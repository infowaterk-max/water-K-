import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontPrimitiveRendererRegistry} from '@/components/builder/storefront-primitives';
import {createStorefrontPrimitiveComponentRegistry,STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {inspectStorefrontVisualStyle,resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const walk=(nodes:StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const page=()=>structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE) as StorefrontPageDocument;
const render=(document:StorefrontPageDocument,viewport:'desktop'|'tablet'|'mobile')=>renderToStaticMarkup(createElement(StorefrontRuntimeRenderer,{page:document,viewport,bindingContext:{},componentRegistry:createStorefrontPrimitiveComponentRegistry(),rendererRegistry:createStorefrontPrimitiveRendererRegistry(),capability:{plan:'alap' as const,features:[]}}));

describe('shared Storefront visual style capability',()=>{
  it('inherits safe visual geometry from base to desktop, tablet and mobile',()=>{
    const value={
      base:{padding:'1rem',color:'#111111'},
      desktop:{gap:'2rem',gridTemplateColumns:'minmax(0,1.65fr) minmax(14rem,.85fr)'},
      tablet:{gap:'1.5rem'},
      mobile:{padding:'.5rem',gridTemplateColumns:'1fr'},
    };
    expect(resolveStorefrontVisualStyle(value,'desktop')).toMatchObject({padding:'1rem',gap:'2rem',gridTemplateColumns:'minmax(0,1.65fr) minmax(14rem,.85fr)'});
    expect(resolveStorefrontVisualStyle(value,'tablet')).toMatchObject({padding:'1rem',gap:'1.5rem',gridTemplateColumns:'minmax(0,1.65fr) minmax(14rem,.85fr)'});
    expect(resolveStorefrontVisualStyle(value,'mobile')).toMatchObject({padding:'.5rem',gap:'1.5rem',gridTemplateColumns:'1fr'});
  });

  it('fails closed for non-allowlisted properties, fixed positioning and CSS URL/expression payloads',()=>{
    const value={base:{color:'#111',position:'fixed',background:'url(javascript:alert(1))',content:'bad',transform:'translateX(4px)'}};
    expect(inspectStorefrontVisualStyle(value).ok).toBe(false);
    expect(resolveStorefrontVisualStyle(value,'desktop')).toEqual({color:'#111',transform:'translateX(4px)'});
  });

  it('exposes style slots through canonical primitive manifests rather than a second renderer authority',()=>{
    const registry=createStorefrontPrimitiveComponentRegistry();
    expect(registry.get('layout.grid',1)?.manifest.configurable).toContain('style');
    expect(registry.get('content.heading',1)?.manifest.configurable).toEqual(expect.arrayContaining(['style','accentStyle']));
    expect(registry.get('system.header',1)?.manifest.configurable).toEqual(expect.arrayContaining(['style','innerStyle','brandStyle','taglineStyle','utilityStyle','mobileToggleStyle']));
  });

  it('renders arbitrary asymmetric grid tracks and responsive typography from the same Page Schema',()=>{
    const document=page();
    const nodes=walk(document.sections);
    const grid=nodes.find(node=>node.id==='reference-grid')!;
    const heading=nodes.find(node=>node.id==='reference-grid-heading')!;
    grid.config.style={base:{gridTemplateColumns:'minmax(0,1.65fr) minmax(14rem,.85fr)',gap:'2.25rem'},mobile:{gridTemplateColumns:'1fr',gap:'1rem'}};
    heading.config.style={base:{fontFamily:'Arial, sans-serif',fontSize:'3.25rem',lineHeight:.9,letterSpacing:'-.04em',maxWidth:'10ch'},mobile:{fontSize:'2rem',maxWidth:'14ch'}};
    const desktop=render(document,'desktop');
    const mobile=render(document,'mobile');
    expect(desktop).toContain('grid-template-columns:minmax(0,1.65fr) minmax(14rem,.85fr)');
    expect(desktop).toContain('font-size:3.25rem');
    expect(desktop).toContain('max-width:10ch');
    expect(mobile).toContain('grid-template-columns:1fr');
    expect(mobile).toContain('font-size:2rem');
    expect(mobile).toContain('max-width:14ch');
  });
});
