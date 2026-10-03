import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {
  applyStorefrontSmartIntentPlan,
  planStorefrontSmartIntent,
  STOREFRONT_SMART_INTENT_VERSION,
} from '@/lib/builder/storefront-smart-intent';
import {setStorefrontResponsiveGridPlacement} from '@/lib/builder/storefront-fidelity-layout';
import {
  inspectStorefrontResponsiveContainerLayout,
  inspectStorefrontResponsiveLayoutDepth,
  setStorefrontResponsiveVisibility,
} from '@/lib/builder/storefront-responsive-layout-depth';
import {getStorefrontGlobalStyleState} from '@/lib/builder/storefront-global-styles';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const registry=createStorefrontVisualBuilderComponentRegistry();
const capability={plan:'pro' as const,features:[...PLANS.pro.features]};
const clone=<T>(value:T):T=>structuredClone(value);
function find(document:StorefrontPageDocument,nodeId:string):StorefrontComponentNode{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|undefined=>{
    for(const node of nodes){if(node.id===nodeId)return node;const nested=walk(node.children??[]);if(nested)return nested;}
    return undefined;
  };
  const node=walk(document.sections);if(!node)throw new Error('TEST_NODE_NOT_FOUND');return node;
}
const plan=(document:StorefrontPageDocument,rawText:string,nodeId:string,viewport:'desktop'|'tablet'|'mobile'='desktop')=>
  planStorefrontSmartIntent({document,rawText,nodeId,viewport,registry,capability});

