import type {CSSProperties} from 'react';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_INTERACTION_STATES,
  STOREFRONT_INTERACTION_STYLE_PROPERTIES,
  resolveStorefrontInteractionStyle,
  type StorefrontInteractionState,
  type StorefrontInteractionStyleProperty,
} from '@/lib/builder/storefront-fidelity-interaction-state';
import styles from './storefront-interactive-state.module.css';

export const STOREFRONT_INTERACTIVE_STATE_RENDERER_VERSION='shoporation.storefront-interactive-state.v1' as const;

type InteractionInlineStyle=CSSProperties&Record<string,string|number>;
const kebab=(value:string)=>value.replace(/[A-Z]/g,match=>`-${match.toLowerCase()}`);
const className=(state:StorefrontInteractionState,property:StorefrontInteractionStyleProperty)=>styles[`${state}${property[0].toUpperCase()}${property.slice(1)}` as keyof typeof styles] as string|undefined;

export function storefrontInteractiveStateProps(styleSlots:unknown,viewport:StorefrontViewport,baseSlot='root'):{className?:string;style:InteractionInlineStyle}{
  const classes=[styles.interactive];
  const inline={} as InteractionInlineStyle;
  for(const state of STOREFRONT_INTERACTION_STATES){
    const resolved=resolveStorefrontInteractionStyle(styleSlots,baseSlot,state,viewport);
    for(const property of STOREFRONT_INTERACTION_STYLE_PROPERTIES){
      const value=resolved[property];
      if(value===undefined)continue;
      inline[`--shoporation-interaction-${state}-${kebab(property)}`]=value;
      const nextClass=className(state,property);
      if(nextClass)classes.push(nextClass);
    }
  }
  return{className:[...new Set(classes.filter(Boolean))].join(' ')||undefined,style:inline};
}
