import {BEAUTY_LAB_VISUAL_DNA} from '@/lib/builder/templates/beauty-lab';
import {
  DERMA_STUDIO_ENGINE_CONTRACT,
  DERMA_STUDIO_HOME_SECTION_ORDER,
  DERMA_STUDIO_MARKETING_LAYER_CONTRACT,
  DERMA_STUDIO_TEMPLATE_KEY,
  DERMA_STUDIO_TEMPLATE_VERSION,
  DERMA_STUDIO_VISUAL_DNA,
} from '@/lib/builder/templates/derma-studio';
import {RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';
import {STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES} from '@/lib/builder/storefront-guided-visual';

/**
 * Wave 30 re-accepts and hardens the inherited Derma Studio implementation on
 * the current production baseline. Guidance remains deterministic merchandising
 * navigation; no medical, diagnostic, treatment or product-truth authority is added.
 */
export const DERMA_STUDIO_WAVE30_ACCEPTANCE=Object.freeze({
  wave:30,
  mode:'current-baseline-reacceptance-and-builder-hardening',
  templateKey:DERMA_STUDIO_TEMPLATE_KEY,
  templateVersion:DERMA_STUDIO_TEMPLATE_VERSION,
  inheritedImplementation:true,
  portfolio:{
    category:'beauty-wellness',
    beautyLab:BEAUTY_LAB_VISUAL_DNA.character,
    dermaStudio:DERMA_STUDIO_VISUAL_DNA.character,
    ritualHouse:RITUAL_HOUSE_VISUAL_DNA.character,
    beautyLabJourney:'formula-to-ingredient-to-texture-to-guided-choice-to-product',
    dermaStudioJourney:'concern-to-routine-to-active-ingredient-to-product',
    ritualHouseJourney:'mood-to-ritual-to-format-to-scent-or-ingredient-to-product',
  },
  visualContract:{
    palette:['warm-white','soft-mineral-grey','graphite','muted-blue-green','soft-clay'],
    typography:['clean-editorial-sans','precise-sans'],
    fontRequirements:['builder-available','legally-usable','hungarian-characters'],
    imagery:'clean-product-macro-ingredient-glass-texture-routine',
    spacing:'precise-airy-educational',
    clinicalTone:'clinically-clean-without-medical-clinic-ui',
  },
  builderContract:{
    heroLayers:DERMA_STUDIO_MARKETING_LAYER_CONTRACT.hero,
    imageRule:DERMA_STUDIO_MARKETING_LAYER_CONTRACT.imageRule,
    composition:DERMA_STUDIO_MARKETING_LAYER_CONTRACT.composition,
    registryComposition:STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES,
    responsiveModes:['desktop','tablet','mobile'],
    hierarchy:'Template -> Page Presets -> Section Presets -> Components',
  },
  guidanceAuthority:{
    engineContract:DERMA_STUDIO_ENGINE_CONTRACT,
    E3:'deterministic-explainable-concern-and-routine-navigation',
    E7:'supplied-structured-active-ingredient-routine-step-and-product-attribute-evidence',
    scoring:'no-black-box-score',
    diagnosis:false,
    medicalTriage:false,
    treatmentAdvice:false,
    healthRecord:false,
    diseaseInference:false,
    routineMutationAuthority:false,
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
    noFakeClinicalEvidence:true,
    noFakeEfficacyClaim:true,
    noTemplateSpecificMedicalAuthority:true,
  },
  exactHomeOrder:DERMA_STUDIO_HOME_SECTION_ORDER,
  distinctness:{
    notBeautyLab:'not-formula-texture-concept-store-first',
    notRitualHouse:'not-dark-sensory-home-wellness-ritual-first',
    ownPosition:'concern-routine-active-ingredient-explainable-skincare-commerce',
  },
  nonScope:[
    'second-derma-studio-template',
    'medical-or-diagnostic-engine',
    'template-local-routine-engine',
    'template-local-product-attribute-engine',
    'template-local-pricing-or-inventory-engine',
    'health-record-system',
    'payment-provider-change',
    'sql-migration',
    'vercel-production-deploy',
    'supabase-mutation',
    'main-merge',
  ],
} as const);
