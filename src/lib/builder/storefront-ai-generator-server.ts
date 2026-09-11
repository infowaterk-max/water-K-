import 'server-only';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {hasAddon} from '@/lib/plans/access';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {
  getCurrentStorefrontBuilderBindingContext,
  getCurrentStorefrontBuilderCapability,
  listCurrentStorefrontTemplatePlanningPages,
} from '@/lib/builder/storefront-builder-server';
import {
  STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,
} from '@/lib/builder/storefront-template-catalog';
import {
  evaluateStorefrontTemplateCapabilityGate,
  planStorefrontTemplateInstallation,
} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontBuilderSchemaStructure} from '@/lib/builder/storefront-builder-schema-policy';
import {saveCurrentStorefrontTemplateDraftPlan} from '@/lib/builder/storefront-template-persistence';
import {
  applyStorefrontAiModelPlan,
  parseStorefrontAiModelPlan,
  storefrontAiGenerationInputSchema,
  type StorefrontAiGenerationInput,
} from '@/lib/builder/storefront-ai-generator';

const MODEL_DEFAULT='openai/gpt-5.6-sol';
const cleanJson=(text:string)=>text.trim().startsWith('```')?text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''):text.trim();
const RESPONSE_SCHEMA={
  type:'object',
  additionalProperties:false,
  properties:{
    templateKey:{type:'string'},
    reason:{type:'string'},
    copy:{
      type:'object',
      additionalProperties:false,
      properties:{
        heroTitle:{type:'string'},
        heroSubtitle:{type:'string'},
        primaryCtaLabel:{type:'string'},
        catalogTitle:{type:'string'},
        catalogDescription:{type:'string'},
        storyTitle:{type:'string'},
        storyCopy:{type:'string'},
      },
      required:['heroTitle','heroSubtitle','primaryCtaLabel','catalogTitle','catalogDescription','storyTitle','storyCopy'],
    },
  },
  required:['templateKey','reason','copy'],
} as const;

export type StorefrontAiGenerationResult={
  ok:true;
  templateKey:string;
  templateVersion:number;
  pageCount:number;
  replayed:boolean;
  mutationScope:'storefront_page_drafts_only';
  requiresReview:true;
  published:false;
  openPageKey:string|null;
  model:string;
  reason:string;
};

