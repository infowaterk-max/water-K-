import {defineStorefrontBuilderComponent,STOREFRONT_BUILDER_FOUNDATION_VERSION} from '@/lib/builder/storefront-foundation';

export type StorefrontPageType='catalog'|'faq'|'contact'|'account'|'cart';

export type StorefrontNavItem={
  id:StorefrontPageType;
  href:string;
  label:string;
  cart?:boolean;
  componentKey:'storefront.navigation.link';
  schemaSlot:'header.primaryNavigation';
  responsiveMode:'primary-navigation';
};

export type StorefrontNavigationConfig={
  hidden?:StorefrontPageType[];
  order?:StorefrontPageType[];
  labels?:Partial<Record<StorefrontPageType,string>>;
};

export const DEFAULT_STOREFRONT_NAVIGATION:readonly StorefrontNavItem[]=[
  {id:'catalog',href:'/webaruhaz',label:'Webáruház',componentKey:'storefront.navigation.link',schemaSlot:'header.primaryNavigation',responsiveMode:'primary-navigation'},
  {id:'faq',href:'/gyik',label:'GYIK',componentKey:'storefront.navigation.link',schemaSlot:'header.primaryNavigation',responsiveMode:'primary-navigation'},
  {id:'contact',href:'/kapcsolat',label:'Kapcsolat',componentKey:'storefront.navigation.link',schemaSlot:'header.primaryNavigation',responsiveMode:'primary-navigation'},
  {id:'account',href:'/fiokom',label:'Fiókom',componentKey:'storefront.navigation.link',schemaSlot:'header.primaryNavigation',responsiveMode:'primary-navigation'},
  {id:'cart',href:'/kosar',label:'Kosár',cart:true,componentKey:'storefront.navigation.link',schemaSlot:'header.primaryNavigation',responsiveMode:'primary-navigation'},
] as const;

const PAGE_TYPES=new Set<StorefrontPageType>(DEFAULT_STOREFRONT_NAVIGATION.map(item=>item.id));
const isPageType=(value:unknown):value is StorefrontPageType=>typeof value==='string'&&PAGE_TYPES.has(value as StorefrontPageType);

export function normalizeStorefrontNavigationConfig(value:unknown):StorefrontNavigationConfig{
  if(!value||typeof value!=='object'||Array.isArray(value))return{};
  const source=value as Record<string,unknown>;
  const hidden=Array.isArray(source.hidden)?source.hidden.filter(isPageType):undefined;
  const order=Array.isArray(source.order)?source.order.filter(isPageType):undefined;
  const labels=source.labels&&typeof source.labels==='object'&&!Array.isArray(source.labels)
    ?Object.fromEntries(Object.entries(source.labels as Record<string,unknown>).filter(([key,label])=>isPageType(key)&&typeof label==='string'&&label.trim()).map(([key,label])=>[key,(label as string).trim().slice(0,48)])) as Partial<Record<StorefrontPageType,string>>
    :undefined;
  return{hidden,order,labels};
}

export function resolveStorefrontNavigation(value?:unknown):StorefrontNavItem[]{
  const config=normalizeStorefrontNavigationConfig(value),hidden=new Set(config.hidden??[]),byId=new Map(DEFAULT_STOREFRONT_NAVIGATION.map(item=>[item.id,item]));
  const requested=[...new Set((config.order??[]).filter(id=>byId.has(id)))];
  const sequence=[...requested,...DEFAULT_STOREFRONT_NAVIGATION.map(item=>item.id).filter(id=>!requested.includes(id))];
  return sequence.filter(id=>!hidden.has(id)).map(id=>{
    const item=byId.get(id)!;
    return{...item,label:config.labels?.[id]??item.label};
  });
}

/**
 * Builder Foundation / Compatibility Contract.
 * Declarative metadata only: Page Schema/Templates and the visual editor remain later roadmap work.
 */
export const STOREFRONT_NAVIGATION_BUILDER_MANIFEST=defineStorefrontBuilderComponent({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  contractVersion:1,
  componentKey:'storefront.navigation.link',
  componentVersion:1,
  schemaSlot:'header.primaryNavigation',
  pageTypes:DEFAULT_STOREFRONT_NAVIGATION.map(item=>item.id),
  configurable:['hidden','order','labels'] as const,
  responsiveMode:'primary-navigation',
  capability:{minPlan:'alap',features:[]},
} as const);
