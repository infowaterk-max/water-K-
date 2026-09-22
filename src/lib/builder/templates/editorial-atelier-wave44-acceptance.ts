import {
  EDITORIAL_ATELIER_ENGINE_CONTRACT,
  EDITORIAL_ATELIER_HOME_SECTION_ORDER,
  EDITORIAL_ATELIER_PRO_CONTRACT,
  EDITORIAL_ATELIER_TEMPLATE_KEY,
  EDITORIAL_ATELIER_TEMPLATE_VERSION,
  EDITORIAL_ATELIER_VISUAL_DNA,
} from '@/lib/builder/templates/editorial-atelier';
import {MONARCHE_TEMPLATE_KEY} from '@/lib/builder/templates/monarche';

/**
 * Wave 44 re-accepts the repository's original Wave 25 Editorial Atelier /
 * Atelier Nova package directly after the accepted Wave 43 Monarche baseline.
 * Historical ordering is repository-derived from PR #147 -> PR #148.
 */
export const EDITORIAL_ATELIER_WAVE44_ACCEPTANCE=Object.freeze({
  wave:44,
  historicalWave:25,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:EDITORIAL_ATELIER_TEMPLATE_KEY,
  templateVersion:EDITORIAL_ATELIER_TEMPLATE_VERSION,
  inheritedImplementation:true,
  historicalSequence:{
    previous:MONARCHE_TEMPLATE_KEY,
    current:EDITORIAL_ATELIER_TEMPLATE_KEY,
    relationship:'original-wave25-stacked-directly-on-monarche-wave24',
  },
  portfolio:{
    category:'fashion-apparel',
    position:'editorial-asymmetric-campaign-led-luxury',
    character:EDITORIAL_ATELIER_VISUAL_DNA.character,
    separation:[
      'not-monarche-balanced-retail-grid',
      'not-street-drop-culture',
      'not-generic-symmetric-hero-cards-grid',
    ] as const,
  },
  experience:{
    homeOrder:EDITORIAL_ATELIER_HOME_SECTION_ORDER,
    campaignComposition:'alternating-image-position-right-then-left',
    editGrid:'three-column-restrained-selection',
    featuredSilhouettes:'two-column-story-led-composition',
    pdpGrid:'desktop-tablet-7-5-mobile-12-12',
  },
  engineContract:{
    historicalRequiredForFullExperience:['E1','E2','E10','E13'] as const,
    historicalOptional:['E7'] as const,
    currentRequiredForFullExperience:EDITORIAL_ATELIER_ENGINE_CONTRACT.requiredForFullExperience,
    currentOptional:EDITORIAL_ATELIER_ENGINE_CONTRACT.optional,
  },
  proBoundary:{
    feature:EDITORIAL_ATELIER_PRO_CONTRACT.feature,
    plan:EDITORIAL_ATELIER_PRO_CONTRACT.plan,
    alapFallback:EDITORIAL_ATELIER_PRO_CONTRACT.alapFallback,
    implementationBoundary:EDITORIAL_ATELIER_PRO_CONTRACT.implementationBoundary,
    authorityBoundary:EDITORIAL_ATELIER_PRO_CONTRACT.authorityBoundary,
  },
  sharedAuthority:{
    runtime:'E1-shared-page-schema-runtime',
    discovery:'E2-only-for-catalog-search-product-eligibility-authority',
    editorial:'E10-only-for-campaign-journal-lookbook-story-authority',
    structuredFacts:'E7-optional-source-supplied-structured-product-facts',
    checkout:'shared-provider-neutral-E13',
    interactiveScene:'future-shared-interactive-scene-or-composer-engine-only',
  },
  safety:{
    fabricatedPrice:false,
    fabricatedStock:false,
    fabricatedRating:false,
    fabricatedMaterialClaim:false,
    fabricatedFitClaim:false,
    fabricatedSizingFact:false,
    templateProductEligibilityAuthority:false,
    templateCheckoutAuthority:false,
    templatePaymentAuthority:false,
    templateSpecificHotspotEngine:false,
  },
  builderContract:{
    hierarchy:'template-page-presets-section-presets-components',
    stableIdentity:'stable-node-ids-and-stable-binding-paths',
    responsiveGrid:'shared-desktop-tablet-mobile-grid',
    pagePresetCount:14,
    minimumPlan:'alap',
    protectedHomeSequence:true,
    protectedPdpGrid:'desktop-tablet-7-5-mobile-12-12',
    runtimeAllowlistWidened:false,
    componentRegistryWidened:false,
    bindingNamespaceWidened:false,
    visualBuilder:'future-compatible-no-template-local-builder-engine',
  },
  nonScope:[
    'duplicate-editorial-atelier-template',
    'fashion-specific-commerce-engine',
    'template-specific-hotspot-engine',
    'fabricated-commerce-or-product-authority',
    'visual-builder-drag-drop-ui',
    'live-canvas',
    'inline-editing',
    'payment-provider-change',
    'sql-migration',
    'vercel-production-deploy',
    'supabase-mutation',
    'tenant-status-change',
    'tenant-plan-change',
    'main-merge',
    'wave45-implementation',
  ] as const,
});
