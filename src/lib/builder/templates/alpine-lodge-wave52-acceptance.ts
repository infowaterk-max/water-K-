import {STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-story-visual';
import {
  ALPINE_LODGE_ENGINE_CONTRACT,
  ALPINE_LODGE_HOME_SECTION_ORDER,
  ALPINE_LODGE_MARKETING_LAYER_CONTRACT,
  ALPINE_LODGE_TEMPLATE_KEY,
  ALPINE_LODGE_TEMPLATE_VERSION,
  ALPINE_LODGE_VISUAL_DNA,
} from '@/lib/builder/templates/alpine-lodge';
import {ALPINE_LODGE_WAVE33_ACCEPTANCE} from '@/lib/builder/templates/alpine-lodge-wave33-acceptance';
import {TRAIL_EXPEDITION_VISUAL_DNA} from '@/lib/builder/templates/trail-expedition';

/**
 * Wave 52 replays repository-proven historical Wave 33 / PR #189 directly
 * after the current Wave 51 Beauty Lab baseline. Alpine Lodge v1 is inherited;
 * this contract re-accepts it against the current stacked Storefront/Page Schema
 * contract without inventing a new template, engine or release checkpoint.
 */
export const ALPINE_LODGE_WAVE52_ACCEPTANCE=Object.freeze({
  wave:52,
  historicalCounterpartWave:33,
  historicalPullRequest:189,
  historicalAcceptance:ALPINE_LODGE_WAVE33_ACCEPTANCE.mode,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:ALPINE_LODGE_TEMPLATE_KEY,
  templateVersion:ALPINE_LODGE_TEMPLATE_VERSION,
  inheritedImplementation:true,
  sequence:{
    previous:'wave51-beauty.beauty-lab',
    current:ALPINE_LODGE_TEMPLATE_KEY,
    relationship:'historical-wave33-successor-replayed-on-current-stacked-baseline',
    releaseCheckpointBeforeCurrent:false,
  },
  portfolio:{
    category:'outdoor-lifestyle',
    alpineLodge:ALPINE_LODGE_VISUAL_DNA.character,
    alpineJourney:ALPINE_LODGE_VISUAL_DNA.journey,
    nearbyTrailExpedition:TRAIL_EXPEDITION_VISUAL_DNA.character,
  },
  visualContract:{
    character:'premium-swiss-boutique-lodge-not-generic-outdoor-shop',
    palette:['wool-ivory','weathered-stone','charcoal','deep-pine','restrained-copper-bronze','misty-mountain-blue-grey'],
    materials:['dark-timber','stone','wool','tactile-natural-materials'],
    typography:['quiet-editorial-serif','clean-refined-sans'],
    fontRequirements:['builder-available','legally-usable','hungarian-characters'],
    spacing:'generous-calm-boutique-lodge',
    imageRule:ALPINE_LODGE_MARKETING_LAYER_CONTRACT.imageRule,
    exclusions:ALPINE_LODGE_VISUAL_DNA.exclusions,
  },
  builderContract:{
    heroLayers:ALPINE_LODGE_MARKETING_LAYER_CONTRACT.hero,
    composition:ALPINE_LODGE_MARKETING_LAYER_CONTRACT.composition,
    registryComposition:STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES,
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
    engineContract:ALPINE_LODGE_ENGINE_CONTRACT,
    productEligibility:'E2-shared-discovery-only',
    pricing:'pricing-binding-only',
    inventory:'inventory-binding-only',
    variants:'variant-binding-only',
    reviews:'review-binding-only',
    structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',
    editorial:'E10-shared-story-presentation-only',
    recommendations:'shared-recommendation-binding-only',
    checkout:'shared-provider-neutral-E13',
    noFakePerformanceClaim:true,
    noFakeOriginClaim:true,
    noFakeSustainabilityClaim:true,
    noTemplateProductAuthority:true,
    noTemplatePricingAuthority:true,
    noTemplateInventoryAuthority:true,
    noTemplateVariantAuthority:true,
    noTemplateCheckoutAuthority:true,
    noTemplatePaymentAuthority:true,
  },
  exactHomeOrder:ALPINE_LODGE_HOME_SECTION_ORDER,
  distinctness:{
    notTrailExpedition:'not-dark-cinematic-route-first-expedition-commerce',
    ownPosition:'warm-natural-premium-boutique-lodge-material-and-layer-editorial-commerce',
    separationIncludes:['layout','section-order','rhythm','palette','typography','imagery','materials','merchandising-journey'],
  },
  installationContract:{
    draftOnly:true,
    demoNamespace:'outdoor-alpine-lodge',
    mutableAuthority:['storefrontPageDrafts'],
    immutableAuthority:['products','variants','pricing','inventory','customers','orders','b2b'],
  },
  nonScope:[
    'duplicate-alpine-lodge-template','template-local-layout-engine','template-local-hero-engine','template-local-product-discovery-engine',
    'template-local-structured-product-engine','template-local-pricing-inventory-review-authority','performance-or-provenance-inference-engine',
    'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
    'visual-builder-drag-drop-ui','live-canvas','inline-editing','payment-provider-change','sql-migration','vercel-production-deploy',
    'supabase-mutation','tenant-status-change','tenant-plan-change','main-merge','wave53-implementation',
  ],
} as const);
