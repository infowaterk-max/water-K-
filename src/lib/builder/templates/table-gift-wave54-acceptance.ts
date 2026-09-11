import {GALLERY_EDIT_VISUAL_DNA} from '@/lib/builder/templates/gallery-edit';
import {MARKET_PANTRY_VISUAL_DNA} from '@/lib/builder/templates/market-pantry';
import {
  TABLE_GIFT_BUILDER_HARDENING_CONTRACT,
  TABLE_GIFT_ENGINE_CONTRACT,
  TABLE_GIFT_HOME_SECTION_ORDER,
  TABLE_GIFT_TEMPLATE_KEY,
  TABLE_GIFT_TEMPLATE_VERSION,
  TABLE_GIFT_VISUAL_DNA,
} from '@/lib/builder/templates/table-gift';
import {TABLE_GIFT_WAVE35_ACCEPTANCE} from '@/lib/builder/templates/table-gift-wave35-acceptance';

/**
 * Wave 54 replays repository-proven historical Wave 35 / PR #195 directly
 * after current Wave 53 Gallery Edit. Table & Gift v1 is inherited unchanged;
 * this contract re-accepts it against the current stacked Storefront/Page Schema
 * baseline without inventing a template, engine, binding namespace or checkpoint.
 */
export const TABLE_GIFT_WAVE54_ACCEPTANCE=Object.freeze({
  wave:54,
  historicalCounterpartWave:35,
  historicalPullRequest:195,
  originalTemplateWave:16,
  originalTemplatePullRequest:139,
  historicalAcceptance:TABLE_GIFT_WAVE35_ACCEPTANCE.mode,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:TABLE_GIFT_TEMPLATE_KEY,
  templateVersion:TABLE_GIFT_TEMPLATE_VERSION,
  inheritedImplementation:true,
  sequence:{
    previous:'wave53-home.gallery-edit',
    current:TABLE_GIFT_TEMPLATE_KEY,
    historicalNext:'wave36-tech.creator-station',
    originalPrevious:'wave15-home.gallery-edit',
    originalCurrent:'wave16-food.table-gift',
    originalNext:'wave17-tech.creator-station',
    relationship:'historical-wave35-successor-replayed-on-current-stacked-baseline',
    releaseCheckpointBeforeCurrent:false,
  },
  portfolio:{
    category:'food-gifting',
    tableGift:TABLE_GIFT_VISUAL_DNA.character,
    journey:TABLE_GIFT_VISUAL_DNA.journey,
    previousGalleryEdit:GALLERY_EDIT_VISUAL_DNA.character,
    foodSiblingMarketPantry:MARKET_PANTRY_VISUAL_DNA.character,
  },
  visualContract:{
    character:'premium-gifting-occasion-table-curated-commerce',
    palette:['ivory','deep-burgundy','forest-green','champagne','black'],
    typography:['elegant-editorial-serif','clean-sans'],
    imagery:'gift-box-ribbon-premium-table-setting-curated-food-drink-packaging-editorial-still-life',
    spacing:'generous-celebratory-refined',
    exclusions:TABLE_GIFT_VISUAL_DNA.exclusions,
  },
  builderContract:{
    hardening:TABLE_GIFT_BUILDER_HARDENING_CONTRACT,
    hierarchy:'template-page-presets-section-presets-components',
    responsiveModes:['desktop','tablet','mobile'],
    pagePresetCount:14,
    minimumPlan:'alap',
    stableIdentity:'unique-node-ids-and-stable-binding-paths',
    merchantEditableDesignTokens:true,
    marketingCopyBakedIntoImages:false,
    runtimeAllowlistWidened:false,
    componentRegistryWidened:false,
    bindingNamespaceWidened:false,
    visualBuilder:'future-compatible-no-template-local-builder-engine',
  },
  commerceAuthority:{
    engineContract:TABLE_GIFT_ENGINE_CONTRACT,
    productEligibility:'E2-shared-discovery-only',
    guidedFinder:'E3-guidance-and-ranking-only',
    composer:'E4-real-product-composition-intent-only',
    pricing:'shared-commerce-binding-only',
    inventory:'shared-commerce-binding-only',
    variants:'shared-variant-binding-only',
    reviews:'shared-review-binding-only-when-present',
    recommendations:'shared-recommendation-binding-only',
    giftMessage:'presentation-only-no-persistence-authority',
    corporateGift:'contact-presentation-only-no-b2b-pricing-or-approval-authority',
    checkout:'shared-provider-neutral-E13',
    noTemplateProductAuthority:true,
    noTemplatePricingAuthority:true,
    noTemplateInventoryAuthority:true,
    noTemplateVariantAuthority:true,
    noTemplateGuidanceAuthority:true,
    noTemplateComposerAuthority:true,
    noTemplateCheckoutAuthority:true,
    noTemplatePaymentAuthority:true,
  },
  exactHomeOrder:TABLE_GIFT_HOME_SECTION_ORDER,
  distinctness:{
    notGalleryEdit:'not-airy-object-room-material-gallery-curation',
    notMarketPantry:'not-pantry-market-composer-first-grocery-commerce',
    ownPosition:'occasion-recipient-gifting-first-guided-and-composed-premium-commerce',
    separationIncludes:['layout','section-order','journey','palette','typography','imagery','occasion-navigation','gift-composition'],
  },
  installationContract:{
    draftOnly:true,
    demoNamespace:'food-table-gift',
    mutableAuthority:['storefrontPageDrafts'],
    immutableAuthority:['products','variants','pricing','inventory','customers','orders','b2b'],
  },
  nonScope:[
    'second-table-gift-template','gift-hero-addition','gift-story-addition','reviews-home-addition','E10-required-dependency',
    'template-local-guided-finder-engine','template-local-composer-engine','template-local-layout-engine','template-local-commerce-engine',
    'virtual-bundle-sku-authority','fixed-gift-price-authority','gift-message-persistence-authority','corporate-pricing-or-b2b-authority',
    'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
    'visual-builder-roadmap-expansion','payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation',
    'tenant-status-change','tenant-plan-change','main-merge','wave55-implementation',
  ],
} as const);
