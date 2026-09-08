import type {FeatureCode,PlanCode} from '@/lib/plans/catalog';
import {
  STOREFRONT_PAGE_SCHEMA_VERSION,
  STOREFRONT_PAGE_TYPES,
  type StorefrontBuilderComponentManifest,
  type StorefrontBuilderPageType,
  type StorefrontGridSpan,
  type StorefrontTemplateManifest,
  type StorefrontViewport,
} from '@/lib/builder/storefront-foundation';

export const STOREFRONT_RUNTIME_VERSION='shoporation.storefront-runtime.v1' as const;

export const STOREFRONT_BINDING_NAMESPACES=[
  'brand','navigation','collection','product','variant','pricing','inventory','cart','customer','content','catalog','search',
  'reviews','recommendations','commerce','finder','composer','composition','configurator','compatibility','context','retention',
  'reorder','b2b','rfq','offer','maker','origin',
] as const;
export type StorefrontBindingNamespace=typeof STOREFRONT_BINDING_NAMESPACES[number];

const PAGE_TYPES=new Set<string>(STOREFRONT_PAGE_TYPES);
const BINDING_NAMESPACES=new Set<string>(STOREFRONT_BINDING_NAMESPACES);
const ID_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const KEY_PATTERN=/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const BINDING_PATTERN=/^[a-z][a-z0-9]*(?:\.[A-Za-z0-9_-]+)+$/;
const SLOT_PATTERN=/^[A-Za-z][A-Za-z0-9_-]*$/;
const FORBIDDEN_PATH_SEGMENTS=new Set(['__proto__','prototype','constructor']);

export type StorefrontBindingReference={path:string;fallback?:unknown};
export type StorefrontResponsiveOverride={hidden?:boolean;gridSpan?:StorefrontGridSpan};
export type StorefrontComponentNode={
  id:string;
  componentKey:string;
  componentVersion:number;
  config:Record<string,unknown>;
  bindings?:Record<string,StorefrontBindingReference>;
  responsive?:Partial<Record<StorefrontViewport,StorefrontResponsiveOverride>>;
  children?:StorefrontComponentNode[];
};

export type StorefrontPageDocument={
  schemaVersion:number;
  pageKey:string;
  pageType:StorefrontBuilderPageType;
  templateKey:string;
  templateVersion:number;
  sections:StorefrontComponentNode[];
  metadata?:Record<string,unknown>;
};

export type StorefrontResolvedComponentNode=StorefrontComponentNode&{
  resolved:{hidden:boolean;gridSpan:StorefrontGridSpan};
  children:StorefrontResolvedComponentNode[];
};

export type StorefrontRuntimeComponentDefinition={
  manifest:StorefrontBuilderComponentManifest;
  bindingSlots?:readonly string[];
  allowsChildren?:boolean;
  allowedChildren?:readonly string[];
  protectedSystem?:boolean;
};

export type StorefrontRuntimeCapabilityContext={
  plan:PlanCode;
  features:readonly FeatureCode[]|ReadonlySet<FeatureCode>;
};

export type StorefrontRuntimeViolation={
  code:string;
  path:string;
  message:string;
  severity:'error'|'warning';
  metadata?:Record<string,unknown>;
};

export type StorefrontValidationResult={
  ok:boolean;
  violations:StorefrontRuntimeViolation[];
};

const planRank:Record<PlanCode,number>={alap:0,pro:1};
const featureSet=(features:StorefrontRuntimeCapabilityContext['features'])=>features instanceof Set?features:new Set(features);

export function hasStorefrontRuntimeCapability(requirement:StorefrontBuilderComponentManifest['capability'],context:StorefrontRuntimeCapabilityContext):boolean{
  if(planRank[context.plan]<planRank[requirement.minPlan])return false;
  const enabled=featureSet(context.features);
  return requirement.features.every(feature=>enabled.has(feature));
}

export function isAllowedStorefrontBindingPath(path:string):boolean{
  if(!BINDING_PATTERN.test(path))return false;
  const segments=path.split('.');
  if(!BINDING_NAMESPACES.has(segments[0]))return false;
  return !segments.some(segment=>FORBIDDEN_PATH_SEGMENTS.has(segment));
}

