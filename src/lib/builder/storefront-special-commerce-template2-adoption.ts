import {createStorefrontVisualBuilderComponentRegistry,STOREFRONT_BUILDER_REGISTRY_VERSION} from '@/lib/builder/storefront-builder-registry';
import {STOREFRONT_PAGE_SCHEMA_VERSION} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,
  STOREFRONT_TEMPLATE_LAUNCH_TARGET,
  STOREFRONT_TEMPLATE_PORTFOLIO_STATUS,
} from '@/lib/builder/storefront-template-catalog';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES,
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS,
  getStorefrontTemplateSpecialCommercePolicy,
  type StorefrontSpecialCommerceCapability,
  type StorefrontTemplateCapabilityStatus,
} from '@/lib/builder/storefront-template-capability-policy';

export {
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES,
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS,
  type StorefrontSpecialCommerceCapability,
  type StorefrontTemplateCapabilityStatus,
} from '@/lib/builder/storefront-template-capability-policy';

export const STOREFRONT_SPECIAL_COMMERCE_TEMPLATE2_ADOPTION_VERSION='shoporation.special-commerce.template2-adoption.wave7.v2' as const;

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
    const policy=getStorefrontTemplateSpecialCommercePolicy(template.manifest.templateKey);
    if(!policy)throw new Error(`WAVE7_TEMPLATE_POLICY_MISSING:${template.manifest.templateKey}`);
    const usage=new Set<string>();
    for(const page of template.pages)walk(page.sections,usage);
    return Object.freeze({
      templateKey:template.manifest.templateKey,
      templateName:titleCase(slugFor(template.manifest.templateKey)),
      category:categoryFor(template.manifest.templateKey),
      templateVersion:template.manifest.templateVersion,
      pageSchemaVersion:template.manifest.pageSchemaVersion,
      pageTypes:[...template.manifest.pageTypes],
      builderRegistry:STOREFRONT_BUILDER_REGISTRY_VERSION,
      runtimeRenderer:'shared-storefront-runtime-renderer' as const,
      currentCommerceComponentUsage:[...usage].filter(isCommerceUsage).sort(),
      specialCommerceUseCases:STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES.filter(capability=>policy[capability]!=='not applicable'),
    });
  }).sort((a,b)=>a.templateKey.localeCompare(b.templateKey)),
);

export type StorefrontTemplate2Wave7MatrixRow=StorefrontTemplate2Wave7InventoryEntry&{
  capabilities:Readonly<Record<StorefrontSpecialCommerceCapability,StorefrontTemplateCapabilityStatus>>;
  plan:'manifest-derived';
};

export const STOREFRONT_TEMPLATE2_WAVE7_CAPABILITY_MATRIX:readonly StorefrontTemplate2Wave7MatrixRow[]=Object.freeze(
  STOREFRONT_TEMPLATE2_WAVE7_INVENTORY.map(entry=>{
    const policy=getStorefrontTemplateSpecialCommercePolicy(entry.templateKey);
    if(!policy)throw new Error(`WAVE7_TEMPLATE_POLICY_MISSING:${entry.templateKey}`);
    return Object.freeze({...entry,capabilities:policy,plan:'manifest-derived' as const});
  }),
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
