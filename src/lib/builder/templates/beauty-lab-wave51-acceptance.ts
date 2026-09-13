import {STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-guided-visual';
import {
  BEAUTY_LAB_ENGINE_CONTRACT,
  BEAUTY_LAB_HOME_SECTION_ORDER,
  BEAUTY_LAB_MARKETING_LAYER_CONTRACT,
  BEAUTY_LAB_TEMPLATE_KEY,
  BEAUTY_LAB_TEMPLATE_VERSION,
  BEAUTY_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/beauty-lab';
import {BEAUTY_LAB_WAVE32_ACCEPTANCE} from '@/lib/builder/templates/beauty-lab-wave32-acceptance';
import {DERMA_STUDIO_VISUAL_DNA} from '@/lib/builder/templates/derma-studio';
import {RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';

/**
 * Wave 51 replays historical Wave 32 / PR #184 directly after Wave 50 Ritual House.
 * The inherited Beauty Lab v1 remains a shared-runtime template. This contract
 * re-accepts it against the current stacked Storefront/Page Schema baseline only.
 */
export const BEAUTY_LAB_WAVE51_ACCEPTANCE=Object.freeze({
  wave:51,
  historicalCounterpartWave:32,
  historicalPullRequest:184,
  historicalAcceptance:BEAUTY_LAB_WAVE32_ACCEPTANCE.mode,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:BEAUTY_LAB_TEMPLATE_KEY,
  templateVersion:BEAUTY_LAB_TEMPLATE_VERSION,
  inheritedImplementation:true,
  sequence:{
    previous:'wave50-beauty.ritual-house',
    current:BEAUTY_LAB_TEMPLATE_KEY,
    relationship:'historical-wave32-successor-replayed-on-current-stacked-baseline',
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
    palette:['warm-white-cream','muted-lilac','sage','dusty-peach','charcoal'],
    typography:['soft-modern-serif-or-refined-sans','clean-sans'],
    fontRequirements:['builder-available','legally-usable','hungarian-characters'],
    imagery:'formula-ingredient-texture-product',
    spacing:'airy-clinical-with-warmth',
    character:'contemporary-formula-lab-without-medical-clinic-authority',
  },
  builderContract:{
    heroLayers:BEAUTY_LAB_MARKETING_LAYER_CONTRACT.hero,
    imageRule:BEAUTY_LAB_MARKETING_LAYER_CONTRACT.imageRule,
    composition:BEAUTY_LAB_MARKETING_LAYER_CONTRACT.composition,
    registryComposition:STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES,
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
    engineContract:BEAUTY_LAB_ENGINE_CONTRACT,
    E3:'deterministic-attribute-based-explainable-guidance',
    E7:'supplied-structured-ingredient-and-product-attribute-evidence-only',
    routine:'editorial-presentation-only-until-shared-routine-read-model',
    diagnosis:false,
    diseaseInference:false,
    treatmentAdvice:false,
    cureClaims:false,
    opaqueScore:false,
    productEligibilityAuthority:'E2-shared-discovery-only',
  },
  commerceAuthority:{
    pricing:'pricing-binding-only',
    inventory:'inventory-binding-only',
    variants:'variant-binding-only',
    reviews:'review-binding-only',
    structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',
    checkout:'shared-provider-neutral-E13',
    noFakeReviewEvidence:true,
    noFakeIngredientConcentration:true,
    noFakeClinicalEvidence:true,
    noFakeEfficacyClaim:true,
    noTemplatePricingAuthority:true,
    noTemplateInventoryAuthority:true,
    noTemplateVariantAuthority:true,
    noTemplateCheckoutAuthority:true,
    noTemplatePaymentAuthority:true,
  },
  exactHomeOrder:BEAUTY_LAB_HOME_SECTION_ORDER,
  distinctness:{
    notDermaStudio:'not-concern-routine-active-ingredient-clinical-first',
    notRitualHouse:'not-mood-ritual-format-scent-cocooning-first',
    ownPosition:'formula-ingredient-texture-guided-choice-concept-store-commerce',
  },
  installationContract:{
    draftOnly:true,
    demoNamespace:'beauty-beauty-lab',
    mutableAuthority:['storefrontPageDrafts'],
    immutableAuthority:['products','variants','customers','orders','b2b'],
  },
  nonScope:[
    'duplicate-beauty-lab-template','template-local-layout-engine','template-local-hero-engine','template-local-guidance-engine',
    'template-local-routine-engine','medical-or-diagnostic-engine','template-local-product-attribute-engine',
    'template-local-pricing-or-inventory-engine','shared-runtime-allowlist-widening','shared-component-registry-widening',
    'shared-binding-namespace-widening','visual-builder-drag-drop-ui','live-canvas','inline-editing','payment-provider-change',
    'sql-migration','vercel-production-deploy','supabase-mutation','tenant-status-change','tenant-plan-change','main-merge','wave52-implementation',
  ],
} as const);
