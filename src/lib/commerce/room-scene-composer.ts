import {
  buildComposerAddIntent,
  buildComposerReadModel,
  type ComposerCartIntent,
  type ComposerCatalogItem,
  type ComposerSelection,
  type MultiProductComposerConfig,
} from '@/lib/commerce/multi-product-composer';
import type {
  InteractiveSceneConfig,
  InteractiveSceneProductProjection,
} from '@/lib/commerce/interactive-scene';

export const ROOM_SCENE_COMPOSER_VERSION='shoporation.room-scene-composer.v1' as const;

export const ROOM_SCENE_COMPOSER_AUTHORITY=Object.freeze({
  product:false,
  variant:false,
  pricing:false,
  inventory:false,
  cart:false,
  checkout:false,
  order:false,
  payment:false,
} as const);

export type RoomSceneVariantOption={
  variantId:string;
  label:string;
  available:boolean;
  priceDisplay:string;
  stockLabel:string;
};

export type RoomSceneSlotReadModel={
  hotspotId:string;
  productId:string;
  label:string;
  href:string;
  required:boolean;
  included:boolean;
  selectedVariantId:string|null;
  variants:readonly RoomSceneVariantOption[];
};

export type RoomSceneComposerReadModel={
  engineVersion:typeof ROOM_SCENE_COMPOSER_VERSION;
  sceneKey:string;
  composerConfig:MultiProductComposerConfig;
  selections:readonly ComposerSelection[];
  catalog:readonly ComposerCatalogItem[];
  slots:readonly RoomSceneSlotReadModel[];
  status:'incomplete'|'ready'|'invalid';
  ready:boolean;
  subtotalDisplay:string|null;
  requiresCartRevalidation:true;
  pricingAuthoritative:false;
  violations:readonly {code:string;path:string;message:string}[];
};

const keySafe=(value:string)=>{
  const normalized=value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g,'-')
    .replace(/^[._-]+|[._-]+$/g,'');
  return normalized||'room';
};

const displayMoney=(amount:number,currency:string)=>new Intl.NumberFormat('hu-HU',{
  style:'currency',
  currency,
  maximumFractionDigits:currency==='HUF'?0:2,
}).format(amount);

