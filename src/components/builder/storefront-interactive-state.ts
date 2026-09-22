import {Children,cloneElement,isValidElement,type CSSProperties,type ReactElement,type ReactNode} from 'react';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_INTERACTION_STATES,
  STOREFRONT_INTERACTION_STYLE_PROPERTIES,
  resolveStorefrontInteractionStyle,
  storefrontInteractionTargetsForComponent,
  type StorefrontInteractionState,
  type StorefrontInteractionStyleProperty,
  type StorefrontInteractionTarget,
} from '@/lib/builder/storefront-fidelity-interaction-state';
import styles from './storefront-interactive-state.module.css';

export const STOREFRONT_INTERACTIVE_STATE_RENDERER_VERSION='shoporation.storefront-interactive-state.v2' as const;

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

function isInteractiveElement(element:ReactElement<Record<string,unknown>>){
  const tag=typeof element.type==='string'?element.type:'';
  return tag==='a'||tag==='button'||element.props['aria-disabled']===true;
}

function decorateDescendants(node:ReactNode,target:StorefrontInteractionTarget,styleSlots:unknown,viewport:StorefrontViewport):ReactNode{
  if(!isValidElement(node))return node;
  const element=node as ReactElement<Record<string,unknown>>;
  const existingChildren=element.props.children as ReactNode;
  const children=existingChildren===undefined?undefined:Children.map(existingChildren,child=>decorateDescendants(child,target,styleSlots,viewport));
  const patch:Record<string,unknown>={};
  if(children!==undefined)patch.children=children;
  if(isInteractiveElement(element)){
    const interaction=storefrontInteractiveStateProps(styleSlots,viewport,target.slot);
    const currentClass=typeof element.props.className==='string'?element.props.className:'';
    patch.className=[currentClass,interaction.className].filter(Boolean).join(' ')||undefined;
    const currentStyle=element.props.style&&typeof element.props.style==='object'?element.props.style as CSSProperties:{};
    patch.style={...currentStyle,...interaction.style};
  }
  return cloneElement(element,patch);
}

/**
 * Commerce renderers remain unchanged: their already-rendered interactive descendants
 * receive state variables here from the same styleSlots contract. Component families
 * with renderer-level handling are intentionally skipped to avoid double decoration.
 */
export function decorateStorefrontInteractiveStateTree(componentKey:string,rendered:ReactNode,styleSlots:unknown,viewport:StorefrontViewport):ReactNode{
  const targets=storefrontInteractionTargetsForComponent(componentKey).filter(target=>target.runtime==='descendants');
  return targets.reduce<ReactNode>((current,target)=>decorateDescendants(current,target,styleSlots,viewport),rendered);
}
