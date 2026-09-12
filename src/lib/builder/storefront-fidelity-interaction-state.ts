import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {resolveStorefrontStyleSlot} from '@/lib/builder/storefront-fidelity-engine';
import {sanitizeStorefrontVisualStyleSlot,type StorefrontVisualStyleSlot} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_FIDELITY_INTERACTION_STATE_VERSION='shoporation.visual-builder-interaction-state.v2' as const;
export const STOREFRONT_INTERACTION_STATES=['hover','focus','active','disabled'] as const;
export type StorefrontInteractionState=typeof STOREFRONT_INTERACTION_STATES[number];
export const STOREFRONT_INTERACTION_STYLE_PROPERTIES=[
  'backgroundColor','color','borderColor','boxShadow','opacity','transform','filter','textDecoration','fontWeight',
] as const;
export type StorefrontInteractionStyleProperty=typeof STOREFRONT_INTERACTION_STYLE_PROPERTIES[number];
export type StorefrontInteractionStyle=Partial<Pick<StorefrontVisualStyleSlot,StorefrontInteractionStyleProperty>>;
export type StorefrontInteractionTarget={slot:string;label:string;runtime:'renderer'|'descendants'};

const SLOT_PATTERN=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const PROPERTY_SET=new Set<string>(STOREFRONT_INTERACTION_STYLE_PROPERTIES);
const upperFirst=(value:string)=>value?`${value[0].toUpperCase()}${value.slice(1)}`:value;
const TARGETS:Readonly<Record<string,readonly StorefrontInteractionTarget[]>>=Object.freeze({
  'content.button':Object.freeze([{slot:'root',label:'Gomb',runtime:'renderer'}]),
  'system.navigation':Object.freeze([{slot:'item',label:'Navigációs link',runtime:'renderer'}]),
  'system.header':Object.freeze([{slot:'brand',label:'Márkalink',runtime:'renderer'},{slot:'utilityItem',label:'Gyorsművelet',runtime:'renderer'}]),
  'commerce.collection-navigation':Object.freeze([{slot:'card',label:'Kollekciókártya',runtime:'descendants'}]),
  'commerce.product-grid':Object.freeze([{slot:'cardLink',label:'Termékkártya link',runtime:'descendants'}]),
  'commerce.product-gallery':Object.freeze([{slot:'thumbnail',label:'Galéria thumbnail',runtime:'descendants'}]),
  'commerce.variant-swatches':Object.freeze([{slot:'option',label:'Variáns opció',runtime:'descendants'}]),
  'commerce.content-tabs':Object.freeze([{slot:'tab',label:'Tartalmi tab',runtime:'descendants'}]),
  'commerce.recommendation-row':Object.freeze([{slot:'cardLink',label:'Ajánláskártya link',runtime:'descendants'}]),
  'commerce.cart-summary':Object.freeze([{slot:'checkout',label:'Checkout CTA',runtime:'descendants'}]),
});

/** Interaction states remain ordinary named styleSlots, shared by Builder and Runtime. */
export function storefrontInteractionSlotName(baseSlot:string,state:StorefrontInteractionState):string{
  if(!SLOT_PATTERN.test(baseSlot))throw new Error('FIDELITY_INTERACTION_BASE_SLOT_INVALID');
  return baseSlot==='root'?state:`${baseSlot}${upperFirst(state)}`;
}

export function storefrontInteractionTargetsForComponent(componentKey:string):readonly StorefrontInteractionTarget[]{
  return TARGETS[componentKey]??[];
}

export function sanitizeStorefrontInteractionStyle(value:unknown):StorefrontInteractionStyle{
  const sanitized=sanitizeStorefrontVisualStyleSlot(value);
  const result:StorefrontInteractionStyle={};
  for(const[property,raw]of Object.entries(sanitized)){
    if(!PROPERTY_SET.has(property))continue;
    (result as Record<string,string|number>)[property]=raw;
  }
  return result;
}

export function resolveStorefrontInteractionStyle(
  styleSlots:unknown,
  baseSlot:string,
  state:StorefrontInteractionState,
  viewport:StorefrontViewport,
):StorefrontInteractionStyle{
  return sanitizeStorefrontInteractionStyle(resolveStorefrontStyleSlot(styleSlots,storefrontInteractionSlotName(baseSlot,state),viewport));
}
