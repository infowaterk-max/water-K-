import {EDITORIAL_ATELIER_VISUAL_DNA} from '@/lib/builder/templates/editorial-atelier';
import {MONARCHE_VISUAL_DNA} from '@/lib/builder/templates/monarche';
import {
  STREET_DROP_ENGINE_CONTRACT,
  STREET_DROP_HOME_SECTION_ORDER,
  STREET_DROP_TEMPLATE_KEY,
  STREET_DROP_TEMPLATE_VERSION,
  STREET_DROP_VISUAL_DNA,
} from '@/lib/builder/templates/street-drop';

/**
 * Wave 26 does not introduce a second Street Drop implementation.
 * The template was implemented earlier in the stacked chain and is inherited by
 * the current fashion-family baseline. This contract re-accepts that inherited
 * implementation against the current 3-direction fashion portfolio.
 */
export const STREET_DROP_WAVE26_ACCEPTANCE = Object.freeze({
  wave: 26,
  mode: 'current-baseline-reacceptance',
  templateKey: STREET_DROP_TEMPLATE_KEY,
  templateVersion: STREET_DROP_TEMPLATE_VERSION,
  inheritedImplementation: true,
  portfolio: {
    category: 'fashion-apparel',
    direction: 'streetwear-sneaker-drop-culture',
    monarche: MONARCHE_VISUAL_DNA.character,
    editorialAtelier: EDITORIAL_ATELIER_VISUAL_DNA.character,
    streetDrop: STREET_DROP_VISUAL_DNA.character,
  },
  visualContract: {
    audience: ['streetwear', 'sneaker', 'street-workout', 'skate', 'roller', 'bmx'],
    foundation: 'black-off-white-with-merchant-replaceable-neon-accent',
    displayTypography: 'characterful-readable-display-headlines-only',
    interfaceTypography: 'clean-sans-ui',
    fontRequirements: ['builder-available', 'legally-usable', 'hungarian-characters'],
    imagery: ['street-workout', 'skate', 'roller', 'bmx', 'sneaker', 'urban-community'],
    rhythm: 'high-energy-home-ordered-commerce-pages-restrained-checkout',
  },
  builderContract: {
    heroMarketingLayers: ['badge', 'headline', 'copy', 'primary-cta', 'secondary-cta', 'image'],
    dropAlertLayers: ['eyebrow', 'headline', 'copy', 'cta'],
    responsiveModes: ['desktop', 'tablet', 'mobile'],
    imageRule: 'business-copy-price-promo-and-cta-never-baked-into-image-assets',
    hierarchy: 'Template -> Page Presets -> Section Presets -> Components',
  },
  authorityContract: {
    inheritedEngineContract: STREET_DROP_ENGINE_CONTRACT,
    scarcity: 'inventory-binding-only',
    releaseStatus: 'authoritative-binding-only',
    noFakeCountdown: true,
    noFakeLimitedStock: true,
    noTemplateSpecificDropScheduler: true,
    noTemplateSpecificInventoryAuthority: true,
    checkout: 'shared-provider-neutral-E13',
  },
  exactHomeOrder: STREET_DROP_HOME_SECTION_ORDER,
  distinctness: {
    notMonarche: 'not-balanced-mainstream-premium-retail',
    notEditorialAtelier: 'not-asymmetric-luxury-magazine-editorial',
    ownPosition: 'aggressive-readable-urban-drop-commerce',
  },
  nonScope: [
    'second-street-drop-template',
    'drop-scheduler-engine',
    'scarcity-engine',
    'inventory-engine',
    'payment-provider-change',
    'sql-migration',
    'vercel-deploy',
    'supabase-mutation',
    'main-merge',
  ],
} as const);
