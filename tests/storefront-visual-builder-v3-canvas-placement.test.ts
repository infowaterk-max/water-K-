import {describe,expect,it} from 'vitest';
import {
  isStorefrontBuilderAbsolutePlacement,
  resolveStorefrontBuilderCanvasPlacement,
  shouldStretchStorefrontBuilderGridChild,
} from '@/lib/builder/storefront-builder-canvas-placement';
import {resolveStorefrontBuilderCanvasFrameGeometry,resolveStorefrontBuilderFitZoom} from '@/lib/builder/storefront-builder-canvas-geometry';
import type {StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';

const node=(input:Partial<StorefrontResolvedComponentNode>={}):StorefrontResolvedComponentNode=>({
  id:'builder-grid-node',
  componentKey:'layout.stack',
  componentVersion:1,
  config:{},
  children:[],
  resolved:{hidden:false,gridSpan:7},
  ...input,
});

describe('Visual Builder canvas placement wrapper',()=>{
  it('preserves the effective runtime grid span on the Builder selection wrapper',()=>{
    expect(resolveStorefrontBuilderCanvasPlacement(node(),'desktop')).toEqual({
      gridColumn:'span 7 / span 7',
      minWidth:0,
    });
  });

  it('preserves explicit viewport grid placement authority instead of collapsing to one grid track',()=>{
    const resolved=node({
      config:{
        style:{
          base:{gridColumn:'1 / span 6',order:1},
          desktop:{gridColumn:'2 / span 7',gridRow:'3',order:4,alignSelf:'center',justifySelf:'end'},
        },
      },
    });
    expect(resolveStorefrontBuilderCanvasPlacement(resolved,'desktop')).toMatchObject({
      gridColumn:'2 / span 7',
      gridRow:'3',
      order:4,
      alignSelf:'center',
      justifySelf:'end',
      minWidth:0,
    });
  });

  it('moves absolute placement geometry onto the Builder decorator wrapper',()=>{
    const resolved=node({
      componentKey:'content.image',
      config:{
        style:{
          base:{
            position:'absolute',
            right:'0',
            top:'0',
            width:'54%',
            height:'100%',
            zIndex:2,
          },
        },
      },
    });
    const placement=resolveStorefrontBuilderCanvasPlacement(resolved,'desktop');
    expect(placement).toMatchObject({
      position:'absolute',
      right:'0',
      top:'0',
      width:'54%',
      height:'100%',
      zIndex:2,
      minWidth:0,
    });
    expect(isStorefrontBuilderAbsolutePlacement(placement)).toBe(true);
  });

  it('preserves runtime grid stretch semantics through the Builder decorator wrapper',()=>{
    const stretchParent=node({componentKey:'layout.grid',config:{}});
    const startParent=node({componentKey:'layout.grid',config:{align:'start'}});
    const visualOverride=node({componentKey:'layout.grid',config:{align:'start',style:{base:{alignItems:'stretch'}}}});
    expect(shouldStretchStorefrontBuilderGridChild(stretchParent,'desktop')).toBe(true);
    expect(shouldStretchStorefrontBuilderGridChild(startParent,'desktop')).toBe(false);
    expect(shouldStretchStorefrontBuilderGridChild(visualOverride,'desktop')).toBe(true);
    expect(shouldStretchStorefrontBuilderGridChild(node({componentKey:'layout.stack'}),'desktop')).toBe(false);
  });

  it('keeps canonical viewport width while zoom only scales its presentation',()=>{
    expect(resolveStorefrontBuilderCanvasFrameGeometry(1200,60)).toEqual({
      width:'1200px',
      scaledWidth:'720px',
      scale:0.6,
      transform:'scale(0.6)',
    });
    expect(resolveStorefrontBuilderCanvasFrameGeometry(768,100)).toEqual({
      width:'768px',
      scaledWidth:'768px',
      scale:1,
      transform:'scale(1)',
    });
    expect(resolveStorefrontBuilderCanvasFrameGeometry(390,130)).toEqual({
      width:'390px',
      scaledWidth:'507px',
      scale:1.3,
      transform:'scale(1.3)',
    });
  });

  it('fits canonical viewport width to the real available canvas width without changing runtime geometry',()=>{
    expect(resolveStorefrontBuilderFitZoom(1200,660)).toBe(55);
    expect(resolveStorefrontBuilderFitZoom(1200,720)).toBe(60);
    expect(resolveStorefrontBuilderFitZoom(768,660)).toBe(85);
    expect(resolveStorefrontBuilderFitZoom(390,660)).toBe(100);
  });
});
