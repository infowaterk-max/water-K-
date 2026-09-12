export const STOREFRONT_MANAGED_CONFIG_VERSION='shoporation.storefront-managed-config.v1' as const;

const MANAGED_CONFIG_KEYS:Readonly<Record<string,ReadonlySet<string>>>=Object.freeze({
  'commerce.interactive-scene':new Set([
    'sceneKey',
    'sceneKind',
    'hotspots',
    'showSetSummary',
    'setTitle',
    'setCtaLabel',
    'setCtaHref',
    'hotspotStyle',
  ]),
});

/**
 * Keys edited by a dedicated merchant control rather than the generic StructuredEditor.
 * They remain validated Page Schema config and are never arbitrary raw Builder input.
 */
export function isStorefrontManagedConfigKey(componentKey:string,key:string):boolean{
  return MANAGED_CONFIG_KEYS[componentKey]?.has(key)===true;
}

export function listStorefrontManagedConfigKeys(componentKey:string):readonly string[]{
  return [...(MANAGED_CONFIG_KEYS[componentKey]??[])];
}
