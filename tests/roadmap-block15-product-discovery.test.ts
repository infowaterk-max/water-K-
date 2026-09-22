import {describe,expect,it} from 'vitest';
import {buildContextAwareDiscovery,DEFAULT_CONTEXT_TYPE_REGISTRY,type ContextProfile} from '@/lib/commerce/context-profile';
import {runGuidedFinder,type GuidedFinderConfig} from '@/lib/commerce/guided-finder';
import {PRODUCT_DISCOVERY_AUTHORITY_CONTRACT,PRODUCT_DISCOVERY_ENGINE_VERSION,PRODUCT_DISCOVERY_TEMPLATE_SWITCH_MUTATION_BOUNDARY,runProductDiscovery,validateProductDiscoveryQuery,type ProductDiscoveryCandidate} from '@/lib/commerce/product-discovery';
import {ROADMAP_BLOCK15_AUTHORITY_CONTRACT,ROADMAP_BLOCK15_ENGINE_FAMILY} from '@/lib/commerce/roadmap-block15';
import {StructuredProductSpecificationRegistry} from '@/lib/commerce/structured-product';

const registry=new StructuredProductSpecificationRegistry({
  groups:[{key:'fit',label:'Illeszkedés',order:1},{key:'technical',label:'Műszaki',order:2}],
  specs:[
    {key:'use-case',label:'Felhasználás',groupKey:'fit',valueType:'multi-value',scope:'product',filterable:true,comparable:true},
    {key:'platform',label:'Platform',groupKey:'fit',valueType:'enum',scope:'variant',filterable:true,comparable:true,enumOptions:['home','pro']},
    {key:'capacity',label:'Kapacitás',groupKey:'technical',valueType:'number',scope:'variant',filterable:true,comparable:true},
  ],
});
const candidates:ProductDiscoveryCandidate[]=[
  {productId:'p-alpha',variantId:'v-pro',label:'Alpha Pro Kit',href:'/termek/alpha-pro',categoryKeys:['kits'],searchTerms:['modular','controller'],productValues:{'use-case':{type:'multi-value',value:['automation','outdoor']}},variantValues:{platform:{type:'enum',value:'pro'},capacity:{type:'number',value:8}},eligibility:{productActive:true,variantActive:true,channelVisible:true,sellable:true},recommendationSignals:['featured','pro-workflow'],contextAttributes:{preferences:['outdoor']}},
  {productId:'p-beta',variantId:'v-home',label:'Beta Home Kit',href:'/termek/beta-home',categoryKeys:['kits'],searchTerms:['modular','controller'],productValues:{'use-case':{type:'multi-value',value:['automation','indoor']}},variantValues:{platform:{type:'enum',value:'home'},capacity:{type:'number',value:4}},eligibility:{productActive:true,variantActive:true,channelVisible:true,sellable:true},recommendationSignals:['featured'],contextAttributes:{preferences:['indoor']}},
  {productId:'p-hidden',variantId:'v-hidden',label:'Hidden Pro Kit',href:'/termek/hidden',categoryKeys:['kits'],productValues:{'use-case':{type:'multi-value',value:['automation']}},variantValues:{platform:{type:'enum',value:'pro'}},eligibility:{productActive:true,variantActive:true,channelVisible:false,sellable:true}},
];