export function buildRoomSceneComposerReadModel(input:{
  tenantId:string;
  scene:InteractiveSceneConfig;
  products:readonly InteractiveSceneProductProjection[];
  selectedVariants?:Readonly<Record<string,string|undefined>>;
  includedOptionalHotspotIds?:readonly string[];
}):RoomSceneComposerReadModel{
  if(input.scene.kind!=='room')throw new Error('ROOM_SCENE_KIND_REQUIRED');

  const products=new Map(input.products.map(item=>[item.productId,item]));
  const optionalIncluded=new Set(input.includedOptionalHotspotIds??[]);
  const slots=input.scene.hotspots.map(hotspot=>{
    const product=products.get(hotspot.productId);
    const required=hotspot.setRequired!==false;
    const included=required||optionalIncluded.has(hotspot.id);
    const variants=(product?.variants??[]).filter(variant=>variant.eligible&&variant.channelVisible);
    const requested=input.selectedVariants?.[hotspot.id]??hotspot.defaultVariantId;
    const selectedVariantId=requested&&variants.some(variant=>variant.variantId===requested)
      ?requested
      :variants.length===1
        ?variants[0]?.variantId
        :null;

    return{
      hotspot,
      product,
      required,
      included,
      variants,
      selectedVariantId:selectedVariantId??null,
    };
  });

  const requiredCount=slots.filter(slot=>slot.required).length;
  const composerConfig:MultiProductComposerConfig={
    version:1,
    tenantId:keySafe(input.tenantId),
    composerKey:`room-${keySafe(input.scene.sceneKey)}`,
    label:'Shop the Room',
    mode:'slots',
    minItems:Math.max(1,requiredCount),
    maxItems:Math.max(1,slots.length),
    duplicateLimit:Math.max(1,slots.length),
    slots:slots.map(slot=>({
      id:keySafe(slot.hotspot.id),
      label:slot.hotspot.label?.trim()||slot.product?.label||'Room item',
      minItems:slot.required?1:0,
      maxItems:1,
      eligibleProductIds:[slot.hotspot.productId],
    })),
  };

  const catalog:ComposerCatalogItem[]=slots.flatMap(slot=>{
    if(!slot.product)return[];
    return slot.variants.map(variant=>({
      productId:slot.product!.productId,
      variantId:variant.variantId,
      label:[slot.product!.label,variant.label].filter(Boolean).join(' · '),
      href:slot.product!.href,
      eligible:slot.product!.eligible&&variant.eligible,
      channelVisible:variant.channelVisible,
      slotIds:[keySafe(slot.hotspot.id)],
      price:variant.price,
      stock:variant.stock,
    }));
  });

  const selections:ComposerSelection[]=slots.flatMap(slot=>
    slot.included&&slot.selectedVariantId
      ?[{
          productId:slot.hotspot.productId,
          variantId:slot.selectedVariantId,
          quantity:1,
          slotId:keySafe(slot.hotspot.id),
        }]
      :[],
  );

  const composer=buildComposerReadModel({config:composerConfig,selections,catalog});
  const missingIncluded=slots
    .filter(slot=>slot.included&&!slot.selectedVariantId)
    .map(slot=>({
      code:'ROOM_SCENE_VARIANT_REQUIRED',
      path:`hotspot:${slot.hotspot.id}`,
      message:'Included room items require an explicit available variant when multiple variants exist.',
    }));
  const violations=[...composer.violations,...missingIncluded];
  const status:RoomSceneComposerReadModel['status']=composer.status==='invalid'
    ?'invalid'
    :missingIncluded.length
      ?'incomplete'
      :composer.status;
  const subtotalDisplay=composer.currentSubtotalMinor!==null&&composer.currency
    ?displayMoney(composer.currentSubtotalMinor,composer.currency)
    :null;

  return Object.freeze({
    engineVersion:ROOM_SCENE_COMPOSER_VERSION,
    sceneKey:input.scene.sceneKey,
    composerConfig,
    selections:Object.freeze(selections),
    catalog:Object.freeze(catalog),
    slots:Object.freeze(slots.map(slot=>({
      hotspotId:slot.hotspot.id,
      productId:slot.hotspot.productId,
      label:slot.hotspot.label?.trim()||slot.product?.label||'Room item',
      href:slot.product?.href??'#',
      required:slot.required,
      included:slot.included,
      selectedVariantId:slot.selectedVariantId,
      variants:Object.freeze(slot.variants.map(variant=>({
        variantId:variant.variantId,
        label:variant.label,
        available:variant.stock.available,
        priceDisplay:variant.price.display,
        stockLabel:variant.stock.statusLabel,
      }))),
    }))),
    status,
    ready:status==='ready',
    subtotalDisplay,
    requiresCartRevalidation:true,
    pricingAuthoritative:false,
    violations:Object.freeze(violations.map(item=>({...item}))),
  });
}

/** Wave 4 produces the canonical E4 atomic intent but never persists/mutates a cart. */
export function buildRoomSceneAddIntent(compositionId:string,input:{
  tenantId:string;
  scene:InteractiveSceneConfig;
  products:readonly InteractiveSceneProductProjection[];
  selectedVariants?:Readonly<Record<string,string|undefined>>;
  includedOptionalHotspotIds?:readonly string[];
}):ComposerCartIntent|null{
  const model=buildRoomSceneComposerReadModel(input);
  if(!model.ready)return null;
  return buildComposerAddIntent(keySafe(compositionId),{
    config:model.composerConfig,
    selections:model.selections,
    catalog:model.catalog,
  });
}
