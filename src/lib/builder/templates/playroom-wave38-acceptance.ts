import {
  PLAYROOM_DISCOVERY_PATH,
  PLAYROOM_ENGINE_CONTRACT,
  PLAYROOM_HOME_SECTION_ORDER,
  PLAYROOM_TEMPLATE_KEY,
  PLAYROOM_TEMPLATE_VERSION,
  PLAYROOM_VISUAL_DNA,
} from '@/lib/builder/templates/playroom';
import {SPEC_LAB_TEMPLATE_KEY,SPEC_LAB_VISUAL_DNA} from '@/lib/builder/templates/spec-lab';

/**
 * Wave 38 re-accepts the repository's original Wave 19 Playroom package
 * directly after the accepted Wave 37 Spec Lab baseline. It preserves the
 * shared Storefront Runtime / Builder contracts and does not introduce a
 * Playroom-local discovery, compatibility, product or commerce authority.
 */
export const PLAYROOM_WAVE38_ACCEPTANCE=Object.freeze({
  wave:38,
  historicalWave:19,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:PLAYROOM_TEMPLATE_KEY,
  templateVersion:PLAYROOM_TEMPLATE_VERSION,
  inheritedImplementation:true,
  historicalSequence:{
    previous:SPEC_LAB_TEMPLATE_KEY,
    current:PLAYROOM_TEMPLATE_KEY,
    relationship:'original-wave19-directly-on-spec-lab',
  },
  portfolio:{
    category:'gaming-geek',
    position:'broad-gaming-console-discovery-store',
    playroom:PLAYROOM_VISUAL_DNA.character,
    previousSpecLab:SPEC_LAB_VISUAL_DNA.character,
    discoveryPath:PLAYROOM_DISCOVERY_PATH,
  },
  builderContract:{
    hierarchy:'template-page-presets-section-presets-components',
    stableIdentity:'stable-node-ids-and-stable-binding-paths',
    designTokens:'shared-storefront-design-token-contract',
    responsiveGrid:'shared-desktop-tablet-mobile-grid',
    pagePresetCount:14,
    minimumPlan:'alap',
    demoNamespace:'gaming-playroom',
    installation:'draft-only',
    homeOrder:PLAYROOM_HOME_SECTION_ORDER,
    hardeningCorrections:[
      'home-compatibility-evidence-to-supported-status-surface',
      'product-compatibility-status-to-supported-evidence-surface',
      'catalog-collection-header-node-id-deduplicated',
      'catalog-guidance-section-node-id-deduplicated',
      'content-guides-to-content-page-supported-shared-editorial-surface',
    ] as const,
    runtimeAllowlistWidened:false,
    visualBuilder:'future-compatible-no-template-local-builder-engine',
  },
  sharedAuthority:{
    engineContract:PLAYROOM_ENGINE_CONTRACT,
    discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',
    guidedFinder:'E3-guidance-and-ranking-only-over-E2-eligible-products',
    compatibility:'E6-explainable-evidence-only-unknown-is-not-compatible',
    structuredProduct:'E7-authoritative-platform-genre-player-and-product-facts',
    editorial:'E10-editorial-read-model-presentation-only',
    pricing:'shared-commerce-binding-only',
    inventory:'shared-commerce-binding-only',
    variants:'shared-commerce-binding-only',
    reviews:'shared-review-binding-only-no-fabricated-score',
    checkout:'shared-provider-neutral-E13',
  },
  separation:{
    rigForge:'no-pc-build-configurator',
    lootVault:'no-collector-drop-or-merch-vault-authority',
  },
  nonScope:[
    'second-playroom-template',
    'template-local-gaming-engine',
    'template-local-guided-finder-engine',
    'template-local-compatibility-engine',
    'template-local-structured-product-registry',
    'runtime-binding-allowlist-widening',
    'pc-configurator-duplication',
    'collector-drop-authority',
    'loot-box-or-gambling-mechanics',
    'fabricated-release-date-or-countdown',
    'fabricated-rating-or-review-score',
    'fabricated-platform-support-or-compatibility',
    'price-or-stock-authority',
    'payment-provider-change',
    'sql-migration',
    'vercel-production-deploy',
    'supabase-mutation',
    'main-merge',
    'visual-builder-drag-drop-ui',
    'live-canvas',
    'inline-editing',
  ],
} as const);
