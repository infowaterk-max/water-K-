import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT,
  SHARED_E13_FUNCTIONAL_PROOF_CONTRACT,
  STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY,
  getStorefrontEngineFunctionalProofDefinition,
  validateStorefrontEngineFunctionalProofRegistry,
} from '@/lib/builder/template-factory/engine-functional-proof-registry';
import {
  PRODUCT_DISCOVERY_AUTHORITY_CONTRACT,
  PRODUCT_DISCOVERY_ENGINE_VERSION,
  runProductDiscovery,
} from '@/lib/commerce/product-discovery';
import {
  STRUCTURED_PRODUCT_ENGINE_VERSION,
  StructuredProductSpecificationRegistry,
  buildStructuredFacetIndex,
  buildStructuredProductComparison,
} from '@/lib/commerce/structured-product';
import {
  STORY_ENGINE_VERSION,
  STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  buildStoryReadModel,
  validateStoryDocument,
  type StoryDocument,
} from '@/lib/content/story-engine';

const registry=new StructuredProductSpecificationRegistry({
  groups:[{key:'core',label:'Fő adatok',order:1}],
  specs:[
    {key:'platform',label:'Platform',groupKey:'core',valueType:'enum',scope:'product',enumOptions:['pro','home'],filterable:true,comparable:true,order:1},
    {key:'weight',label:'Tömeg',groupKey:'core',valueType:'measurement',scope:'product',unitFamily:'mass',filterable:true,comparable:true,order:2},
  ],
});

const publishedStory:StoryDocument={
  version:1,
  id:'story-proof-001',
  slug:'verified-origin',
  storyType:'origin',
  status:'published',
  title:'Ellenőrzött eredet',
  excerpt:'Strukturált editorial proof.',
  author:{id:'author-proof',name:'Proof Author'},
  taxonomy:{categories:['Materials','Materials'],tags:['gold',' proof ','gold']},
  publishedAt:'2026-09-29T08:00:00Z',
  relations:[
    {id:'origin-certified',type:'origin',entityId:'origin-record-1',label:'Ellenőrzött eredet',href:'/eredet/1',verified:true},
    {id:'product-one',type:'product',entityId:'product-1',label:'Proof Product',href:'/termek/proof-product'},
  ],
  blocks:[
    {id:'intro',type:'prose',text:'Ellenőrzött szerkesztett tartalom.'},
    {id:'claim',type:'provenance',title:'Eredet',claims:[{label:'Anyag',value:'18K arany',originRelationId:'origin-certified'}]},
    {id:'related',type:'relation-grid',title:'Kapcsolódó termék',relationIds:['product-one']},
  ],
};

