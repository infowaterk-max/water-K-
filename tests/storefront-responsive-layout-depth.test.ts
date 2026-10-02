import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {setStorefrontNodeViewportStyle,moveStorefrontChildAtViewport,setStorefrontResponsiveChildOrder} from '@/lib/builder/storefront-fidelity-builder-operations';
import {setStorefrontResponsiveGridPlacement} from '@/lib/builder/storefront-fidelity-layout';
import {
  STOREFRONT_RESPONSIVE_LAYOUT_DEPTH_VERSION,
  STOREFRONT_RESPONSIVE_INHERITANCE_INTELLIGENCE_VERSION,
  STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS,
  applyStorefrontResponsiveInheritancePropagation,
  inspectStorefrontResponsiveInheritance,
  inspectStorefrontResponsiveLayoutDepth,
  planStorefrontResponsiveInheritancePropagation,
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
  it('uses the existing Page Schema/Fidelity authority and reports viewport-local/default state',()=>{
    const document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const state=inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile');
    expect(state.version).toBe(STOREFRONT_RESPONSIVE_LAYOUT_DEPTH_VERSION);
    expect(state.editMode).toBe('normal');
    expect(state.parentComponentKey).toBe('layout.grid');
    expect(state.effectiveGridSpan).toBe(12);
    expect(state.visibility).toEqual({direct:null,effective:false});
  });

  it('supports explicit breakpoint visibility without sibling-viewport leakage',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontResponsiveVisibility(document,'reference-grid-left','desktop',true);
    expect(inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile').visibility.effective).toBe(false);
    document=setStorefrontResponsiveVisibility(document,'reference-grid-left','mobile',false);
    expect(inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile').visibility).toEqual({direct:false,effective:false});
    document=setStorefrontResponsiveVisibility(document,'reference-grid-left','mobile',null);
    expect(inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile').visibility).toEqual({direct:null,effective:false});
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
    expect(settings).toContain('Haladó elrendezési vezérlés');
    expect(settings).toContain("const advanced=inspector.editMode==='advanced'||inspector.editMode==='expert'");
    expect(controls).toContain('StorefrontFidelityLayoutControls');
    expect(controls).toContain("state.editMode==='advanced'||state.editMode==='expert'");
    expect(controls).toContain('Breakpoin');
    expect(controls).not.toContain('<textarea');
    expect(engine).toContain('setStorefrontNodeViewportStyle');
    expect(engine).toContain('resetStorefrontResponsiveGridPlacement');
    expect(engine).not.toContain('publish_storefront_page_v1');
    expect(engine).not.toContain('dangerouslySetInnerHTML');
  });

  it('explains exact-viewport provenance without reviving Desktop to Tablet to Mobile cascade',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontResponsiveVisibility(document,'reference-grid','desktop',true);
    document=setStorefrontResponsiveGridPlacement(document,'reference-grid','desktop',{span:8});
    const result=inspectStorefrontResponsiveInheritance(document,'reference-grid');
    expect(result.version).toBe(STOREFRONT_RESPONSIVE_INHERITANCE_INTELLIGENCE_VERSION);
    expect(result.runtimeSemantics).toBe('base-plus-exact-viewport');
    expect(result.viewports.desktop.visibility).toMatchObject({direct:true,effective:true,source:'viewport'});
    expect(result.viewports.tablet.visibility).toMatchObject({direct:null,effective:false,source:'default'});
    expect(result.viewports.mobile.visibility).toMatchObject({direct:null,effective:false,source:'default'});
    expect(result.viewports.desktop.gridPlacement).toMatchObject({effectiveGridSpan:8,source:'viewport'});
    expect(result.viewports.tablet.gridPlacement).toMatchObject({effectiveGridSpan:12,source:'default'});
  });

  it('diagnoses only overrides proven redundant by dimension-local reset',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontResponsiveVisibility(document,'reference-grid','mobile',false);
    document=setStorefrontResponsiveGridPlacement(document,'reference-grid','mobile',{span:12});
    document=setStorefrontResponsiveGridContainerLayout(document,'reference-grid','mobile',{gap:'m'});
    document=setStorefrontResponsiveChildOrder(document,'reference-grid','mobile',['reference-grid-left','reference-grid-right']);
    const diagnostics=inspectStorefrontResponsiveInheritance(document,'reference-grid').diagnostics
      .filter(issue=>issue.viewport==='mobile')
      .map(issue=>issue.dimension);
    expect(diagnostics).toEqual(expect.arrayContaining(['visibility','grid-placement','container','child-order']));

    document=setStorefrontResponsiveGridContainerLayout(document,'reference-grid','mobile',{gap:'xl'});
    expect(inspectStorefrontResponsiveInheritance(document,'reference-grid').diagnostics)
      .not.toContainEqual(expect.objectContaining({viewport:'mobile',dimension:'container'}));
  });

  it('plans deterministic explicit propagation and mutates only selected targets',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontNodeViewportStyle(document,'reference-grid','tablet',{backgroundColor:'#ffffff'});
    document=setStorefrontResponsiveVisibility(document,'reference-grid','desktop',true);
    document=setStorefrontResponsiveGridPlacement(document,'reference-grid','desktop',{span:8,order:2});
    document=setStorefrontResponsiveGridContainerLayout(document,'reference-grid','desktop',{columns:2,gap:'l',alignItems:'center'});
    document=moveStorefrontChildAtViewport(document,'reference-grid','desktop','reference-grid-right',0);

    const first=planStorefrontResponsiveInheritancePropagation({
      document,nodeId:'reference-grid',sourceViewport:'desktop',targetViewports:['tablet'],
      dimensions:STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS,
    });
    const second=planStorefrontResponsiveInheritancePropagation({
      document,nodeId:'reference-grid',sourceViewport:'desktop',targetViewports:['tablet'],
      dimensions:STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS,
    });
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);

    const next=applyStorefrontResponsiveInheritancePropagation(document,first);
    const tablet=inspectStorefrontResponsiveLayoutDepth(next,'reference-grid','tablet');
    const mobile=inspectStorefrontResponsiveLayoutDepth(next,'reference-grid','mobile');
    expect(tablet.visibility.direct).toBe(true);
    expect(tablet.gridPlacement.direct).toMatchObject({span:8,order:2});
    expect(tablet.container.direct).toMatchObject({columns:2,gap:'l',alignItems:'center'});
    expect(tablet.childOrder[0]).toBe('reference-grid-right');
    expect(mobile.visibility.direct).toBeNull();
    expect(mobile.gridPlacement.hasOverride).toBe(false);
    expect(mobile.container.hasOverride).toBe(false);
    const tabletStyle=(findNode(next,'reference-grid').config.style as {tablet?:Record<string,unknown>}).tablet!;
    expect(tabletStyle.backgroundColor).toBe('#ffffff');
  });

  it('propagates absent source intent as a dimension-local reset instead of freezing defaults',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontNodeViewportStyle(document,'reference-grid','mobile',{backgroundColor:'#f8fafc'});
    document=setStorefrontResponsiveVisibility(document,'reference-grid','mobile',true);
    document=setStorefrontResponsiveGridPlacement(document,'reference-grid','mobile',{span:7,order:3});
    document=setStorefrontResponsiveGridContainerLayout(document,'reference-grid','mobile',{columns:1,gap:'xl'});
    document=moveStorefrontChildAtViewport(document,'reference-grid','mobile','reference-grid-right',0);

    const plan=planStorefrontResponsiveInheritancePropagation({
      document,nodeId:'reference-grid',sourceViewport:'desktop',targetViewports:['mobile'],
      dimensions:STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS,
    });
    expect(plan.operations.every(operation=>operation.action==='reset')).toBe(true);
    const next=applyStorefrontResponsiveInheritancePropagation(document,plan);
    const state=inspectStorefrontResponsiveLayoutDepth(next,'reference-grid','mobile');
    expect(state.visibility.direct).toBeNull();
    expect(state.gridPlacement.hasOverride).toBe(false);
    expect(state.container.hasOverride).toBe(false);
    expect(state.childOrder).toEqual(['reference-grid-left','reference-grid-right']);
    const style=(findNode(next,'reference-grid').config.style as {mobile?:Record<string,unknown>}).mobile!;
    expect(style.backgroundColor).toBe('#f8fafc');
  });

  it('fails closed on stale source or target intent while ignoring unrelated style changes',()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontResponsiveVisibility(document,'reference-grid','desktop',true);
    const plan=planStorefrontResponsiveInheritancePropagation({
      document,nodeId:'reference-grid',sourceViewport:'desktop',targetViewports:['tablet'],
      dimensions:['visibility','container'],
    });
    const staleSource=setStorefrontResponsiveVisibility(document,'reference-grid','desktop',false);
    expect(()=>applyStorefrontResponsiveInheritancePropagation(staleSource,plan)).toThrow('RESPONSIVE_INHERITANCE_PLAN_STALE_SOURCE');

    const staleTarget=setStorefrontResponsiveGridContainerLayout(document,'reference-grid','tablet',{gap:'xl'});
    expect(()=>applyStorefrontResponsiveInheritancePropagation(staleTarget,plan)).toThrow('RESPONSIVE_INHERITANCE_PLAN_STALE_TARGET');

    const unrelated=setStorefrontNodeViewportStyle(document,'reference-grid','tablet',{backgroundColor:'#123456'});
    expect(()=>applyStorefrontResponsiveInheritancePropagation(unrelated,plan)).not.toThrow();
  });

  it('rejects ambiguous target and dimension plans plus tampered plan hashes',()=>{
    const document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    expect(()=>planStorefrontResponsiveInheritancePropagation({
      document,nodeId:'reference-grid',sourceViewport:'desktop',targetViewports:['desktop'],dimensions:['visibility'],
    })).toThrow('RESPONSIVE_INHERITANCE_SOURCE_TARGET_CONFLICT');
    expect(()=>planStorefrontResponsiveInheritancePropagation({
      document,nodeId:'reference-grid',sourceViewport:'desktop',targetViewports:['tablet','tablet'],dimensions:['visibility'],
    })).toThrow('RESPONSIVE_INHERITANCE_TARGET_DUPLICATE');
    expect(()=>planStorefrontResponsiveInheritancePropagation({
      document,nodeId:'reference-grid',sourceViewport:'desktop',targetViewports:['tablet'],dimensions:['visibility','visibility'],
    })).toThrow('RESPONSIVE_INHERITANCE_DIMENSION_DUPLICATE');

    const plan=structuredClone(planStorefrontResponsiveInheritancePropagation({
      document,nodeId:'reference-grid',sourceViewport:'desktop',targetViewports:['tablet'],dimensions:['visibility'],
    }));
    plan.hash='fnv1a32:00000000';
    expect(()=>applyStorefrontResponsiveInheritancePropagation(document,plan)).toThrow('RESPONSIVE_INHERITANCE_PLAN_HASH_INVALID');
  });

  it('keeps legacy cascade migration-only and the core intelligence persistence-free',()=>{
    const engine=read('src/lib/builder/storefront-responsive-layout-depth.ts');
    const runtime=read('src/lib/builder/storefront-runtime.ts');
    expect(engine).not.toContain('LegacyCascade');
    expect(runtime).toContain('resolveStorefrontResponsiveOverrideLegacyCascade');
    expect(engine).toContain('planStorefrontResponsiveInheritancePropagation');
    expect(engine).toContain('applyStorefrontResponsiveInheritancePropagation');
    expect(engine).not.toContain('publishVisualBuilderPageAction');
    expect(engine).not.toContain('saveVisualBuilderDraftAction');
    expect(engine).not.toContain('supabase');
  });

});
