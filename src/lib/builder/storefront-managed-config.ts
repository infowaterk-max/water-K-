export const STOREFRONT_MANAGED_CONFIG_VERSION='shoporation.storefront-managed-config.v5' as const;
const MANAGED_CONFIG_KEYS:Readonly<Record<string,ReadonlySet<string>>>=Object.freeze({
  'commerce.interactive-scene':new Set(['sceneKey','sceneKind','hotspots','showSetSummary','setTitle','setCtaLabel','setCtaHref','hotspotStyle']),
  'commerce.recipe':new Set(['recipeKey','defaultServings']),
  'commerce.release':new Set(['releaseKey','showCountdown','showStockCount']),
  'guided.finder':new Set(['finderKey']),
  'guided.results':new Set(['finderKey']),
  'guided.explanation':new Set(['finderKey']),
  'composer.builder':new Set(['composerKey']),
  'configurator.builder':new Set(['configuratorKey']),
  'configurator.slot-list':new Set(['configuratorKey']),
  'compatibility.status':new Set(['configuratorKey']),
  'compatibility.evidence':new Set(['configuratorKey']),
});
export function isStorefrontManagedConfigKey(componentKey:string,key:string):boolean{return MANAGED_CONFIG_KEYS[componentKey]?.has(key)===true;}
export function listStorefrontManagedConfigKeys(componentKey:string):readonly string[]{return[...(MANAGED_CONFIG_KEYS[componentKey]??[])];}
