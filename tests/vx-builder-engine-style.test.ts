import {describe,expect,it} from 'vitest';
import {
  EMPTY_VX_ENGINE_STYLE_STATE,
  VX_ENGINE_COLOR_TOKEN_KEYS,
  VX_ENGINE_STYLE_CONFIG_KEY,
  VX_ENGINE_STYLE_VERSION,
  parseVxEngineStyleState,
  parseVxEngineStyleTokens,
  readVxEngineStyleFromConfig,
  resolveVxEngineStyleCssVariables,
  writeVxEngineStyleToConfig,
} from '@/lib/builder/vx-builder-engine-style';
import {STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-guided-finder';
import {STOREFRONT_MULTI_PRODUCT_COMPOSER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-multi-product-composer';
import {STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-configurator';
import {STOREFRONT_INTERACTIVE_SCENE_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-interactive-scene';
import {STOREFRONT_RECIPE_COMMERCE_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-recipe-commerce';
import {STOREFRONT_RELEASE_COMMERCE_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-release-commerce';

describe('VX universal engine style contract',()=>{
  it('inherits Template DNA by emitting no local override for absent style state',()=>{
    expect(readVxEngineStyleFromConfig({})).toEqual(EMPTY_VX_ENGINE_STYLE_STATE);
    expect(resolveVxEngineStyleCssVariables(undefined)).toEqual({});
  });

  it('accepts bounded semantic colors and normalizes hex case',()=>{
    const state={version:VX_ENGINE_STYLE_VERSION,tokens:{surface:'#F0E1D2',accent:'#AA33CC'}};
    expect(parseVxEngineStyleState(state)).toEqual({version:VX_ENGINE_STYLE_VERSION,tokens:{surface:'#f0e1d2',accent:'#aa33cc'}});
    expect(resolveVxEngineStyleCssVariables(state)).toEqual({
      '--shoporation-color-surface':'#f0e1d2',
      '--shoporation-color-accent':'#aa33cc',
    });
  });

  it('fails closed for unknown keys and non-hex CSS expressions',()=>{
    expect(()=>parseVxEngineStyleTokens({position:'#000000'})).toThrow('VX_ENGINE_STYLE_TOKEN_UNKNOWN');
    expect(()=>parseVxEngineStyleTokens({accent:'rgb(1,2,3)'})).toThrow('VX_ENGINE_STYLE_COLOR_INVALID:accent');
    expect(()=>parseVxEngineStyleTokens({accent:'var(--evil)'})).toThrow('VX_ENGINE_STYLE_COLOR_INVALID:accent');
    expect(()=>parseVxEngineStyleTokens({accent:'#fff'})).toThrow('VX_ENGINE_STYLE_COLOR_INVALID:accent');
    expect(()=>parseVxEngineStyleState({version:VX_ENGINE_STYLE_VERSION,tokens:{},rawCss:'x'})).toThrow('VX_ENGINE_STYLE_STATE_KEY_UNKNOWN');
  });

  it('supports partial local overrides without resetting inherited tokens',()=>{
    const config=writeVxEngineStyleToConfig({title:'Engine'},{accent:'#123456'});
    expect(config[VX_ENGINE_STYLE_CONFIG_KEY]).toEqual({version:VX_ENGINE_STYLE_VERSION,tokens:{accent:'#123456'}});
    expect(resolveVxEngineStyleCssVariables(config[VX_ENGINE_STYLE_CONFIG_KEY])).toEqual({'--shoporation-color-accent':'#123456'});
    expect(writeVxEngineStyleToConfig(config,{})).toEqual({title:'Engine'});
  });

  it('keeps the color vocabulary finite',()=>{
    expect(VX_ENGINE_COLOR_TOKEN_KEYS).toHaveLength(11);
    expect(new Set(VX_ENGINE_COLOR_TOKEN_KEYS).size).toBe(VX_ENGINE_COLOR_TOKEN_KEYS.length);
  });

  it('gives every shared engine family the same engineStyle config seam',()=>{
    const definitions=[
      ...STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS,
      ...STOREFRONT_MULTI_PRODUCT_COMPOSER_COMPONENT_DEFINITIONS,
      ...STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS,
      ...STOREFRONT_INTERACTIVE_SCENE_COMPONENT_DEFINITIONS,
      ...STOREFRONT_RECIPE_COMMERCE_COMPONENT_DEFINITIONS,
      ...STOREFRONT_RELEASE_COMMERCE_COMPONENT_DEFINITIONS,
    ];
    for(const definition of definitions){
      expect(definition.manifest.configurable,definition.manifest.componentKey).toContain(VX_ENGINE_STYLE_CONFIG_KEY);
    }
    const scene=STOREFRONT_INTERACTIVE_SCENE_COMPONENT_DEFINITIONS.find(item=>item.manifest.componentKey==='commerce.interactive-scene')!;
    expect(scene.manifest.capability).toEqual({minPlan:'pro',features:['catalog','interactiveSceneCommerce']});
  });
});
