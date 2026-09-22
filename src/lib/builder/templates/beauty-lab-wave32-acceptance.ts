import {
  GUIDED_FINDER_ENGINE_VERSION,
  GUIDED_FINDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
} from '@/lib/commerce/guided-finder';
import {STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-guided-visual';
import {
  BEAUTY_LAB_ENGINE_CONTRACT,
  BEAUTY_LAB_HOME_SECTION_ORDER,
  BEAUTY_LAB_MARKETING_LAYER_CONTRACT,
  BEAUTY_LAB_TEMPLATE_KEY,
  BEAUTY_LAB_TEMPLATE_VERSION,
  BEAUTY_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/beauty-lab';
import {DERMA_STUDIO_HOME_SECTION_ORDER,DERMA_STUDIO_VISUAL_DNA} from '@/lib/builder/templates/derma-studio';
import {RITUAL_HOUSE_HOME_SECTION_ORDER,RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';

/**
 * Wave 32 re-accepts the inherited Beauty Lab v1 against the current stacked
 * Builder contract. Formula guidance remains deterministic merchandising
 * navigation and structured product truth remains under existing shared engines.
 */
export const BEAUTY_LAB_WAVE32_ACCEPTANCE=Object.freeze({
  wave:32,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:BEAUTY_LAB_TEMPLATE_KEY,
  templateVersion:BEAUTY_LAB_TEMPLATE_VERSION,
  inheritedImplementation:true,
  portfolio:{
    category:'beauty-wellness',
    beautyLab:BEAUTY_LAB_VISUAL_DNA.character,
    dermaStudio:DERMA_STUDIO_VISUAL_DNA.character,
    ritualHouse:RITUAL_HOUSE_VISUAL_DNA.character,
    beautyLabJourney:BEAUTY_LAB_VISUAL_DNA.journey,
    dermaStudioJourney:DERMA_STUDIO_VISUAL_DNA.journey,
    ritualHouseJourney:RITUAL_HOUSE_VISUAL_DNA.journey,
    beautyLabHomeOrder:BEAUTY_LAB_HOME_SECTION_ORDER,
    dermaStudioHomeOrder:DERMA_STUDIO_HOME_SECTION_ORDER,
    ritualHouseHomeOrder:RITUAL_HOUSE_HOME_SECTION_ORDER,
  },
  visualContract:{
    palette:['warm-white-cream','muted-lilac','sage','dusty-peach','charcoal'],
    typography:['soft-modern-serif-or-refined-sans','clean-sans'],
    fontRequirements:['builder-available','legally-usable','hungarian-characters'],
    imagery:'formula-ingredient-texture-product',
    spacing:'airy-clinical-with-warmth',
    imageRule:BEAUTY_LAB_MARKETING_LAYER_CONTRACT.imageRule,
  },
  builderContract:{
    heroLayers:BEAUTY_LAB_MARKETING_LAYER_CONTRACT.hero,
    composition:BEAUTY_LAB_MARKETING_LAYER_CONTRACT.composition,
    registryComposition:STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES,
    majorMarketingBindings:['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'],
    stableIdentity:'stable-node-ids-and-stable-binding-paths',
    responsiveModes:['desktop','tablet','mobile'],
    hierarchy:'Template -> Page Presets -> Section Presets -> Components',
    pagePresetCount:14,
    minimumPlan:'alap',
    demoNamespace:'beauty-beauty-lab',
    installation:'draft-only',
  },
  finderAuthority:{
    engineContract:BEAUTY_LAB_ENGINE_CONTRACT,
    engineVersion:GUIDED_FINDER_ENGINE_VERSION,
    mode:'deterministic-attribute-based-explainable-guidance',
    resultStatuses:['exact','partial','zero'],
    tenantScoped:true,
    scoring:'explainable-rule-score-not-opaque-ranking-authority',
    diagnosis:false,
    diseaseInference:false,
    treatmentAdvice:false,
    cureClaims:false,
    opaqueScore:false,
    productEligibilityAuthority:'E2-shared-discovery-only',
    structuredFacts:'E7-supplied-structured-product-data-only',
    templateSwitchMutationBoundary:GUIDED_FINDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  },
  routineAuthority:{
    mode:'editorial-presentation-only-until-shared-routine-read-model',
    templateLocalEngine:false,
    commerceMutationAuthority:false,
  },
  commerceAuthority:{
    pricing:'pricing-binding-only',
    inventory:'inventory-binding-only',
    variants:'variant-binding-only',
    reviews:'review-binding-only',
    structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',
    checkout:'shared-provider-neutral-E13',
    noFakeIngredientConcentration:true,
    noFakeClinicalEvidence:true,
    noFakeEfficacyClaim:true,
    noTemplateSpecificMedicalAuthority:true,
  },
  exactHomeOrder:BEAUTY_LAB_HOME_SECTION_ORDER,
  distinctness:{
    notDermaStudio:'not-concern-routine-active-ingredient-clinical-first',
    notRitualHouse:'not-mood-ritual-format-scent-cocooning-first',
    ownPosition:'formula-ingredient-texture-guided-choice-concept-store-commerce',
    separationIncludes:['layout','section-order','rhythm','typography','imagery','merchandising-journey'],
  },
  nonScope:[
    'second-beauty-lab-template',
    'visual-builder-drag-drop-ui',
    'template-local-layout-engine',
    'template-local-hero-engine',
    'template-local-guidance-engine',
    'template-local-routine-engine',
    'template-local-product-attribute-engine',
    'template-local-pricing-inventory-review-authority',
    'medical-or-diagnostic-engine',
    'payment-provider-change',
    'sql-migration',
    'vercel-production-deploy',
    'supabase-mutation',
    'main-merge',
  ],
} as const);
