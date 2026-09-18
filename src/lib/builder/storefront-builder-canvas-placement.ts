import type {StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';

export type StorefrontBuilderCanvasPlacementStyle={
  gridColumn:string;
  gridRow?:string;
  order?:number;
  alignSelf?:string;
  justifySelf?:string;
  minWidth:0;
};

export function resolveStorefrontBuilderCanvasPlacement(
  node:StorefrontResolvedComponentNode,
  viewport:StorefrontViewport,
):StorefrontBuilderCanvasPlacementStyle{
  const visual=resolveStorefrontVisualStyle(node.config.style,viewport) as Record<string,unknown>;
  const span=Math.max(1,Math.min(12,Math.round(node.resolved.gridSpan)));
  const gridColumn=typeof visual.gridColumn==='string'&&visual.gridColumn.trim()
    ?visual.gridColumn
    :`span ${span} / span ${span}`;
  return{
    gridColumn,
    ...(typeof visual.gridRow==='string'&&visual.gridRow.trim()?{gridRow:visual.gridRow}:{}),
    ...(typeof visual.order==='number'&&Number.isFinite(visual.order)?{order:visual.order}:{}),
    ...(typeof visual.alignSelf==='string'&&visual.alignSelf.trim()?{alignSelf:visual.alignSelf}:{}),
    ...(typeof visual.justifySelf==='string'&&visual.justifySelf.trim()?{justifySelf:visual.justifySelf}:{}),
    minWidth:0,
  };
}