describe('VX Smart Intent Brabus Core',()=>{
  it('compiles a balanced 6/12 + 6/12 pair into 8/12 + 4/12 and applies atomically',async()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    document=setStorefrontResponsiveGridPlacement(document,'reference-grid-left','desktop',{span:6});
    document=setStorefrontResponsiveGridPlacement(document,'reference-grid-right','desktop',{span:6});
    const before=clone(document);
    const intent=await plan(document,'Legyen szélesebb a blokk','reference-grid-left');
    expect(intent.contract).toBe(STOREFRONT_SMART_INTENT_VERSION);
    expect(intent.status).toBe('READY');
    expect(intent.family).toBe('layout-width');
    expect(intent.operations).toHaveLength(2);
    expect(intent.operations.map(operation=>operation.authority)).toEqual(['storefront-fidelity-layout','storefront-fidelity-layout']);
    const applied=await applyStorefrontSmartIntentPlan({document,plan:intent,registry,capability});
    expect(inspectStorefrontResponsiveLayoutDepth(applied.document,'reference-grid-left','desktop').effectiveGridSpan).toBe(8);
    expect(inspectStorefrontResponsiveLayoutDepth(applied.document,'reference-grid-right','desktop').effectiveGridSpan).toBe(4);
    expect(document).toEqual(before);
    expect(Object.isFrozen(intent)).toBe(true);
  });

  it('uses component context to disambiguate generic bigger as typography but refuses a generic container guess',async()=>{
    const document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const heading=await plan(document,'Legyen nagyobb','reference-title');
    expect(heading.status).toBe('READY');
    expect(heading.family).toBe('typography');
    expect(heading.operations[0]?.authority).toBe('storefront-fidelity-builder-operations');
    const applied=await applyStorefrontSmartIntentPlan({document,plan:heading,registry,capability});
    const typography=find(applied.document,'reference-title').config.typography as {desktop?:{fontSizeRem?:number}};
    expect(typography.desktop?.fontSizeRem).toBeGreaterThan(2);

    const ambiguous=await plan(document,'Legyen nagyobb','reference-grid');
    expect(ambiguous.status).toBe('UNKNOWN');
    expect(ambiguous.operations).toEqual([]);
  });

  it('rejects contradictory, multi-family and multi-viewport language instead of guessing',async()=>{
    const document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const contradictory=await plan(document,'Legyen szélesebb és keskenyebb','reference-grid-left');
    expect(contradictory.status).toBe('UNKNOWN');
    expect(contradictory.operations).toEqual([]);

    const multi=await plan(document,'Legyen szélesebb és több levegő','reference-grid-left');
    expect(multi.status).toBe('UNKNOWN');
    expect(multi.operations).toEqual([]);

    const viewport=await plan(document,'Rejtsd el mobilon és tableten','reference-grid-left');
    expect(viewport.status).toBe('UNKNOWN');
    expect(viewport.operations).toEqual([]);
  });

  it('uses local gap tokens and explicit global spacing tokens without raw CSS',async()=>{
    const document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const local=await plan(document,'Adj több levegőt','reference-grid-heading');
    expect(local.status).toBe('READY');
    expect(local.operations[0]).toMatchObject({kind:'container-gap',nodeId:'reference-grid-left',gap:'m'});
    const localApplied=await applyStorefrontSmartIntentPlan({document,plan:local,registry,capability});
    expect(inspectStorefrontResponsiveContainerLayout(localApplied.document,'reference-grid-left','desktop').direct.gap).toBe('m');

    const global=await plan(document,'Legyen szellősebb az egész oldal','reference-title');
    expect(global.status).toBe('READY');
    expect(global.operations[0]).toMatchObject({kind:'global-spacing',value:'airy'});
    const globalApplied=await applyStorefrontSmartIntentPlan({document,plan:global,registry,capability});
    expect(getStorefrontGlobalStyleState(globalApplied.document).tokens.spacingScale).toBe('airy');
  });

  it('honors an explicit viewport for visibility and keeps responsive reset canonical',async()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const hide=await plan(document,'Rejtsd el mobilon','reference-grid-left','desktop');
    expect(hide.status).toBe('READY');
    expect(hide.operations[0]).toMatchObject({kind:'visibility',viewport:'mobile',hidden:true});
    document=(await applyStorefrontSmartIntentPlan({document,plan:hide,registry,capability})).document;
    expect(inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile').visibility.direct).toBe(true);

    const reset=await plan(document,'Állítsd vissza az öröklést mobilon','reference-grid-left','desktop');
    expect(reset.status).toBe('READY');
    document=(await applyStorefrontSmartIntentPlan({document,plan:reset,registry,capability})).document;
    expect(inspectStorefrontResponsiveLayoutDepth(document,'reference-grid-left','mobile').visibility.direct).toBeNull();
  });

  it('blocks no-op/boundary and unsupported typography intents with zero operations',async()=>{
    const document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const reset=await plan(document,'Reset mobilon','reference-grid-heading');
    expect(reset.status).toBe('BLOCK');
    expect(reset.operations).toEqual([]);

    const unsupported=await plan(document,'Legyen nagyobb cím','reference-grid');
    expect(unsupported.status).toBe('BLOCK');
    expect(unsupported.operations).toEqual([]);
  });

  it('rejects stale plans before any canonical operation applies',async()=>{
    let document=clone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const intent=await plan(document,'Rejtsd el mobilon','reference-grid-left');
    expect(intent.status).toBe('READY');
    document=setStorefrontResponsiveVisibility(document,'reference-grid-right','tablet',true);
    await expect(applyStorefrontSmartIntentPlan({document,plan:intent,registry,capability})).rejects.toThrow('SMART_INTENT_PLAN_STALE');
  });

  it('remains user-intent driven and outside AI, publish, persistence and diagnostic repair authority',()=>{
    const source=readFileSync('src/lib/builder/storefront-smart-intent.ts','utf8');
    expect(source).not.toContain('storefront-ai-generator');
    expect(source).not.toContain('ai-gateway');
    expect(source).not.toContain('publishVisualBuilderPageAction');
    expect(source).not.toContain('saveVisualBuilderDraftAction');
    expect(source).not.toContain('inspectStorefrontPublishReadiness');
    expect(source).not.toContain('storefront-visual-diff-intelligence');
    expect(source).not.toContain('dangerouslySetInnerHTML');
    expect(source).not.toContain('supabase');
  });
});
