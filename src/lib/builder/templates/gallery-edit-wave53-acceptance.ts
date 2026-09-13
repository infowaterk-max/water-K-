import {STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-story-visual';
import {ALPINE_LODGE_VISUAL_DNA} from '@/lib/builder/templates/alpine-lodge';
import {
  GALLERY_EDIT_ENGINE_CONTRACT,
  GALLERY_EDIT_HOME_SECTION_ORDER,
  GALLERY_EDIT_MARKETING_LAYER_CONTRACT,
  GALLERY_EDIT_TEMPLATE_KEY,
  GALLERY_EDIT_TEMPLATE_VERSION,
  GALLERY_EDIT_VISUAL_DNA,
} from '@/lib/builder/templates/gallery-edit';
import {GALLERY_EDIT_WAVE34_ACCEPTANCE} from '@/lib/builder/templates/gallery-edit-wave34-acceptance';
import {TABLE_GIFT_VISUAL_DNA} from '@/lib/builder/templates/table-gift';

/**
 * Wave 53 replays repository-proven historical Wave 34 / PR #194 directly
 * after current Wave 52 Alpine Lodge. Gallery Edit v1 is inherited unchanged;
 * this contract re-accepts it against the current stacked Storefront/Page Schema
 * baseline without inventing a template, engine, binding namespace or checkpoint.
 */
export const GALLERY_EDIT_WAVE53_ACCEPTANCE=Object.freeze({
  wave:53,
  historicalCounterpartWave:34,
  historicalPullRequest:194,
  originalTemplateWave:15,
  originalTemplatePullRequest:138,
  historicalAcceptance:GALLERY_EDIT_WAVE34_ACCEPTANCE.mode,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:GALLERY_EDIT_TEMPLATE_KEY,
  templateVersion:GALLERY_EDIT_TEMPLATE_VERSION,
  inheritedImplementation:true,
  sequence:{
    previous:'wave52-outdoor.alpine-lodge',
    current:GALLERY_EDIT_TEMPLATE_KEY,
    historicalNext:'wave35-food.table-gift',
    relationship:'historical-wave34-successor-replayed-on-current-stacked-baseline',
    releaseCheckpointBeforeCurrent:false,
  },
  portfolio:{
    category:'home-living-design',
    galleryEdit:GALLERY_EDIT_VISUAL_DNA.character,
    galleryJourney:GALLERY_EDIT_VISUAL_DNA.journey,
    previousAlpineLodge:ALPINE_LODGE_VISUAL_DNA.character,
    nextTableGift:TABLE_GIFT_VISUAL_DNA.character,
  },
  visualContract:{
    character:'contemporary-interior-design-concept-store-meets-gallery',
    palette:['chalk-off-white','limestone-grey','graphite','single-curatorial-accent'],
    typography:['editorial-grotesk-or-refined-serif','clean-sans'],
    imagery:'furniture-lighting-ceramics-textile-and-objects-presented-as-gallery-pieces',
    spacing:'gallery-scale-airy-precise-with-large-negative-space',
    imageRule:GALLERY_EDIT_MARKETING_LAYER_CONTRACT.imageRule,
    exclusions:GALLERY_EDIT_VISUAL_DNA.exclusions,
  },
  builderContract:{
    heroLayers:GALLERY_EDIT_MARKETING_LAYER_CONTRACT.hero,
    composition:GALLERY_EDIT_MARKETING_LAYER_CONTRACT.composition,
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
    engineContract:GALLERY_EDIT_ENGINE_CONTRACT,
    productEligibility:'E2-shared-discovery-only',
    pricing:'pricing-binding-only',
    inventory:'inventory-binding-only',
    variants:'variant-binding-only',
    reviews:'review-binding-only',
    structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',
    editorial:'E10-shared-story-presentation-only',
    recommendations:'shared-recommendation-binding-only',
    checkout:'shared-provider-neutral-E13',
    noFakeDesignerProvenance:true,
    noFakeMaterialClaim:true,
    noFakeDimensions:true,
    noTemplateProductAuthority:true,
    noTemplatePricingAuthority:true,
    noTemplateInventoryAuthority:true,
    noTemplateVariantAuthority:true,
    noTemplateCheckoutAuthority:true,
    noTemplatePaymentAuthority:true,
  },
  exactHomeOrder:GALLERY_EDIT_HOME_SECTION_ORDER,
  distinctness:{
    notAlpineLodge:'not-warm-natural-boutique-lodge-layer-and-material-commerce',
    notTableGift:'not-occasion-recipient-gifting-first-commerce',
    ownPosition:'airy-contemporary-gallery-object-room-material-editorial-commerce',
    separationIncludes:['layout','section-order','rhythm','palette','typography','imagery','negative-space','merchandising-journey'],
  },
  installationContract:{
    draftOnly:true,
    demoNamespace:'home-gallery-edit',
    mutableAuthority:['storefrontPageDrafts'],
    immutableAuthority:['products','variants','pricing','inventory','customers','orders','b2b'],
  },
  nonScope:[
    'duplicate-gallery-edit-template','template-local-layout-engine','template-local-hero-engine','template-local-product-discovery-engine',
    'template-local-structured-product-engine','template-local-pricing-inventory-review-authority','designer-provenance-or-material-truth-authority',
    'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
    'visual-builder-drag-drop-ui','live-canvas','inline-editing','payment-provider-change','sql-migration','vercel-production-deploy',
    'supabase-mutation','tenant-status-change','tenant-plan-change','main-merge','wave54-implementation',
  ],
} as const);
