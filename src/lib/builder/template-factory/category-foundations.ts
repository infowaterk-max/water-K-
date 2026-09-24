import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import {PLAYROOM_V20_TEMPLATE_PACKAGE,PLAYROOM_V20_TEMPLATE_VERSION} from '@/lib/builder/templates/playroom-v20';
import type {StorefrontTemplateFactoryCategoryFoundation} from '@/lib/builder/template-factory/scaffold';

export const GAMING_TEMPLATE_FACTORY_FOUNDATION:StorefrontTemplateFactoryCategoryFoundation=Object.freeze({
  category:'gaming',
  foundationTemplateKey:'gaming.playroom',
  foundationTemplateVersion:PLAYROOM_V20_TEMPLATE_VERSION,
  package:PLAYROOM_V20_TEMPLATE_PACKAGE,
  recommendedOwnedPages:Object.freeze(['home','catalog','product','blog-index','blog-article'] as const),
  inheritedPages:Object.freeze(STOREFRONT_PAGE_TYPES.filter(page=>!['home','catalog','product','blog-index','blog-article'].includes(page))),
  brandTokens:Object.freeze(['PLAYROOM','Playroom']),
  forbiddenLeakTokens:Object.freeze(['PLAYROOM','Playroom','/storefront/playroom/']),
});

export const STOREFRONT_TEMPLATE_FACTORY_CATEGORY_FOUNDATIONS=Object.freeze({
  gaming:GAMING_TEMPLATE_FACTORY_FOUNDATION,
});

export function getStorefrontTemplateFactoryCategoryFoundation(category:string):StorefrontTemplateFactoryCategoryFoundation{
  const foundation=STOREFRONT_TEMPLATE_FACTORY_CATEGORY_FOUNDATIONS[category as keyof typeof STOREFRONT_TEMPLATE_FACTORY_CATEGORY_FOUNDATIONS];
  if(!foundation)throw new Error(`TEMPLATE_FACTORY_CATEGORY_FOUNDATION_MISSING:${category}`);
  return foundation;
}
