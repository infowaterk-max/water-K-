import {describe,expect,it} from 'vitest';
import {createStorefrontEditorialComponentRegistry} from '@/lib/builder/storefront-editorial';
import {PLANS} from '@/lib/plans/catalog';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {EDITORIAL_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/editorial-atelier';
import {MONARCHE_VISUAL_DNA} from '@/lib/builder/templates/monarche';
import {
  STREET_DROP_DESIGN_TOKENS,
  STREET_DROP_ENGINE_CONTRACT,
  STREET_DROP_HOME_PAGE,
  STREET_DROP_HOME_SECTION_ORDER,
  STREET_DROP_TEMPLATE_PACKAGE,
  STREET_DROP_VISUAL_DNA,
} from '@/lib/builder/templates/street-drop';
import {STREET_DROP_WAVE26_ACCEPTANCE} from '@/lib/builder/templates/street-drop-wave26-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};

describe('Scale-out Wave 26 Street Drop current-baseline reacceptance',()=>{
  it('reuses the inherited Street Drop implementation instead of duplicating the template',()=>{
    expect(STREET_DROP_WAVE26_ACCEPTANCE.mode).toBe('current-baseline-reacceptance');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.inheritedImplementation).toBe(true);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.templateKey).toBe('fashion.street-drop');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.templateVersion).toBe(1);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.nonScope).toContain('second-street-drop-template');
  });

  it('locks the approved third fashion direction as aggressive but readable streetwear/drop culture',()=>{
    expect(STREET_DROP_VISUAL_DNA.character).toBe('aggressive-urban-drop-commerce');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.visualContract.audience).toEqual(['streetwear','sneaker','street-workout','skate','roller','bmx']);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.visualContract.foundation).toBe('black-off-white-with-merchant-replaceable-neon-accent');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.visualContract.displayTypography).toBe('characterful-readable-display-headlines-only');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.visualContract.interfaceTypography).toBe('clean-sans-ui');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(STREET_DROP_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('is structurally distinct from both Monarche and Editorial Atelier',()=>{
    expect(STREET_DROP_VISUAL_DNA.character).not.toBe(MONARCHE_VISUAL_DNA.character);
    expect(STREET_DROP_VISUAL_DNA.character).not.toBe(EDITORIAL_ATELIER_VISUAL_DNA.character);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.distinctness).toEqual({
      notMonarche:'not-balanced-mainstream-premium-retail',
      notEditorialAtelier:'not-asymmetric-luxury-magazine-editorial',
      ownPosition:'aggressive-readable-urban-drop-commerce',
    });
    expect(STREET_DROP_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['luxury-editorial-clone','fake-stock-scarcity','unreadable-graffiti-font']));
  });

  it('retains the original high-energy Home journey and separately editable marketing layers',()=>{
    expect(STREET_DROP_HOME_SECTION_ORDER).toEqual(['Drop Hero','Release Bar','Shop the Drop','Categories','Limited Stock','Street Story','New Arrivals','Community Journal','Drop Alert','Footer']);
    expect(STREET_DROP_HOME_PAGE.metadata?.sectionOrder).toEqual(STREET_DROP_HOME_SECTION_ORDER);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.builderContract.heroMarketingLayers).toEqual(['badge','headline','copy','primary-cta','secondary-cta','image']);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.builderContract.dropAlertLayers).toEqual(['eyebrow','headline','copy','cta']);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.builderContract.responsiveModes).toEqual(['desktop','tablet','mobile']);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.builderContract.imageRule).toMatch(/never-baked-into-image-assets/);
    const source=JSON.stringify(STREET_DROP_HOME_PAGE);
    for(const id of ['street-drop-hero-badge','street-drop-hero-title','street-drop-hero-copy','street-drop-hero-primary','street-drop-hero-secondary','street-drop-hero-image','street-drop-alert-eyebrow','street-drop-alert-title','street-drop-alert-copy','street-drop-alert-cta']) expect(source).toContain(id);
  });

  it('keeps scarcity and release urgency fail-closed under shared authority',()=>{
    expect(STREET_DROP_ENGINE_CONTRACT.stockScarcityAuthority).toBe('inventory-binding-only');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.authorityContract.scarcity).toBe('inventory-binding-only');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.authorityContract.releaseStatus).toBe('authoritative-binding-only');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.authorityContract.noFakeCountdown).toBe(true);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.authorityContract.noFakeLimitedStock).toBe(true);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.authorityContract.noTemplateSpecificDropScheduler).toBe(true);
    expect(STREET_DROP_WAVE26_ACCEPTANCE.authorityContract.noTemplateSpecificInventoryAuthority).toBe(true);
    expect(JSON.stringify(STREET_DROP_HOME_PAGE)).not.toMatch(/countdownSeconds|fakeCountdown|hardcodedStockCount/i);
  });

  it('still validates all 14 Alap pages and draft-only installation on the current baseline',()=>{
    const registry=createStorefrontEditorialComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:STREET_DROP_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(STREET_DROP_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    for(const page of STREET_DROP_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:STREET_DROP_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='fashion-street-drop')).toBe(true);
  });

  it('keeps checkout provider-neutral and outside the drop aesthetic authority',()=>{
    const checkout=STREET_DROP_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(STREET_DROP_WAVE26_ACCEPTANCE.authorityContract.checkout).toBe('shared-provider-neutral-E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
