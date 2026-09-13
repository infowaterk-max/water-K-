export const STOREFRONT_MANAGED_CONFIG_VERSION='shoporation.storefront-managed-config.v3' as const;
const MANAGED_CONFIG_KEYS:Readonly<Record<string,ReadonlySet<string>>>=Object.freeze({
  'commerce.interactive-scene':new Set(['sceneKey','sceneKind','hotspots','showSetSummary','setTitle','setCtaLabel','setCtaHref','hotspotStyle']),
  'commerce.recipe':new Set(['recipeKey','defaultServings']),
  'commerce.release':new Set(['releaseKey','showCountdown','showStockCount']),
});
export function isStorefrontManagedConfigKey(componentKey:string,key:string):boolean{return MANAGED_CONFIG_KEYS[componentKey]?.has(key)===true;}
export function listStorefrontManagedConfigKeys(componentKey:string):readonly string[]{return[...(MANAGED_CONFIG_KEYS[componentKey]??[])];}