export function resolveStorefrontBinding(path:string,context:Record<string,unknown>):unknown{
  if(!isAllowedStorefrontBindingPath(path))return undefined;
  let current:unknown=context;
  for(const segment of path.split('.')){
    if(!current||typeof current!=='object'||Array.isArray(current))return undefined;
    if(!Object.prototype.hasOwnProperty.call(current,segment))return undefined;
    current=(current as Record<string,unknown>)[segment];
  }
  return current;
}

export function applyStorefrontBindings(node:StorefrontComponentNode,context:Record<string,unknown>):Record<string,unknown>{
  const config={...node.config};
  for(const[slot,reference]of Object.entries(node.bindings??{})){
    const value=resolveStorefrontBinding(reference.path,context);
    if(value!==undefined)config[slot]=value;
    else if(Object.prototype.hasOwnProperty.call(reference,'fallback'))config[slot]=reference.fallback;
  }
  return config;
}

export function resolveStorefrontResponsiveOverride(node:StorefrontComponentNode,viewport:StorefrontViewport):Required<StorefrontResponsiveOverride>{
  const desktop=node.responsive?.desktop??{};
  const tablet={...desktop,...node.responsive?.tablet};
  const mobile={...tablet,...node.responsive?.mobile};
  const selected=viewport==='desktop'?desktop:viewport==='tablet'?tablet:mobile;
  return{hidden:selected.hidden??false,gridSpan:selected.gridSpan??12};
}

export class StorefrontComponentRegistry{
  private readonly definitions=new Map<string,Map<number,StorefrontRuntimeComponentDefinition>>();

  register(definition:StorefrontRuntimeComponentDefinition):this{
    const{manifest}=definition;
    const versions=this.definitions.get(manifest.componentKey)??new Map<number,StorefrontRuntimeComponentDefinition>();
    if(versions.has(manifest.componentVersion))throw new Error('STOREFRONT_COMPONENT_DUPLICATE');
    for(const slot of definition.bindingSlots??[])if(!SLOT_PATTERN.test(slot))throw new Error('STOREFRONT_BINDING_SLOT_INVALID');
    versions.set(manifest.componentVersion,Object.freeze({...definition}));
    this.definitions.set(manifest.componentKey,versions);
    return this;
  }

  get(componentKey:string,componentVersion:number):StorefrontRuntimeComponentDefinition|undefined{
    return this.definitions.get(componentKey)?.get(componentVersion);
  }

  latest(componentKey:string):StorefrontRuntimeComponentDefinition|undefined{
    const versions=this.definitions.get(componentKey);
    if(!versions?.size)return undefined;
    const latest=Math.max(...versions.keys());
    return versions.get(latest);
  }

  list():StorefrontRuntimeComponentDefinition[]{
    return [...this.definitions.values()].flatMap(versions=>[...versions.values()]);
  }
}

const issue=(violations:StorefrontRuntimeViolation[],code:string,path:string,message:string,severity:'error'|'warning'='error',metadata?:Record<string,unknown>)=>{
  violations.push({code,path,message,severity,metadata});
};

