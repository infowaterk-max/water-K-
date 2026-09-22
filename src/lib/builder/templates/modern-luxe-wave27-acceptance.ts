import {HERITAGE_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/heritage-atelier';
import {
  MODERN_LUXE_ENGINE_CONTRACT,
  MODERN_LUXE_HOME_SECTION_ORDER,
  MODERN_LUXE_SPACING_CONTRACT,
  MODERN_LUXE_TEMPLATE_KEY,
  MODERN_LUXE_TEMPLATE_VERSION,
  MODERN_LUXE_VISUAL_DNA,
} from '@/lib/builder/templates/modern-luxe';
import {STATEMENT_LAB_VISUAL_DNA} from '@/lib/builder/templates/statement-lab';

/**
 * Wave 27 re-accepts the inherited Modern Luxe implementation on the current
 * stacked baseline. It intentionally does not introduce a second template,
 * jewelry authority engine, 3D/AR engine or template-local product truth.
 */
export const MODERN_LUXE_WAVE27_ACCEPTANCE=Object.freeze({
  wave:27,
  mode:'current-baseline-reacceptance',
  templateKey:MODERN_LUXE_TEMPLATE_KEY,
  templateVersion:MODERN_LUXE_TEMPLATE_VERSION,
  inheritedImplementation:true,
  portfolio:{
    category:'jewelry-accessories',
    direction:'modern-spacious-editorial-luxury-retail',
    modernLuxe:MODERN_LUXE_VISUAL_DNA.character,
    heritageAtelier:HERITAGE_ATELIER_VISUAL_DNA.character,
    statementLab:STATEMENT_LAB_VISUAL_DNA.character,
  },
  visualContract:{
    categories:['Ékszerek','Órák','Táskák','Napszemüvegek','Kiegészítők'],
    palette:['ivory','champagne-gold','black'],
    imagery:'large-close-up-jewelry-watch-bag-accessory',
    displayTypography:'elegant-editorial-serif-headlines',
    interfaceTypography:'clean-sans-ui',
    fontRequirements:['builder-available','legally-usable','hungarian-characters'],
    rhythm:'airy-separated-premium-commerce',
    heroNavigation:'none',
  },
  builderContract:{
    heroLayers:['image','overlay','decoration','badge','title','subtitle','cta'],
    spacing:MODERN_LUXE_SPACING_CONTRACT,
    responsiveModes:['desktop','tablet','mobile'],
    imageRule:'business-copy-price-promotion-and-cta-never-baked-into-image-assets',
    hierarchy:'Template -> Page Presets -> Section Presets -> Components',
  },
  authorityContract:{
    inheritedEngineContract:MODERN_LUXE_ENGINE_CONTRACT,
    pricing:'pricing-binding-only',
    inventory:'inventory-binding-only',
    variants:'variant-binding-only',
    structuredFacts:'E7-or-authoritative-product-binding-only-when-supplied',
    recommendations:'shared-recommendation-surface-only',
    checkout:'shared-provider-neutral-E13',
    noTemplateSpecificJewelryAuthority:true,
    noFakeMaterialClaims:true,
    noFakeScarcity:true,
  },
  capabilityBoundary:{
    threeDAr:'not-required-by-modern-luxe-v1',
    packaging:'deferred-shared-pro-or-addon-capability',
    rule:'future-3d-ar-must-compose-with-shared-capability-not-template-local-engine',
  },
  exactHomeOrder:MODERN_LUXE_HOME_SECTION_ORDER,
  distinctness:{
    notHeritageAtelier:'not-craftsmanship-provenance-heritage-story-led',
    notStatementLab:'not-material-lab-spec-gallery-led',
    ownPosition:'premium-modern-spacious-editorial-luxury-retail',
  },
  nonScope:[
    'second-modern-luxe-template',
    'jewelry-product-authority-engine',
    'template-local-3d-ar-engine',
    'template-local-inventory-engine',
    'payment-provider-change',
    'sql-migration',
    'vercel-deploy',
    'supabase-mutation',
    'main-merge',
  ],
} as const);
