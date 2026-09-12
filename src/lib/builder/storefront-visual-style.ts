import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';

export const STOREFRONT_VISUAL_STYLE_VERSION='shoporation.storefront-visual-style.v1' as const;

export type StorefrontVisualStyleValue=string|number;
export type StorefrontVisualStyleSlot=Record<string,StorefrontVisualStyleValue>;
export type StorefrontVisualStyleConfig={
  base?:StorefrontVisualStyleSlot;
  desktop?:StorefrontVisualStyleSlot;
  tablet?:StorefrontVisualStyleSlot;
  mobile?:StorefrontVisualStyleSlot;
};

const STYLE_PROPERTIES=new Set([
  'width','minWidth','maxWidth','height','minHeight','maxHeight',
  'padding','paddingBlock','paddingInline','paddingTop','paddingRight','paddingBottom','paddingLeft',
  'margin','marginBlock','marginInline','marginTop','marginRight','marginBottom','marginLeft',
  'gap','rowGap','columnGap',
  'display','position','top','right','bottom','left','inset','zIndex','overflow','overflowX','overflowY','visibility','isolation','boxSizing',
  'background','backgroundColor','color','opacity',
  'border','borderTop','borderRight','borderBottom','borderLeft','borderWidth','borderStyle','borderColor','borderRadius','boxShadow',
  'fontFamily','fontSize','fontWeight','fontStyle','fontStretch','lineHeight','letterSpacing','textTransform','textAlign','textWrap','whiteSpace','textDecoration','textOverflow',
  'gridTemplateColumns','gridTemplateRows','gridColumn','gridRow','gridAutoFlow','alignItems','justifyItems','placeItems','alignContent','justifyContent','placeContent','alignSelf','justifySelf',
  'flex','flexBasis','flexGrow','flexShrink','flexDirection','flexWrap','order',
  'aspectRatio','objectFit','objectPosition',
  'transform','transformOrigin','filter','backdropFilter','mixBlendMode','pointerEvents',
]);
const SLOT_KEYS=['base','desktop','tablet','mobile'] as const;
const UNSAFE_VALUE=/(?:url\s*\(|expression\s*\(|javascript:|@import|[;{}<>])/i;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function safeStyleValue(property:string,value:unknown):StorefrontVisualStyleValue|undefined{
  if(typeof value==='number')return Number.isFinite(value)?value:undefined;
  if(typeof value!=='string')return undefined;
  const normalized=value.trim();
  if(!normalized||normalized.length>240||UNSAFE_VALUE.test(normalized))return undefined;
  if(property==='position'&&normalized.toLowerCase()==='fixed')return undefined;
  return normalized;
}

export function sanitizeStorefrontVisualStyleSlot(value:unknown):StorefrontVisualStyleSlot{
  if(!isRecord(value))return{};
  const result:StorefrontVisualStyleSlot={};
  for(const[property,raw]of Object.entries(value)){
    if(!STYLE_PROPERTIES.has(property))continue;
    const next=safeStyleValue(property,raw);
    if(next!==undefined)result[property]=next;
  }
  return result;
}

/**
 * Visual style is deliberately allowlisted and breakpoint-aware. Desktop values
 * inherit from base, tablet inherits desktop, and mobile inherits tablet. A flat
 * style object is accepted as a base style for migration/backward convenience.
 */
export function resolveStorefrontVisualStyle(value:unknown,viewport:StorefrontViewport):StorefrontVisualStyleSlot{
  if(!isRecord(value))return{};
  const usesSlots=SLOT_KEYS.some(key=>Object.prototype.hasOwnProperty.call(value,key));
  if(!usesSlots)return sanitizeStorefrontVisualStyleSlot(value);
  const base=sanitizeStorefrontVisualStyleSlot(value.base);
  const desktop={...base,...sanitizeStorefrontVisualStyleSlot(value.desktop)};
  const tablet={...desktop,...sanitizeStorefrontVisualStyleSlot(value.tablet)};
  const mobile={...tablet,...sanitizeStorefrontVisualStyleSlot(value.mobile)};
  return viewport==='desktop'?desktop:viewport==='tablet'?tablet:mobile;
}

export function inspectStorefrontVisualStyle(value:unknown):{ok:boolean;issues:string[]}{
  if(!isRecord(value))return{ok:false,issues:['STYLE_OBJECT_REQUIRED']};
  const usesSlots=SLOT_KEYS.some(key=>Object.prototype.hasOwnProperty.call(value,key));
  const candidates=usesSlots?SLOT_KEYS.flatMap(slot=>isRecord(value[slot])?Object.entries(value[slot] as Record<string,unknown>).map(([property,raw])=>({slot,property,raw})):[]):Object.entries(value).map(([property,raw])=>({slot:'base',property,raw}));
  const issues:string[]=[];
  for(const{slot,property,raw}of candidates){
    if(!STYLE_PROPERTIES.has(property)){issues.push(`STYLE_PROPERTY_NOT_ALLOWED:${slot}.${property}`);continue;}
    if(safeStyleValue(property,raw)===undefined)issues.push(`STYLE_VALUE_NOT_ALLOWED:${slot}.${property}`);
  }
  return{ok:issues.length===0,issues};
}

export const STOREFRONT_VISUAL_STYLE_PROPERTIES=Object.freeze([...STYLE_PROPERTIES]);