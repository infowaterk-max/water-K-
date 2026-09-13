import {createStorefrontVisualBuilderComponentRegistry,STOREFRONT_BUILDER_REGISTRY_VERSION} from '@/lib/builder/storefront-builder-registry';
import {STOREFRONT_PAGE_SCHEMA_VERSION} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,
  STOREFRONT_TEMPLATE_LAUNCH_TARGET,
  STOREFRONT_TEMPLATE_PORTFOLIO_STATUS,
} from '@/lib/builder/storefront-template-catalog';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_SPECIAL_COMMERCE_TEMPLATE2_ADOPTION_VERSION='shoporation.special-commerce.template2-adoption.wave7.v1' as const;

export const STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES=[
  'scene','room','recipe','release','finder','composer','configurator','compatibility',
] as const;
export type StorefrontSpecialCommerceCapability=typeof STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES[number];
export type StorefrontTemplateCapabilityStatus='required'|'supported'|'optional'|'not applicable';

/**
 * These are references to production component keys, never replacement engines.
 * Entitlement truth is deliberately NOT duplicated here: it is resolved from each
 * real component manifest in the shared Builder registry.
 */
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
const templatePolicy:Readonly<Record<string,Readonly<Record<StorefrontSpecialCommerceCapability,StorefrontTemplateCapabilityStatus>>>>=Object.freeze({
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

const titleCase=(value:string)=>value.split('-').map(part=>part?`${part[0]?.toUpperCase()}${part.slice(1)}`:'').join(' ');
const slugFor=(templateKey:string)=>templateKey.split('.').at(-1)??templateKey;
const categoryFor=(templateKey:string)=>templateKey.split('.')[0]??'unknown';
const walk=(nodes:readonly StorefrontComponentNode[],out:Set<string>)=>{for(const node of nodes){out.add(node.componentKey);walk(node.children??[],out);}};
const isCommerceUsage=(key:string)=>key.startsWith('commerce.')||key.startsWith('guided.')||key.startsWith('composer.')||key.startsWith('configurator.')||key.startsWith('compatibility.');

export type StorefrontTemplate2Wave7InventoryEntry={
  templateKey:string;
  templateName:string;
  category:string;
  templateVersion:number;
  pageSchemaVersion:number;
  pageTypes:readonly string[];
  builderRegistry:string;
  runtimeRenderer:'shared-storefront-runtime-renderer';
  currentCommerceComponentUsage:readonly string[];
  specialCommerceUseCases:readonly StorefrontSpecialCommerceCapability[];
};

export const STOREFRONT_TEMPLATE2_WAVE7_INVENTORY:readonly StorefrontTemplate2Wave7InventoryEntry[]=Object.freeze(
  STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.map(template=>{
    const slug=slugFor(template.manifest.templateKey);
    const policy=templatePolicy[slug];
    if(!policy)throw new Error(`WAVE7_TEMPLATE_POLICY_MISSING:${template.manifest.templateKey}`);
    const usage=new Set<string>();
    for(const page of template.pages)walk(page.sections,usage);
    return Object.freeze({
      templateKey:template.manifest.templateKey,
      templateName:titleCase(slug),
      category:categoryFor(template.manifest.templateKey),
      templateVersion:template.manifest.templateVersion,
      pageSchemaVersion:template.manifest.pageSchemaVersion,
      pageTypes:[...template.manifest.pageTypes],
      builderRegistry:STOREFRONT_BUILDER_REGISTRY_VERSION,
      runtimeRenderer:'shared-storefront-runtime-renderer' as const,
      currentCommerceComponentUsage:[...usage].filter(isCommerceUsage).sort(),
      specialCommerceUseCases:STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES.filter(capability=>policy[capability]!==N),
    });
  }).sort((a,b)=>a.templateKey.localeCompare(b.templateKey)),
);

export type StorefrontTemplate2Wave7MatrixRow=StorefrontTemplate2Wave7InventoryEntry&{
  capabilities:Readonly<Record<StorefrontSpecialCommerceCapability,StorefrontTemplateCapabilityStatus>>;
  plan:'manifest-derived';
};

export const STOREFRONT_TEMPLATE2_WAVE7_CAPABILITY_MATRIX:readonly StorefrontTemplate2Wave7MatrixRow[]=Object.freeze(
  STOREFRONT_TEMPLATE2_WAVE7_INVENTORY.map(entry=>Object.freeze({
    ...entry,
    capabilities:templatePolicy[slugFor(entry.templateKey)]!,
    plan:'manifest-derived' as const,
  })),
);

export function getStorefrontSpecialCommerceCapabilityRequirement(capability:StorefrontSpecialCommerceCapability){
  const registry=createStorefrontVisualBuilderComponentRegistry();
  const definitions=STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS[capability].map(componentKey=>{
    const definition=registry.get(componentKey,1);
    if(!definition)throw new Error(`WAVE7_COMPONENT_NOT_REGISTERED:${componentKey}`);
    return definition;
  });
  const minPlan=definitions.some(definition=>definition.manifest.capability.minPlan==='pro')?'pro':'alap';
  const features=[...new Set(definitions.flatMap(definition=>definition.manifest.capability.features))].sort();
  return Object.freeze({minPlan,features,componentKeys:STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS[capability]});
}

export const STOREFRONT_TEMPLATE2_WAVE7_PORTFOLIO=Object.freeze({
  pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  launchTarget:STOREFRONT_TEMPLATE_LAUNCH_TARGET,
  actualTemplateCount:STOREFRONT_TEMPLATE2_WAVE7_INVENTORY.length,
  remainingTemplateGap:STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.remaining,
  fabricatedEntriesAllowed:false,
  full42ClosurePossible:STOREFRONT_TEMPLATE2_WAVE7_INVENTORY.length===STOREFRONT_TEMPLATE_LAUNCH_TARGET,
});