export function validateStorefrontPageDocument(document:StorefrontPageDocument,registry:StorefrontComponentRegistry,capability?:StorefrontRuntimeCapabilityContext):StorefrontValidationResult{
  const violations:StorefrontRuntimeViolation[]=[];
  if(document.schemaVersion!==STOREFRONT_PAGE_SCHEMA_VERSION)issue(violations,'PAGE_SCHEMA_VERSION_UNSUPPORTED','schemaVersion','Unsupported storefront page schema version.');
  if(!ID_PATTERN.test(document.pageKey))issue(violations,'PAGE_KEY_INVALID','pageKey','Page key is invalid.');
  if(!PAGE_TYPES.has(document.pageType))issue(violations,'PAGE_TYPE_INVALID','pageType','Page type is invalid.');
  if(!KEY_PATTERN.test(document.templateKey))issue(violations,'TEMPLATE_KEY_INVALID','templateKey','Template key is invalid.');
  if(!Number.isInteger(document.templateVersion)||document.templateVersion<1)issue(violations,'TEMPLATE_VERSION_INVALID','templateVersion','Template version is invalid.');
  if(!Array.isArray(document.sections))issue(violations,'PAGE_SECTIONS_INVALID','sections','Sections must be an ordered array.');

  const ids=new Set<string>();
  const walk=(node:StorefrontComponentNode,path:string,parent?:StorefrontRuntimeComponentDefinition)=>{
    if(!ID_PATTERN.test(node.id))issue(violations,'NODE_ID_INVALID',`${path}.id`,'Component node id is invalid.');
    else if(ids.has(node.id))issue(violations,'NODE_ID_DUPLICATE',`${path}.id`,'Component node id must be unique within the page.');
    else ids.add(node.id);
    if(!KEY_PATTERN.test(node.componentKey))issue(violations,'COMPONENT_KEY_INVALID',`${path}.componentKey`,'Component key is invalid.');
    if(!Number.isInteger(node.componentVersion)||node.componentVersion<1)issue(violations,'COMPONENT_VERSION_INVALID',`${path}.componentVersion`,'Component version is invalid.');

    const definition=registry.get(node.componentKey,node.componentVersion);
    if(!definition){
      issue(violations,'COMPONENT_NOT_REGISTERED',path,'Component key/version is not registered.', 'error',{componentKey:node.componentKey,componentVersion:node.componentVersion});
    }else{
      if(!definition.manifest.pageTypes.includes(document.pageType))issue(violations,'COMPONENT_PAGE_TYPE_NOT_ALLOWED',path,'Component is not allowed on this page type.');
      if(capability&&!hasStorefrontRuntimeCapability(definition.manifest.capability,capability))issue(violations,'COMPONENT_CAPABILITY_REQUIRED',path,'Runtime capability requirement is not satisfied.');
      if(parent?.allowedChildren&&!parent.allowedChildren.includes(node.componentKey))issue(violations,'COMPONENT_CHILD_NOT_ALLOWED',path,'Component is not allowed inside the parent component.');
      const supportedBindings=new Set(definition.bindingSlots??[]);
      for(const[slot,reference]of Object.entries(node.bindings??{})){
        if(!SLOT_PATTERN.test(slot))issue(violations,'BINDING_SLOT_INVALID',`${path}.bindings.${slot}`,'Binding slot is invalid.');
        if(!supportedBindings.has(slot))issue(violations,'BINDING_SLOT_NOT_SUPPORTED',`${path}.bindings.${slot}`,'Binding slot is not declared by the component.');
        if(!isAllowedStorefrontBindingPath(reference.path))issue(violations,'BINDING_PATH_NOT_ALLOWED',`${path}.bindings.${slot}`,'Binding path is not in an allowed storefront namespace.');
      }
      const configurable=new Set(definition.manifest.configurable);
      for(const key of Object.keys(node.config))if(!configurable.has(key))issue(violations,'UNKNOWN_CONFIG_KEY_PRESERVED',`${path}.config.${key}`,'Unknown config key is preserved for forward compatibility.','warning');
      for(const[viewport,override]of Object.entries(node.responsive??{})){
        if(!['desktop','tablet','mobile'].includes(viewport))issue(violations,'RESPONSIVE_VIEWPORT_INVALID',`${path}.responsive.${viewport}`,'Viewport is invalid.');
        if(override.gridSpan!==undefined&&(!Number.isInteger(override.gridSpan)||override.gridSpan<1||override.gridSpan>12))issue(violations,'RESPONSIVE_GRID_SPAN_INVALID',`${path}.responsive.${viewport}.gridSpan`,'Grid span must be between 1 and 12.');
      }
      if((node.children?.length??0)>0&&!definition.allowsChildren)issue(violations,'COMPONENT_CHILDREN_NOT_ALLOWED',`${path}.children`,'Component does not allow child nodes.');
    }

    node.children?.forEach((child,index)=>walk(child,`${path}.children[${index}]`,definition));
  };
  document.sections.forEach((section,index)=>walk(section,`sections[${index}]`));
  return{ok:!violations.some(item=>item.severity==='error'),violations};
}

export function resolveStorefrontPageDocument(document:StorefrontPageDocument,viewport:StorefrontViewport,bindingContext:Record<string,unknown>):StorefrontResolvedComponentNode[]{
  const resolveNode=(node:StorefrontComponentNode):StorefrontResolvedComponentNode=>({
    ...node,
    config:applyStorefrontBindings(node,bindingContext),
    resolved:resolveStorefrontResponsiveOverride(node,viewport),
    children:(node.children??[]).map(resolveNode),
  });
  return document.sections.map(resolveNode);
}

export type StorefrontTemplatePackage={
  manifest:StorefrontTemplateManifest;
  pages:readonly StorefrontPageDocument[];
};

