import {HERITAGE_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/heritage-atelier';
import {MODERN_LUXE_VISUAL_DNA} from '@/lib/builder/templates/modern-luxe';
import {
  STATEMENT_LAB_ENGINE_CONTRACT,
  STATEMENT_LAB_HOME_SECTION_ORDER,
  STATEMENT_LAB_TEMPLATE_KEY,
  STATEMENT_LAB_TEMPLATE_VERSION,
  STATEMENT_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/statement-lab';

/**
 * Wave 29 re-accepts the inherited Statement Lab implementation on the current
 * stacked baseline. It does not duplicate the template or create a template-
 * local material/spec/compare/product authority.
 */
export const STATEMENT_LAB_WAVE29_ACCEPTANCE=Object.freeze({
  wave:29,
  mode:'current-baseline-reacceptance',
  templateKey:STATEMENT_LAB_TEMPLATE_KEY,
  templateVersion:STATEMENT_LAB_TEMPLATE_VERSION,
  inheritedImplementation:true,
  portfolio:{
    category:'jewelry-accessories',
    statementLab:STATEMENT_LAB_VISUAL_DNA.character,
    modernLuxe:MODERN_LUXE_VISUAL_DNA.character,
    heritageAtelier:HERITAGE_ATELIER_VISUAL_DNA.character,
    ownPosition:'contemporary-object-gallery-material-spec-lab',
  },
  visualContract:{
    palette:['off-white','silver-grey','graphite','one-merchant-accent'],
    accentOptions:['oxidized-red','acid-yellow','cobalt'],
    typography:['grotesk-display','clean-sans','optional-monospace-spec-accent'],
    fontRequirements:['builder-available','legally-usable','hungarian-characters'],
    imagery:'large-object-photography-and-macro-material-study',
    spacing:'asymmetric-precise-gallery-like',
    accentRule:'single-accent-only-no-competing-neon-or-luxe-gold-stack',
  },
  builderContract:{
    openingLayers:['object-image','object-index','display-title','supporting-copy'],
    hierarchy:'Template -> Page Presets -> Section Presets -> Components',
    responsiveModes:['desktop','tablet','mobile'],
    imageRule:'business-copy-price-material-manufacturing-claims-specs-and-cta-never-baked-into-image-assets',
  },
  authorityContract:{
    engine:STATEMENT_LAB_ENGINE_CONTRACT,
    pricing:'pricing-binding-only',
    inventory:'inventory-binding-only',
    variants:'variant-binding-only',
    materialFacts:'E7-or-authoritative-product-binding-only-when-supplied',
    manufacturingFacts:'E7-or-authoritative-product-binding-only-when-supplied',
    formCompare:'E7-read-model-only',
    documents:'authoritative-product-document-binding-only',
    checkout:'shared-provider-neutral-E13',
    noTemplateSpecificMaterialAuthority:true,
    noTemplateSpecificCompareEngine:true,
    noFakeMaterialClaim:true,
    noFakeManufacturingClaim:true,
    noFakeScarcity:true,
  },
  exactHomeOrder:STATEMENT_LAB_HOME_SECTION_ORDER,
  pdpContract:{
    desktopTablet:'gallery-7/12-buybox-5/12',
    mobile:'gallery-12/12-buybox-12/12',
    sections:['product-info','generic-options','object-specification','form-compare','technical-documents'],
  },
  distinctness:{
    notModernLuxe:'not-champagne-gold-spacious-campaign-luxury-retail',
    notHeritageAtelier:'not-provenance-craftsmanship-story-led-heritage-luxury',
    ownRhythm:'object-index-material-study-statement-grid-object-detail',
  },
  capabilityBoundary:{
    threeDAr:'not-required-by-statement-lab-v1',
    packaging:'deferred-shared-pro-or-addon-capability',
    rule:'future-3d-ar-must-compose-with-shared-capability-and-never-own-material-or-product-truth',
  },
  nonScope:[
    'second-statement-lab-template',
    'template-local-material-engine',
    'template-local-compare-engine',
    'template-local-product-authority',
    'template-local-3d-ar-engine',
    'payment-provider-change',
    'sql-migration',
    'vercel-deploy',
    'supabase-mutation',
    'main-merge',
  ],
} as const);
