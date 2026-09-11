import {
  STOREFRONT_DESIGN_TOKEN_CONTRACT,
  STOREFRONT_LAYOUT_GRID_CONTRACT,
  STOREFRONT_PAGE_SCHEMA_CONTRACT,
  STOREFRONT_PAGE_SCHEMA_VERSION,
  STOREFRONT_PAGE_TYPES,
  STOREFRONT_VIEWPORTS,
  type StorefrontBuilderPageType,
  type StorefrontViewport,
} from '@/lib/builder/storefront-foundation';
import {
  type StorefrontComponentNode,
  type StorefrontPageDocument,
  type StorefrontRuntimeComponentDefinition,
  StorefrontComponentRegistry,
} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_PAGE_SCHEMA_BLOCK21_VERSION='shoporation.page-schema.block21.v1' as const;

/**
 * Runtime breakpoints are interpretation metadata for one shared Page Schema.
 * They do not create independent mobile/tablet page documents and do not expose
 * any Visual Builder interaction engine.
 */
export const STOREFRONT_BREAKPOINT_CONTRACT=Object.freeze({
  mobile:{minWidthPx:0,maxWidthPx:767},
  tablet:{minWidthPx:768,maxWidthPx:1199},
  desktop:{minWidthPx:1200,maxWidthPx:null},
  inheritance:'mobile->tablet->desktop',
  separatePageDocuments:false,
} as const);

export function resolveStorefrontViewportForWidth(widthPx:number):StorefrontViewport{
  if(!Number.isFinite(widthPx)||widthPx<0)throw new Error('STOREFRONT_VIEWPORT_WIDTH_INVALID');
  if(widthPx>=STOREFRONT_BREAKPOINT_CONTRACT.desktop.minWidthPx)return'desktop';
  if(widthPx>=STOREFRONT_BREAKPOINT_CONTRACT.tablet.minWidthPx)return'tablet';
  return'mobile';
}

export type StorefrontBuilderEditabilityMetadata={
  componentKey:string;
  componentVersion:number;
  schemaSlot:string;
  pageTypes:readonly StorefrontBuilderPageType[];
  configurable:readonly string[];
  bindingSlots:readonly string[];
  responsiveMode:StorefrontRuntimeComponentDefinition['manifest']['responsiveMode'];
  allowsChildren:boolean;
  allowedChildren:readonly string[]|null;
  protectedSystem:boolean;
  capability:StorefrontRuntimeComponentDefinition['manifest']['capability'];
  interactions:{
    dragDrop:false;
    inlineEditing:false;
    resizeHandles:false;
    canvas:false;
  };
};

export function storefrontBuilderEditabilityMetadata(
  definition:StorefrontRuntimeComponentDefinition,
):Readonly<StorefrontBuilderEditabilityMetadata>{
  return Object.freeze({
    componentKey:definition.manifest.componentKey,
    componentVersion:definition.manifest.componentVersion,
    schemaSlot:definition.manifest.schemaSlot,
    pageTypes:[...definition.manifest.pageTypes],
    configurable:[...definition.manifest.configurable],
    bindingSlots:[...(definition.bindingSlots??[])],
    responsiveMode:definition.manifest.responsiveMode,
    allowsChildren:definition.allowsChildren===true,
    allowedChildren:definition.allowedChildren?[...definition.allowedChildren]:null,
    protectedSystem:definition.protectedSystem===true,
    capability:{
      minPlan:definition.manifest.capability.minPlan,
      features:[...definition.manifest.capability.features],
    },
    interactions:{dragDrop:false,inlineEditing:false,resizeHandles:false,canvas:false},
  });
}

export function listStorefrontBuilderEditabilityMetadata(
  registry:StorefrontComponentRegistry,
):ReadonlyArray<Readonly<StorefrontBuilderEditabilityMetadata>>{
  return registry.list()
    .map(storefrontBuilderEditabilityMetadata)
    .sort((a,b)=>a.componentKey.localeCompare(b.componentKey)||a.componentVersion-b.componentVersion);
}

export type StorefrontPageSchemaOutlineNode={
  id:string;
  componentKey:string;
  componentVersion:number;
  depth:number;
  protectedSystem:boolean;
  configurable:readonly string[];
  bindingSlots:readonly string[];
  children:readonly StorefrontPageSchemaOutlineNode[];
};

function outlineNode(
  node:StorefrontComponentNode,
  registry:StorefrontComponentRegistry,
  depth:number,
):StorefrontPageSchemaOutlineNode{
  const definition=registry.get(node.componentKey,node.componentVersion);
  if(!definition)throw new Error('STOREFRONT_COMPONENT_NOT_REGISTERED');
  return{
    id:node.id,
    componentKey:node.componentKey,
    componentVersion:node.componentVersion,
    depth,
    protectedSystem:definition.protectedSystem===true,
    configurable:[...definition.manifest.configurable],
    bindingSlots:[...(definition.bindingSlots??[])],
    children:(node.children??[]).map(child=>outlineNode(child,registry,depth+1)),
  };
}

/**
 * Read-only hierarchy consumed later by Block 22. Producing an outline never
 * mutates, reorders, saves or publishes a Page Schema document.
 */
export function describeStorefrontPageSchema(
  document:Readonly<StorefrontPageDocument>,
  registry:StorefrontComponentRegistry,
){
  if(document.schemaVersion!==STOREFRONT_PAGE_SCHEMA_VERSION)throw new Error('PAGE_SCHEMA_VERSION_UNSUPPORTED');
  return Object.freeze({
    contractVersion:STOREFRONT_PAGE_SCHEMA_BLOCK21_VERSION,
    schemaVersion:document.schemaVersion,
    pageKey:document.pageKey,
    pageType:document.pageType,
    templateKey:document.templateKey,
    templateVersion:document.templateVersion,
    sections:document.sections.map(section=>outlineNode(section,registry,0)),
  });
}

export const STOREFRONT_PAGE_SCHEMA_BLOCK21_CONTRACT=Object.freeze({
  contractVersion:STOREFRONT_PAGE_SCHEMA_BLOCK21_VERSION,
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  pageTypes:STOREFRONT_PAGE_TYPES,
  viewports:STOREFRONT_VIEWPORTS,
  breakpoints:STOREFRONT_BREAKPOINT_CONTRACT,
  grid:STOREFRONT_LAYOUT_GRID_CONTRACT,
  designTokens:STOREFRONT_DESIGN_TOKEN_CONTRACT,
  pageSchema:STOREFRONT_PAGE_SCHEMA_CONTRACT,
  hierarchy:'template-page-presets-section-presets-components',
  previewAndPublishedUseSameSchema:true,
  templateInstallPublishes:false,
  visualBuilder:{
    dragDrop:false,
    canvas:false,
    inspector:false,
    resizeHandles:false,
    inlineEditing:false,
  },
} as const);
