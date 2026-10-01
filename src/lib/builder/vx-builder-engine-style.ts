export const VX_ENGINE_STYLE_VERSION='vision.vx-engine-style.v1' as const;
export const VX_ENGINE_STYLE_CONFIG_KEY='engineStyle' as const;

export const VX_ENGINE_COLOR_TOKEN_KEYS=[
  'background','surface','surfaceMuted','text','mutedText','border',
  'primary','primaryContrast','accent','accentSecondary','accentTertiary',
] as const;

export type VxEngineColorTokenKey=typeof VX_ENGINE_COLOR_TOKEN_KEYS[number];
export type VxEngineStyleTokens=Partial<Record<VxEngineColorTokenKey,string>>;
export type VxEngineStyleState={version:typeof VX_ENGINE_STYLE_VERSION;tokens:VxEngineStyleTokens};

const HEX=/^#[0-9a-fA-F]{6}$/;
const ALLOWED=new Set<string>(VX_ENGINE_COLOR_TOKEN_KEYS);
const CSS_VARIABLES:Record<VxEngineColorTokenKey,string>={
  background:'--shoporation-color-background',
  surface:'--shoporation-color-surface',
  surfaceMuted:'--shoporation-color-surface-muted',
  text:'--shoporation-color-text',
  mutedText:'--shoporation-color-muted-text',
  border:'--shoporation-color-border',
  primary:'--shoporation-color-primary',
  primaryContrast:'--shoporation-color-primary-contrast',
  accent:'--shoporation-color-accent',
  accentSecondary:'--shoporation-color-accent-secondary',
  accentTertiary:'--shoporation-color-accent-tertiary',
};
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

export const EMPTY_VX_ENGINE_STYLE_STATE:VxEngineStyleState=Object.freeze({
  version:VX_ENGINE_STYLE_VERSION,
  tokens:Object.freeze({}),
}) as VxEngineStyleState;

export function parseVxEngineStyleTokens(value:unknown):VxEngineStyleTokens{
  if(value===undefined||value===null)return{};
  if(!isRecord(value))throw new Error('VX_ENGINE_STYLE_TOKENS_INVALID');
  const keys=Object.keys(value);
  if(keys.length>VX_ENGINE_COLOR_TOKEN_KEYS.length)throw new Error('VX_ENGINE_STYLE_TOKENS_TOO_LARGE');
  for(const key of keys)if(!ALLOWED.has(key))throw new Error('VX_ENGINE_STYLE_TOKEN_UNKNOWN');
  const tokens:VxEngineStyleTokens={};
  for(const key of VX_ENGINE_COLOR_TOKEN_KEYS){
    const raw=value[key];
    if(raw===undefined)continue;
    if(typeof raw!=='string'||!HEX.test(raw))throw new Error('VX_ENGINE_STYLE_COLOR_INVALID:'+key);
    tokens[key]=raw.toLowerCase();
  }
  return tokens;
}

export function parseVxEngineStyleState(value:unknown):VxEngineStyleState{
  if(value===undefined||value===null)return{version:VX_ENGINE_STYLE_VERSION,tokens:{}};
  if(!isRecord(value))throw new Error('VX_ENGINE_STYLE_STATE_INVALID');
  if(value.version!==VX_ENGINE_STYLE_VERSION)throw new Error('VX_ENGINE_STYLE_VERSION_INVALID');
  const keys=Object.keys(value);
  if(keys.some(key=>key!=='version'&&key!=='tokens'))throw new Error('VX_ENGINE_STYLE_STATE_KEY_UNKNOWN');
  return{version:VX_ENGINE_STYLE_VERSION,tokens:parseVxEngineStyleTokens(value.tokens)};
}

export function readVxEngineStyleFromConfig(config:Record<string,unknown>):VxEngineStyleState{
  const raw=config[VX_ENGINE_STYLE_CONFIG_KEY];
  if(raw===undefined||raw===null)return{version:VX_ENGINE_STYLE_VERSION,tokens:{}};
  return parseVxEngineStyleState(raw);
}

export function writeVxEngineStyleToConfig(config:Record<string,unknown>,tokens:VxEngineStyleTokens):Record<string,unknown>{
  const normalized=parseVxEngineStyleTokens(tokens);
  if(!Object.keys(normalized).length){
    const next={...config};
    delete next[VX_ENGINE_STYLE_CONFIG_KEY];
    return next;
  }
  return{...config,[VX_ENGINE_STYLE_CONFIG_KEY]:{version:VX_ENGINE_STYLE_VERSION,tokens:normalized} satisfies VxEngineStyleState};
}

export function resolveVxEngineStyleCssVariables(value:unknown):Record<string,string>{
  const state=parseVxEngineStyleState(value);
  const css:Record<string,string>={};
  for(const key of VX_ENGINE_COLOR_TOKEN_KEYS){
    const color=state.tokens[key];
    if(color)css[CSS_VARIABLES[key]]=color;
  }
  return css;
}

export function isVxEngineStyleConfigKey(key:string):key is typeof VX_ENGINE_STYLE_CONFIG_KEY{
  return key===VX_ENGINE_STYLE_CONFIG_KEY;
}
