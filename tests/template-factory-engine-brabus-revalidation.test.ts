import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  SHARED_E13_FUNCTIONAL_PROOF_CONTRACT,
  SHARED_STOREFRONT_ENGINE_IDS,
  STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY,
  STOREFRONT_ENGINE_BRABUS_REVALIDATION,
  STOREFRONT_ENGINE_BRABUS_REVALIDATION_TEST_PRODUCER,
  STOREFRONT_E13_BRABUS_REVALIDATION_PRODUCER,
  validateStorefrontEngineFunctionalProofRegistry,
} from '@/lib/builder/template-factory/engine-functional-proof-registry';
import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  defineStorefrontBuilderComponent,
} from '@/lib/builder/storefront-foundation';
import {
  StorefrontComponentRegistry,
  applyStorefrontBindings,
  resolveStorefrontPageDocument,
  validateStorefrontPageDocument,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {
  PRODUCT_DISCOVERY_AUTHORITY_CONTRACT,
  runProductDiscovery,
} from '@/lib/commerce/product-discovery';
import {
  StructuredProductSpecificationRegistry,
  buildStructuredProductComparison,
} from '@/lib/commerce/structured-product';
import {
  GUIDED_FINDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  runGuidedFinder,
  validateFinderSelections,
  type FinderCandidate,
  type GuidedFinderConfig,
} from '@/lib/commerce/guided-finder';
import {
  MULTI_PRODUCT_COMPOSER_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  buildComposerAddIntent,
  validateComposerSelections,
  type ComposerCatalogItem,
  type MultiProductComposerConfig,
} from '@/lib/commerce/multi-product-composer';
import {
  PRODUCT_CONFIGURATOR_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  buildConfiguratorAddIntent,
  buildConfiguratorReadModel,
  type ConfiguratorCatalogPart,
  type ProductConfiguratorConfig,
} from '@/lib/commerce/product-configurator';
import {
  COMPATIBILITY_AUTHORITY_CONTRACT,
  evaluateCompatibility,
  validateCompatibilityRules,
  type CompatibilityPart,
  type CompatibilityRule,
} from '@/lib/commerce/compatibility-engine';
import {
  CONTEXT_PROFILE_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  CONTEXT_RUNTIME_CONTRACT,
  DEFAULT_CONTEXT_TYPE_REGISTRY,
  buildContextAwareDiscovery,
  buildContextProfileSaveIntent,
  switchActiveContext,
  validateContextProfile,
  type ContextProfile,
} from '@/lib/commerce/context-profile';
import {
  RETENTION_REORDER_RUNTIME_CONTRACT,
  RETENTION_REORDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  buildReorderCartIntent,
  buildReorderReadModel,
  type ReorderAuthoritySnapshot,
} from '@/lib/commerce/retention-reorder';
import {
  PROFESSIONAL_B2B_SERVER_AUTHORITIES,
  PROFESSIONAL_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  buildProfessionalProductReadModel,
  buildProfessionalQuantityHint,
  validateProfessionalProductAuthority,
  type ProfessionalProductAuthoritySnapshot,
} from '@/lib/commerce/professional-b2b';
import {
  STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  buildStoryReadModel,
  validateStoryDocument,
  type StoryDocument,
} from '@/lib/content/story-engine';

const clone=<T>(value:T):T=>structuredClone(value);

const sectionManifest=defineStorefrontBuilderComponent({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  componentKey:'brabus.section',
  componentVersion:1,
  schemaSlot:'page.sections',
  pageTypes:['home'],
  configurable:['tone'] as const,
  responsiveMode:'container',
  capability:{minPlan:'alap',features:[]},
} as const);
const headingManifest=defineStorefrontBuilderComponent({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  componentKey:'brabus.heading',
  componentVersion:1,
  schemaSlot:'section.children',
  pageTypes:['home'],
  configurable:['text'] as const,
  responsiveMode:'fixed',
  capability:{minPlan:'alap',features:[]},
} as const);
const runtimeRegistry=()=>new StorefrontComponentRegistry()
  .register({manifest:sectionManifest,allowsChildren:true,allowedChildren:['brabus.heading']})
  .register({manifest:headingManifest,bindingSlots:['text']});
const runtimePage=():StorefrontPageDocument=>({
  schemaVersion:1,
  pageKey:'brabus.home',
  pageType:'home',
  templateKey:'brabus.revalidation',
  templateVersion:1,
  sections:[{
    id:'hero',
    componentKey:'brabus.section',
    componentVersion:1,
    config:{tone:'quiet'},
    responsive:{desktop:{gridSpan:12},tablet:{gridSpan:8},mobile:{gridSpan:6}},
    children:[{
      id:'hero-title',
      componentKey:'brabus.heading',
      componentVersion:1,
      config:{text:'Fallback'},
      bindings:{text:{path:'brand.name',fallback:'Store'}},
    }],
  }],
});

const specRegistry=new StructuredProductSpecificationRegistry({
  groups:[{key:'core',label:'Core',order:1}],
  specs:[
    {key:'platform',label:'Platform',groupKey:'core',valueType:'enum',scope:'product',enumOptions:['pro','home'],filterable:true,comparable:true,order:1},
    {key:'weight',label:'Weight',groupKey:'core',valueType:'measurement',scope:'product',unitFamily:'mass',filterable:true,comparable:true,order:2},
  ],
});

const finderConfig:GuidedFinderConfig={
  version:1,tenantId:'tenant-brabus',finderKey:'proof-finder',label:'Proof Finder',safetyPolicy:'non-diagnostic',
  partialPolicy:'show-nearest',maxResults:4,
  steps:[{id:'preferences',title:'Preferences',questions:[
    {id:'texture',label:'Texture?',mode:'single',required:true,options:[
      {id:'gel',label:'Gel',rules:[{id:'rule-texture-gel',attributeKey:'texture',operator:'eq',value:'gel',kind:'required',reason:'Gel selected.'}]},
      {id:'cream',label:'Cream',rules:[{id:'rule-texture-cream',attributeKey:'texture',operator:'eq',value:'cream',kind:'required',reason:'Cream selected.'}]},
    ]},
    {id:'finish',label:'Finish?',mode:'multi',options:[
      {id:'light',label:'Light',rules:[{id:'rule-light',attributeKey:'finish',operator:'includes',value:'light',kind:'preferred',weight:3,reason:'Light preferred.'}]},
      {id:'fragrance-free',label:'Fragrance free',rules:[{id:'rule-fragrance',attributeKey:'fragrance-free',operator:'eq',value:true,kind:'preferred',weight:5,reason:'Fragrance free preferred.'}]},
    ]},
  ]}],
};
const finderCandidates:FinderCandidate[]=[
  {id:'a',label:'Cloud Gel',href:'/termek/cloud-gel',eligible:true,attributes:{texture:'gel',finish:['light'],'fragrance-free':true}},
  {id:'b',label:'Rich Gel',href:'/termek/rich-gel',eligible:true,attributes:{texture:'gel',finish:['rich'],'fragrance-free':false}},
  {id:'hidden',label:'Hidden Gel',href:'/termek/hidden',eligible:false,attributes:{texture:'gel',finish:['light'],'fragrance-free':true}},
];

const composerConfig:MultiProductComposerConfig={
  version:1,tenantId:'tenant-brabus',composerKey:'box',label:'Box',mode:'pool',minItems:2,maxItems:4,duplicateLimit:2,
};
const composerCatalog:ComposerCatalogItem[]=[
  {productId:'tomato',variantId:'jar-1',label:'Tomato',href:'/termek/tomato',eligible:true,channelVisible:true,price:{amountMinor:2290,currency:'HUF',display:'2 290 Ft',source:'shared-pricing-authority'},stock:{available:true,statusLabel:'Raktáron'}},
  {productId:'olive',variantId:'jar-1',label:'Olive',href:'/termek/olive',eligible:true,channelVisible:true,price:{amountMinor:1890,currency:'HUF',display:'1 890 Ft',source:'shared-pricing-authority'},stock:{available:true,statusLabel:'Raktáron'}},
];

const configuratorConfig:ProductConfiguratorConfig={
  version:1,tenantId:'tenant-brabus',configuratorKey:'rig',label:'Rig',
  slots:[{id:'cpu',label:'CPU',required:true},{id:'motherboard',label:'Motherboard',required:true}],
};
const configuratorCatalog:ConfiguratorCatalogPart[]=[
  {productId:'cpu-am5',variantId:'v1',label:'CPU',href:'/termek/cpu',slotIds:['cpu'],eligible:true,channelVisible:true,price:{amountMinor:129900,currency:'HUF',display:'129 900 Ft',source:'shared-pricing-authority'},stock:{available:true,label:'Raktáron'},compatibility:{socket:{specKey:'socket',source:'compare-spec-engine.v1',value:{type:'enum',value:'AM5'}}}},
  {productId:'mb-am5',variantId:'v1',label:'Motherboard',href:'/termek/mb',slotIds:['motherboard'],eligible:true,channelVisible:true,price:{amountMinor:89900,currency:'HUF',display:'89 900 Ft',source:'shared-pricing-authority'},stock:{available:true,label:'Raktáron'},compatibility:{socket:{specKey:'socket',source:'compare-spec-engine.v1',value:{type:'enum',value:'AM5'}}}},
];
const compatibilityRules:CompatibilityRule[]=[{
  id:'socket-match',label:'Socket',kind:'required',operator:'eq',
  left:{slotId:'cpu',specKey:'socket'},right:{slotId:'motherboard',specKey:'socket'},
  compatibleReason:'Socket matches.',incompatibleReason:'Socket mismatch.',unknownReason:'Socket unknown.',
}];
const compatibilityParts:CompatibilityPart[]=[
  {slotId:'cpu',productId:'cpu-am5',variantId:'v1',label:'CPU',specs:{socket:{specKey:'socket',source:'compare-spec-engine.v1',value:{type:'enum',value:'AM5'}}}},
  {slotId:'motherboard',productId:'mb-am5',variantId:'v1',label:'Motherboard',specs:{socket:{specKey:'socket',source:'compare-spec-engine.v1',value:{type:'enum',value:'AM5'}}}},
];

const petProfile:ContextProfile={
  profileId:'pet-luna',typeKey:'pet',label:'Luna',ownerScope:'customer',saved:true,
  attributes:{species:'dog',size:'m','life-stage':'adult','weight-kg':12,preferences:['snack','outdoor']},
};

const reorderSnapshot:ReorderAuthoritySnapshot={
  authority:'server-retention-authority',journeyKind:'replenishment',journeyId:'journey-1',signal:'due',
  profileId:'pet-luna',productId:'food-1',variantId:'bag-2kg',label:'Daily Food',href:'/termek/daily-food',
  previousQuantity:2,channelVisible:true,eligible:true,
  price:{amountMinor:6990,currency:'HUF',display:'6 990 Ft',source:'shared-pricing-authority'},
  stock:{available:true,label:'Raktáron'},minimumQuantity:2,orderMultiple:2,
};

const story:StoryDocument={
  version:1,id:'story-brabus',slug:'brabus-origin',storyType:'origin',status:'published',
  title:'Verified origin',excerpt:'Proof',author:{id:'author',name:'Author'},
  taxonomy:{categories:['Materials'],tags:['gold']},publishedAt:'2026-09-29T08:00:00Z',
  relations:[
    {id:'origin',type:'origin',entityId:'origin-1',label:'Origin',href:'/eredet/1',verified:true},
    {id:'product',type:'product',entityId:'product-1',label:'Product',href:'/termek/proof'},
  ],
  blocks:[
    {id:'intro',type:'prose',text:'Safe content.'},
    {id:'claim',type:'provenance',title:'Origin',claims:[{label:'Material',value:'18K gold',originRelationId:'origin'}]},
  ],
};

const professionalProduct:ProfessionalProductAuthoritySnapshot={
  authority:'server',productId:'p-1',variantId:'v-1',sku:'TD-001',name:'Pro Drill',href:'/termek/pro-drill',
  channelVisible:true,stockQuantity:14,stockLabel:'14 db raktáron',
  displayNetPrice:'99 900 Ft + ÁFA',displayGrossPrice:'126 873 Ft',priceAuthority:'partner',
  minimumQuantity:2,orderMultiple:2,canRequestQuote:true,
};

describe('Template Engine Brabus current-stack revalidation',()=>{
  it('keeps one canonical engine registry and leaves E12 reserved',()=>{
    const validation=validateStorefrontEngineFunctionalProofRegistry();
    expect(validation.ok,validation.issues.join(',')).toBe(true);
    expect(STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY.map(item=>item.engineId)).toEqual(SHARED_STOREFRONT_ENGINE_IDS);
    expect(SHARED_STOREFRONT_ENGINE_IDS).not.toContain('E12');
    expect(STOREFRONT_ENGINE_BRABUS_REVALIDATION.map(item=>item.engineId)).toEqual(SHARED_STOREFRONT_ENGINE_IDS);
    expect(STOREFRONT_ENGINE_BRABUS_REVALIDATION.every(item=>item.state==='PROVEN'&&Boolean(item.proofProducer))).toBe(true);
    expect(STOREFRONT_ENGINE_BRABUS_REVALIDATION.filter(item=>item.engineId!=='E13').every(item=>item.proofProducer===STOREFRONT_ENGINE_BRABUS_REVALIDATION_TEST_PRODUCER&&item.proofProducer!==item.retainedProofProducer)).toBe(true);
    expect(STOREFRONT_ENGINE_BRABUS_REVALIDATION.find(item=>item.engineId==='E13')?.proofProducer).toBe(STOREFRONT_E13_BRABUS_REVALIDATION_PRODUCER);
    expect(STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY.every(item=>item.productionMutationAllowed===false)).toBe(true);
  });

  it('E1 revalidates canonical schema, binding and responsive runtime fail-closed behavior without mutating input',()=>{
    const document=runtimePage();
    const before=clone(document);
    const valid=validateStorefrontPageDocument(document,runtimeRegistry(),{plan:'alap',features:[]});
    expect(valid.ok,JSON.stringify(valid.violations)).toBe(true);
    expect(applyStorefrontBindings(document.sections[0].children![0],{brand:{name:'Brabus'}}).text).toBe('Brabus');
    const desktop=resolveStorefrontPageDocument(document,'desktop',{brand:{name:'Brabus'}});
    const mobile=resolveStorefrontPageDocument(document,'mobile',{brand:{name:'Brabus'}});
    expect(desktop[0].resolved.gridSpan).toBe(12);
    expect(mobile[0].resolved.gridSpan).toBe(6);
    expect(document).toEqual(before);

    const invalid=clone(document);
    invalid.sections[0].children![0].id='hero';
    invalid.sections[0].children![0].bindings={text:{path:'window.location'}};
    const rejected=validateStorefrontPageDocument(invalid,runtimeRegistry(),{plan:'alap',features:[]});
    expect(rejected.ok).toBe(false);
    expect(rejected.violations.map(item=>item.code)).toEqual(expect.arrayContaining(['NODE_ID_DUPLICATE','BINDING_PATH_NOT_ALLOWED']));
  });

  it('E2 revalidates deterministic explainable discovery under candidate reordering and preserves commerce inputs',()=>{
    const candidates=[
      {productId:'p-alpha',variantId:'v-alpha',label:'Alpha Kit',href:'/termek/alpha',categoryKeys:['kits'],searchTerms:['automation'],productValues:{platform:{type:'enum' as const,value:'pro'}},eligibility:{productActive:true,variantActive:true,channelVisible:true,sellable:true},recommendationSignals:['featured']},
      {productId:'p-beta',variantId:'v-beta',label:'Beta Kit',href:'/termek/beta',categoryKeys:['kits'],searchTerms:['automation'],productValues:{platform:{type:'enum' as const,value:'home'}},eligibility:{productActive:true,variantActive:true,channelVisible:true,sellable:true}},
      {productId:'p-hidden',variantId:'v-hidden',label:'Hidden',href:'/termek/hidden',categoryKeys:['kits'],productValues:{platform:{type:'enum' as const,value:'home'}},eligibility:{productActive:true,variantActive:true,channelVisible:false,sellable:true}},
    ];
    const before=clone(candidates);
    const query={text:'kit',categoryKeys:['kits'],boosts:[{signalKey:'featured',weight:20,reason:'Featured'}]};
    const first=runProductDiscovery({registry:specRegistry,query,candidates})!;
    const second=runProductDiscovery({registry:specRegistry,query,candidates:[...candidates].reverse()})!;
    expect(first.results.map(item=>item.productId)).toEqual(second.results.map(item=>item.productId));
    expect(first.exclusions).toContainEqual(expect.objectContaining({productId:'p-hidden'}));
    expect(first.results[0]?.evidence.length).toBeGreaterThan(0);
    expect(candidates).toEqual(before);
    expect(PRODUCT_DISCOVERY_AUTHORITY_CONTRACT).toMatchObject({catalogMutation:false,pricingAuthority:false,inventoryMutation:false,customerMutation:false,orderMutation:false});
  });

  it('E3 revalidates deterministic guidance, selection validation, evidence and template-switch boundaries',()=>{
    const before=clone(finderCandidates);
    const selections={texture:['gel'],finish:['light','fragrance-free']};
    const first=runGuidedFinder({config:finderConfig,selections,candidates:finderCandidates})!;
    const second=runGuidedFinder({config:finderConfig,selections,candidates:[...finderCandidates].reverse()})!;
    expect(first.results.map(item=>item.id)).toEqual(second.results.map(item=>item.id));
    expect(first.results[0]?.evidence.length).toBeGreaterThan(0);
    expect(first.results.some(item=>item.id==='hidden')).toBe(false);
    expect(validateFinderSelections(finderConfig,{texture:[]}).some(item=>item.code==='FINDER_REQUIRED_ANSWER_MISSING')).toBe(true);
    expect(finderCandidates).toEqual(before);
    expect(GUIDED_FINDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY.orders).toBe(false);
  });

  it('E4 revalidates real catalog lines, atomic intent, current stock validation and no silent replacement',()=>{
    const selection=[{productId:'tomato',variantId:'jar-1',quantity:1},{productId:'olive',variantId:'jar-1',quantity:1}] as const;
    const before=clone(composerCatalog);
    const intent=buildComposerAddIntent('box-1',{config:composerConfig,selections:selection,catalog:composerCatalog})!;
    expect(intent).toMatchObject({atomic:true,silentReplacementAllowed:false});
    expect(intent.requiredRevalidation).toEqual(['composer-eligibility','channel','price','stock']);
    const stale=[{...composerCatalog[0],stock:{available:false,statusLabel:'Elfogyott'}},composerCatalog[1]];
    expect(validateComposerSelections({config:composerConfig,selections:selection,catalog:stale}).some(item=>item.code==='COMPOSER_ITEM_OUT_OF_STOCK')).toBe(true);
    expect(buildComposerAddIntent('box-1',{config:composerConfig,selections:selection,catalog:stale})).toBeNull();
    expect(composerCatalog).toEqual(before);
    expect(MULTI_PRODUCT_COMPOSER_TEMPLATE_SWITCH_MUTATION_BOUNDARY.orders).toBe(false);
  });

  it('E5 revalidates slot/compatibility fail-closed behavior, server revalidation and no silent replacement',()=>{
    const selections=[{slotId:'cpu',productId:'cpu-am5',variantId:'v1'},{slotId:'motherboard',productId:'mb-am5',variantId:'v1'}] as const;
    const input={config:configuratorConfig,selections,catalog:configuratorCatalog,compatibilityRules};
    const before=clone(configuratorCatalog);
    expect(buildConfiguratorReadModel(input)).toMatchObject({status:'ready',requiresServerRevalidation:true});
    const intent=buildConfiguratorAddIntent('rig-1',input)!;
    expect(intent).toMatchObject({atomic:true,silentReplacementAllowed:false,compatibilityAuthority:'server-authoritative-final-validation'});
    const unknownRules=[{...compatibilityRules[0],right:{slotId:'motherboard',specKey:'missing-spec'}}];
    const unknown={...input,compatibilityRules:unknownRules};
    expect(buildConfiguratorReadModel(unknown).status).toBe('unknown');
    expect(buildConfiguratorAddIntent('rig-1',unknown)).toBeNull();
    expect(configuratorCatalog).toEqual(before);
    expect(PRODUCT_CONFIGURATOR_TEMPLATE_SWITCH_MUTATION_BOUNDARY.orders).toBe(false);
  });

  it('E6 revalidates structured explanations, Unknown-not-Compatible and malformed-rule fail-closed semantics',()=>{
    const before=clone(compatibilityParts);
    const compatible=evaluateCompatibility({rules:compatibilityRules,parts:compatibilityParts})!;
    expect(compatible.status).toBe('compatible');
    expect(compatible.results[0]?.explanation).toBeTruthy();
    const unknown=evaluateCompatibility({rules:compatibilityRules,parts:compatibilityParts.filter(part=>part.slotId!=='motherboard')})!;
    expect(unknown.status).toBe('unknown');
    expect(unknown.required.unknown).toBeGreaterThan(0);
    expect(COMPATIBILITY_AUTHORITY_CONTRACT.unknownCountsAsCompatible).toBe(false);
    expect(validateCompatibilityRules([{...compatibilityRules[0],id:'Bad Key'}]).some(item=>item.code==='COMPATIBILITY_RULE_ID_INVALID')).toBe(true);
    expect(compatibilityParts).toEqual(before);
  });

  it('E7 revalidates canonical structured registry, unit normalization, comparison determinism and input immutability',()=>{
    const items=[
      {id:'a',label:'A',productValues:{platform:{type:'enum' as const,value:'pro'},weight:{type:'measurement' as const,value:1,unit:'kg'}}},
      {id:'b',label:'B',productValues:{platform:{type:'enum' as const,value:'home'},weight:{type:'measurement' as const,value:1000,unit:'g'}}},
    ];
    const before=clone(items);
    const first=buildStructuredProductComparison({registry:specRegistry,items});
    const second=buildStructuredProductComparison({registry:specRegistry,items});
    expect(second).toEqual(first);
    const rows=first.flatMap(group=>group.rows);
    expect(rows.find(row=>row.specKey==='weight')).toMatchObject({hasDifference:false});
    expect(rows.find(row=>row.specKey==='weight')?.cells.map(cell=>cell.displayValue)).toEqual(['1000 g','1000 g']);
    expect(items).toEqual(before);
  });

  it('E8 revalidates customer/context separation, soft ranking, cart preservation and server save authority',()=>{
    const candidates=[
      {id:'match',label:'Snack',href:'/termek/snack',eligible:true,contextAttributes:{species:['dog'],preferences:['snack']}},
      {id:'mismatch',label:'Toy',href:'/termek/toy',eligible:true,contextAttributes:{species:['cat']}},
      {id:'neutral',label:'Bowl',href:'/termek/bowl',eligible:true,contextAttributes:{}},
    ];
    const before=clone(petProfile);
    expect(validateContextProfile({registry:DEFAULT_CONTEXT_TYPE_REGISTRY,profile:petProfile})).toEqual([]);
    const discovery=buildContextAwareDiscovery({registry:DEFAULT_CONTEXT_TYPE_REGISTRY,profile:petProfile,candidates});
    expect(discovery.every(item=>item.excludedByContext===false)).toBe(true);
    expect(switchActiveContext({profiles:[petProfile],currentProfileId:null,nextProfileId:'pet-luna'})).toMatchObject({cartPreserved:true,cartMutationAllowed:false,catalogMode:'soft-ranking'});
    const guest:ContextProfile={profileId:'guest',typeKey:'pet',label:'Guest',ownerScope:'guest-session',saved:false,attributes:{species:'cat'}};
    expect(buildContextProfileSaveIntent({registry:DEFAULT_CONTEXT_TYPE_REGISTRY,profile:guest})).toMatchObject({persistenceAuthority:'server-context-profile-authority',explicitUserActionRequired:true});
    expect(CONTEXT_RUNTIME_CONTRACT.customerIsContext).toBe(false);
    expect(CONTEXT_PROFILE_TEMPLATE_SWITCH_MUTATION_BOUNDARY.carts).toBe(false);
    expect(petProfile).toEqual(before);
  });

  it('E9 revalidates server retention evidence, current commerce checks and rejects silent quantity/subscription invention',()=>{
    const before=clone(reorderSnapshot);
    expect(buildReorderReadModel(reorderSnapshot)).toMatchObject({requiresServerRevalidation:true,silentReplacementAllowed:false});
    expect(buildReorderCartIntent(reorderSnapshot,3)).toBeNull();
    const intent=buildReorderCartIntent(reorderSnapshot,4)!;
    expect(intent.requiredRevalidation).toEqual(['eligibility','channel','price','stock','moq','order-multiple']);
    expect(intent).toMatchObject({silentReplacementAllowed:false,subscription:false});
    expect(buildReorderCartIntent({...reorderSnapshot,stock:{available:false,label:'Out'}},4)).toBeNull();
    expect(RETENTION_REORDER_RUNTIME_CONTRACT).toMatchObject({usesExistingRetentionAuthority:true,subscriptionEngine:false,historicalPriceIsCurrentAuthority:false});
    expect(RETENTION_REORDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY.orders).toBe(false);
    expect(reorderSnapshot).toEqual(before);
  });

  it('E10 revalidates publication/provenance/unsafe-content fail-closed behavior and content ownership',()=>{
    const before=clone(story);
    expect(validateStoryDocument(story).ok).toBe(true);
    expect(buildStoryReadModel(story,{now:new Date('2026-09-29T10:00:00Z')})).not.toBeNull();
    const unverified:StoryDocument={...story,id:'story-unverified',slug:'story-unverified',relations:story.relations.map(item=>item.type==='origin'?{...item,verified:false}:item)};
    expect(validateStoryDocument(unverified).violations.some(item=>item.code==='STORY_PROVENANCE_UNVERIFIED')).toBe(true);
    const unsafe:StoryDocument={...story,id:'story-unsafe',slug:'story-unsafe',relations:[...story.relations,{id:'unsafe',type:'story',entityId:'x',label:'Unsafe',href:'javascript:alert(1)'}]};
    expect(validateStoryDocument(unsafe).violations.some(item=>item.code==='STORY_RELATION_URL_UNSAFE')).toBe(true);
    expect(STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY.storyDocuments).toBe(false);
    expect(story).toEqual(before);
  });

  it('E11 revalidates server snapshot authority, no commercial recomputation, MOQ hints and unsafe snapshot rejection',()=>{
    const before=clone(professionalProduct);
    const model=buildProfessionalProductReadModel(professionalProduct)!;
    expect(model.displayNetPrice).toBe(professionalProduct.displayNetPrice);
    expect(model.displayGrossPrice).toBe(professionalProduct.displayGrossPrice);
    expect(model.stockQuantity).toBe(professionalProduct.stockQuantity);
    expect(model.requiresServerRevalidation).toBe(true);
    expect(PROFESSIONAL_B2B_SERVER_AUTHORITIES).toEqual(expect.arrayContaining(['pricing-tax','stock','moq-order-multiple']));
    expect(buildProfessionalQuantityHint({requestedQuantity:5,minimumQuantity:2,orderMultiple:2})).toMatchObject({suggestedQuantity:6,clientHintOnly:true,requiresServerRevalidation:true});
    expect(validateProfessionalProductAuthority({...professionalProduct,minimumQuantity:0}).some(item=>item.code==='PROFESSIONAL_MOQ_INVALID')).toBe(true);
    expect(buildProfessionalProductReadModel({...professionalProduct,href:'javascript:alert(1)'})).toBeNull();
    expect(PROFESSIONAL_TEMPLATE_SWITCH_MUTATION_BOUNDARY.pricing).toBe(false);
    expect(professionalProduct).toEqual(before);
  });

  it('E13 remains bound to exact-head browser/network checkout proof and never to a unit-only substitute',()=>{
    const e13=STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY.find(item=>item.engineId==='E13');
    expect(e13).toMatchObject({
      proofClass:'browser-journey',
      proofContract:SHARED_E13_FUNCTIONAL_PROOF_CONTRACT,
      browserRequired:true,
      networkRequired:true,
      productionMutationAllowed:false,
    });
    const handoff=readFileSync('scripts/template-factory-product-owner-handoff.mjs','utf8');
    expect(handoff).toContain('async function proveSharedE13FunctionalEngine(page)');
    expect(handoff).toContain("contract:'shoporation.shared-engine-functional-proof.v1'");
    expect(handoff).toContain('data-storefront-live-checkout="shared-e13"');
  });
});
