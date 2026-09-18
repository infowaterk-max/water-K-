import type {CSSProperties} from 'react';
import type {StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';

export type StorefrontBuilderCanvasPlacementStyle=CSSProperties&{
  gridColumn:string;
  minWidth:0;
};

const stringValue=(value:unknown)=>typeof value==='string'&&value.trim()?value:undefined;
const sizeValue=(value:unknown)=>typeof value==='string'||typeof value==='number'?value:undefined;

export function resolveStorefrontBuilderCanvasPlacement(
  node:StorefrontResolvedComponentNode,
  viewport:StorefrontViewport,
):StorefrontBuilderCanvasPlacementStyle{
  const visual=resolveStorefrontVisualStyle(node.config.style,viewport) as Record<string,unknown>;
  const span=Math.max(1,Math.min(12,Math.round(node.resolved.gridSpan)));
  const gridColumn=stringValue(visual.gridColumn)??`span ${span} / span ${span}`;
  const absolute=visual.position==='absolute';
  return{
    gridColumn,
    ...(stringValue(visual.gridRow)?{gridRow:String(visual.gridRow)}:{}),
    ...(typeof visual.order==='number'&&Number.isFinite(visual.order)?{order:visual.order}:{}),
    ...(stringValue(visual.alignSelf)?{alignSelf:String(visual.alignSelf)}:{}),
    ...(stringValue(visual.justifySelf)?{justifySelf:String(visual.justifySelf)}:{}),
    ...(absolute?{
      position:'absolute' as const,
      ...(stringValue(visual.inset)?{inset:String(visual.inset)}:{}),
      ...(sizeValue(visual.top)!==undefined?{top:sizeValue(visual.top)}:{}),
      ...(sizeValue(visual.right)!==undefined?{right:sizeValue(visual.right)}:{}),
      ...(sizeValue(visual.bottom)!==undefined?{bottom:sizeValue(visual.bottom)}:{}),
      ...(sizeValue(visual.left)!==undefined?{left:sizeValue(visual.left)}:{}),
      ...(sizeValue(visual.width)!==undefined?{width:sizeValue(visual.width)}:{}),
      ...(sizeValue(visual.height)!==undefined?{height:sizeValue(visual.height)}:{}),
      ...(sizeValue(visual.minHeight)!==undefined?{minHeight:sizeValue(visual.minHeight)}:{}),
      ...(sizeValue(visual.maxWidth)!==undefined?{maxWidth:sizeValue(visual.maxWidth)}:{}),
      ...(typeof visual.zIndex==='number'&&Number.isFinite(visual.zIndex)?{zIndex:visual.zIndex}:{}),
    }:{}),
    minWidth:0,
  };
}

export function isStorefrontBuilderAbsolutePlacement(style:StorefrontBuilderCanvasPlacementStyle):boolean{
  return style.position==='absolute';
}


export function shouldStretchStorefrontBuilderGridChild(
  parent:StorefrontResolvedComponentNode|undefined,
  viewport:StorefrontViewport,
):boolean{
  if(!parent||parent.componentKey!=='layout.grid')return false;
  const visual=resolveStorefrontVisualStyle(parent.config.style,viewport) as Record<string,unknown>;
  const visualAlign=typeof visual.alignItems==='string'?visual.alignItems:undefined;
  const configAlign=typeof parent.config.align==='string'?parent.config.align:undefined;
  return (visualAlign??configAlign??'stretch')==='stretch';
}
