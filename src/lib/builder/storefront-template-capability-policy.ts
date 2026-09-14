import type {StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES=[
  'scene','room','recipe','release','finder','composer','configurator','compatibility',
] as const;
export type StorefrontSpecialCommerceCapability=typeof STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES[number];
export type StorefrontTemplateCapabilityStatus='required'|'supported'|'optional'|'not applicable';

export const STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS:Readonly<Record<StorefrontSpecialCommerceCapability,readonly string[]>>=Object.freeze({
  scene:['commerce.interactive-scene'],
  room:['commerce.interactive-scene','composer.builder'],
  recipe:['commerce.recipe'],
  release:['commerce.release'],
  finder:['guided.finder','guided.results'],
  composer:['composer.builder'],
  configurator:['configurator.builder','configurator.slot-list'],
  compatibility:['compatibility.status','compatibility.evidence'],
});

const N='not applicable' as const;
export const STOREFRONT_TEMPLATE_SPECIAL_COMMERCE_POLICY:Readonly<Record<string,Readonly<Record<StorefrontSpecialCommerceCapability,StorefrontTemplateCapabilityStatus>>>>=Object.freeze({
  'alpine-lodge':{scene:'supported',room:N,recipe:N,release:'optional',finder:'supported',composer:'supported',configurator:'optional',compatibility:'optional'},
  'beauty-lab':{scene:'supported',room:N,recipe:N,release:'optional',finder:'required',composer:'optional',configurator:'optional',compatibility:N},
  'creator-station':{scene:'optional',room:N,recipe:N,release:'required',finder:N,composer:'supported',configurator:N,compatibility:N},
  'derma-studio':{scene:'optional',room:N,recipe:N,release:'optional',finder:'required',composer:'optional',configurator:'optional',compatibility:N},
  'editorial-atelier':{scene:'required',room:N,recipe:N,release:'optional',finder:'optional',composer:'supported',configurator:N,compatibility:N},
  'gallery-edit':{scene:'required',room:'required',recipe:N,release:N,finder:'optional',composer:'required',configurator:'supported',compatibility:'optional'},
  'heritage-atelier':{scene:'supported',room:N,recipe:N,release:'optional',finder:'optional',composer:'supported',configurator:'supported',compatibility:'optional'},
  'loot-vault':{scene:'optional',room:N,recipe:N,release:'required',finder:'supported',composer:'supported',configurator:'optional',compatibility:'optional'},
  'market-pantry':{scene:'optional',room:N,recipe:'required',release:'optional',finder:'optional',composer:'supported',configurator:N,compatibility:N},
  'modern-luxe':{scene:'supported',room:N,recipe:N,release:'optional',finder:'optional',composer:'supported',configurator:'supported',compatibility:'optional'},
  'monarche':{scene:'required',room:N,recipe:N,release:'supported',finder:'optional',composer:'supported',configurator:N,compatibility:N},
  'my-pack':{scene:N,room:N,recipe:N,release:'optional',finder:'required',composer:'supported',configurator:'optional',compatibility:'optional'},
  'performance-lab':{scene:'optional',room:N,recipe:N,release:'optional',finder:'required',composer:'supported',configurator:'optional',compatibility:'optional'},
  'playroom':{scene:'optional',room:N,recipe:N,release:'supported',finder:'supported',composer:'supported',configurator:'optional',compatibility:'optional'},
  'rig-forge':{scene:'optional',room:N,recipe:N,release:'supported',finder:'required',composer:'required',configurator:'required',compatibility:'required'},
  'ritual-house':{scene:'supported',room:N,recipe:N,release:'optional',finder:'required',composer:'supported',configurator:'optional',compatibility:N},
  'spec-lab':{scene:'optional',room:N,recipe:N,release:'supported',finder:'required',composer:'supported',configurator:'required',compatibility:'required'},
  'sport-hub':{scene:'optional',room:N,recipe:N,release:'optional',finder:'required',composer:'supported',configurator:'optional',compatibility:'optional'},
  'statement-lab':{scene:'required',room:N,recipe:N,release:'supported',finder:'optional',composer:'supported',configurator:N,compatibility:N},
  'street-drop':{scene:'supported',room:N,recipe:N,release:'required',finder:'optional',composer:'supported',configurator:N,compatibility:N},
  'table-gift':{scene:'optional',room:N,recipe:'supported',release:'optional',finder:'optional',composer:'required',configurator:N,compatibility:N},
  'tech-deck':{scene:'optional',room:N,recipe:N,release:'supported',finder:'required',composer:'supported',configurator:'required',compatibility:'required'},
  'tool-depot':{scene:'optional',room:N,recipe:N,release:'optional',finder:'required',composer:'required',configurator:'required',compatibility:'required'},
  'trail-expedition':{scene:'supported',room:N,recipe:N,release:'optional',finder:'required',composer:'supported',configurator:'optional',compatibility:'optional'},
});

export const STOREFRONT_PAGE_SEMANTIC_CONTEXTS:Readonly<Record<StorefrontBuilderPageType,readonly string[]>>=Object.freeze({
  home:['home.discovery','home.marketing','home.retention','home.special-commerce'],
  catalog:['catalog.discovery','catalog.merchandising'],
  product:['product.media.after','product.buybox.after','product.fulfillment','product.documents','product.compatibility','product.related'],
  search:['search.discovery'],
  cart:['cart.fulfillment','cart.recommendations','cart.retention'],
  checkout:['checkout.fulfillment','checkout.shipping.methods','checkout.payment.methods','checkout.post-purchase','checkout.retention'],
  account:['account.documents','account.order-details','account.post-purchase','account.retention'],
  content:['content.commerce','content.marketing','content.support'],
  'blog-index':['content.marketing'],
  'blog-article':['content.commerce','content.marketing'],
  faq:['contact.support'],
  contact:['contact.support'],
  legal:[],
  'not-found':[],
});

export type StorefrontContextualCapabilityDescriptor={
  key:string;
  label:string;
  description:string;
  componentKeys:readonly string[];
  contexts:readonly string[];
};

export const STOREFRONT_CONTEXTUAL_CAPABILITIES:readonly StorefrontContextualCapabilityDescriptor[]=Object.freeze([
  {key:'fulfillment',label:'Fizikai / digitális teljesítés',description:'A valós termék- és kosáradatból származó teljesítési mód és kézbesítési elvárás.',componentKeys:['commerce.fulfillment-summary'],contexts:['product.fulfillment','cart.fulfillment','checkout.fulfillment']},
  {key:'product-documents',label:'Termékdokumentumok',description:'Termékhez vagy változathoz kapcsolt, külön Product Documents authorityból érkező dokumentumlista.',componentKeys:['commerce.product-documents'],contexts:['product.documents']},
  {key:'documents-center',label:'Dokumentumok és letöltések',description:'Digitális vásárlások és rendelési dokumentumok közös felfedezési felülete, külön backend authoritykkal.',componentKeys:['commerce.documents-center'],contexts:['account.documents']},
  {key:'post-purchase-access',label:'Vásárlás utáni hozzáférés',description:'Fizetés utáni digitális hozzáférés és dokumentumközpont útmutatás a rendelési authority állapotából.',componentKeys:['commerce.post-purchase-guidance'],contexts:['checkout.post-purchase','account.post-purchase']},
  {key:'newsletter',label:'Hírlevél-feliratkozás',description:'Valódi marketing hozzájárulással működő Builder-blokk.',componentKeys:['marketing.newsletter-signup'],contexts:['home.marketing','content.marketing']},
  {key:'promotion',label:'Promóció / kupon kiemelés',description:'A kupon authorityból olvasott promóciós storefront-felület.',componentKeys:['marketing.promotion-banner'],contexts:['home.marketing','catalog.merchandising','product.related','cart.recommendations','content.marketing']},
  {key:'support',label:'Kapcsolati / ügyfélszolgálati űrlap',description:'Tenant-szintű, követhető support ticketet létrehozó űrlap.',componentKeys:['support.contact-form'],contexts:['contact.support','content.support']},
  {key:'retention',label:'Visszatérési és újravásárlási blokkok',description:'Korábbi vásárlás, mentett kosár és releváns utánkövetési felületek.',componentKeys:['retention.buy-again','retention.reorder-row','retention.post-purchase-recommendations','retention.saved-cart-recovery'],contexts:['home.retention','cart.retention','checkout.retention','account.retention']},
]);

export const STOREFRONT_SPECIAL_COMMERCE_CONTEXTS:Readonly<Record<StorefrontSpecialCommerceCapability,readonly string[]>>=Object.freeze({
  scene:['home.special-commerce','catalog.discovery','product.media.after','content.commerce'],
  room:['home.special-commerce','content.commerce'],
  recipe:['content.commerce','home.special-commerce'],
  release:['home.discovery','catalog.discovery','product.related','content.commerce'],
  finder:['home.discovery','catalog.discovery','search.discovery','content.commerce'],
  composer:['home.special-commerce','product.related','content.commerce','cart.recommendations'],
  configurator:['home.special-commerce','product.buybox.after','content.commerce','cart.recommendations'],
  compatibility:['product.compatibility','content.commerce','cart.recommendations'],
});

export const storefrontTemplateSlug=(templateKey:string)=>templateKey.split('.').at(-1)??templateKey;
export function getStorefrontTemplateSpecialCommercePolicy(templateKey:string){return STOREFRONT_TEMPLATE_SPECIAL_COMMERCE_POLICY[storefrontTemplateSlug(templateKey)]??null;}

export function getStorefrontPageSemanticContexts(document:Pick<StorefrontPageDocument,'pageType'|'metadata'>):readonly string[]{
  const addon=document.metadata?.addonIntegration;
  if(addon&&typeof addon==='object'&&!Array.isArray(addon)){
    const semantic=(addon as Record<string,unknown>).semanticContexts;
    if(Array.isArray(semantic)){
      const values=semantic.filter((value):value is string=>typeof value==='string'&&value.trim().length>0);
      if(values.length)return Object.freeze([...new Set(values)]);
    }
  }
  return STOREFRONT_PAGE_SEMANTIC_CONTEXTS[document.pageType];
}
