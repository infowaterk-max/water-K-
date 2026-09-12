import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {resolveStorefrontStyleSlot} from '@/lib/builder/storefront-fidelity-engine';
import {sanitizeStorefrontVisualStyleSlot,type StorefrontVisualStyleSlot} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_FIDELITY_INTERACTION_STATE_VERSION='shoporation.visual-builder-interaction-state.v1' as const;
export const STOREFRONT_INTERACTION_STATES=['hover','focus','active','disabled'] as const;
export type StorefrontInteractionState=typeof STOREFRONT_INTERACTION_STATES[number];
export const STOREFRONT_INTERACTION_STYLE_PROPERTIES=[
  'backgroundColor','color','borderColor','boxShadow','opacity','transform','filter','textDecoration','fontWeight',
] as const;
export type StorefrontInteractionStyleProperty=typeof STOREFRONT_INTERACTION_STYLE_PROPERTIES[number];
export type StorefrontInteractionStyle=Partial<Pick<StorefrontVisualStyleSlot,StorefrontInteractionStyleProperty>>;

const SLOT_PATTERN=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const PROPERTY_SET=new Set<string>(STOREFRONT_INTERACTION_STYLE_PROPERTIES);
const upperFirst=(value:string)=>value?`${value[0].toUpperCase()}${value.slice(1)}`:value;

/**
 * Interaction states remain ordinary named styleSlots. The naming convention is
 * shared by Builder and Runtime so no second visual-state authority is created.
 */
export function storefrontInteractionSlotName(baseSlot:string,state:StorefrontInteractionState):string{
  if(!SLOT_PATTERN.test(baseSlot))throw new Error('FIDELITY_INTERACTION_BASE_SLOT_INVALID');
  return baseSlot==='root'?state:`${baseSlot}${upperFirst(state)}`;
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
