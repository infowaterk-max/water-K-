import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_GLOBAL_STYLES_VERSION='shoporation.storefront-global-styles.v1' as const;
export const STOREFRONT_GLOBAL_STYLES_METADATA_KEY='shoporationGlobalStyles' as const;

export const STOREFRONT_GLOBAL_FONT_PRESETS=['system-sans','humanist-sans','geometric-sans','editorial-serif','monospace'] as const;
export type StorefrontGlobalFontPreset=typeof STOREFRONT_GLOBAL_FONT_PRESETS[number];
export const STOREFRONT_GLOBAL_SPACING_SCALES=['compact','comfortable','airy'] as const;
export type StorefrontGlobalSpacingScale=typeof STOREFRONT_GLOBAL_SPACING_SCALES[number];
export const STOREFRONT_GLOBAL_RADIUS_SCALES=['sharp','soft','rounded'] as const;
export type StorefrontGlobalRadiusScale=typeof STOREFRONT_GLOBAL_RADIUS_SCALES[number];

export type StorefrontGlobalStyleTokens={
  background?:string;
  surface?:string;
  surfaceMuted?:string;
  text?:string;
  mutedText?:string;
  border?:string;
  primary?:string;
  primaryContrast?:string;
  accent?:string;
  headingFont?:StorefrontGlobalFontPreset;
  bodyFont?:StorefrontGlobalFontPreset;
  spacingScale?:StorefrontGlobalSpacingScale;
  radiusScale?:StorefrontGlobalRadiusScale;
};

export type StorefrontGlobalStyleState={
  version:typeof STOREFRONT_GLOBAL_STYLES_VERSION;
  tokens:StorefrontGlobalStyleTokens;
};

const COLOR_KEYS=['background','surface','surfaceMuted','text','mutedText','border','primary','primaryContrast','accent'] as const;
const TOKEN_KEYS=new Set<string>([...COLOR_KEYS,'headingFont','bodyFont','spacingScale','radiusScale']);
const HEX=/^#[0-9a-fA-F]{6}$/;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

export const EMPTY_STOREFRONT_GLOBAL_STYLE_STATE:StorefrontGlobalStyleState=Object.freeze({
  version:STOREFRONT_GLOBAL_STYLES_VERSION,
  tokens:Object.freeze({}),
}) as StorefrontGlobalStyleState;

function normalizeTokens(value:unknown):StorefrontGlobalStyleTokens{
  if(value===undefined)return{};
  if(!isRecord(value))throw new Error('STOREFRONT_GLOBAL_STYLES_TOKENS_INVALID');
  const keys=Object.keys(value);
  if(keys.length>16)throw new Error('STOREFRONT_GLOBAL_STYLES_TOKENS_TOO_LARGE');
  for(const key of keys)if(!TOKEN_KEYS.has(key))throw new Error('STOREFRONT_GLOBAL_STYLES_TOKEN_UNKNOWN');
  const tokens:StorefrontGlobalStyleTokens={};
  for(const key of COLOR_KEYS){
    const raw=value[key];
    if(raw===undefined)continue;
    if(typeof raw!=='string'||!HEX.test(raw))throw new Error(`STOREFRONT_GLOBAL_STYLES_COLOR_INVALID:${key}`);
    tokens[key]=raw.toLowerCase();
  }
  if(value.headingFont!==undefined){
    if(typeof value.headingFont!=='string'||!(STOREFRONT_GLOBAL_FONT_PRESETS as readonly string[]).includes(value.headingFont))throw new Error('STOREFRONT_GLOBAL_STYLES_HEADING_FONT_INVALID');
    tokens.headingFont=value.headingFont as StorefrontGlobalFontPreset;
  }
  if(value.bodyFont!==undefined){
    if(typeof value.bodyFont!=='string'||!(STOREFRONT_GLOBAL_FONT_PRESETS as readonly string[]).includes(value.bodyFont))throw new Error('STOREFRONT_GLOBAL_STYLES_BODY_FONT_INVALID');
    tokens.bodyFont=value.bodyFont as StorefrontGlobalFontPreset;
  }
  if(value.spacingScale!==undefined){
    if(typeof value.spacingScale!=='string'||!(STOREFRONT_GLOBAL_SPACING_SCALES as readonly string[]).includes(value.spacingScale))throw new Error('STOREFRONT_GLOBAL_STYLES_SPACING_INVALID');
    tokens.spacingScale=value.spacingScale as StorefrontGlobalSpacingScale;
  }
  if(value.radiusScale!==undefined){
    if(typeof value.radiusScale!=='string'||!(STOREFRONT_GLOBAL_RADIUS_SCALES as readonly string[]).includes(value.radiusScale))throw new Error('STOREFRONT_GLOBAL_STYLES_RADIUS_INVALID');
    tokens.radiusScale=value.radiusScale as StorefrontGlobalRadiusScale;
  }
  return tokens;
}

