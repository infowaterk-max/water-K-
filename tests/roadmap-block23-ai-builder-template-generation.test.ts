import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {MODERN_LUXE_TEMPLATE_PACKAGE} from '@/lib/builder/templates/modern-luxe';
import {planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {
  STOREFRONT_AI_GENERATOR_VERSION,
  applyStorefrontAiModelPlan,
  parseStorefrontAiModelPlan,
  storefrontAiGenerationInputSchema,
} from '@/lib/builder/storefront-ai-generator';

const pro={plan:'pro' as const,features:[...PLANS.pro.features]};
const modelPlan={
  templateKey:MODERN_LUXE_TEMPLATE_PACKAGE.manifest.templateKey,
  reason:'A prémium, levegős szerkezet illeszkedik a briefhez.',
  copy:{
    heroTitle:'Időtálló részletek, modern ritmusban',
    heroSubtitle:'Válogatott darabok letisztult, bizalomépítő bemutatással.',
    primaryCtaLabel:'Fedezd fel a kollekciót',
    catalogTitle:'Válogatott kollekció',
    catalogDescription:'Böngészd a gondosan összeállított kínálatot.',
    storyTitle:'A részletekben hiszünk',
    storyCopy:'Olyan vásárlási élményt építünk, ahol a termék és a márka története együtt marad áttekinthető.',
  },
};

const find=(nodes:StorefrontComponentNode[],predicate:(node:StorefrontComponentNode)=>boolean):StorefrontComponentNode|undefined=>{
  for(const node of nodes){
    if(predicate(node))return node;
    const child=find(node.children??[],predicate);if(child)return child;
  }
  return undefined;
};

describe('Roadmap Block 23 AI-assisted Builder / template generation',()=>{
  it('accepts bounded merchant intent and rejects HTML/script-shaped or tenant-spoofed input',()=>{
    const valid={businessCategory:'ékszer',description:'Prémium kiegészítők.',style:'levegős',targetAudience:'ajándékot kereső felnőttek',language:'hu' as const,operationKey:'ai-12345678'};
    expect(storefrontAiGenerationInputSchema.parse(valid).language).toBe('hu');
    expect(()=>storefrontAiGenerationInputSchema.parse({...valid,description:'<script>alert(1)</script>'})).toThrow();
    expect(()=>storefrontAiGenerationInputSchema.parse({...valid,instanceId:'00000000-0000-4000-8000-000000000023'})).toThrow();
  });

  it('allows only a server-provided eligible template key',()=>{
    expect(parseStorefrontAiModelPlan(modelPlan,new Set([modelPlan.templateKey])).templateKey).toBe(modelPlan.templateKey);
    expect(()=>parseStorefrontAiModelPlan({...modelPlan,templateKey:'invented.ai-template'},new Set([modelPlan.templateKey]))).toThrow('STOREFRONT_AI_TEMPLATE_NOT_ALLOWED');
    expect(()=>parseStorefrontAiModelPlan({...modelPlan,copy:{...modelPlan.copy,heroTitle:'<b>unsafe</b>'}},new Set([modelPlan.templateKey]))).toThrow('STOREFRONT_AI_MODEL_PLAN_INVALID');
  });

  it('materializes AI output through the existing template plan and changes only editable copy',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const base=planStorefrontTemplateInstallation({template:MODERN_LUXE_TEMPLATE_PACKAGE,componentRegistry:registry,capability:pro});
    const generated=applyStorefrontAiModelPlan({plan:base,modelPlan,registry,capability:pro});
    expect(generated.templateKey).toBe(base.templateKey);
    expect(generated.mutationBoundary).toEqual(base.mutationBoundary);
    expect(generated.mutationBoundary.products).toBe(false);
    expect(generated.mutationBoundary.orders).toBe(false);
    const home=generated.pages.find(page=>page.pageType==='home');
    expect(home).toBeTruthy();
    const heading=find(home!.document.sections,node=>node.componentKey==='content.heading');
    expect(heading?.config.text).toBe(modelPlan.copy.heroTitle);
    expect(home!.document.metadata?.aiGeneration).toEqual({version:STOREFRONT_AI_GENERATOR_VERSION,source:'block23',requiresReview:true});
    for(const page of generated.pages)expect(validateStorefrontPageDocument(page.document,registry,pro).ok).toBe(true);
  });

  it('fails closed if the model plan template does not match the materialized template',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const base=planStorefrontTemplateInstallation({template:MODERN_LUXE_TEMPLATE_PACKAGE,componentRegistry:registry,capability:pro});
    expect(()=>applyStorefrontAiModelPlan({plan:base,modelPlan:{...modelPlan,templateKey:'other.template'},registry,capability:pro})).toThrow('STOREFRONT_AI_PLAN_TEMPLATE_MISMATCH');
  });

  it('keeps tenant, authorization, entitlement, schema, rate-limit and draft persistence authority on the server',()=>{
    const source=readFileSync('src/lib/builder/storefront-ai-generator-server.ts','utf8');
    expect(source).toContain("getAdminRequestUser('store.manage')");
    expect(source).toContain("requireCurrentStoreContext('store.manage')");
    expect(source).toContain('evaluateStorefrontTemplateCapabilityGate');
    expect(source).toContain('validateStorefrontBuilderSchemaStructure');
    expect(source).toContain('consume_security_rate_limit');
    expect(source).toContain('saveCurrentStorefrontTemplateDraftPlan');
    expect(source).toContain('STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES');
    expect(source).not.toContain('input.instanceId');
    expect(source).not.toContain("from('products').update");
    expect(source).not.toContain("from('orders').update");
    expect(source).not.toContain('publishCurrentStorefrontPage');
  });
});
