export const INTERACTIVE_SCENE_ENGINE_VERSION='shoporation.interactive-scene-commerce.v1' as const;

export const INTERACTIVE_SCENE_KINDS=['look','room','setup','gear','generic'] as const;
export type InteractiveSceneKind=typeof INTERACTIVE_SCENE_KINDS[number];
export type InteractiveSceneViewport='desktop'|'tablet'|'mobile';
export type InteractiveScenePoint={x:number;y:number};
export type InteractiveSceneResponsivePoint={desktop:InteractiveScenePoint;tablet?:InteractiveScenePoint;mobile?:InteractiveScenePoint};

export type InteractiveSceneHotspot={
  id:string;
  productId:string;
  label?:string;
  position:InteractiveSceneResponsivePoint;
};

export type InteractiveSceneConfig={
  sceneKey:string;
  kind:InteractiveSceneKind;
  hotspots:readonly InteractiveSceneHotspot[];
};

/** Authoritative read projection. The scene never invents or mutates these values. */
export type InteractiveSceneProductProjection={
  productId:string;
  label:string;
  href:string;
  eligible:boolean;
  priceDisplay?:string|null;
  stockLabel?:string|null;
  imageUrl?:string|null;
};

export type ResolvedInteractiveSceneHotspot={
  id:string;
  productId:string;
  label:string;
  href:string;
  position:InteractiveScenePoint;
  priceDisplay:string|null;
  stockLabel:string|null;
  imageUrl:string|null;
};

export type InteractiveSceneResolution={
  engineVersion:typeof INTERACTIVE_SCENE_ENGINE_VERSION;
  sceneKey:string;
  kind:InteractiveSceneKind;
  viewport:InteractiveSceneViewport;
  hotspots:readonly ResolvedInteractiveSceneHotspot[];
  excludedProductIds:readonly string[];
  fallbackRequired:boolean;
};

export const INTERACTIVE_SCENE_COMMERCE_AUTHORITY=Object.freeze({
  product:false,
  variant:false,
  pricing:false,
  inventory:false,
  cart:false,
  checkout:false,
  order:false,
  payment:false,
} as const);

const ID_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const safeHref=(value:string)=>value.startsWith('/')||value.startsWith('#')||value.startsWith('https://');
const validPoint=(point:InteractiveScenePoint)=>Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=0&&point.x<=100&&point.y>=0&&point.y<=100;

export function resolveInteractiveScenePoint(position:InteractiveSceneResponsivePoint,viewport:InteractiveSceneViewport):InteractiveScenePoint{
  const point=viewport==='mobile'?position.mobile??position.tablet??position.desktop:viewport==='tablet'?position.tablet??position.desktop:position.desktop;
  if(!validPoint(point))throw new Error('INTERACTIVE_SCENE_POINT_INVALID');
  return{...point};
}

export function validateInteractiveSceneConfig(config:InteractiveSceneConfig):readonly string[]{
  const errors:string[]=[];
  if(!ID_PATTERN.test(config.sceneKey))errors.push('INTERACTIVE_SCENE_KEY_INVALID');
  if(!INTERACTIVE_SCENE_KINDS.includes(config.kind))errors.push('INTERACTIVE_SCENE_KIND_INVALID');
  if(config.hotspots.length>50)errors.push('INTERACTIVE_SCENE_HOTSPOT_LIMIT_EXCEEDED');
  const ids=new Set<string>();
  for(const hotspot of config.hotspots){
    if(!ID_PATTERN.test(hotspot.id))errors.push('INTERACTIVE_SCENE_HOTSPOT_ID_INVALID');
    if(ids.has(hotspot.id))errors.push('INTERACTIVE_SCENE_HOTSPOT_ID_DUPLICATE');
    ids.add(hotspot.id);
    if(!hotspot.productId.trim())errors.push('INTERACTIVE_SCENE_PRODUCT_REQUIRED');
    for(const point of [hotspot.position.desktop,hotspot.position.tablet,hotspot.position.mobile].filter(Boolean) as InteractiveScenePoint[]){
      if(!validPoint(point))errors.push('INTERACTIVE_SCENE_POINT_INVALID');
    }
  }
  return errors;
}

export function resolveInteractiveScene(input:{
  config:InteractiveSceneConfig;
  products:readonly InteractiveSceneProductProjection[];
  viewport:InteractiveSceneViewport;
}):InteractiveSceneResolution{
  const errors=validateInteractiveSceneConfig(input.config);
  if(errors.length)throw new Error(errors[0]);
  const products=new Map(input.products.map(product=>[product.productId,product]));
  const excludedProductIds:string[]=[];
  const hotspots:ResolvedInteractiveSceneHotspot[]=[];
  for(const hotspot of input.config.hotspots){
    const product=products.get(hotspot.productId);
    if(!product?.eligible||!product.label.trim()||!safeHref(product.href)){
      excludedProductIds.push(hotspot.productId);
      continue;
    }
    hotspots.push({
      id:hotspot.id,
      productId:hotspot.productId,
      label:hotspot.label?.trim()||product.label,
      href:product.href,
      position:resolveInteractiveScenePoint(hotspot.position,input.viewport),
      priceDisplay:product.priceDisplay?.trim()||null,
      stockLabel:product.stockLabel?.trim()||null,
      imageUrl:product.imageUrl?.trim()||null,
    });
  }
  return Object.freeze({
    engineVersion:INTERACTIVE_SCENE_ENGINE_VERSION,
    sceneKey:input.config.sceneKey,
    kind:input.config.kind,
    viewport:input.viewport,
    hotspots:Object.freeze(hotspots),
    excludedProductIds:Object.freeze(excludedProductIds),
    fallbackRequired:hotspots.length===0,
  });
}
