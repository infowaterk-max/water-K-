import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontVisualStyleSlot} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_FIDELITY_TYPOGRAPHY_VERSION='shoporation.visual-builder-fidelity-typography.v1' as const;

export const STOREFRONT_TYPOGRAPHY_FONT_TOKENS=['inherit','body','heading','display','brand','mono'] as const;
export type StorefrontTypographyFontToken=typeof STOREFRONT_TYPOGRAPHY_FONT_TOKENS[number];
export type StorefrontTypographyAlign='left'|'center'|'right';
export type StorefrontTypographyTransform='none'|'uppercase'|'lowercase'|'capitalize';
export type StorefrontTypographyWrap='normal'|'balance'|'pretty';

export type StorefrontTypographyValue={
  fontToken?:StorefrontTypographyFontToken;
  fontSizeRem?:number;
  fluidSize?:{minRem:number;maxRem:number;preferredVw:number};
  fontWeight?:number;
  fontStyle?:'normal'|'italic';
  lineHeight?:number;
  letterSpacingEm?:number;
  textTransform?:StorefrontTypographyTransform;
  textAlign?:StorefrontTypographyAlign;
  textWrap?:StorefrontTypographyWrap;
  maxWidthCh?:number;
  preserveLineBreaks?:boolean;
};

export type StorefrontResponsiveTypography={
  base?:StorefrontTypographyValue;
  desktop?:StorefrontTypographyValue;
  tablet?:StorefrontTypographyValue;
  mobile?:StorefrontTypographyValue;
};

const FONT_STACK:Record<StorefrontTypographyFontToken,string|undefined>={
  inherit:undefined,
  body:'var(--shoporation-body-font, Arial, sans-serif)',
  heading:'var(--shoporation-heading-font, Georgia, serif)',
  display:'var(--shoporation-display-font, var(--shoporation-heading-font, Georgia, serif))',
  brand:'var(--shoporation-brand-font, var(--shoporation-heading-font, Georgia, serif))',
  mono:'var(--shoporation-mono-font, ui-monospace, SFMono-Regular, Menlo, monospace)',
};

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

export function sanitizeStorefrontTypographyValue(value:unknown):StorefrontTypographyValue{
  if(!record(value))return{};
  const result:StorefrontTypographyValue={};
  if(typeof value.fontToken==='string'&&(STOREFRONT_TYPOGRAPHY_FONT_TOKENS as readonly string[]).includes(value.fontToken))result.fontToken=value.fontToken as StorefrontTypographyFontToken;
  if(finite(value.fontSizeRem))result.fontSizeRem=clamp(value.fontSizeRem,.625,12);
  if(record(value.fluidSize)&&finite(value.fluidSize.minRem)&&finite(value.fluidSize.maxRem)&&finite(value.fluidSize.preferredVw)){
    const minRem=clamp(value.fluidSize.minRem,.625,12);
    const maxRem=clamp(value.fluidSize.maxRem,minRem,12);
    result.fluidSize={minRem,maxRem,preferredVw:clamp(value.fluidSize.preferredVw,.5,20)};
  }
  if(finite(value.fontWeight))result.fontWeight=Math.round(clamp(value.fontWeight,100,900)/50)*50;
  if(value.fontStyle==='normal'||value.fontStyle==='italic')result.fontStyle=value.fontStyle;
  if(finite(value.lineHeight))result.lineHeight=clamp(value.lineHeight,.75,2.5);
  if(finite(value.letterSpacingEm))result.letterSpacingEm=clamp(value.letterSpacingEm,-.12,.5);
  if(value.textTransform==='none'||value.textTransform==='uppercase'||value.textTransform==='lowercase'||value.textTransform==='capitalize')result.textTransform=value.textTransform;
  if(value.textAlign==='left'||value.textAlign==='center'||value.textAlign==='right')result.textAlign=value.textAlign;
  if(value.textWrap==='normal'||value.textWrap==='balance'||value.textWrap==='pretty')result.textWrap=value.textWrap;
  if(finite(value.maxWidthCh))result.maxWidthCh=clamp(value.maxWidthCh,4,100);
  if(typeof value.preserveLineBreaks==='boolean')result.preserveLineBreaks=value.preserveLineBreaks;
  return result;
}

function mergedTypography(value:unknown,viewport:StorefrontViewport):StorefrontTypographyValue{
  if(!record(value))return{};
  const hasResponsive=['base','desktop','tablet','mobile'].some(key=>Object.prototype.hasOwnProperty.call(value,key));
  if(!hasResponsive)return sanitizeStorefrontTypographyValue(value);
  const base=sanitizeStorefrontTypographyValue(value.base);
  const desktop={...base,...sanitizeStorefrontTypographyValue(value.desktop)};
  const tablet={...desktop,...sanitizeStorefrontTypographyValue(value.tablet)};
  const mobile={...tablet,...sanitizeStorefrontTypographyValue(value.mobile)};
  return viewport==='desktop'?desktop:viewport==='tablet'?tablet:mobile;
}

export function resolveStorefrontTypography(value:unknown,viewport:StorefrontViewport):StorefrontVisualStyleSlot{
  const typography=mergedTypography(value,viewport);
  const style:StorefrontVisualStyleSlot={};
  if(typography.fontToken&&FONT_STACK[typography.fontToken])style.fontFamily=FONT_STACK[typography.fontToken]!;
  if(typography.fluidSize)style.fontSize=`clamp(${typography.fluidSize.minRem}rem, ${typography.fluidSize.preferredVw}vw, ${typography.fluidSize.maxRem}rem)`;
  else if(typography.fontSizeRem!==undefined)style.fontSize=`${typography.fontSizeRem}rem`;
  if(typography.fontWeight!==undefined)style.fontWeight=typography.fontWeight;
  if(typography.fontStyle)style.fontStyle=typography.fontStyle;
  if(typography.lineHeight!==undefined)style.lineHeight=typography.lineHeight;
  if(typography.letterSpacingEm!==undefined)style.letterSpacing=`${typography.letterSpacingEm}em`;
  if(typography.textTransform&&typography.textTransform!=='none')style.textTransform=typography.textTransform;
  if(typography.textAlign)style.textAlign=typography.textAlign;
  if(typography.textWrap&&typography.textWrap!=='normal')style.textWrap=typography.textWrap;
  if(typography.maxWidthCh!==undefined)style.maxWidth=`${typography.maxWidthCh}ch`;
  if(typography.preserveLineBreaks)style.whiteSpace='pre-line';
  return style;
}
