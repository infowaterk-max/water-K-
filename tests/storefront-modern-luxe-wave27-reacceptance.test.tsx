import {describe,expect,it} from 'vitest';
import {createStorefrontVisualLayerComponentRegistry} from '@/lib/builder/storefront-visual-layers';
import {PLANS} from '@/lib/plans/catalog';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {HERITAGE_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/heritage-atelier';
import {
  MODERN_LUXE_DESIGN_TOKENS,
  MODERN_LUXE_ENGINE_CONTRACT,
  MODERN_LUXE_HOME_PAGE,
  MODERN_LUXE_HOME_SECTION_ORDER,
  MODERN_LUXE_SPACING_CONTRACT,
  MODERN_LUXE_TEMPLATE_PACKAGE,
  MODERN_LUXE_VISUAL_DNA,
} from '@/lib/builder/templates/modern-luxe';
import {MODERN_LUXE_WAVE27_ACCEPTANCE} from '@/lib/builder/templates/modern-luxe-wave27-acceptance';
import {STATEMENT_LAB_VISUAL_DNA} from '@/lib/builder/templates/statement-lab';

const capability={plan:'alap' as const,features:PLANS.alap.features};

describe('Scale-out Wave 27 Modern Luxe current-baseline reacceptance',()=>{
  it('reuses the inherited Modern Luxe implementation instead of duplicating it',()=>{
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.mode).toBe('current-baseline-reacceptance');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.inheritedImplementation).toBe(true);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.templateKey).toBe('jewelry.modern-luxe');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.templateVersion).toBe(1);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.nonScope).toContain('second-modern-luxe-template');
  });

  it('locks the approved spacious modern luxury direction and merchant-adjustable styling',()=>{
    expect(MODERN_LUXE_VISUAL_DNA.character).toBe('premium-modern-jewelry-accessories-spacious-editorial-luxe');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.visualContract.categories).toEqual(['Ékszerek','Órák','Táskák','Napszemüvegek','Kiegészítők']);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.visualContract.palette).toEqual(['ivory','champagne-gold','black']);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.visualContract.fontRequirements).toEqual(['builder-available','legally-usable','hungarian-characters']);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.visualContract.heroNavigation).toBe('none');
    expect(MODERN_LUXE_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(MODERN_LUXE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['crowded-home','hero-carousel-next-prev','baked-in-marketing-copy','overloaded-gold']));
  });

  it('is structurally distinct from Heritage Atelier and Statement Lab',()=>{
    expect(MODERN_LUXE_VISUAL_DNA.character).not.toBe(HERITAGE_ATELIER_VISUAL_DNA.character);
    expect(MODERN_LUXE_VISUAL_DNA.character).not.toBe(STATEMENT_LAB_VISUAL_DNA.character);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.distinctness).toEqual({
      notHeritageAtelier:'not-craftsmanship-provenance-heritage-story-led',
      notStatementLab:'not-material-lab-spec-gallery-led',
      ownPosition:'premium-modern-spacious-editorial-luxury-retail',
    });
  });

  it('retains the accepted airy Home journey, no carousel navigation and independent visual layers',()=>{
    expect(MODERN_LUXE_HOME_SECTION_ORDER).toEqual(['Layered Luxe Hero','Category Edit','Signature Selection','Ajándéknak választva','Brand Story','Footer']);
    expect(MODERN_LUXE_HOME_PAGE.metadata?.sectionOrder).toEqual(MODERN_LUXE_HOME_SECTION_ORDER);
    expect(MODERN_LUXE_HOME_PAGE.metadata?.heroNavigation).toBe('none');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.builderContract.heroLayers).toEqual(['image','overlay','decoration','badge','title','subtitle','cta']);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.builderContract.spacing).toBe(MODERN_LUXE_SPACING_CONTRACT);
    expect(MODERN_LUXE_SPACING_CONTRACT).toEqual({presets:['narrow','normal','airy','custom'],defaultPreset:'airy',controls:['section-gap','inner-padding','column-gap'],responsive:['desktop','tablet','mobile']});
    const source=JSON.stringify(MODERN_LUXE_HOME_PAGE);
    for(const id of ['modern-luxe-hero-image-layer','modern-luxe-hero-overlay-layer','modern-luxe-hero-decoration-layer','modern-luxe-hero-badge-layer','modern-luxe-hero-title-layer','modern-luxe-hero-subtitle-layer','modern-luxe-hero-cta-layer']) expect(source).toContain(id);
  });

  it('keeps product truth and commerce authority fail-closed',()=>{
    expect(MODERN_LUXE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E13']);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.authorityContract.pricing).toBe('pricing-binding-only');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.authorityContract.inventory).toBe('inventory-binding-only');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.authorityContract.variants).toBe('variant-binding-only');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.authorityContract.structuredFacts).toBe('E7-or-authoritative-product-binding-only-when-supplied');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.authorityContract.noTemplateSpecificJewelryAuthority).toBe(true);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.authorityContract.noFakeMaterialClaims).toBe(true);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.authorityContract.noFakeScarcity).toBe(true);
  });

  it('does not make 3D/AR a Modern Luxe v1 dependency or create a template-local engine',()=>{
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.capabilityBoundary.threeDAr).toBe('not-required-by-modern-luxe-v1');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.capabilityBoundary.packaging).toBe('deferred-shared-pro-or-addon-capability');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.capabilityBoundary.rule).toMatch(/shared-capability-not-template-local-engine/);
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.nonScope).toContain('template-local-3d-ar-engine');
  });

  it('still validates all 14 Alap pages and draft-only installation on the current baseline',()=>{
    const registry=createStorefrontVisualLayerComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:MODERN_LUXE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(MODERN_LUXE_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(MODERN_LUXE_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of MODERN_LUXE_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:MODERN_LUXE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='jewelry-modern-luxe')).toBe(true);
  });

  it('keeps checkout provider-neutral and outside visual-template authority',()=>{
    const checkout=MODERN_LUXE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(MODERN_LUXE_WAVE27_ACCEPTANCE.authorityContract.checkout).toBe('shared-provider-neutral-E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
