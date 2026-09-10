import {
  TRAIL_EXPEDITION_ENGINE_CONTRACT,
  TRAIL_EXPEDITION_HOME_SECTION_ORDER,
  TRAIL_EXPEDITION_SELECTOR_CONTRACT,
  TRAIL_EXPEDITION_TEMPLATE_KEY,
  TRAIL_EXPEDITION_TEMPLATE_VERSION,
  TRAIL_EXPEDITION_VISUAL_DNA,
} from '@/lib/builder/templates/trail-expedition';
import {SPORT_HUB_TEMPLATE_KEY,SPORT_HUB_VISUAL_DNA} from '@/lib/builder/templates/sport-hub';
import {PERFORMANCE_LAB_TEMPLATE_KEY,PERFORMANCE_LAB_VISUAL_DNA} from '@/lib/builder/templates/performance-lab';

/**
 * Wave 41 re-accepts the repository's original Wave 22 Trail & Expedition
 * package directly after the accepted Wave 40 Sport Hub baseline. Historical
 * Wave 23 Performance Lab stacked directly on Trail & Expedition, preserving
 * the accepted Sport & Outdoor sequence without inventing a new identity.
 */
export const TRAIL_EXPEDITION_WAVE41_ACCEPTANCE=Object.freeze({
  wave:41,
  historicalWave:22,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:TRAIL_EXPEDITION_TEMPLATE_KEY,
  templateVersion:TRAIL_EXPEDITION_TEMPLATE_VERSION,
  inheritedImplementation:true,
  historicalSequence:{
    previous:SPORT_HUB_TEMPLATE_KEY,
    current:TRAIL_EXPEDITION_TEMPLATE_KEY,
    next:PERFORMANCE_LAB_TEMPLATE_KEY,
    relationship:'original-wave22-directly-on-sport-hub-and-wave23-directly-on-trail-expedition',
  },
  portfolio:{
    category:'sport-outdoor',
    categoryPositionWithinSportOutdoor:2,
    position:'route-adventure-first-trail-trekking-and-camping-commerce',
    trailExpedition:TRAIL_EXPEDITION_VISUAL_DNA.character,
    previousSportHub:SPORT_HUB_VISUAL_DNA.character,
    nextPerformanceLab:PERFORMANCE_LAB_VISUAL_DNA.character,
  },
  experience:{
    shoppingEntryQuestion:TRAIL_EXPEDITION_SELECTOR_CONTRACT.question,
    adventureRoutes:TRAIL_EXPEDITION_SELECTOR_CONTRACT.routes,
    selectorGeometry:TRAIL_EXPEDITION_SELECTOR_CONTRACT.geometry,
    selectorDefaultState:TRAIL_EXPEDITION_SELECTOR_CONTRACT.defaultState,
    selectorActiveState:TRAIL_EXPEDITION_SELECTOR_CONTRACT.activeState,
    desktopInteraction:TRAIL_EXPEDITION_SELECTOR_CONTRACT.desktopInteraction,
    mobileInteraction:TRAIL_EXPEDITION_SELECTOR_CONTRACT.mobileInteraction,
    homeOrder:TRAIL_EXPEDITION_HOME_SECTION_ORDER,
  },
  engineContract:{
    historicalRequiredForFullExperience:['E1','E2','E7','E10','E13'] as const,
    currentRequiredForFullExperience:TRAIL_EXPEDITION_ENGINE_CONTRACT.requiredForFullExperience,
  },
  sharedAuthority:{
    discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',
    structuredOutdoorFacts:'E7-only-when-authoritative-product-data-supplies-them',
    editorial:'E10-for-checklists-field-notes-guides-and-route-editorial-presentation',
    routeSelector:'shared-collection-navigation-presentation-only',
    guidedFinder:'no-template-local-state-machine-compose-with-shared-engine-when-integrated',
    routeMap:'editorial-context-only-not-live-navigation-weather-safety-or-difficulty-authority',
    checkout:'shared-provider-neutral-E13',
  },
  separation:{
    sportHub:'no-mainstream-multisport-hub-duplication',
    performanceLab:'no-specialist-goal-spec-data-lab-duplication',
    genericStorefront:'no-generic-hero-cards-repeated-grid-clone',
  },
  safety:{
    fabricatedRouteSafety:false,
    fabricatedWeatherSuitability:false,
    fabricatedDifficulty:false,
    fabricatedFitnessSuitability:false,
    fabricatedSurvivalClaims:false,
    fabricatedPerformanceClaims:false,
    templatePriceAuthority:false,
    templateStockAuthority:false,
    templateProductEligibilityAuthority:false,
    templateCheckoutAuthority:false,
    templatePaymentAuthority:false,
    templateLocalGuidedFinderEngine:false,
    liveNavigationEngine:false,
    liveWeatherEngine:false,
  },
  builderContract:{
    hierarchy:'template-page-presets-section-presets-components',
    stableIdentity:'stable-node-ids-and-stable-binding-paths',
    responsiveGrid:'shared-desktop-tablet-mobile-grid',
    pagePresetCount:14,
    minimumPlan:'alap',
    hardeningCorrections:['catalog-collection-header-node-id-deduplicated','content-story-index-replaced-with-content-allowed-story-body'] as const,
    runtimeAllowlistWidened:false,
    visualBuilder:'future-compatible-no-template-local-builder-engine',
  },
  nonScope:[
    'template-local-stateful-guided-finder',
    'live-route-navigation-or-gps',
    'live-weather-or-safety-authority',
    'template-local-difficulty-or-fitness-authority',
    'visual-builder-drag-drop-ui',
    'live-canvas',
    'inline-editing',
    'payment-provider-change',
    'sql-migration',
    'vercel-production-deploy',
    'supabase-mutation',
    'tenant-status-change',
    'main-merge',
  ] as const,
});