export class StorefrontTemplateRegistry{
  private readonly packages=new Map<string,Map<number,Readonly<StorefrontTemplatePackage>>>();

  register(template:StorefrontTemplatePackage):this{
    const{manifest,pages}=template;
    const versions=this.packages.get(manifest.templateKey)??new Map<number,Readonly<StorefrontTemplatePackage>>();
    if(versions.has(manifest.templateVersion))throw new Error('STOREFRONT_TEMPLATE_DUPLICATE');
    const seenPageTypes=new Set<StorefrontBuilderPageType>();
    for(const page of pages){
      if(page.templateKey!==manifest.templateKey||page.templateVersion!==manifest.templateVersion)throw new Error('STOREFRONT_TEMPLATE_PAGE_IDENTITY_MISMATCH');
      if(!manifest.pageTypes.includes(page.pageType))throw new Error('STOREFRONT_TEMPLATE_PAGE_TYPE_NOT_DECLARED');
      if(seenPageTypes.has(page.pageType))throw new Error('STOREFRONT_TEMPLATE_PAGE_TYPE_DUPLICATE');
      seenPageTypes.add(page.pageType);
    }
    versions.set(manifest.templateVersion,Object.freeze({manifest,pages:[...pages]}));
    this.packages.set(manifest.templateKey,versions);
    return this;
  }

  get(templateKey:string,templateVersion:number):Readonly<StorefrontTemplatePackage>|undefined{
    return this.packages.get(templateKey)?.get(templateVersion);
  }

  latest(templateKey:string):Readonly<StorefrontTemplatePackage>|undefined{
    const versions=this.packages.get(templateKey);
    if(!versions?.size)return undefined;
    return versions.get(Math.max(...versions.keys()));
  }
}

export type StorefrontPageMigration={
  fromVersion:number;
  toVersion:number;
  migrate:(document:Readonly<StorefrontPageDocument>)=>StorefrontPageDocument;
};

export function migrateStorefrontPageDocument(document:StorefrontPageDocument,targetVersion:number,migrations:readonly StorefrontPageMigration[]):StorefrontPageDocument{
  if(!Number.isInteger(targetVersion)||targetVersion<1)throw new Error('STOREFRONT_MIGRATION_TARGET_INVALID');
  if(targetVersion<document.schemaVersion)throw new Error('STOREFRONT_MIGRATION_BACKWARD_FORBIDDEN');
  let current=structuredClone(document);
  while(current.schemaVersion<targetVersion){
    const migration=migrations.find(candidate=>candidate.fromVersion===current.schemaVersion);
    if(!migration)throw new Error('STOREFRONT_MIGRATION_STEP_REQUIRED');
    if(migration.toVersion<=migration.fromVersion)throw new Error('STOREFRONT_MIGRATION_NOT_FORWARD');
    const next=migration.migrate(Object.freeze(structuredClone(current)));
    if(next.schemaVersion!==migration.toVersion)throw new Error('STOREFRONT_MIGRATION_VERSION_MISMATCH');
    current=next;
  }
  if(current.schemaVersion!==targetVersion)throw new Error('STOREFRONT_MIGRATION_TARGET_OVERSHOT');
  return current;
}

export type StorefrontPageSnapshotKind='preview'|'published';
export type StorefrontPageSnapshot={
  snapshotId:string;
  kind:StorefrontPageSnapshotKind;
  revision:number;
  createdAt:string;
  document:Readonly<StorefrontPageDocument>;
};

const deepFreeze=<T>(value:T):T=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  }
  return value;
};

export function createStorefrontPageSnapshot(input:{snapshotId:string;kind:StorefrontPageSnapshotKind;revision:number;createdAt?:string;document:StorefrontPageDocument}):Readonly<StorefrontPageSnapshot>{
  if(!ID_PATTERN.test(input.snapshotId))throw new Error('STOREFRONT_SNAPSHOT_ID_INVALID');
  if(!Number.isInteger(input.revision)||input.revision<1)throw new Error('STOREFRONT_SNAPSHOT_REVISION_INVALID');
  const document=deepFreeze(structuredClone(input.document));
  return deepFreeze({snapshotId:input.snapshotId,kind:input.kind,revision:input.revision,createdAt:input.createdAt??new Date().toISOString(),document});
}
