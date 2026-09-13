import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  defineStorefrontBuilderComponent,
  type StorefrontBuilderPageType,
} from '@/lib/builder/storefront-foundation';
import type {
  StorefrontComponentNode,
  StorefrontPageDocument,
  StorefrontRuntimeComponentDefinition,
} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_GROWTH_MARKETING_VERSION='shoporation.storefront-growth-marketing.v1' as const;
export const STOREFRONT_GROWTH_MARKETING_MAX_REFERENCED_COUPONS=20 as const;

export type StorefrontGrowthMarketingSurface={
  surfaceKey:string;
  label:string;
  authority:string;
  componentKeys:readonly string[];
};

/**
 * Wave 8 is a surface catalogue over already accepted authorities. It is not a
 * second campaign, promotion, retention or Special Commerce engine. Entitlement
 * remains exclusively in each component manifest; this catalogue does not copy it.
 */
export const STOREFRONT_GROWTH_MARKETING_SURFACES:readonly StorefrontGrowthMarketingSurface[]=[
  {surfaceKey:'newsletter-capture',label:'Hírlevél-feliratkozás',authority:'marketing_consents',componentKeys:['marketing.newsletter-signup']},
  {surfaceKey:'promotion-callout',label:'Kupon / promóciós kiemelés',authority:'coupons',componentKeys:['marketing.promotion-banner']},
  {surfaceKey:'special-commerce-discovery',label:'Special Commerce discovery',authority:'existing Special Commerce + catalog/pricing/inventory authorities',componentKeys:['guided.finder','guided.results','commerce.interactive-scene','commerce.recipe','commerce.release','composer.builder','configurator.builder','configurator.slot-list','compatibility.status','compatibility.evidence']},
  {surfaceKey:'retention-recovery',label:'Megtartás és visszatérés',authority:'existing retention/recovery/recommendation authorities',componentKeys:['retention.running-low','retention.reorder-row','retention.recently-purchased','retention.buy-again','retention.profile-replenishment','retention.post-purchase-recommendations','retention.saved-cart-recovery']},
] as const;

const PROMOTION_PAGE_TYPES:readonly StorefrontBuilderPageType[]=['home','catalog','product','cart','content'];

export const STOREFRONT_GROWTH_MARKETING_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[
  {
    manifest:defineStorefrontBuilderComponent({
      foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
      componentKey:'marketing.promotion-banner',
      componentVersion:1,
      schemaSlot:'children',
      pageTypes:PROMOTION_PAGE_TYPES,
      configurable:['couponCode','eyebrow','title','copy','ctaLabel','ctaHref','tone','showCode'],
      responsiveMode:'grid',
      capability:{minPlan:'alap',features:['coupons']},
    }),
    runtimeBindingSlots:['promotion'],
  },
] as const;

const COUPON_CODE_PATTERN=/^[A-Za-z0-9_-]{3,32}$/;

export function normalizeStorefrontPromotionCouponCode(value:unknown):string|null{
  if(typeof value!=='string')return null;
  const code=value.trim().toUpperCase();
  return COUPON_CODE_PATTERN.test(code)?code:null;
}

function walk(nodes:readonly StorefrontComponentNode[],visit:(node:StorefrontComponentNode)=>void){
  for(const node of nodes){visit(node);walk(node.children??[],visit);}
}

/** Only explicitly referenced coupon codes are eligible for storefront projection. */
export function collectStorefrontGrowthMarketingCouponCodes(document:StorefrontPageDocument):readonly string[]{
  const codes:string[]=[];
  walk(document.sections,node=>{
    if(node.componentKey!=='marketing.promotion-banner')return;
    const code=normalizeStorefrontPromotionCouponCode(node.config.couponCode);
    if(code&&!codes.includes(code)&&codes.length<STOREFRONT_GROWTH_MARKETING_MAX_REFERENCED_COUPONS)codes.push(code);
  });
  return Object.freeze(codes);
}

function bindNode(node:StorefrontComponentNode):StorefrontComponentNode{
  const children=node.children?.map(bindNode);
  if(node.componentKey!=='marketing.promotion-banner')return children?{...node,children}:node;
  const code=normalizeStorefrontPromotionCouponCode(node.config.couponCode);
  const bindings={...(node.bindings??{})};
  delete bindings.promotion;
  if(code)bindings.promotion={path:`offer.promotions.${code}`};
  return{...node,bindings,...(children?{children}:{})};
}

/** Injects only runtime-managed promotion bindings; authored business authority is never trusted. */
export function bindStorefrontGrowthMarketingRuntime(document:StorefrontPageDocument):StorefrontPageDocument{
  return{...document,sections:document.sections.map(bindNode)};
}
