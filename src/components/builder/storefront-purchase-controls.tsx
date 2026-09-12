import type {CSSProperties,ReactNode} from 'react';
import type {StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {StorefrontPurchaseControlsClient} from '@/components/builder/storefront-purchase-controls-client';
import {sanitizeStorefrontStyleSlots} from '@/lib/builder/storefront-fidelity-engine';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_PURCHASE_CONTROLS_RENDERERS_VERSION='shoporation.storefront-purchase-controls-renderers.v1' as const;

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const number=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const styles=(config:Record<string,unknown>,viewport:StorefrontComponentRenderProps['viewport'])=>{
  const slots=sanitizeStorefrontStyleSlots(config.styleSlots);
  return(slot:string)=>resolveStorefrontVisualStyle(slots[slot],viewport) as CSSProperties;
};

function PurchaseControlsRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const slot=styles(config,viewport);
  const rawVariant=text(config.variantId);
  return <div style={{gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`}}>
    <StorefrontPurchaseControlsClient
      productId={text(config.productId)}
      variantId={rawVariant||null}
      slug={text(config.slug)}
      name={text(config.name,'Termék')}
      unitPrice={Math.max(0,number(config.unitPrice,0))}
      availableQuantity={Math.max(0,Math.floor(number(config.availableQuantity,0)))}
      minimumQuantity={Math.max(1,Math.floor(number(config.minimumQuantity,1)))}
      orderMultiple={Math.max(1,Math.floor(number(config.orderMultiple,1)))}
      purchaseLabel={text(config.purchaseLabel,'Kosárba')}
      wishlistLabel={text(config.wishlistLabel,'Kedvencekhez')}
      currency={text(config.currency,'HUF')}
      styles={{root:slot('root'),quantity:slot('quantity'),step:slot('step'),value:slot('value'),purchase:slot('purchase'),wishlist:slot('wishlist')}}
    />
  </div>;
}

export const STOREFRONT_PURCHASE_CONTROLS_RENDERERS:readonly [string,number,(props:StorefrontComponentRenderProps)=>ReactNode][]=[
  ['commerce.purchase-controls',1,PurchaseControlsRenderer],
] as const;
