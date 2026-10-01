import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {VX_ENGINE_STYLE_CONFIG_KEY,VX_ENGINE_STYLE_VERSION,parseVxEngineStyleState} from '@/lib/builder/vx-builder-engine-style';

const root=process.cwd();
const source=readFileSync(resolve(root,'src/components/admin/storefront-visual-builder-v3.tsx'),'utf8');
const css=readFileSync(resolve(root,'src/components/admin/storefront-visual-builder-v3.module.css'),'utf8');

describe('VX engine style Inspector',()=>{
  it('uses the existing shared engineStyle contract instead of a parallel style authority',()=>{
    expect(source).toContain("VX_ENGINE_STYLE_CONFIG_KEY");
    expect(source).toContain("parseVxEngineStyleState");
    expect(source).toContain("allConfigurable.includes(VX_ENGINE_STYLE_CONFIG_KEY)");
    expect(source).toContain("setMerchantConfig(VX_ENGINE_STYLE_CONFIG_KEY,value)");
    expect(source).toContain("DELEGATED_KEYS=new Set");
    expect(source).toContain("VX_ENGINE_STYLE_CONFIG_KEY]);");
    expect(VX_ENGINE_STYLE_CONFIG_KEY).toBe('engineStyle');
  });

  it('keeps normal mode focused on six common colors with five more behind disclosure',()=>{
    expect(source).toContain("ENGINE_STYLE_COMMON_KEYS:readonly VxEngineColorTokenKey[]=['background','surface','text','primary','primaryContrast','accent']");
    expect(source).toContain("ENGINE_STYLE_MORE_KEYS:readonly VxEngineColorTokenKey[]=['surfaceMuted','mutedText','border','accentSecondary','accentTertiary']");
    expect(source).toContain('Motor színei');
    expect(source).toContain('További színek');
    expect(source).toContain('Sablonból örökölt');
    expect(source).toContain('Template DNA');
    expect(source).toContain('type="color"');
    expect(source).toContain("querySelector<HTMLElement>('[data-storefront-global-styles-v1]')");
    expect(source).toContain('resolveStorefrontGlobalStyleCssVariables(document)');
    expect(source).toContain('resolveInheritedColor={resolveEngineInheritedColor}');
    expect(source).not.toContain('getComputedStyle(rootRef.current)');
  });

  it('keeps reset state shape-compatible and preserves partial inheritance semantics',()=>{
    const reset=parseVxEngineStyleState({version:VX_ENGINE_STYLE_VERSION,tokens:{}});
    expect(reset).toEqual({version:VX_ENGINE_STYLE_VERSION,tokens:{}});
    const partial=parseVxEngineStyleState({version:VX_ENGINE_STYLE_VERSION,tokens:{accent:'#123456'}});
    expect(partial.tokens).toEqual({accent:'#123456'});
    expect(source).toContain("delete next[key];commit(next)");
    expect(source).toContain("Minden szín öröklése");
    expect(source).toContain("onClick={()=>commit({})}");
    expect(source).not.toContain("setMerchantConfig(VX_ENGINE_STYLE_CONFIG_KEY,null)");
  });

  it('keeps raw CSS and business-state editing out of the engine color UI',()=>{
    expect(source).not.toContain('Motor CSS');
    expect(source).not.toContain('Egyedi CSS');
    expect(source).not.toContain('engineStyle.rawCss');
    expect(source).not.toContain('engineStyle.bindings');
    expect(source).not.toContain('engineStyle.capability');
  });

  it('provides a compact mobile layout without horizontal color-control overflow',()=>{
    expect(css).toContain('.engineColorRow{display:grid');
    expect(css).toContain('@media(max-width:820px){.engineColorRow{grid-template-columns:28px minmax(0,1fr) 34px}');
    expect(css).toContain('.engineOwnColorButton{grid-column:2/4;width:100%}');
    expect(css).not.toContain('.engineColorList{overflow-x:auto');
  });
});
