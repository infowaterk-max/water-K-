import {
  PERFORMANCE_LAB_ENGINE_CONTRACT,
  PERFORMANCE_LAB_GOAL_CONTRACT,
  PERFORMANCE_LAB_HOME_SECTION_ORDER,
  PERFORMANCE_LAB_TEMPLATE_KEY,
  PERFORMANCE_LAB_TEMPLATE_VERSION,
  PERFORMANCE_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/performance-lab';
import {TRAIL_EXPEDITION_TEMPLATE_KEY,TRAIL_EXPEDITION_VISUAL_DNA} from '@/lib/builder/templates/trail-expedition';
import {SPORT_HUB_TEMPLATE_KEY,SPORT_HUB_VISUAL_DNA} from '@/lib/builder/templates/sport-hub';

/**
 * Wave 42 re-accepts the repository's original Wave 23 Performance Lab
 * package directly after the accepted Wave 41 Trail & Expedition baseline.
 * The identity and ordering are repository-derived from historical PR #146,
 * the original Wave 23 evidence, and the Wave 41 closure contract.
 */
export const PERFORMANCE_LAB_WAVE42_ACCEPTANCE=Object.freeze({
  wave:42,
  historicalWave:23,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:PERFORMANCE_LAB_TEMPLATE_KEY,
  templateVersion:PERFORMANCE_LAB_TEMPLATE_VERSION,
  inheritedImplementation:true,
  historicalSequence:{
    previous:TRAIL_EXPEDITION_TEMPLATE_KEY,
    current:PERFORMANCE_LAB_TEMPLATE_KEY,
    relationship:'original-wave23-stacked-directly-on-trail-expedition-wave22',
  },
  portfolio:{
    category:'sport-outdoor',
    categoryPositionWithinSportOutdoor:3,
    position:'specialist-goal-spec-compare-performance-commerce',
    performanceLab:PERFORMANCE_LAB_VISUAL_DNA.character,
    previousTrailExpedition:TRAIL_EXPEDITION_VISUAL_DNA.character,
    broadSportHub:SPORT_HUB_VISUAL_DNA.character,
    broadSportHubKey:SPORT_HUB_TEMPLATE_KEY,
  },
  experience:{
    shoppingEntryQuestion:PERFORMANCE_LAB_GOAL_CONTRACT.question,
    defaultGoals:PERFORMANCE_LAB_GOAL_CONTRACT.goals,
    goalPresentation:PERFORMANCE_LAB_GOAL_CONTRACT.presentation,
    homeOrder:PERFORMANCE_LAB_HOME_SECTION_ORDER,
  },
  engineContract:{
    historicalRequiredForFullExperience:['E1','E2','E7','E10','E13'] as const,
    currentRequiredForFullExperience:PERFORMANCE_LAB_ENGINE_CONTRACT.requiredForFullExperience,
  },
  sharedAuthority:{
    discovery:'E2-only-for-catalog-search-channel-product-eligibility-and-goal-routing-results',
    structuredFacts:'E7-only-for-source-supplied-specs-measurements-and-comparisons',
    metricSnapshot:'shared-commerce-read-model-backed-by-E7-supplied-measurements-only',
    editorial:'E10-for-expert-video-research-note-and-lab-editorial-context',
    goalConsole:'merchant-configured-navigation-not-product-suitability-authority',
    gearFinder:'declarative-discovery-compose-with-shared-guided-finder-when-integrated',
    labTested:'presentation-only-never-infers-missing-values-deltas-rankings-or-gains',
    checkout:'shared-provider-neutral-E13',
  },
  separation:{
    trailExpedition:'no-route-first-cinematic-diamond-slant-duplication',
    sportHub:'no-mainstream-multisport-hub-duplication',
    genericStorefront:'no-generic-hero-cards-repeated-grid-clone',
  },
  safety:{
    fabricatedLabResults:false,
    fabricatedPerformanceGains:false,
    fabricatedFitnessSuitability:false,
    fabricatedAthleteEndorsements:false,
    fabricatedRankings:false,
    templatePriceAuthority:false,
    templateStockAuthority:false,
    templateInventoryAuthority:false,
    templateProductEligibilityAuthority:false,
    templateCheckoutAuthority:false,
    templatePaymentAuthority:false,
    templateLocalGuidedFinderEngine:false,
  },
  builderContract:{
    hierarchy:'template-page-presets-section-presets-components',
    stableIdentity:'stable-node-ids-and-stable-binding-paths',
    responsiveGrid:'shared-desktop-tablet-mobile-grid',
    pagePresetCount:14,
    minimumPlan:'alap',
    hardeningCorrections:[
      'performance-metric-namespace-to-shared-commerce-read-model',
      'compare-namespace-to-shared-commerce-read-models',
      'catalog-collection-header-node-id-deduplicated',
      'product-compare-button-to-content-and-commerce-bindings',
      'content-story-index-to-story-body',
    ] as const,
    runtimeAllowlistWidened:false,
    visualBuilder:'future-compatible-no-template-local-builder-engine',
  },
  nonScope:[
    'template-local-stateful-guided-finder',
    'fabricated-lab-or-performance-authority',
    'visual-builder-drag-drop-ui',
    'live-canvas',
    'inline-editing',
    'payment-provider-change',
    'sql-migration',
    'vercel-production-deploy',
    'supabase-mutation',
    'tenant-status-change',
    'main-merge',
    'wave43-implementation',
  ] as const,
});
