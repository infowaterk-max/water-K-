import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {setStorefrontNodeViewportStyle,moveStorefrontChildAtViewport} from '@/lib/builder/storefront-fidelity-builder-operations';
import {setStorefrontResponsiveGridPlacement} from '@/lib/builder/storefront-fidelity-layout';
import {
  STOREFRONT_RESPONSIVE_LAYOUT_DEPTH_VERSION,
  inspectStorefrontResponsiveLayoutDepth,
  resetStorefrontResponsiveLayoutDepth,
  setStorefrontResponsiveGridContainerLayout,
  setStorefrontResponsiveStackContainerLayout,
  setStorefrontResponsiveVisibility,
} from '@/lib/builder/storefront-responsive-layout-depth';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const clone=<T>(value:T):T=>structuredClone(value);
const read=(path:string)=>readFileSync(path,'utf8');
function findNode(document:StorefrontPageDocument,nodeId:string):StorefrontComponentNode{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|undefined=>{
    for(const node of nodes){if(node.id===nodeId)return node;const nested=walk(node.children??[]);if(nested)return nested;}
    return undefined;
  };
  const node=walk(document.sections);if(!node)throw new Error(`TEST_NODE_NOT_FOUND:${nodeId}`);return node;
}

describe('Responsive / Layout Depth v1',()=>{
  it('uses the existing Page Schema/Fidelity authority and reports inherited state',()=>{
    const document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const state=inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile');
    expect(state.version).toBe(STOREFRONT_RESPONSIVE_LAYOUT_DEPTH_VERSION);
    expect(state.editMode).toBe('normal');
    expect(state.parentComponentKey).toBe('layout.grid');
    expect(state.effectiveGridSpan).toBe(12);
    expect(state.visibility).toEqual({direct:null,effective:false});
  });

  it('supports explicit breakpoint visibility while retaining inheritance semantics',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontResponsiveVisibility(document,'reference-grid-left','desktop',true);
    expect(inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile').visibility.effective).toBe(true);
    document=setStorefrontResponsiveVisibility(document,'reference-grid-left','mobile',false);
    expect(inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile').visibility).toEqual({direct:false,effective:false});
    document=setStorefrontResponsiveVisibility(document,'reference-grid-left','mobile',null);
    expect(inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile').visibility).toEqual({direct:null,effective:true});
  });

  it('adds structured responsive grid flow without erasing unrelated allowlisted style',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontNodeViewportStyle(document,'reference-grid','tablet',{backgroundColor:'#ffffff'});
    document=setStorefrontResponsiveGridContainerLayout(document,'reference-grid','tablet',{columns:2,gap:'l',alignItems:'center',justifyItems:'stretch'});
    const node=findNode(document,'reference-grid');
    const tablet=(node.config.style as {tablet?:Record<string,unknown>}).tablet!;
    expect(tablet.backgroundColor).toBe('#ffffff');
    expect(tablet.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(tablet.gap).toBe('var(--shoporation-space-l, 2.5rem)');
    expect(tablet.alignItems).toBe('center');
    expect(tablet.justifyItems).toBe('stretch');
    const inspection=inspectStorefrontResponsiveLayoutDepth(document,'reference-grid','tablet');
    expect(inspection.container.direct).toMatchObject({columns:2,gap:'l',alignItems:'center',justifyItems:'stretch'});
    expect(()=>setStorefrontResponsiveGridContainerLayout(document,'reference-grid','tablet',{columns:13})).toThrow('RESPONSIVE_LAYOUT_GRID_COLUMNS_INVALID');
  });

  it('adds structured responsive stack direction, wrap, spacing and alignment',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontResponsiveStackContainerLayout(document,'reference-hero-stack','mobile',{direction:'row',wrap:'wrap',gap:'s',alignItems:'center',justifyContent:'between'});
    const inspection=inspectStorefrontResponsiveLayoutDepth(document,'reference-hero-stack','mobile');
    expect(inspection.container.kind).toBe('stack');
    expect(inspection.container.direct).toMatchObject({direction:'row',wrap:'wrap',gap:'s',alignItems:'center',justifyContent:'between'});
    const mobile=(findNode(document,'reference-hero-stack').config.style as {mobile?:Record<string,unknown>}).mobile!;
    expect(mobile.flexDirection).toBe('row');
    expect(mobile.flexWrap).toBe('wrap');
    expect(mobile.gap).toBe('var(--shoporation-space-s, 1rem)');
    expect(mobile.justifyContent).toBe('space-between');
  });

  it('uses existing responsive child-order metadata and resets only layout-depth overrides',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontNodeViewportStyle(document,'reference-grid','mobile',{backgroundColor:'#f8fafc'});
    document=setStorefrontResponsiveVisibility(document,'reference-grid','mobile',true);
    document=setStorefrontResponsiveGridPlacement(document,'reference-grid','mobile',{span:10,order:2});
    document=setStorefrontResponsiveGridContainerLayout(document,'reference-grid','mobile',{columns:1,gap:'xl'});
    document=moveStorefrontChildAtViewport(document,'reference-grid','mobile','reference-grid-right',0);
    expect(inspectStorefrontResponsiveLayoutDepth(document,'reference-grid','mobile').childOrder[0]).toBe('reference-grid-right');

    document=resetStorefrontResponsiveLayoutDepth(document,'reference-grid','mobile');
    const state=inspectStorefrontResponsiveLayoutDepth(document,'reference-grid','mobile');
    expect(state.visibility.direct).toBeNull();
    expect(state.gridPlacement.hasOverride).toBe(false);
    expect(state.container.hasOverride).toBe(false);
    expect(state.childOrder).toEqual(['reference-grid-left','reference-grid-right']);
    const mobile=(findNode(document,'reference-grid').config.style as {mobile?:Record<string,unknown>}).mobile!;
    expect(mobile.backgroundColor).toBe('#f8fafc');
  });

  it('reuses the existing runtime/style engine and exposes mode-gated Builder controls without raw CSS',()=>{
    const runtime=read('src/components/builder/storefront-primitives.tsx');
    const settings=read('src/components/admin/storefront-fidelity-settings.tsx');
    const controls=read('src/components/admin/storefront-responsive-layout-depth-controls.tsx');
    const engine=read('src/lib/builder/storefront-responsive-layout-depth.ts');
    expect(runtime).toContain('visualStyle(config.style,viewport)');
    expect(settings).toContain('StorefrontResponsiveLayoutDepthControls');
    expect(settings).toContain('Responsive / Layout Depth');
    expect(controls).toContain('StorefrontFidelityLayoutControls');
    expect(controls).toContain("state.editMode==='advanced'||state.editMode==='expert'");
    expect(controls).toContain('Breakpoin');
    expect(controls).not.toContain('<textarea');
    expect(engine).toContain('setStorefrontNodeViewportStyle');
    expect(engine).toContain('resetStorefrontResponsiveGridPlacement');
    expect(engine).not.toContain('publish_storefront_page_v1');
    expect(engine).not.toContain('dangerouslySetInnerHTML');
  });
});
