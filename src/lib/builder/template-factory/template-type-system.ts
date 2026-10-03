import {
  SHARED_STOREFRONT_ENGINE_IDS,
  type StorefrontEngineId,
} from '@/lib/builder/template-factory/engine-functional-proof-registry';
import type {StorefrontTemplateGenome} from '@/lib/builder/template-factory/template-genome';

export const STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION='shoporation.template-type-system.v1' as const;

export const STOREFRONT_TEMPLATE_TYPE_IDS=Object.freeze([
  'fashion','gaming','outdoor','luxury','beauty','b2b','editorial','hobby',
] as const);

export type StorefrontTemplateTypeId=(typeof STOREFRONT_TEMPLATE_TYPE_IDS)[number];
export type StorefrontTemplateDensity='sparse'|'balanced'|'dense'|'mixed';

export type StorefrontTemplateTypeDefinition={
  contract:typeof STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION;
  typeId:StorefrontTemplateTypeId;
  label:string;
  layout:{
    archetypes:readonly string[];
    density:StorefrontTemplateDensity;
    sectionRhythm:string;
  };
  navigation:{
    model:string;
    requiredCapabilities:readonly string[];
  };
  interaction:{
    character:string;
    patterns:readonly string[];
    forbidden:readonly string[];
  };
  content:{
    hierarchy:readonly string[];
    voice:string;
  };
  commerce:{
    journey:string;
    requirements:readonly string[];
  };
  media:{
    language:string;
    roles:readonly string[];
  };
  componentGrammar:{
    families:readonly string[];
    rules:readonly string[];
  };
  engineExpectations:{
    required:readonly StorefrontEngineId[];
    priority:readonly StorefrontEngineId[];
  };
  compatibility:{
    minArchetypeOverlap:1;
    minMediaRoleOverlap:1;
    minComponentFamilyOverlap:1;
  };
};

export type StorefrontTemplateTypeSystemIssue={
  code:string;
  path:string;
  message:string;
  severity:'error';
};

export type StorefrontTemplateTypeSystemValidation={
  valid:boolean;
  issues:readonly StorefrontTemplateTypeSystemIssue[];
};

export type StorefrontTemplateTypeCompatibilityValidation={
  valid:boolean;
  typeId:string;
  definition:StorefrontTemplateTypeDefinition|null;
  overlaps:{
    archetypes:readonly string[];
    mediaRoles:readonly string[];
    componentFamilies:readonly string[];
  };
  issues:readonly StorefrontTemplateTypeSystemIssue[];
};

const issue=(code:string,path:string,message:string):StorefrontTemplateTypeSystemIssue=>({code,path,message,severity:'error'});
const strings=(value:unknown):readonly string[]=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];
const nonEmpty=(value:unknown)=>typeof value==='string'&&value.trim().length>0;
const nonEmptyList=(value:unknown)=>{
  const values=strings(value);
  return values.length>0&&values.every(item=>item.trim().length>0);
};
const uniq=(values:readonly string[])=>new Set(values).size===values.length;
const intersect=(left:readonly string[],right:readonly string[])=>{
  const wanted=new Set(right);
  return Object.freeze([...new Set(left.filter(value=>wanted.has(value)))]);
};
function deepFreeze<T>(value:T):T{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  return value;
}
const define=(value:StorefrontTemplateTypeDefinition)=>deepFreeze(structuredClone(value));

const BASELINE_ENGINES=Object.freeze(['E1','E2','E13'] as const satisfies readonly StorefrontEngineId[]);

