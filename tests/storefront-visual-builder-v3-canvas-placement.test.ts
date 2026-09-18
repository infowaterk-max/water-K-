import {describe,expect,it} from 'vitest';
import {resolveStorefrontBuilderCanvasPlacement} from '@/lib/builder/storefront-builder-canvas-placement';
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

  it('clamps malformed effective spans before applying them to the decorator wrapper',()=>{
    expect(resolveStorefrontBuilderCanvasPlacement(node({resolved:{hidden:false,gridSpan:99}}),'desktop').gridColumn).toBe('span 12 / span 12');
  });
});
