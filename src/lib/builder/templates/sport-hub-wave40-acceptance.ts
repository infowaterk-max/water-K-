import {
  SPORT_HUB_ENGINE_CONTRACT,
  SPORT_HUB_HOME_SECTION_ORDER,
  SPORT_HUB_TEMPLATE_KEY,
  SPORT_HUB_TEMPLATE_VERSION,
  SPORT_HUB_VISUAL_DNA,
} from '@/lib/builder/templates/sport-hub';
import {LOOT_VAULT_TEMPLATE_KEY,LOOT_VAULT_VISUAL_DNA} from '@/lib/builder/templates/loot-vault';
import {TRAIL_EXPEDITION_TEMPLATE_KEY,TRAIL_EXPEDITION_VISUAL_DNA} from '@/lib/builder/templates/trail-expedition';

/**
 * Wave 40 re-accepts the repository's original Wave 21 Sport Hub package
 * directly after the accepted Wave 39 Loot Vault baseline. The historical
 * Wave 22 Trail & Expedition package stacked directly on Sport Hub, which
 * closes the sequence evidence without inventing a new roadmap identity.
 */
export const SPORT_HUB_WAVE40_ACCEPTANCE=Object.freeze({
  wave:40,
  historicalWave:21,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:SPORT_HUB_TEMPLATE_KEY,
  templateVersion:SPORT_HUB_TEMPLATE_VERSION,
  inheritedImplementation:true,
  historicalSequence:{
    previous:LOOT_VAULT_TEMPLATE_KEY,
    current:SPORT_HUB_TEMPLATE_KEY,
    next:TRAIL_EXPEDITION_TEMPLATE_KEY,
    relationship:'original-wave21-directly-on-loot-vault-and-wave22-directly-on-sport-hub',
  },
  portfolio:{
    category:'sport-outdoor',
    categoryPosition:8,
    position:'broad-mainstream-multisport-commerce-hub',
    sportHub:SPORT_HUB_VISUAL_DNA.character,
    previousLootVault:LOOT_VAULT_VISUAL_DNA.character,
    nextTrailExpedition:TRAIL_EXPEDITION_VISUAL_DNA.character,
  },
  experience:{
    shoppingEntryQuestion:'Milyen sportot űzöl?',
    sports:['futás','kerékpár','fitnesz','túra','úszás','labdajátékok'] as const,
    skillLevels:['Kezdő','Haladó','Profi'] as const,
    homeOrder:SPORT_HUB_HOME_SECTION_ORDER,
  },
  engineContract:{
    historicalRequiredForFullExperience:['E1','E2','E7','E10','E13'] as const,
    currentRequiredForFullExperience:SPORT_HUB_ENGINE_CONTRACT.requiredForFullExperience,
  },
  sharedAuthority:{
    discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',
    structuredSportFacts:'E7-only-when-authoritative-product-data-supplies-them',
    editorial:'E10-editorial-read-model-presentation-only',
    activity:'E2-authoritative-collection-navigation',
    skillLevel:'merchant-configured-navigation-and-E7-facets-only-when-supplied',
    season:'E2-eligibility-and-E7-facets-only-when-supplied',
    quickBuy:'existing-commerce-components-only',
    checkout:'shared-provider-neutral-E13',
  },
  separation:{
    playroom:'no-gaming-discovery-role-duplication',
    lootVault:'no-collector-drop-preorder-role-duplication',
    trailExpedition:'no-route-expedition-first-role-duplication',
    performanceLab:'no-specialist-performance-data-lab-duplication',
  },
  safety:{
    fabricatedPerformanceClaims:false,
    fabricatedTeamAffiliation:false,
    fabricatedEventResults:false,
    templatePriceAuthority:false,
    templateStockAuthority:false,
    templateProductEligibilityAuthority:false,
    templateCheckoutAuthority:false,
    templatePaymentAuthority:false,
    templateLocalSportsEngine:false,
    liveScoreEngine:false,
  },
  builderContract:{
    hierarchy:'template-page-presets-section-presets-components',
    stableIdentity:'stable-node-ids-and-stable-binding-paths',
    responsiveGrid:'shared-desktop-tablet-mobile-grid',
    pagePresetCount:14,
    minimumPlan:'alap',
    hardeningCorrections:['catalog-collection-header-node-id-deduplicated','content-story-index-replaced-with-content-allowed-story-body'],
    runtimeAllowlistWidened:false,
    visualBuilder:'future-compatible-no-template-local-builder-engine',
  },
  nonScope:[
    'template-local-sports-engine',
    'template-local-live-score-engine',
    'template-local-performance-authority',
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
