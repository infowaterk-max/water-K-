import {describe,expect,it} from 'vitest';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontGuidedVisualComponentRegistry} from '@/lib/builder/storefront-guided-visual';
import {PLANS} from '@/lib/plans/catalog';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  BEAUTY_LAB_REFERENCE_V28_HOME_PAGE,
  BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE,
  BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_REFERENCE_V28_PACKAGE,
} from '@/lib/builder/templates/beauty-lab-reference-v28';
import {BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_CANONICAL_V2_PACKAGE} from '@/lib/builder/templates/beauty-lab-canonical-v2';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const flatten=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...flatten(node.children??[])]);
const find=(nodes:readonly StorefrontComponentNode[],id:string)=>flatten(nodes).find(node=>node.id===id);

describe('Beauty Lab reference v2.8 shared fidelity integration',()=>{
  it('replaces Home and PDP generic trust workarounds with the shared trust-strip primitive',()=>{
    const homeTrust=find(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.sections,'beauty-usp-grid')!;
    expect(homeTrust.componentKey).toBe('content.trust-strip');
    expect(homeTrust.componentVersion).toBe(1);
    expect(homeTrust.config).toMatchObject({columns:3,mobileColumns:3,presentation:'beauty-lab-home'});
    expect(homeTrust.children).toBeUndefined();
    expect(homeTrust.bindings?.items).toMatchObject({path:'content.homeTrust.items'});
    expect(homeTrust.config.items).toEqual(expect.arrayContaining([expect.objectContaining({label:'Bőrbarát formulák'}),expect.objectContaining({label:'Valódi eredmények'})]));

    const productTrust=find(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.sections,'beauty-product-trust')!;
    expect(productTrust.componentKey).toBe('content.trust-strip');
    expect(productTrust.componentVersion).toBe(1);
    expect(productTrust.config).toMatchObject({columns:3,mobileColumns:2,presentation:'compact-pdp'});
    expect(productTrust.children).toBeUndefined();
    expect(productTrust.bindings?.items).toMatchObject({path:'content.productTrust.items'});
    expect(productTrust.config.items).toEqual(expect.arrayContaining([expect.objectContaining({label:'Raktáron'}),expect.objectContaining({label:'30 napos visszaküldés'})]));
  });

  it('wires before/after to merchant evidence while failing closed by default',()=>{
    const evidence=find(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.sections,'beauty-product-before-after')!;
    expect(evidence.componentKey).toBe('editorial.before-after');
    expect(evidence.componentVersion).toBe(1);
    expect(evidence.config).toMatchObject({beforeImage:'',afterImage:'',evidenceStatus:'unverified',presentation:'merchant-evidence'});
    expect(evidence.bindings).toMatchObject({
      beforeImage:{path:'content.beforeAfter.beforeImage',fallback:''},
      afterImage:{path:'content.beforeAfter.afterImage',fallback:''},
      evidenceStatus:{path:'content.beforeAfter.evidenceStatus',fallback:'unverified'},
    });
    expect(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.metadata).toMatchObject({
      beforeAfterPrimitive:'editorial.before-after@1',
      beforeAfterStatus:'wired-fail-closed-awaiting-authoritative-merchant-evidence',
    });
    expect(JSON.stringify(evidence.config)).not.toMatch(/clinical|diagnos|cure|efficacy|gyógyít|kezelés/i);
  });

  it('keeps every reference v2.8 page valid in the shared guided visual runtime for Alap',()=>{
    const registry=createStorefrontGuidedVisualComponentRegistry();
    for(const page of BEAUTY_LAB_REFERENCE_V28_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the Visual Builder renderer registry symmetric with every Beauty Lab page node',()=>{
    const renderers=createStorefrontVisualBuilderRendererRegistry();
    for(const page of BEAUTY_LAB_CANONICAL_V2_PACKAGE.pages){
      for(const node of flatten(page.sections)){
        expect(renderers.get(node.componentKey,node.componentVersion),`${page.pageType}:${node.id}:${node.componentKey}@${node.componentVersion}`).toBeDefined();
      }
    }
    expect(renderers.get('commerce.purchase-controls',1)).toBeDefined();
  });

  it('promotes v2.8 as the canonical v2 source without creating a new template identity',()=>{
    expect(BEAUTY_LAB_CANONICAL_V2_PACKAGE.manifest.templateKey).toBe(BEAUTY_LAB_REFERENCE_V28_PACKAGE.manifest.templateKey);
    expect(BEAUTY_LAB_CANONICAL_V2_PACKAGE.manifest.templateVersion).toBe(2);
    expect(BEAUTY_LAB_CANONICAL_V2_PACKAGE.pages.every(page=>page.templateVersion===2)).toBe(true);
    expect(BEAUTY_LAB_CANONICAL_V2_PACKAGE.pages.every(page=>page.metadata?.canonicalTemplateSource==='beauty-lab-reference-v28')).toBe(true);
  });
});
