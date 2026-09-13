import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontPrimitiveRendererRegistry} from '@/components/builder/storefront-primitives';
import {
  STOREFRONT_NEUTRAL_REFERENCE_PAGE,
  createStorefrontPrimitiveComponentRegistry,
} from '@/lib/builder/storefront-primitives';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {
  resolveStorefrontInteractionStyle,
  sanitizeStorefrontInteractionStyle,
  storefrontInteractionSlotName,
} from '@/lib/builder/storefront-fidelity-interaction-state';

function findNode(nodes:readonly StorefrontComponentNode[],id:string):StorefrontComponentNode{
  for(const node of nodes){
    if(node.id===id)return node;
    if(node.children?.length){
      try{return findNode(node.children,id);}catch{}
    }
  }
  throw new Error(`NODE_NOT_FOUND:${id}`);
}

describe('Visual Builder interaction state engine',()=>{
  it('uses one deterministic style-slot naming convention and filters state properties',()=>{
    expect(storefrontInteractionSlotName('root','hover')).toBe('hover');
    expect(storefrontInteractionSlotName('item','focus')).toBe('itemFocus');
    expect(sanitizeStorefrontInteractionStyle({backgroundColor:'#123456',transform:'translateY(-2px)',position:'fixed'})).toEqual({backgroundColor:'#123456',transform:'translateY(-2px)'});
    expect(()=>storefrontInteractionSlotName('bad slot','hover')).toThrow('FIDELITY_INTERACTION_BASE_SLOT_INVALID');
  });

  it('resolves viewport inheritance through the existing styleSlots authority',()=>{
    const slots={itemHover:{base:{color:'#111111'},desktop:{backgroundColor:'#eeeeee'},mobile:{color:'#222222'}}};
    expect(resolveStorefrontInteractionStyle(slots,'item','hover','tablet')).toEqual({color:'#111111',backgroundColor:'#eeeeee'});
    expect(resolveStorefrontInteractionStyle(slots,'item','hover','mobile')).toEqual({color:'#222222',backgroundColor:'#eeeeee'});
  });

  it('renders button and navigation interaction variables without duplicating runtime state',()=>{
    const page=structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const button=findNode(page.sections,'reference-cta');
    button.config={...button.config,styleSlots:{
      hover:{desktop:{backgroundColor:'#0055aa',color:'#ffffff',position:'fixed'}},
      focus:{desktop:{boxShadow:'0 0 0 3px #88bbff'}},
      active:{desktop:{transform:'translateY(1px)'}},
    }};
    const navigation=findNode(page.sections,'reference-navigation');
    navigation.config={...navigation.config,styleSlots:{
      itemHover:{desktop:{color:'#006644',textDecoration:'underline'}},
      itemFocus:{desktop:{boxShadow:'0 0 0 2px #00aa88'}},
    }};
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
      page={page}
      viewport="desktop"
      bindingContext={{brand:{name:'Shoporation'},navigation:{primary:[{label:'Katalógus',href:'/webaruhaz'}]}}}
      componentRegistry={createStorefrontPrimitiveComponentRegistry()}
      rendererRegistry={createStorefrontPrimitiveRendererRegistry()}
    />);
    expect(html).toContain('--shoporation-interaction-hover-background-color:#0055aa');
    expect(html).toContain('--shoporation-interaction-focus-box-shadow:0 0 0 3px #88bbff');
    expect(html).toContain('--shoporation-interaction-active-transform:translateY(1px)');
    expect(html).toContain('--shoporation-interaction-hover-color:#006644');
    expect(html).toContain('--shoporation-interaction-hover-text-decoration:underline');
    expect(html).not.toContain('position:fixed');
  });
});