export const STOREFRONT_TEMPLATE_TYPE_DEFINITIONS:readonly StorefrontTemplateTypeDefinition[]=Object.freeze([
  define({
    contract:STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,typeId:'fashion',label:'Fashion',
    layout:{archetypes:['editorial-lookbook','collection-grid','campaign-feature','fit-and-detail-pdp'],density:'mixed',sectionRhythm:'editorial breathing room alternating with dense collection discovery'},
    navigation:{model:'collection-and-story',requiredCapabilities:['collection-discovery','search','campaign-entry','account-cart']},
    interaction:{character:'editorial-fluid',patterns:['collection-filtering','variant-selection','quick-discovery'],forbidden:['dashboard-heavy-navigation','unbounded-freeform-motion']},
    content:{hierarchy:['campaign','collection','product','fit-detail','service'],voice:'editorial, aspirational and product-specific'},
    commerce:{journey:'browse-look-select-size-purchase',requirements:['variant-clarity','size-selection','collection-context','persistent-cart-access']},
    media:{language:'editorial campaign imagery with garment detail and styling context',roles:['campaign-hero','lookbook-editorial','collection-product','product-detail','material-detail']},
    componentGrammar:{families:['story.hero','story.feature','commerce.collection-navigation','commerce.product-grid','commerce.product-detail'],rules:['editorial-sections-may-breathe','product-actions-remain-direct']},
    engineExpectations:{required:BASELINE_ENGINES,priority:['E3','E5','E8','E10']},
    compatibility:{minArchetypeOverlap:1,minMediaRoleOverlap:1,minComponentFamilyOverlap:1},
  }),
  define({
    contract:STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,typeId:'gaming',label:'Gaming',
    layout:{archetypes:['cinematic-hero','universe-selector','collector-grid','editorial-feature','fact-led-pdp'],density:'mixed',sectionRhythm:'cinematic discovery alternating with evidence-dense catalog and product facts'},
    navigation:{model:'universe-and-catalog',requiredCapabilities:['universe-discovery','catalog-search','platform-or-compatibility-context','account-cart']},
    interaction:{character:'responsive-collector',patterns:['universe-selection','filtering','comparison','bounded-configuration'],forbidden:['slot-machine-pressure','fake-scarcity-motion']},
    content:{hierarchy:['universe-or-theme','product-identity','compatibility-or-spec','story','purchase'],voice:'informed, atmospheric and evidence-led'},
    commerce:{journey:'discover-verify-fit-select-purchase',requirements:['structured-product-facts','compatibility-clarity','shared-checkout','no-fake-rarity']},
    media:{language:'cinematic worlds plus collector-object and product evidence imagery',roles:['hero-scene','universe-editorial','collector-product','archive-story','supporting-background']},
    componentGrammar:{families:['story.hero','story.feature','commerce.collection-navigation','commerce.product-grid','commerce.key-specs','commerce.specification-groups'],rules:['story-supports-commerce','technical-facts-remain-structured']},
    engineExpectations:{required:BASELINE_ENGINES,priority:['E3','E5','E6','E7','E10']},
    compatibility:{minArchetypeOverlap:1,minMediaRoleOverlap:1,minComponentFamilyOverlap:1},
  }),
  define({
    contract:STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,typeId:'outdoor',label:'Outdoor',
    layout:{archetypes:['adventure-hero','activity-selector','gear-grid','field-guide-feature','spec-led-pdp'],density:'mixed',sectionRhythm:'broad environmental storytelling followed by task-oriented gear selection'},
    navigation:{model:'activity-and-gear',requiredCapabilities:['activity-discovery','category-navigation','compatibility-or-use-case-filtering','account-cart']},
    interaction:{character:'purposeful-exploration',patterns:['activity-selection','guided-finder','comparison','spec-expansion'],forbidden:['decorative-interaction-without-use-case','hidden-core-specs']},
    content:{hierarchy:['activity','need','gear','technical-proof','service'],voice:'practical, capable and experience-aware'},
    commerce:{journey:'choose-activity-narrow-gear-verify-spec-purchase',requirements:['use-case-context','spec-comparison','compatibility-clarity','shared-checkout']},
    media:{language:'environmental use-case imagery balanced by clear gear and detail evidence',roles:['adventure-hero','activity-editorial','gear-product','in-use-detail','technical-detail']},
    componentGrammar:{families:['story.hero','commerce.guided-finder','commerce.product-grid','commerce.key-specs','commerce.specification-groups'],rules:['use-case-before-complexity','technical-details-stay-reachable']},
    engineExpectations:{required:BASELINE_ENGINES,priority:['E3','E6','E7','E8','E10']},
    compatibility:{minArchetypeOverlap:1,minMediaRoleOverlap:1,minComponentFamilyOverlap:1},
  }),
  define({
    contract:STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,typeId:'luxury',label:'Luxury',
    layout:{archetypes:['statement-hero','curated-collection','craft-feature','concierge-proof','detail-led-pdp'],density:'sparse',sectionRhythm:'large intentional pauses with selective high-information craft moments'},
    navigation:{model:'curated-and-concierge',requiredCapabilities:['curated-discovery','search','service-or-concierge-entry','account-cart']},
    interaction:{character:'restrained-premium',patterns:['subtle-reveal','curated-selection','detail-expansion'],forbidden:['gamified-pressure','busy-dashboard-patterns']},
    content:{hierarchy:['brand-or-object','craft','provenance','product','service'],voice:'precise, restrained and provenance-aware'},
    commerce:{journey:'discover-understand-craft-select-purchase',requirements:['premium-product-detail','service-confidence','shared-checkout','no-false-exclusivity']},
    media:{language:'art-directed object, craft and material imagery with controlled negative space',roles:['statement-hero','curated-product','craft-detail','material-detail','service-editorial']},
    componentGrammar:{families:['story.hero','story.feature','commerce.product-grid','commerce.product-detail','commerce.key-specs'],rules:['fewer-stronger-sections','commerce-actions-remain-unambiguous']},
    engineExpectations:{required:BASELINE_ENGINES,priority:['E7','E10']},
    compatibility:{minArchetypeOverlap:1,minMediaRoleOverlap:1,minComponentFamilyOverlap:1},
  }),
  define({
    contract:STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,typeId:'beauty',label:'Beauty',
    layout:{archetypes:['ritual-hero','concern-selector','routine-builder','ingredient-feature','benefit-led-pdp'],density:'balanced',sectionRhythm:'soft editorial education alternating with guided product/routine choice'},
    navigation:{model:'concern-and-routine',requiredCapabilities:['concern-discovery','routine-navigation','search','account-cart']},
    interaction:{character:'guided-calm',patterns:['guided-finder','routine-selection','variant-selection','ingredient-expansion'],forbidden:['medical-claim-gamification','fake-before-after-pressure']},
    content:{hierarchy:['concern-or-goal','routine','product','ingredients-or-benefits','purchase'],voice:'clear, reassuring and claim-disciplined'},
    commerce:{journey:'identify-goal-build-routine-verify-product-purchase',requirements:['guided-discovery','variant-clarity','claim-discipline','shared-checkout']},
    media:{language:'clean product, texture, routine and ingredient-context imagery',roles:['ritual-hero','routine-editorial','beauty-product','texture-detail','ingredient-detail']},
    componentGrammar:{families:['story.hero','commerce.guided-finder','commerce.product-grid','commerce.product-detail','story.feature'],rules:['education-supports-selection','claims-never-outpace-product-data']},
    engineExpectations:{required:BASELINE_ENGINES,priority:['E3','E5','E8','E10']},
    compatibility:{minArchetypeOverlap:1,minMediaRoleOverlap:1,minComponentFamilyOverlap:1},
  }),
  define({
    contract:STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,typeId:'b2b',label:'B2B',
    layout:{archetypes:['solution-hero','industry-selector','capability-grid','proof-feature','spec-and-quote-pdp'],density:'dense',sectionRhythm:'business context followed by structured capability, evidence and transaction detail'},
    navigation:{model:'solution-and-account',requiredCapabilities:['solution-discovery','catalog-or-service-search','quote-or-contact','account']},
    interaction:{character:'task-efficient',patterns:['guided-selection','comparison','configuration','quote-request'],forbidden:['consumer-pressure-patterns','decorative-blocking-motion']},
    content:{hierarchy:['business-need','solution','evidence','specification','commercial-action'],voice:'professional, explicit and evidence-oriented'},
    commerce:{journey:'identify-need-configure-or-compare-quote-or-order',requirements:['company-context','structured-specs','quote-capability','account-continuity']},
    media:{language:'solution, deployment, product and evidence imagery with low decoration',roles:['solution-hero','industry-context','product-or-system','evidence-detail','implementation-context']},
    componentGrammar:{families:['story.hero','commerce.guided-finder','commerce.comparison','commerce.specification-groups','support.contact-form'],rules:['task-completion-first','business-evidence-before-decoration']},
    engineExpectations:{required:BASELINE_ENGINES,priority:['E4','E5','E7','E9','E11']},
    compatibility:{minArchetypeOverlap:1,minMediaRoleOverlap:1,minComponentFamilyOverlap:1},
  }),
  define({
    contract:STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,typeId:'editorial',label:'Editorial',
    layout:{archetypes:['editorial-hero','story-index','topic-feature','article-depth','contextual-commerce'],density:'mixed',sectionRhythm:'strong story pacing with intentionally placed discovery and commerce bridges'},
    navigation:{model:'topic-and-story',requiredCapabilities:['topic-navigation','search','story-index','account-or-commerce-entry']},
    interaction:{character:'reading-first',patterns:['topic-filtering','progressive-reading','contextual-discovery'],forbidden:['commerce-interruption-overload','dashboard-density']},
    content:{hierarchy:['story','topic','evidence','related-content','contextual-product'],voice:'editorial, structured and source-aware'},
    commerce:{journey:'read-discover-context-evaluate-purchase',requirements:['commerce-remains-contextual','product-truth-remains-shared','shared-checkout']},
    media:{language:'story-led editorial imagery with documentary or subject-specific context',roles:['editorial-hero','story-feature','article-inline','subject-detail','contextual-product']},
    componentGrammar:{families:['story.hero','story.feature','content.article','commerce.product-grid','commerce.product-detail'],rules:['reading-flow-primary','commerce-does-not-overwrite-story-authority']},
    engineExpectations:{required:BASELINE_ENGINES,priority:['E10']},
    compatibility:{minArchetypeOverlap:1,minMediaRoleOverlap:1,minComponentFamilyOverlap:1},
  }),
  define({
    contract:STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION,typeId:'hobby',label:'Hobby',
    layout:{archetypes:['passion-hero','project-selector','product-grid','how-to-feature','configuration-led-pdp'],density:'balanced',sectionRhythm:'enthusiasm-led discovery alternating with practical project and product detail'},
    navigation:{model:'project-and-category',requiredCapabilities:['project-discovery','category-navigation','guided-selection','account-cart']},
    interaction:{character:'hands-on-guided',patterns:['project-selection','guided-finder','configuration','comparison'],forbidden:['random-gamification','hidden-required-accessories']},
    content:{hierarchy:['project-or-interest','need','product','how-to','purchase'],voice:'enthusiastic, practical and instructional'},
    commerce:{journey:'choose-project-find-parts-verify-fit-purchase',requirements:['guided-discovery','compatibility-or-parts-clarity','structured-product-detail','shared-checkout']},
    media:{language:'project context, hands-on use, product and detail imagery',roles:['passion-hero','project-editorial','hobby-product','in-use-detail','parts-detail']},
    componentGrammar:{families:['story.hero','commerce.guided-finder','commerce.product-grid','commerce.product-detail','story.feature'],rules:['projects-guide-commerce','instructions-do-not-replace-product-truth']},
    engineExpectations:{required:BASELINE_ENGINES,priority:['E3','E4','E5','E7','E10']},
    compatibility:{minArchetypeOverlap:1,minMediaRoleOverlap:1,minComponentFamilyOverlap:1},
  }),
]);

