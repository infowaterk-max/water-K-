import type { FeatureCode, PlanCode } from '@/lib/plans/catalog';

export const STOREFRONT_BUILDER_FOUNDATION_VERSION='shoporation.storefront-builder-foundation.v1' as const;
export const STOREFRONT_PAGE_SCHEMA_VERSION=1 as const;
export const STOREFRONT_TEMPLATE_MANIFEST_VERSION=1 as const;

export const STOREFRONT_PAGE_TYPES=[
  'home','catalog','product','cart','checkout','account','search','content','blog-index','blog-article','faq','contact','legal','not-found',
] as const;
export type StorefrontBuilderPageType=typeof STOREFRONT_PAGE_TYPES[number];

export const STOREFRONT_VIEWPORTS=['desktop','tablet','mobile'] as const;
export type StorefrontViewport=typeof STOREFRONT_VIEWPORTS[number];
export type StorefrontResponsiveValue<T>={desktop:T;tablet?:T;mobile?:T};

export function resolveStorefrontResponsiveValue<T>(value:StorefrontResponsiveValue<T>,viewport:StorefrontViewport):T{
  if(viewport==='mobile')return value.mobile??value.tablet??value.desktop;
  if(viewport==='tablet')return value.tablet??value.desktop;
  return value.desktop;
}

export const STOREFRONT_GRID_SPANS=[1,2,3,4,5,6,7,8,9,10,11,12] as const;
export type StorefrontGridSpan=typeof STOREFRONT_GRID_SPANS[number];
export function normalizeStorefrontGridSpan(value:unknown,fallback:StorefrontGridSpan=12):StorefrontGridSpan{
  return typeof value==='number'&&STOREFRONT_GRID_SPANS.includes(value as StorefrontGridSpan)?value as StorefrontGridSpan:fallback;
}

export const STOREFRONT_LAYOUT_GRID_CONTRACT={
  columns:12,
  maxContentWidthPx:1440,
  gutterPx:{desktop:32,tablet:24,mobile:16},
  sectionGapScale:['none','xs','s','m','l','xl','2xl'],
  layoutPresets:['full','content','narrow','split'],
  responsiveInheritance:'mobile->tablet->desktop',
} as const;

export const STOREFRONT_DESIGN_TOKEN_CONTRACT={
  colors:['background','surface','surfaceMuted','text','mutedText','border','primary','primaryContrast','accent','success','warning','danger'],
  typography:['headingFontFamily','bodyFontFamily','baseSize','scale','lineHeight','fontWeightRegular','fontWeightStrong'],
  spacing:['none','xs','s','m','l','xl','2xl'],
  radius:['none','s','m','l','pill'],
  shadow:['none','surface','overlay'],
} as const;

export const STOREFRONT_PAGE_SCHEMA_CONTRACT={
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  stableSectionIds:true,
  componentKeyRequired:true,
  orderedSections:true,
  preserveUnknownConfigKeys:true,
  inlineEditingRuntime:false,
  dragDropRuntime:false,
} as const;

export type StorefrontResponsiveMode='fixed'|'container'|'grid'|'stack'|'primary-navigation';
export type StorefrontBuilderCapabilityRequirement={minPlan:PlanCode;features:readonly FeatureCode[]};
export type StorefrontBuilderComponentManifest={
  foundationVersion:typeof STOREFRONT_BUILDER_FOUNDATION_VERSION;
  componentKey:string;
  componentVersion:number;
  schemaSlot:string;
  pageTypes:readonly StorefrontBuilderPageType[];
  configurable:readonly string[];
  responsiveMode:StorefrontResponsiveMode;
  capability:StorefrontBuilderCapabilityRequirement;
};

export function defineStorefrontBuilderComponent<const T extends StorefrontBuilderComponentManifest>(manifest:T):Readonly<T>{
  if(!manifest.componentKey.includes('.'))throw new Error('BUILDER_COMPONENT_KEY_INVALID');
  if(!Number.isInteger(manifest.componentVersion)||manifest.componentVersion<1)throw new Error('BUILDER_COMPONENT_VERSION_INVALID');
  return Object.freeze(manifest);
}

export const STOREFRONT_TEMPLATE_MIGRATION_POLICY={
  forwardOnly:true,
  preserveUnknownConfigKeys:true,
  destructiveResetForbidden:true,
  explicitMigrationRequiredOnSchemaChange:true,
} as const;

export const STOREFRONT_DEMO_CONTENT_POLICY={
  strategy:'replaceable-fixture',
  customerData:'forbidden',
  stableEntityKeys:true,
  productionCopyRequiresExplicitAction:true,
} as const;

export type StorefrontTemplateManifest={
  foundationVersion:typeof STOREFRONT_BUILDER_FOUNDATION_VERSION;
  manifestVersion:typeof STOREFRONT_TEMPLATE_MANIFEST_VERSION;
  templateKey:string;
  templateVersion:number;
  pageSchemaVersion:typeof STOREFRONT_PAGE_SCHEMA_VERSION;
  minPlan:PlanCode;
  requiredFeatures:readonly FeatureCode[];
  pageTypes:readonly StorefrontBuilderPageType[];
  responsive:{desktop:true;tablet:true;mobile:true};
  migration:typeof STOREFRONT_TEMPLATE_MIGRATION_POLICY;
  demoContent:{namespace:string;policy:typeof STOREFRONT_DEMO_CONTENT_POLICY};
};

export function defineStorefrontTemplateManifest<const T extends StorefrontTemplateManifest>(manifest:T):Readonly<T>{
  if(!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(manifest.templateKey))throw new Error('TEMPLATE_KEY_INVALID');
  if(!Number.isInteger(manifest.templateVersion)||manifest.templateVersion<1)throw new Error('TEMPLATE_VERSION_INVALID');
  if(!manifest.demoContent.namespace.trim())throw new Error('TEMPLATE_DEMO_NAMESPACE_REQUIRED');
  return Object.freeze(manifest);
}
