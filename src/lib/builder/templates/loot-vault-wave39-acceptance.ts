import {
  LOOT_VAULT_ENGINE_CONTRACT,
  LOOT_VAULT_HOME_SECTION_ORDER,
  LOOT_VAULT_TEMPLATE_KEY,
  LOOT_VAULT_TEMPLATE_VERSION,
  LOOT_VAULT_VISUAL_DNA,
} from '@/lib/builder/templates/loot-vault';
import {PLAYROOM_TEMPLATE_KEY,PLAYROOM_VISUAL_DNA} from '@/lib/builder/templates/playroom';

/**
 * Wave 39 re-accepts the repository's original Wave 20 Loot Vault package
 * directly after the accepted Wave 38 Playroom baseline. It preserves the
 * shared Storefront Runtime / Builder contracts and does not introduce a
 * Loot Vault-local scarcity, release, collector-state or commerce authority.
 */
export const LOOT_VAULT_WAVE39_ACCEPTANCE=Object.freeze({
  wave:39,
  historicalWave:20,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:LOOT_VAULT_TEMPLATE_KEY,
  templateVersion:LOOT_VAULT_TEMPLATE_VERSION,
  inheritedImplementation:true,
  historicalSequence:{
    previous:PLAYROOM_TEMPLATE_KEY,
    current:LOOT_VAULT_TEMPLATE_KEY,
    relationship:'original-wave20-directly-on-playroom',
  },
  portfolio:{
    category:'gaming-geek',
    categoryPosition:8,
    position:'collector-merch-drop-storefront',
    lootVault:LOOT_VAULT_VISUAL_DNA.character,
    previousPlayroom:PLAYROOM_VISUAL_DNA.character,
  },
  builderContract:{
    hierarchy:'template-page-presets-section-presets-components',
    stableIdentity:'stable-node-ids-and-stable-binding-paths',
    designTokens:'shared-storefront-design-token-contract',
    responsiveGrid:'shared-desktop-tablet-mobile-grid',
    pagePresetCount:14,
    minimumPlan:'alap',
    demoNamespace:'gaming-loot-vault',
    installation:'draft-only',
    homeOrder:LOOT_VAULT_HOME_SECTION_ORDER,
    visualBuilder:'future-compatible-no-template-local-builder-engine',
  },
  sharedAuthority:{
    engineContract:LOOT_VAULT_ENGINE_CONTRACT,
    discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',
    structuredCollectorFacts:'E7-only-when-authoritative-product-data-supplies-them',
    editorial:'E10-editorial-read-model-presentation-only',
    pricing:'shared-commerce-binding-only',
    inventory:'shared-commerce-binding-only',
    variants:'shared-commerce-binding-only',
    reviews:'shared-review-binding-only-no-fabricated-score',
    releaseAndPreorder:'catalog-product-commerce-inventory-read-models-only',
    checkout:'shared-provider-neutral-E13',
  },
  separation:{
    playroom:'no-broad-console-discovery-duplication',
    rigForge:'no-pc-build-configurator',
  },
  safety:{
    lootBoxOrGambling:false,
    fabricatedScarcity:false,
    fabricatedCountdown:false,
    fabricatedStock:false,
    fabricatedRarity:false,
    fabricatedExclusivity:false,
    templateReleaseAuthority:false,
    collectionTrackerV1:false,
  },
  nonScope:[
    'second-loot-vault-template',
    'template-local-collector-engine',
    'template-local-drop-or-preorder-engine',
    'template-local-release-authority',
    'template-local-product-authority',
    'template-local-commerce-authority',
    'runtime-binding-allowlist-widening',
    'loot-box-or-gambling-mechanics',
    'fabricated-scarcity-countdown-stock-or-release-state',
    'collection-tracker-v1',
    'playroom-broad-discovery-duplication',
    'rig-forge-configurator-duplication',
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