export function parseStorefrontGlobalStyleState(value:unknown):StorefrontGlobalStyleState{
  if(value===undefined||value===null)return{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{}};
  if(!isRecord(value)||value.version!==STOREFRONT_GLOBAL_STYLES_VERSION)throw new Error('STOREFRONT_GLOBAL_STYLES_VERSION_INVALID');
  return{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:normalizeTokens(value.tokens)};
}

export function getStorefrontGlobalStyleState(document:StorefrontPageDocument):StorefrontGlobalStyleState{
  return parseStorefrontGlobalStyleState(document.metadata?.[STOREFRONT_GLOBAL_STYLES_METADATA_KEY]);
}

export function setStorefrontGlobalStyleState(document:StorefrontPageDocument,state:StorefrontGlobalStyleState):StorefrontPageDocument{
  const normalized=parseStorefrontGlobalStyleState(state);
  return{
    ...document,
    metadata:{...(document.metadata??{}),[STOREFRONT_GLOBAL_STYLES_METADATA_KEY]:normalized},
  };
}

export function storefrontGlobalStyleStatesEqual(left:StorefrontGlobalStyleState,right:StorefrontGlobalStyleState):boolean{
  const a=parseStorefrontGlobalStyleState(left),b=parseStorefrontGlobalStyleState(right);
  return JSON.stringify(a.tokens)===JSON.stringify(b.tokens);
}

export function assertSafeStorefrontGlobalStylesDocument(document:StorefrontPageDocument):void{
  const raw=document.metadata?.[STOREFRONT_GLOBAL_STYLES_METADATA_KEY];
  if(raw!==undefined)parseStorefrontGlobalStyleState(raw);
}

const FONT_STACKS:Record<StorefrontGlobalFontPreset,string>={
  'system-sans':'Arial, Helvetica, sans-serif',
  'humanist-sans':'"Trebuchet MS", Arial, sans-serif',
  'geometric-sans':'"Avenir Next", Avenir, "Segoe UI", sans-serif',
  'editorial-serif':'Georgia, "Times New Roman", serif',
  monospace:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};
const SPACING:Record<StorefrontGlobalSpacingScale,Record<string,string>>={
  compact:{xs:'.35rem',s:'.7rem',m:'1rem',l:'1.75rem',xl:'2.75rem','2xl':'4rem'},
  comfortable:{xs:'.5rem',s:'1rem',m:'1.5rem',l:'2.5rem',xl:'4rem','2xl':'6rem'},
  airy:{xs:'.625rem',s:'1.25rem',m:'1.875rem',l:'3.25rem',xl:'5.25rem','2xl':'7.5rem'},
};
const RADIUS:Record<StorefrontGlobalRadiusScale,Record<string,string>>={
  sharp:{s:'2px',m:'4px',l:'8px'},
  soft:{s:'.375rem',m:'.75rem',l:'1.25rem'},
  rounded:{s:'.625rem',m:'1.125rem',l:'1.75rem'},
};

export function resolveStorefrontGlobalStyleCssVariables(document:StorefrontPageDocument):Record<string,string>{
  const{tokens}=getStorefrontGlobalStyleState(document);
  const css:Record<string,string>={};
  const colorMap:Record<typeof COLOR_KEYS[number],string>={
    background:'--shoporation-color-background',surface:'--shoporation-color-surface',surfaceMuted:'--shoporation-color-surface-muted',text:'--shoporation-color-text',mutedText:'--shoporation-color-muted-text',border:'--shoporation-color-border',primary:'--shoporation-color-primary',primaryContrast:'--shoporation-color-primary-contrast',accent:'--shoporation-color-accent',
  };
  for(const key of COLOR_KEYS)if(tokens[key])css[colorMap[key]]=tokens[key]!;
  if(tokens.headingFont)css['--shoporation-heading-font']=FONT_STACKS[tokens.headingFont];
  if(tokens.bodyFont)css['--shoporation-body-font']=FONT_STACKS[tokens.bodyFont];
  if(tokens.spacingScale)for(const[key,value]of Object.entries(SPACING[tokens.spacingScale]))css[`--shoporation-space-${key}`]=value;
  if(tokens.radiusScale)for(const[key,value]of Object.entries(RADIUS[tokens.radiusScale]))css[`--shoporation-radius-${key}`]=value;
  return css;
}