export function validateStorefrontTemplateTypeSystemCatalog(
  catalog:readonly StorefrontTemplateTypeDefinition[]=STOREFRONT_TEMPLATE_TYPE_DEFINITIONS,
):StorefrontTemplateTypeSystemValidation{
  const issues:StorefrontTemplateTypeSystemIssue[]=[];
  const supported=new Set<string>(STOREFRONT_TEMPLATE_TYPE_IDS);
  const engineIds=new Set<string>(SHARED_STOREFRONT_ENGINE_IDS);
  const seen=new Set<string>();

  for(const[index,definition]of catalog.entries()){
    const base=`catalog[${index}]`;
    if(definition.contract!==STOREFRONT_TEMPLATE_TYPE_SYSTEM_VERSION)issues.push(issue('TEMPLATE_TYPE_CONTRACT_INVALID',`${base}.contract`,'Template Type contract version is unsupported.'));
    if(!supported.has(definition.typeId))issues.push(issue('TEMPLATE_TYPE_ID_UNSUPPORTED',`${base}.typeId`,'Template Type ID is outside the canonical supported set.'));
    if(seen.has(definition.typeId))issues.push(issue('TEMPLATE_TYPE_ID_DUPLICATE',`${base}.typeId`,'Template Type IDs must be unique.'));
    seen.add(definition.typeId);
    if(!nonEmpty(definition.label))issues.push(issue('TEMPLATE_TYPE_LABEL_REQUIRED',`${base}.label`,'Template Type label is required.'));

    const scalarChecks:[string,unknown][]=[
      ['layout.sectionRhythm',definition.layout.sectionRhythm],
      ['navigation.model',definition.navigation.model],
      ['interaction.character',definition.interaction.character],
      ['content.voice',definition.content.voice],
      ['commerce.journey',definition.commerce.journey],
      ['media.language',definition.media.language],
    ];
    for(const[path,value]of scalarChecks)if(!nonEmpty(value))issues.push(issue('TEMPLATE_TYPE_SEMANTIC_REQUIRED',`${base}.${path}`,`${path} must be explicit.`));

    const listChecks:[string,unknown][]=[
      ['layout.archetypes',definition.layout.archetypes],
      ['navigation.requiredCapabilities',definition.navigation.requiredCapabilities],
      ['interaction.patterns',definition.interaction.patterns],
      ['interaction.forbidden',definition.interaction.forbidden],
      ['content.hierarchy',definition.content.hierarchy],
      ['commerce.requirements',definition.commerce.requirements],
      ['media.roles',definition.media.roles],
      ['componentGrammar.families',definition.componentGrammar.families],
      ['componentGrammar.rules',definition.componentGrammar.rules],
      ['engineExpectations.required',definition.engineExpectations.required],
      ['engineExpectations.priority',definition.engineExpectations.priority],
    ];
    for(const[path,value]of listChecks)if(!nonEmptyList(value))issues.push(issue('TEMPLATE_TYPE_SEMANTIC_LIST_REQUIRED',`${base}.${path}`,`${path} requires at least one explicit value.`));

    const engines=[...definition.engineExpectations.required,...definition.engineExpectations.priority];
    for(const engineId of engines)if(!engineIds.has(engineId))issues.push(issue('TEMPLATE_TYPE_ENGINE_UNKNOWN',`${base}.engineExpectations`,`Engine expectation ${engineId} is not a canonical shared storefront engine.`));
    if(!uniq(engines))issues.push(issue('TEMPLATE_TYPE_ENGINE_DUPLICATE',`${base}.engineExpectations`,'Required and priority engine expectations must not contain duplicates.'));
  }

  for(const typeId of STOREFRONT_TEMPLATE_TYPE_IDS){
    if(!seen.has(typeId))issues.push(issue('TEMPLATE_TYPE_DEFINITION_MISSING',`catalog.${typeId}`,'Every supported Template Type requires exactly one canonical definition.'));
  }
  return Object.freeze({valid:issues.length===0,issues:Object.freeze(issues)});
}