describe('Roadmap Block 15 – Product Discovery and decision-support family',()=>{
  it('implements E2 as deterministic explainable discovery over authoritative eligibility evidence',()=>{
    const run=runProductDiscovery({registry,candidates,query:{text:'kit',categoryKeys:['kits'],boosts:[{signalKey:'pro-workflow',weight:20,reason:'Pro workflow preference.'}],limit:10}})!;
    expect(PRODUCT_DISCOVERY_ENGINE_VERSION).toBe('shoporation.product-discovery.v1');
    expect(run).toMatchObject({totalCandidates:3,eligibleCandidates:2,matchedCandidates:2,deterministic:true,explainable:true});
    expect(run.results.map(item=>item.productId)).toEqual(['p-alpha','p-beta']);
    expect(run.results[0].evidence).toEqual(expect.arrayContaining([expect.objectContaining({kind:'query'}),expect.objectContaining({kind:'category'}),expect.objectContaining({kind:'boost',key:'pro-workflow',scoreDelta:20})]));
    expect(run.exclusions).toContainEqual(expect.objectContaining({productId:'p-hidden',reasons:expect.arrayContaining(['channel-hidden'])}));
  });

  it('reuses E7 structured filter semantics instead of inventing a second attribute registry',()=>{
    const preview=runProductDiscovery({registry,candidates,query:{categoryKeys:['kits']}})!;
    const platform=preview.facets.find(facet=>facet.specKey==='platform')!;
    const proKey=platform.options.find(option=>option.label==='pro')!.key;
    const filtered=runProductDiscovery({registry,candidates,query:{facets:{platform:[proKey]}}})!;
    expect(filtered.results.map(item=>item.productId)).toEqual(['p-alpha']);
    expect(filtered.results[0].finderAttributes).toMatchObject({platform:'pro',capacity:8,'use-case':['automation','outdoor']});
    expect(PRODUCT_DISCOVERY_AUTHORITY_CONTRACT.structuredSpecAuthority).toBe('shoporation.compare-spec-engine.v1');
  });

  it('feeds the existing E3 Guided Finder from the same resolved discovery attributes',()=>{
    const discovered=runProductDiscovery({registry,candidates,query:{categoryKeys:['kits']}})!;
    const config:GuidedFinderConfig={version:1,tenantId:'tenant-demo',finderKey:'workflow-finder',label:'Workflow Finder',safetyPolicy:'standard',partialPolicy:'zero',maxResults:5,steps:[{id:'workflow',title:'Workflow',questions:[{id:'platform-choice',label:'Melyik platform?',mode:'single',required:true,options:[{id:'pro',label:'Pro',rules:[{id:'platform-pro',attributeKey:'platform',operator:'eq',value:'pro',kind:'required',reason:'Pro platformot választottál.'}]}]}]}]};
    const result=runGuidedFinder({config,selections:{'platform-choice':['pro']},candidates:discovered.results.map(item=>({id:item.id,label:item.label,href:item.href,eligible:true,attributes:item.finderAttributes}))})!;
    expect(result.status).toBe('exact');
    expect(result.results.map(item=>item.id)).toEqual(['p-alpha:v-pro']);
  });

  it('keeps E8 Profile Context as soft ranking over E2-eligible candidates',()=>{
    const discovered=runProductDiscovery({registry,candidates,query:{categoryKeys:['kits']}})!;
    const profile:ContextProfile={profileId:'ctx-1',typeKey:'pet',label:'Demo',ownerScope:'customer',saved:true,attributes:{species:'dog',preferences:['outdoor']}};
    const contextual=buildContextAwareDiscovery({registry:DEFAULT_CONTEXT_TYPE_REGISTRY,profile,candidates:discovered.results.map(item=>({id:item.id,label:item.label,href:item.href,eligible:true,contextAttributes:item.contextAttributes}))});
    expect(contextual.map(item=>item.id)).toEqual(['p-alpha:v-pro','p-beta:v-home']);
    expect(contextual[0]).toMatchObject({affinity:'strong',excludedByContext:false});
  });

  it('fails closed on malformed discovery contracts and preserves template/commerce mutation boundaries',()=>{
    expect(validateProductDiscoveryQuery({limit:0}).some(item=>item.code==='DISCOVERY_LIMIT_INVALID')).toBe(true);
    expect(validateProductDiscoveryQuery({boosts:[{signalKey:'Bad Key',weight:5,reason:'x'}]}).some(item=>item.code==='DISCOVERY_BOOST_KEY_INVALID')).toBe(true);
    expect(PRODUCT_DISCOVERY_TEMPLATE_SWITCH_MUTATION_BOUNDARY).toMatchObject({storefrontPageDrafts:true,discoveryConfiguration:false,products:false,variants:false,pricing:false,inventory:false,customers:false,orders:false});
  });

  it('locks the canonical E2–E8 family while keeping Block 21/22 and Block 14 exclusions out of scope',()=>{
    expect(ROADMAP_BLOCK15_ENGINE_FAMILY).toEqual({productDiscovery:'shoporation.product-discovery.v1',guidedFinder:'shoporation.guided-finder.v1',multiProductComposer:'shoporation.multi-product-composer.v1',productConfigurator:'shoporation.product-configurator.v1',compatibility:'shoporation.compatibility-engine.v1',compareSpec:'shoporation.compare-spec-engine.v1',profileContext:'shoporation.context-profile-engine.v1'});
    expect(ROADMAP_BLOCK15_AUTHORITY_CONTRACT).toMatchObject({deterministicOutputs:true,explainableOutputs:true,builderReadyReadModels:true,pageSchemaTemplatesImplemented:false,visualBuilderImplemented:false,parallelCatalogEngine:false,supplierFeedSync:false,automaticCatalogEnrichment:false,marketplaceBulkPublishing:false,advancedPimErpConnector:false,aiGeneratedProductData:false});
  });
});
