import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  gridTrackTemplateFromWeights,
  inspectStorefrontCustomGridTracks,
  inspectStorefrontGridPlacement,
  resetStorefrontResponsiveGridPlacement,
  setStorefrontCustomGridTracks,
  setStorefrontResponsiveGridPlacement,
} from '@/lib/builder/storefront-fidelity-layout';
import {resolveStorefrontResponsiveOverride} from '@/lib/builder/storefront-runtime';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';

const page=():StorefrontPageDocument=>({
  schemaVersion:1,pageKey:'layout.home',pageType:'home',templateKey:'reference.layout',templateVersion:1,
  sections:[{id:'section',componentKey:'layout.section',componentVersion:1,config:{spacing:'l'},children:[
    {id:'grid',componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap:'m'},children:[
      {id:'item',componentKey:'content.text',componentVersion:1,config:{text:'Grid elem'},responsive:{desktop:{gridSpan:8}}},
    ]},
  ]}],
});

describe('Storefront Fidelity responsive layout operations',()=>{
  it('uses canonical responsive gridSpan plus allowlisted style for start/end/order/alignment',()=>{
    const source=page();
    const next=setStorefrontResponsiveGridPlacement(source,'item','tablet',{span:6,start:2,end:8,order:3,alignSelf:'center',justifySelf:'end'});
    const item=next.sections[0].children?.[0]?.children?.[0];if(!item)throw new Error('ITEM_MISSING');
    expect(item.responsive?.tablet?.gridSpan).toBe(6);
    expect(resolveStorefrontResponsiveOverride(item,'tablet').gridSpan).toBe(6);
    expect(resolveStorefrontVisualStyle(item.config.style,'tablet')).toMatchObject({gridColumn:'2 / 8',order:3,alignSelf:'center',justifySelf:'end'});
    expect(source.sections[0].children?.[0]?.children?.[0]?.responsive?.tablet).toBeUndefined();
  });

  it('keeps breakpoint inheritance and can reset only the direct viewport override',()=>{
    const first=setStorefrontResponsiveGridPlacement(page(),'item','tablet',{span:5,order:2});
    const second=setStorefrontResponsiveGridPlacement(first,'item','mobile',{span:12,order:7});
    expect(inspectStorefrontGridPlacement(second,'item','mobile').hasOverride).toBe(true);
    const reset=resetStorefrontResponsiveGridPlacement(second,'item','mobile');
    const item=reset.sections[0].children?.[0]?.children?.[0];if(!item)throw new Error('ITEM_MISSING');
    expect(inspectStorefrontGridPlacement(reset,'item','mobile').hasOverride).toBe(false);
    expect(resolveStorefrontResponsiveOverride(item,'mobile').gridSpan).toBe(5);
    expect(resolveStorefrontVisualStyle(item.config.style,'mobile').order).toBe(2);
  });

  it('generates bounded custom tracks without accepting raw CSS',()=>{
    expect(gridTrackTemplateFromWeights([2,1,1])).toBe('minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)');
    const next=setStorefrontCustomGridTracks(page(),'grid','desktop',[2,1,1]);
    const inspected=inspectStorefrontCustomGridTracks(next,'grid','desktop');
    expect(inspected).toEqual({hasOverride:true,weights:[2,1,1]});
    const grid=next.sections[0].children?.[0];if(!grid)throw new Error('GRID_MISSING');
    expect(resolveStorefrontVisualStyle(grid.config.style,'desktop').gridTemplateColumns).toBe('minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)');
    expect(()=>gridTrackTemplateFromWeights([0.1])).toThrow('FIDELITY_GRID_TRACK_WEIGHT_INVALID');
    expect(()=>setStorefrontCustomGridTracks(page(),'item','desktop',[1,1])).toThrow('FIDELITY_CUSTOM_TRACKS_GRID_REQUIRED');
  });
});
