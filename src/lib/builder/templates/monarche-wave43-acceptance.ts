import {
  MONARCHE_ENGINE_CONTRACT,
  MONARCHE_HEADER_CONTRACT,
  MONARCHE_HOME_SECTION_ORDER,
  MONARCHE_TEMPLATE_KEY,
  MONARCHE_TEMPLATE_VERSION,
  MONARCHE_VISUAL_DNA,
} from '@/lib/builder/templates/monarche';
import {PERFORMANCE_LAB_TEMPLATE_KEY} from '@/lib/builder/templates/performance-lab';

/**
 * Wave 43 re-accepts the repository's original Wave 24 Golden #1 Monarche
 * package directly after the accepted Wave 42 Performance Lab baseline.
 * Historical ordering is repository-derived from PR #146 -> PR #147.
 */
export const MONARCHE_WAVE43_ACCEPTANCE=Object.freeze({
  wave:43,
  historicalWave:24,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:MONARCHE_TEMPLATE_KEY,
  templateVersion:MONARCHE_TEMPLATE_VERSION,
  inheritedImplementation:true,
  historicalSequence:{
    previous:PERFORMANCE_LAB_TEMPLATE_KEY,
    current:MONARCHE_TEMPLATE_KEY,
    relationship:'original-wave24-stacked-directly-on-performance-lab-wave23',
  },
  portfolio:{
    category:'fashion-apparel',
    goldenPosition:'Golden #1',
    position:'balanced-modern-premium-mainstream',
    monarche:MONARCHE_VISUAL_DNA.character,
    separation:[
      'not-editorial-atelier-asymmetry',
      'not-street-drop-culture',
      'not-discount-megastore-density',
    ] as const,
  },
  experience:{
    homeOrder:MONARCHE_HOME_SECTION_ORDER,
    headerLayout:MONARCHE_HEADER_CONTRACT.layout,
    headerUtilities:MONARCHE_HEADER_CONTRACT.utilityLabels,
    headerBoundary:MONARCHE_HEADER_CONTRACT.utilityBoundary,
    imageRatios:MONARCHE_VISUAL_DNA.imageRatios,
  },
  engineContract:{
    historicalRequiredForFullExperience:['E1','E2','E10','E13'] as const,
    historicalOptional:['E7'] as const,
    currentRequiredForFullExperience:MONARCHE_ENGINE_CONTRACT.requiredForFullExperience,
    currentOptional:MONARCHE_ENGINE_CONTRACT.optional,
  },
  sharedAuthority:{
    runtime:'E1-shared-page-schema-runtime',
    discovery:'E2-only-for-catalog-search-product-eligibility-and-collections',
    editorial:'E10-only-for-journal-editorial-story-content',
    structuredFacts:'E7-optional-source-supplied-structured-product-facts',
    checkout:'shared-provider-neutral-E13',
    ratings:'shared-review-authority-only-no-template-default-score',
  },
  safety:{
    fabricatedPrice:false,
    fabricatedStock:false,
    fabricatedRating:false,
    fabricatedProductAttribute:false,
    fabricatedMaterialClaim:false,
    fabricatedDurabilityClaim:false,
    templateProductEligibilityAuthority:false,
    templateCheckoutAuthority:false,
    templatePaymentAuthority:false,
    templateSpecificHeaderRenderer:false,
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
    'duplicate-monarche-template',
    'fashion-specific-commerce-engine',
    'template-specific-header-child-hack',
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
    'wave44-implementation',
  ] as const,
});