export function getStorefrontTemplateTypeDefinition(typeId:string):StorefrontTemplateTypeDefinition|null{
  return STOREFRONT_TEMPLATE_TYPE_DEFINITIONS.find(item=>item.typeId===typeId)??null;
}

export function validateStorefrontTemplateTypeCompatibility(input:{
  category:string;
  genome?:StorefrontTemplateGenome|null;
}):StorefrontTemplateTypeCompatibilityValidation{
  const issues:StorefrontTemplateTypeSystemIssue[]=[];
  const definition=getStorefrontTemplateTypeDefinition(input.category);
  const empty=Object.freeze([] as string[]);
  if(!definition){
    return Object.freeze({
      valid:false,typeId:input.category,definition:null,
      overlaps:{archetypes:empty,mediaRoles:empty,componentFamilies:empty},
      issues:Object.freeze([issue('TEMPLATE_TYPE_UNSUPPORTED','category','Generator-ready production requires a supported canonical Template Type.')]),
    });
  }
  if(!input.genome){
    return Object.freeze({
      valid:false,typeId:input.category,definition,
      overlaps:{archetypes:empty,mediaRoles:empty,componentFamilies:empty},
      issues:Object.freeze([issue('TEMPLATE_TYPE_GENOME_REQUIRED','genome','Template Type compatibility requires the canonical Template Genome.')]),
    });
  }

  if(input.genome.identity.category!==definition.typeId){
    issues.push(issue('TEMPLATE_TYPE_GENOME_CATEGORY_DRIFT','genome.identity.category','Template Genome category must match the selected canonical Template Type.'));
  }
  const archetypes=intersect(input.genome.dimensions.composition.archetypes,definition.layout.archetypes);
  const mediaRoles=intersect(input.genome.dimensions.image.roles,definition.media.roles);
  const componentFamilies=intersect(input.genome.dimensions.componentGrammar.preferred,definition.componentGrammar.families);

  if(archetypes.length<definition.compatibility.minArchetypeOverlap)issues.push(issue('TEMPLATE_TYPE_ARCHETYPE_INCOMPATIBLE','genome.dimensions.composition.archetypes','Template Genome requires meaningful composition archetype overlap with the selected type.'));
  if(mediaRoles.length<definition.compatibility.minMediaRoleOverlap)issues.push(issue('TEMPLATE_TYPE_MEDIA_ROLE_INCOMPATIBLE','genome.dimensions.image.roles','Template Genome requires meaningful semantic media-role overlap with the selected type.'));
  if(componentFamilies.length<definition.compatibility.minComponentFamilyOverlap)issues.push(issue('TEMPLATE_TYPE_COMPONENT_GRAMMAR_INCOMPATIBLE','genome.dimensions.componentGrammar.preferred','Template Genome requires meaningful component-family overlap with the selected type.'));

  return Object.freeze({
    valid:issues.length===0,
    typeId:definition.typeId,
    definition,
    overlaps:{archetypes,mediaRoles,componentFamilies},
    issues:Object.freeze(issues),
  });
}
