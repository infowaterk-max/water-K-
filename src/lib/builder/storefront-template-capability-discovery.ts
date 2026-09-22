import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {hasStorefrontRuntimeCapability,type StorefrontPageDocument,type StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import type {FeatureCode,PlanCode} from '@/lib/plans/catalog';
import {
  STOREFRONT_CONTEXTUAL_CAPABILITIES,
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES,
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS,
  STOREFRONT_SPECIAL_COMMERCE_CONTEXTS,
  getStorefrontPageSemanticContexts,
  getStorefrontTemplateSpecialCommercePolicy,
  type StorefrontSpecialCommerceCapability,
  type StorefrontTemplateCapabilityStatus,
} from '@/lib/builder/storefront-template-capability-policy';

export const STOREFRONT_TEMPLATE_CAPABILITY_DISCOVERY_VERSION='shoporation.storefront-template-capability-discovery.v1' as const;

export type StorefrontContextualCapabilityOpportunity={
  key:string;
  label:string;
  description:string;
  componentKeys:readonly string[];
  semanticContexts:readonly string[];
  templateStatus:'core'|StorefrontTemplateCapabilityStatus;
  availability:'available'|'locked';
  requiredPlan:PlanCode;
  requiredFeatures:readonly FeatureCode[];
};

const intersects=(left:readonly string[],right:readonly string[])=>left.some(value=>right.includes(value));
const planRank:Record<PlanCode,number>={alap:0,pro:1};

function requirement(componentKeys:readonly string[],pageType:StorefrontPageDocument['pageType']){
  const registry=createStorefrontVisualBuilderComponentRegistry();
  const definitions=componentKeys.flatMap(componentKey=>{
    const definition=registry.get(componentKey,1);
    return definition&&definition.manifest.pageTypes.includes(pageType)?[definition]:[];
  });
  if(!definitions.length)return null;
  const requiredPlan=definitions.reduce<PlanCode>((current,definition)=>planRank[definition.manifest.capability.minPlan]>planRank[current]?definition.manifest.capability.minPlan:current,'alap');
  const requiredFeatures=[...new Set(definitions.flatMap(definition=>definition.manifest.capability.features))] as FeatureCode[];
  return{definitions,requiredPlan,requiredFeatures:Object.freeze(requiredFeatures)};
}

function opportunity(input:{
  key:string;label:string;description:string;componentKeys:readonly string[];contexts:readonly string[];templateStatus:'core'|StorefrontTemplateCapabilityStatus;
},document:StorefrontPageDocument,capability:StorefrontRuntimeCapabilityContext):StorefrontContextualCapabilityOpportunity|null{
  const contexts=getStorefrontPageSemanticContexts(document);
  if(!intersects(contexts,input.contexts))return null;
  const resolved=requirement(input.componentKeys,document.pageType);
  if(!resolved)return null;
  const available=resolved.definitions.every(definition=>hasStorefrontRuntimeCapability(definition.manifest.capability,capability));
  return Object.freeze({
    key:input.key,label:input.label,description:input.description,componentKeys:Object.freeze(resolved.definitions.map(definition=>definition.manifest.componentKey)),semanticContexts:Object.freeze(input.contexts.filter(context=>contexts.includes(context))),templateStatus:input.templateStatus,availability:available?'available':'locked',requiredPlan:resolved.requiredPlan,requiredFeatures:resolved.requiredFeatures,
  });
}

const SPECIAL_LABELS:Record<StorefrontSpecialCommerceCapability,{label:string;description:string}>={
  scene:{label:'Interaktív termékjelenet',description:'Hotspotos Shop the Look / Shop the Setup jellegű Pro felület a közös commerce authorityval.'},
  room:{label:'Shop the Room / tér-összeállítás',description:'Teljes összeállítás vásárlása közös scene + composer motorból.'},
  recipe:{label:'Receptből kosárba',description:'Recept- és termékadatok összekötése a közös Recipe Commerce motorral.'},
  release:{label:'Drop / release commerce',description:'Ütemezett megjelenés és release állapot a valós idő- és készlet-authorityból.'},
  finder:{label:'Vezetett termékkereső',description:'Attribútum-alapú, adatvezérelt választási segítség.'},
  composer:{label:'Többtermékes összeállítás',description:'Szettek és csomagok összeállítása, újraellenőrzött ár- és készletadatokkal.'},
  configurator:{label:'Konfigurátor',description:'Strukturált konfiguráció a közös katalógus- és készletmotor fölött.'},
  compatibility:{label:'Kompatibilitási segédlet',description:'Ellenőrzött kompatibilitási státusz és bizonyíték, találgatás nélkül.'},
};

export function listStorefrontContextualCapabilityOpportunities(input:{document:StorefrontPageDocument;capability:StorefrontRuntimeCapabilityContext}):readonly StorefrontContextualCapabilityOpportunity[]{
  const{document,capability}=input;
  const results:StorefrontContextualCapabilityOpportunity[]=[];
  for(const descriptor of STOREFRONT_CONTEXTUAL_CAPABILITIES){
    const item=opportunity({...descriptor,templateStatus:'core'},document,capability);
    if(item)results.push(item);
  }
  const policy=getStorefrontTemplateSpecialCommercePolicy(document.templateKey);
  if(policy){
    for(const capabilityKey of STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES){
      const templateStatus=policy[capabilityKey];
      if(templateStatus==='not applicable')continue;
      const copy=SPECIAL_LABELS[capabilityKey];
      const item=opportunity({key:`special:${capabilityKey}`,label:copy.label,description:copy.description,componentKeys:STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS[capabilityKey],contexts:STOREFRONT_SPECIAL_COMMERCE_CONTEXTS[capabilityKey],templateStatus},document,capability);
      if(item)results.push(item);
    }
  }
  const seen=new Set<string>();
  return Object.freeze(results.filter(item=>{if(seen.has(item.key))return false;seen.add(item.key);return true;}).sort((a,b)=>Number(a.availability==='locked')-Number(b.availability==='locked')||a.label.localeCompare(b.label,'hu')));
}
