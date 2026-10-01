import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {applyVxEngineStyleToRenderedRoot} from '@/components/builder/storefront-runtime-renderer';
import {VX_ENGINE_STYLE_VERSION} from '@/lib/builder/vx-builder-engine-style';

describe('VX engine style runtime scoping',()=>{
  it('is a strict no-op when no local style is configured',()=>{
    const root=createElement('section',{style:{display:'grid'},'data-test-root':'true'},'Engine');
    expect(applyVxEngineStyleToRenderedRoot(root,undefined)).toBe(root);
  });

  it('merges local semantic CSS variables onto the existing root without a wrapper',()=>{
    const root=createElement('section',{style:{display:'grid',gridColumn:'span 6 / span 6'},'data-test-root':'true'},'Engine');
    const decorated=applyVxEngineStyleToRenderedRoot(root,{
      version:VX_ENGINE_STYLE_VERSION,
      tokens:{accent:'#AA33CC',surface:'#F0E1D2'},
    });
    const html=renderToStaticMarkup(decorated);
    expect(html.match(/<section/g)).toHaveLength(1);
    expect(html).toContain('data-test-root="true"');
    expect(html).toContain('data-vx-engine-style="local"');
    expect(html).toContain('display:grid');
    expect(html).toContain('grid-column:span 6 / span 6');
    expect(html).toContain('--shoporation-color-accent:#aa33cc');
    expect(html).toContain('--shoporation-color-surface:#f0e1d2');
  });

  it('keeps sibling overrides isolated',()=>{
    const first=applyVxEngineStyleToRenderedRoot(createElement('section',null,'A'),{
      version:VX_ENGINE_STYLE_VERSION,tokens:{accent:'#111111'},
    });
    const second=applyVxEngineStyleToRenderedRoot(createElement('section',null,'B'),{
      version:VX_ENGINE_STYLE_VERSION,tokens:{accent:'#eeeeee'},
    });
    const html=renderToStaticMarkup(createElement('main',null,first,second));
    expect(html).toContain('<section style="--shoporation-color-accent:#111111"');
    expect(html).toContain('<section style="--shoporation-color-accent:#eeeeee"');
    expect(html.match(/data-vx-engine-style="local"/g)).toHaveLength(2);
  });

  it('fails closed for malformed engine style state',()=>{
    const root=createElement('section',null,'Engine');
    expect(()=>applyVxEngineStyleToRenderedRoot(root,{version:VX_ENGINE_STYLE_VERSION,tokens:{accent:'red'}})).toThrow('VX_ENGINE_STYLE_COLOR_INVALID:accent');
  });

  it('fails closed rather than wrapping a non-element render root',()=>{
    expect(()=>applyVxEngineStyleToRenderedRoot('plain text',{version:VX_ENGINE_STYLE_VERSION,tokens:{accent:'#123456'}})).toThrow('VX_ENGINE_STYLE_RENDER_ROOT_INVALID');
  });
});
