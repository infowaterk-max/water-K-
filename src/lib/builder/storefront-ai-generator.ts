import {z} from 'zod';
import {
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontComponentRegistry,
  type StorefrontRuntimeCapabilityContext,
} from '@/lib/builder/storefront-runtime';
import type {StorefrontTemplateInstallationPlan} from '@/lib/builder/storefront-template-installation';

export const STOREFRONT_AI_GENERATOR_VERSION='shoporation.storefront-ai-generator.block23.v1' as const;

const safeText=(max:number)=>z.string().trim().min(1).max(max).refine(value=>!/[<>]/.test(value),'HTML_NOT_ALLOWED');

export const storefrontAiGenerationInputSchema=z.object({
  businessCategory:safeText(120),
  description:safeText(1200),
  style:safeText(200),
  targetAudience:safeText(400),
  language:z.enum(['hu','en']),
  operationKey:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,111}$/),
}).strict();

export const storefrontAiModelPlanSchema=z.object({
  templateKey:z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  reason:safeText(500),
  copy:z.object({
    heroTitle:safeText(140),
    heroSubtitle:safeText(420),
    primaryCtaLabel:safeText(80),
    catalogTitle:safeText(120),
    catalogDescription:safeText(420),
    storyTitle:safeText(140),
    storyCopy:safeText(700),
  }).strict(),
}).strict();

export type StorefrontAiGenerationInput=z.infer<typeof storefrontAiGenerationInputSchema>;
export type StorefrontAiModelPlan=z.infer<typeof storefrontAiModelPlanSchema>;

export function parseStorefrontAiModelPlan(value:unknown,allowedTemplateKeys:ReadonlySet<string>):StorefrontAiModelPlan{
  const parsed=storefrontAiModelPlanSchema.safeParse(value);
  if(!parsed.success)throw new Error('STOREFRONT_AI_MODEL_PLAN_INVALID');
  if(!allowedTemplateKeys.has(parsed.data.templateKey))throw new Error('STOREFRONT_AI_TEMPLATE_NOT_ALLOWED');
  return parsed.data;
}

function walkNodes(nodes:StorefrontComponentNode[],visit:(node:StorefrontComponentNode)=>void){
  for(const node of nodes){visit(node);walkNodes(node.children??[],visit)}
}

function firstNode(nodes:StorefrontComponentNode[],predicate:(node:StorefrontComponentNode)=>boolean){
  let found:StorefrontComponentNode|undefined;
  walkNodes(nodes,node=>{if(!found&&predicate(node))found=node});
  return found;
}

function lastNode(nodes:StorefrontComponentNode[],predicate:(node:StorefrontComponentNode)=>boolean){
  let found:StorefrontComponentNode|undefined;
  walkNodes(nodes,node=>{if(predicate(node))found=node});
  return found;
}

function setEditableConfig(input:{registry:StorefrontComponentRegistry;node:StorefrontComponentNode|undefined;key:string;value:string}){
  const{registry,node,key,value}=input;
  if(!node)return false;
  const definition=registry.get(node.componentKey,node.componentVersion);
  if(!definition||!definition.manifest.configurable.includes(key))return false;
  node.config={...node.config,[key]:value};
  if(node.bindings?.[key])node.bindings={...node.bindings,[key]:{...node.bindings[key],fallback:value}};
  return true;
}

export function applyStorefrontAiModelPlan(input:{
  plan:StorefrontTemplateInstallationPlan;
  modelPlan:StorefrontAiModelPlan;
  registry:StorefrontComponentRegistry;
  capability:StorefrontRuntimeCapabilityContext;
}):StorefrontTemplateInstallationPlan{
  if(input.plan.templateKey!==input.modelPlan.templateKey)throw new Error('STOREFRONT_AI_PLAN_TEMPLATE_MISMATCH');
  let changes=0;
  const pages=input.plan.pages.map(page=>{
    const document=structuredClone(page.document);
    const nodes=document.sections;
    if(document.pageType==='home'){
      const heading=firstNode(nodes,node=>node.componentKey==='content.heading');
      const subtitle=firstNode(nodes,node=>node.componentKey==='content.text'&&(String(node.id).toLowerCase().includes('subtitle')||node.config.as==='p'));
      const cta=firstNode(nodes,node=>node.componentKey==='content.button');
      const story=lastNode(nodes,node=>node.componentKey==='editorial.split-feature');
      changes+=Number(setEditableConfig({registry:input.registry,node:heading,key:'text',value:input.modelPlan.copy.heroTitle}));
      changes+=Number(setEditableConfig({registry:input.registry,node:subtitle,key:'text',value:input.modelPlan.copy.heroSubtitle}));
      changes+=Number(setEditableConfig({registry:input.registry,node:cta,key:'label',value:input.modelPlan.copy.primaryCtaLabel}));
      changes+=Number(setEditableConfig({registry:input.registry,node:story,key:'title',value:input.modelPlan.copy.storyTitle}));
      changes+=Number(setEditableConfig({registry:input.registry,node:story,key:'copy',value:input.modelPlan.copy.storyCopy}));
    }
    if(document.pageType==='catalog'){
      const header=firstNode(nodes,node=>node.componentKey==='commerce.collection-header');
      const fallbackHeading=firstNode(nodes,node=>node.componentKey==='content.heading');
      const fallbackText=firstNode(nodes,node=>node.componentKey==='content.text'&&node.config.as==='p');
      changes+=Number(setEditableConfig({registry:input.registry,node:header??fallbackHeading,key:'title',value:input.modelPlan.copy.catalogTitle})||setEditableConfig({registry:input.registry,node:fallbackHeading,key:'text',value:input.modelPlan.copy.catalogTitle}));
      changes+=Number(setEditableConfig({registry:input.registry,node:header,key:'description',value:input.modelPlan.copy.catalogDescription})||setEditableConfig({registry:input.registry,node:fallbackText,key:'text',value:input.modelPlan.copy.catalogDescription}));
    }
    document.metadata={...(document.metadata??{}),aiGeneration:{version:STOREFRONT_AI_GENERATOR_VERSION,source:'block23',requiresReview:true}};
    const validation=validateStorefrontPageDocument(document,input.registry,input.capability);
    if(!validation.ok)throw new Error(`STOREFRONT_AI_GENERATED_PAGE_INVALID:${validation.violations[0]?.code??'UNKNOWN'}`);
    return{...page,document};
  });
  if(changes===0)throw new Error('STOREFRONT_AI_NO_EDITABLE_COPY_TARGET');
  return{...input.plan,pages};
}
