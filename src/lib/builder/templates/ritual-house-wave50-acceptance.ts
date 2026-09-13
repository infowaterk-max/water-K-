import {BEAUTY_LAB_VISUAL_DNA} from '@/lib/builder/templates/beauty-lab';
import {DERMA_STUDIO_VISUAL_DNA} from '@/lib/builder/templates/derma-studio';
import {
  RITUAL_HOUSE_ENGINE_CONTRACT,
  RITUAL_HOUSE_HOME_SECTION_ORDER,
  RITUAL_HOUSE_MARKETING_LAYER_CONTRACT,
  RITUAL_HOUSE_TEMPLATE_KEY,
  RITUAL_HOUSE_TEMPLATE_VERSION,
  RITUAL_HOUSE_VISUAL_DNA,
} from '@/lib/builder/templates/ritual-house';
import {STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-story-visual';

/**
 * Wave 50 replays historical Wave 31 / PR #177 after the Wave 49 Derma Studio
 * re-acceptance. The inherited Ritual House v1 remains a shared-runtime template;
 * this contract only re-accepts and hardens it against the current stacked baseline.
 */
export const RITUAL_HOUSE_WAVE50_ACCEPTANCE=Object.freeze({
  wave:50,
  historicalCounterpartWave:31,
  historicalPullRequest:177,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:RITUAL_HOUSE_TEMPLATE_KEY,
  templateVersion:RITUAL_HOUSE_TEMPLATE_VERSION,
  inheritedImplementation:true,
  sequence:{
    previous:'wave49-beauty.derma-studio',
    current:RITUAL_HOUSE_TEMPLATE_KEY,
    relationship:'historical-wave31-successor-replayed-on-current-stacked-baseline',
  },
  portfolio:{
    category:'beauty-wellness',
    beautyLab:BEAUTY_LAB_VISUAL_DNA.character,
    dermaStudio:DERMA_STUDIO_VISUAL_DNA.character,
    ritualHouse:RITUAL_HOUSE_VISUAL_DNA.character,
    beautyLabJourney:BEAUTY_LAB_VISUAL_DNA.journey,
    dermaStudioJourney:DERMA_STUDIO_VISUAL_DNA.journey,
    ritualHouseJourney:RITUAL_HOUSE_VISUAL_DNA.journey,
  },
  visualContract:{
    palette:['smoked-umber','warm-taupe','soft-ivory','candle-amber','muted-sage'],
    typography:['soft-editorial-serif','clean-warm-sans'],
    fontRequirements:['builder-available','legally-usable','hungarian-characters'],
    imagery:'candle-diffuser-oil-cream-bath-steam-tactile-texture',
    spacing:'slow-generous-cocooning',
    character:'warm-dark-sensory-cocooning-not-clinical',
  },
  builderContract:{
    heroLayers:RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.hero,
    imageRule:RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.imageRule,
    composition:RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.composition,
    registryComposition:STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES,
    hierarchy:'template-page-presets-section-presets-components',
    responsiveModes:['desktop','tablet','mobile'],
    pagePresetCount:14,
    minimumPlan:'alap',
    stableIdentity:'unique-node-ids-and-stable-binding-paths',
    runtimeAllowlistWidened:false,
    componentRegistryWidened:false,
    bindingNamespaceWidened:false,
    visualBuilder:'future-compatible-no-template-local-builder-engine',
  },
  guidanceAuthority:{
    engineContract:RITUAL_HOUSE_ENGINE_CONTRACT,
    mode:'editorial-merchandising-navigation-only',
    mood:'merchant-taxonomy-not-psychological-state-inference',
    ritual:'merchant-navigation-not-health-protocol',
    E7:'supplied-structured-scent-format-ingredient-and-product-attribute-evidence-only',
    E10:'editorial-story-content-only',
    diagnosis:false,
    psychologicalAssessment:false,
    medicalAdvice:false,
    healthOutcomeScoring:false,
    sleepStressAnxietyOutcomeAuthority:false,
    productEligibilityAuthority:'E2-shared-discovery-only',
  },
  commerceAuthority:{
    pricing:'pricing-binding-only',
    inventory:'inventory-binding-only',
    variants:'variant-binding-only',
    reviews:'review-binding-only',
    structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',
    checkout:'shared-provider-neutral-E13',
    noFakeIngredientConcentration:true,
    noFakeScentOrMaterialFact:true,
    noFakeWellnessClaim:true,
    noFakePriceStockRatingOrProductAttribute:true,
    noTemplatePricingAuthority:true,
    noTemplateInventoryAuthority:true,
    noTemplateVariantAuthority:true,
    noTemplateCheckoutAuthority:true,
    noTemplatePaymentAuthority:true,
  },
  exactHomeOrder:RITUAL_HOUSE_HOME_SECTION_ORDER,
  distinctness:{
    notBeautyLab:'not-formula-ingredient-texture-concept-store-first',
    notDermaStudio:'not-clinical-concern-routine-active-ingredient-skincare-first',
    ownPosition:'warm-dark-sensory-cocooning-mood-ritual-format-scent-led-wellness-commerce',
  },
  installationContract:{
    draftOnly:true,
    demoNamespace:'beauty-ritual-house',
    mutableAuthority:['storefrontPageDrafts'],
    immutableAuthority:['products','variants','customers','orders','b2b'],
  },
  nonScope:[
    'duplicate-ritual-house-template','template-local-layout-engine','template-local-hero-engine','template-local-guidance-engine',
    'medical-or-psychological-recommender','template-local-product-attribute-engine','template-local-pricing-or-inventory-engine',
    'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
    'visual-builder-drag-drop-ui','live-canvas','inline-editing','payment-provider-change','sql-migration','vercel-production-deploy',
    'supabase-mutation','tenant-status-change','tenant-plan-change','main-merge','wave51-implementation',
  ],
} as const);
