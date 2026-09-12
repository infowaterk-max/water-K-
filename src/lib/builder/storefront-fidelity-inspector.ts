import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  STOREFRONT_BUILDER_EDIT_MODES,
  STOREFRONT_EDIT_MODE_CAPABILITIES,
  readStorefrontFidelityMetadata,
  type StorefrontBuilderEditMode,
} from '@/lib/builder/storefront-fidelity-engine';
import {evaluateStorefrontPerformance} from '@/lib/builder/storefront-performance-contract';

export const STOREFRONT_FIDELITY_INSPECTOR_VERSION='shoporation.visual-builder-fidelity-inspector.v1' as const;

export type StorefrontFidelityCapability=
  |typeof STOREFRONT_EDIT_MODE_CAPABILITIES.normal[number]
  |typeof STOREFRONT_EDIT_MODE_CAPABILITIES.advanced[number]
  |typeof STOREFRONT_EDIT_MODE_CAPABILITIES.expert[number];

export type StorefrontFidelityInspectorStatus='ok'|'warning'|'error';

const MODE_RANK:Record<StorefrontBuilderEditMode,number>={normal:0,advanced:1,expert:2};

export function resolveStorefrontBuilderEditCapabilities(mode:StorefrontBuilderEditMode):StorefrontFidelityCapability[]{
  if(!STOREFRONT_BUILDER_EDIT_MODES.includes(mode))return[];
  const result:StorefrontFidelityCapability[]=[...STOREFRONT_EDIT_MODE_CAPABILITIES.normal];
  if(MODE_RANK[mode]>=MODE_RANK.advanced)result.push(...STOREFRONT_EDIT_MODE_CAPABILITIES.advanced);
  if(MODE_RANK[mode]>=MODE_RANK.expert)result.push(...STOREFRONT_EDIT_MODE_CAPABILITIES.expert);
  return [...new Set(result)];
}

export function getStorefrontBuilderEditMode(document:Pick<StorefrontPageDocument,'metadata'>):StorefrontBuilderEditMode{
  return readStorefrontFidelityMetadata(document)?.editMode??'normal';
}

export function canUseStorefrontFidelityCapability(document:Pick<StorefrontPageDocument,'metadata'>,capability:StorefrontFidelityCapability):boolean{
  return resolveStorefrontBuilderEditCapabilities(getStorefrontBuilderEditMode(document)).includes(capability);
}

export function inspectStorefrontFidelityBuilder(document:StorefrontPageDocument){
  const metadata=readStorefrontFidelityMetadata(document);
  const editMode=metadata?.editMode??'normal';
  const capabilities=resolveStorefrontBuilderEditCapabilities(editMode);
  const performance=evaluateStorefrontPerformance(document);
  const performanceStatus:StorefrontFidelityInspectorStatus=performance.issues.some(issue=>issue.severity==='error')?'error':performance.issues.length?'warning':'ok';
  return{
    inspectorVersion:STOREFRONT_FIDELITY_INSPECTOR_VERSION,
    editMode,
    capabilities,
    designGuard:{
      mode:metadata?.designGuard?.mode??'off',
      presetId:metadata?.designGuard?.presetId??null,
      baselineVersion:metadata?.designGuard?.baselineVersion??null,
      protectedNodeCount:metadata?.designGuard?.protectedNodeIds?.length??0,
    },
    performance:{
      status:performanceStatus,
      ok:performance.ok,
      metrics:performance.metrics,
      issues:performance.issues,
    },
  } as const;
}
