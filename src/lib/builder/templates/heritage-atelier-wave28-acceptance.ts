import {
  HERITAGE_ATELIER_ENGINE_CONTRACT,
  HERITAGE_ATELIER_HOME_SECTION_ORDER,
  HERITAGE_ATELIER_TEMPLATE_KEY,
  HERITAGE_ATELIER_TEMPLATE_VERSION,
  HERITAGE_ATELIER_VISUAL_DNA,
} from '@/lib/builder/templates/heritage-atelier';
import {MODERN_LUXE_VISUAL_DNA} from '@/lib/builder/templates/modern-luxe';
import {STATEMENT_LAB_VISUAL_DNA} from '@/lib/builder/templates/statement-lab';
import {STORY_ENGINE_VERSION,STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY} from '@/lib/content/story-engine';

/**
 * Wave 28 re-accepts the inherited Golden #3 Heritage Atelier implementation
 * on the current stacked baseline. It does not create a second template or a
 * template-local provenance/product authority.
 */
export const HERITAGE_ATELIER_WAVE28_ACCEPTANCE=Object.freeze({
  wave:28,
  mode:'current-baseline-reacceptance',
  templateKey:HERITAGE_ATELIER_TEMPLATE_KEY,
  templateVersion:HERITAGE_ATELIER_TEMPLATE_VERSION,
  inheritedImplementation:true,
  portfolio:{
    category:'jewelry-accessories',
    heritageAtelier:HERITAGE_ATELIER_VISUAL_DNA.character,
    modernLuxe:MODERN_LUXE_VISUAL_DNA.character,
    statementLab:STATEMENT_LAB_VISUAL_DNA.character,
    ownPosition:'heritage-craftsmanship-provenance-editorial-commerce',
  },
  visualContract:{
    palette:['warm-ivory-parchment','deep-charcoal','burgundy-antique-brass','muted-stone'],
    typography:['heritage-editorial-serif','clean-sans'],
    fontRequirements:['builder-available','legally-usable','hungarian-characters'],
    imagery:'macro-material-workshop-craft',
    spacing:'generous-editorial-whitespace',
    chrome:'restrained-provenance-luxury',
  },
  storyContract:{
    engine:STORY_ENGINE_VERSION,
    requiredEngine:'E10',
    supportedStoryTypes:['lookbook','maker','journal','origin','process','before-after'],
    provenance:'claim-renders-only-from-explicit-verified-origin-relation',
    publishing:'draft-preview-only-published-after-valid-publishedAt-archived-preview-only',
    markup:'structured-blocks-only-no-arbitrary-raw-html-script-or-iframe',
    relationAuthority:'story-relations-never-own-price-stock-inventory-sku-variants-or-order-data',
    templateSwitchMutationBoundary:STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  },
  commerceAuthority:{
    pricing:'pricing-binding-only',
    inventory:'inventory-binding-only',
    variants:'variant-binding-only',
    structuredMaterialFacts:'E7-or-authoritative-product-binding-only-when-supplied',
    checkout:'shared-provider-neutral-E13',
    noTemplateSpecificJewelryAuthority:true,
    noFakeProvenance:true,
    noFakeMakerClaim:true,
    noFakeMaterialClaim:true,
    noFakeScarcity:true,
  },
  builderContract:{
    hierarchy:'Template -> Page Presets -> Section Presets -> Components',
    storySurfaces:['story.hero','story.feature','story.provenance','story.timeline','story.body','story.index','story.service-care'],
    contentRole:'story-detail',
    responsiveModes:['desktop','tablet','mobile'],
    imageRule:'business-copy-price-provenance-maker-claims-and-cta-never-baked-into-image-assets',
  },
  exactHomeOrder:HERITAGE_ATELIER_HOME_SECTION_ORDER,
  engineContract:HERITAGE_ATELIER_ENGINE_CONTRACT,
  distinctness:{
    notModernLuxe:'not-spacious-campaign-luxury-retail-first',
    notStatementLab:'not-contemporary-material-spec-object-lab-first',
    ownRhythm:'story-provenance-craft-commerce-journal-care',
  },
  capabilityBoundary:{
    threeDAr:'not-required-by-heritage-atelier-v1',
    packaging:'deferred-shared-pro-or-addon-capability',
    rule:'future-3d-ar-must-compose-with-shared-capability-not-template-local-engine',
  },
  nonScope:[
    'second-heritage-atelier-template',
    'template-local-story-engine',
    'template-local-provenance-engine',
    'template-local-jewelry-product-authority',
    'template-local-3d-ar-engine',
    'payment-provider-change',
    'sql-migration',
    'vercel-deploy',
    'supabase-mutation',
    'main-merge',
  ],
} as const);