describe('Template Factory fast engine functional proof registry',()=>{
  it('registers one proof class per shared engine and keeps E13 on the existing browser journey',()=>{
    const validation=validateStorefrontEngineFunctionalProofRegistry();
    expect(validation.ok,validation.issues.join(',')).toBe(true);
    expect(STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY.map(item=>item.engineId)).toEqual(['E2','E7','E10','E13']);

    expect(getStorefrontEngineFunctionalProofDefinition('E2')).toMatchObject({
      authorityVersion:PRODUCT_DISCOVERY_ENGINE_VERSION,
      proofClass:'deterministic-runtime',
      proofContract:FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT,
      browserRequired:false,
      productionMutationAllowed:false,
    });
    expect(getStorefrontEngineFunctionalProofDefinition('E7')).toMatchObject({
      authorityVersion:STRUCTURED_PRODUCT_ENGINE_VERSION,
      proofClass:'deterministic-runtime',
      browserRequired:false,
    });
    expect(getStorefrontEngineFunctionalProofDefinition('E10')).toMatchObject({
      authorityVersion:STORY_ENGINE_VERSION,
      proofClass:'content-authority',
      browserRequired:false,
    });
    expect(getStorefrontEngineFunctionalProofDefinition('E13')).toMatchObject({
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

  it('proves E2 by executing deterministic discovery, eligibility exclusion and explainable ranking',()=>{
    const run=runProductDiscovery({
      registry,
      query:{text:'kit',categoryKeys:['kits'],boosts:[{signalKey:'featured',weight:20,reason:'Kiemelt proof jel.'}]},
      candidates:[
        {
          productId:'p-alpha',variantId:'v-alpha',label:'Alpha Kit',href:'/termek/alpha',
          categoryKeys:['kits'],searchTerms:['automation'],
          productValues:{platform:{type:'enum',value:'pro'},weight:{type:'measurement',value:1,unit:'kg'}},
          eligibility:{productActive:true,variantActive:true,channelVisible:true,sellable:true},
          recommendationSignals:['featured'],
        },
        {
          productId:'p-hidden',variantId:'v-hidden',label:'Hidden Kit',href:'/termek/hidden',
          categoryKeys:['kits'],productValues:{platform:{type:'enum',value:'home'}},
          eligibility:{productActive:true,variantActive:true,channelVisible:false,sellable:true},
        },
      ],
    });
    expect(run).not.toBeNull();
    expect(run).toMatchObject({engineVersion:PRODUCT_DISCOVERY_ENGINE_VERSION,totalCandidates:2,eligibleCandidates:1,matchedCandidates:1,deterministic:true,explainable:true});
    expect(run?.results[0]).toMatchObject({productId:'p-alpha'});
    expect(run?.results[0]?.evidence).toEqual(expect.arrayContaining([expect.objectContaining({kind:'query'}),expect.objectContaining({kind:'category'}),expect.objectContaining({kind:'boost',key:'featured',scoreDelta:20})]));
    expect(run?.exclusions).toContainEqual(expect.objectContaining({productId:'p-hidden',reasons:expect.arrayContaining(['channel-hidden'])}));
    expect(PRODUCT_DISCOVERY_AUTHORITY_CONTRACT).toMatchObject({catalogMutation:false,pricingAuthority:false,inventoryMutation:false,customerMutation:false,orderMutation:false});
  });

  it('proves E7 through the canonical structured registry, unit normalization, compare and facet behavior',()=>{
    const comparison=buildStructuredProductComparison({
      registry,
      items:[
        {id:'a',label:'A',productValues:{platform:{type:'enum',value:'pro'},weight:{type:'measurement',value:1,unit:'kg'}}},
        {id:'b',label:'B',productValues:{platform:{type:'enum',value:'home'},weight:{type:'measurement',value:1000,unit:'g'}}},
      ],
    });
    const rows=comparison.flatMap(group=>group.rows);
    expect(rows.find(row=>row.specKey==='weight')).toMatchObject({hasDifference:false});
    expect(rows.find(row=>row.specKey==='weight')?.cells.map(cell=>cell.displayValue)).toEqual(['1000 g','1000 g']);
    expect(rows.find(row=>row.specKey==='platform')).toMatchObject({hasDifference:true});

    const facets=buildStructuredFacetIndex({
      registry,
      items:[
        {id:'a',label:'A',productValues:{platform:{type:'enum',value:'pro'},weight:{type:'measurement',value:1,unit:'kg'}}},
        {id:'b',label:'B',productValues:{platform:{type:'enum',value:'home'},weight:{type:'measurement',value:1000,unit:'g'}}},
      ],
    });
    expect(facets.find(item=>item.specKey==='platform')?.options.map(option=>option.label).sort()).toEqual(['home','pro']);
  });

  it('proves E10 publication/read-model behavior and fails closed on unverifiable provenance and unsafe content',()=>{
    const valid=validateStoryDocument(publishedStory);
    expect(valid.ok,JSON.stringify(valid.violations)).toBe(true);
    const read=buildStoryReadModel(publishedStory,{now:new Date('2026-09-29T10:00:00Z')});
    expect(read?.taxonomy.categories).toEqual(['Materials']);
    expect(read?.taxonomy.tags).toEqual(['gold','proof']);

    const unverifiable:StoryDocument={
      ...publishedStory,
      id:'story-proof-unverified',
      slug:'unverified-origin',
      relations:publishedStory.relations.map(item=>item.type==='origin'?{...item,verified:false}:item),
    };
    const provenance=validateStoryDocument(unverifiable);
    expect(provenance.ok).toBe(false);
    expect(provenance.violations.some(item=>item.code==='STORY_PROVENANCE_UNVERIFIED')).toBe(true);

    const unsafe={
      ...publishedStory,
      id:'story-proof-unsafe',
      slug:'unsafe-story',
      relations:[...publishedStory.relations,{id:'unsafe-link',type:'story' as const,entityId:'story-2',label:'Unsafe',href:'javascript:alert(1)'}],
      blocks:[...publishedStory.blocks,{id:'unsafe-prose',type:'prose' as const,text:'<script>alert(1)</script>'}],
    } satisfies StoryDocument;
    const unsafeResult=validateStoryDocument(unsafe);
    expect(unsafeResult.ok).toBe(false);
    expect(unsafeResult.violations.map(item=>item.code)).toEqual(expect.arrayContaining(['STORY_RELATION_URL_UNSAFE','STORY_UNSAFE_MARKUP']));
    expect(STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY).toMatchObject({storyDocuments:false,products:false,collections:false,makers:false,storefrontPageDrafts:true});
  });
});
