import {
  buildStorefrontTemplateFromFactory,
  evaluateStorefrontFactoryReadiness,
  type StorefrontFactoryDefinition,
} from '@/lib/builder/storefront-template-factory';
import {LOOT_VAULT_FACTORY_DEFINITION} from '@/lib/builder/templates/loot-vault-factory-definition';

export const STOREFRONT_TEMPLATE_FACTORY_DEFINITIONS:readonly StorefrontFactoryDefinition[]=Object.freeze([
  LOOT_VAULT_FACTORY_DEFINITION,
]);

export function getStorefrontTemplateFactoryDefinition(templateKey:string){
  return STOREFRONT_TEMPLATE_FACTORY_DEFINITIONS.find(item=>item.templateKey===templateKey)??null;
}

export function buildStorefrontFactoryCandidate(templateKey:string){
  const definition=getStorefrontTemplateFactoryDefinition(templateKey);
  if(!definition)throw new Error(`TEMPLATE_FACTORY_DEFINITION_MISSING:${templateKey}`);
  return Object.freeze({
    definition,
    readiness:evaluateStorefrontFactoryReadiness(definition),
    template:buildStorefrontTemplateFromFactory(definition),
  });
}