export async function generateCurrentStorefrontWithAi(rawInput:StorefrontAiGenerationInput):Promise<StorefrontAiGenerationResult>{
  const input=storefrontAiGenerationInputSchema.parse(rawInput);
  const actor=await getAdminRequestUser('store.manage');
  if(!actor)throw new Error('STOREFRONT_AI_AUTH_REQUIRED');
  const[scope,capability,existingPages,bindingContext,aiAddonEnabled]=await Promise.all([
    requireCurrentStoreContext('store.manage'),
    getCurrentStorefrontBuilderCapability(),
    listCurrentStorefrontTemplatePlanningPages(),
    getCurrentStorefrontBuilderBindingContext(),
    hasAddon('ai-assistant'),
  ]);
  if(!aiAddonEnabled)throw new Error('STOREFRONT_AI_ADDON_REQUIRED');
  const registry=createStorefrontVisualBuilderComponentRegistry();
  const eligible=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.filter(template=>evaluateStorefrontTemplateCapabilityGate({template,componentRegistry:registry,capability}).ok);
  if(!eligible.length)throw new Error('STOREFRONT_AI_NO_ELIGIBLE_TEMPLATE');

  const admin=createAdminClient();
  const{data:allowed,error:rateLimitError}=await admin.rpc('consume_security_rate_limit',{
    p_rate_key:`storefront-ai-generator:${scope.instanceId}:${actor.id}`,
    p_window_seconds:3600,
    p_max_count:12,
  });
  if(rateLimitError)throw new Error('STOREFRONT_AI_RATE_LIMIT_UNAVAILABLE');
  if(allowed!==true)throw new Error('STOREFRONT_AI_RATE_LIMIT_EXCEEDED');

  const token=process.env.AI_GATEWAY_API_KEY?.trim()||process.env.VERCEL_OIDC_TOKEN?.trim();
  if(!token)throw new Error('STOREFRONT_AI_GATEWAY_NOT_CONFIGURED');
  const model=process.env.STOREFRONT_AI_MODEL?.trim()||MODEL_DEFAULT;
  const brand=(bindingContext.brand&&typeof bindingContext.brand==='object'&&!Array.isArray(bindingContext.brand))?bindingContext.brand:{};
  const allowedTemplates=eligible.map(template=>({
    templateKey:template.manifest.templateKey,
    category:template.manifest.templateKey.split('.')[0]??'general',
    pageTypes:[...template.manifest.pageTypes],
    minPlan:template.manifest.minPlan,
  }));
  const system=[
    'Te a Shoperation AI Webshop Generator vagy.',
    'Egyetlen feladatod, hogy a megadott üzleti briefhez a felsorolt engedélyezett Shoporation template-ek közül válassz, és rövid szerkeszthető storefront szövegeket adj.',
    'Soha ne generálj Next.js/React/HTML/JavaScript/SQL/RPC kódot, komponenst, template-kulcsot vagy oldalstruktúrát az allowlisten kívül.',
    'Ne találj ki termékárat, készletet, műszaki tulajdonságot, garanciát, tanúsítványt vagy üzleti tényt.',
    'A kimenet csak a kért strukturált JSON lehet: templateKey, reason, copy{heroTitle,heroSubtitle,primaryCtaLabel,catalogTitle,catalogDescription,storyTitle,storyCopy}.',
    'Minden copy mező legyen a brief nyelvén, HTML nélkül. A generált eredmény kizárólag draft lesz és emberi ellenőrzést igényel.',
  ].join(' ');
  const userPayload={
    brief:{businessCategory:input.businessCategory,description:input.description,style:input.style,targetAudience:input.targetAudience,language:input.language},
    canonicalBrand:{name:(brand as Record<string,unknown>).name??null,tagline:(brand as Record<string,unknown>).tagline??null,logoUrl:(brand as Record<string,unknown>).logoUrl??null,primaryColor:(brand as Record<string,unknown>).primaryColor??null},
    currentPlan:capability.plan,
    allowedTemplates,
  };
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),30000);
  let candidate:unknown;
  try{
    const response=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{
      method:'POST',
      headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
      body:JSON.stringify({
        model,
        temperature:0,
        messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(userPayload)}],
        response_format:{
          type:'json_schema',
          json_schema:{
            name:'shoporation_storefront_plan',
            description:'A bounded Shoporation storefront template choice and editable copy plan.',
            schema:RESPONSE_SCHEMA,
          },
        },
        user:actor.id,
      }),
      signal:controller.signal,
    });
    const payload=await response.json().catch(()=>null) as null|{choices?:Array<{message?:{content?:string}}>};
    if(!response.ok)throw new Error(response.status===429?'STOREFRONT_AI_PROVIDER_RATE_LIMIT':'STOREFRONT_AI_PROVIDER_FAILED');
    const content=payload?.choices?.[0]?.message?.content;
    if(!content)throw new Error('STOREFRONT_AI_EMPTY_RESPONSE');
    try{candidate=JSON.parse(cleanJson(content))}catch{throw new Error('STOREFRONT_AI_RESPONSE_NOT_JSON')}
  }catch(error){
    if(error instanceof Error&&error.name==='AbortError')throw new Error('STOREFRONT_AI_TIMEOUT');
    throw error;
  }finally{clearTimeout(timeout)}

  const allowedTemplateKeys=new Set(eligible.map(template=>template.manifest.templateKey));
  const modelPlan=parseStorefrontAiModelPlan(candidate,allowedTemplateKeys);
  const template=eligible.find(item=>item.manifest.templateKey===modelPlan.templateKey);
  if(!template)throw new Error('STOREFRONT_AI_TEMPLATE_NOT_ALLOWED');
  const installationPlan=planStorefrontTemplateInstallation({template,componentRegistry:registry,capability,existingPages});
  const generatedPlan=applyStorefrontAiModelPlan({plan:installationPlan,modelPlan,registry,capability});
  for(const page of generatedPlan.pages)validateStorefrontBuilderSchemaStructure({document:page.document,registry});
  const saved=await saveCurrentStorefrontTemplateDraftPlan({plan:generatedPlan,operationKey:input.operationKey});
  const home=generatedPlan.pages.find(page=>page.pageType==='home')??generatedPlan.pages[0];
  return{
    ok:true,
    templateKey:saved.templateKey,
    templateVersion:saved.templateVersion,
    pageCount:saved.pageCount,
    replayed:saved.replayed,
    mutationScope:saved.mutationScope,
    requiresReview:true,
    published:false,
    openPageKey:home?.pageKey??null,
    model,
    reason:modelPlan.reason,
  };
}
