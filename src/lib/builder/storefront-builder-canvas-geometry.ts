export const STOREFRONT_BUILDER_MIN_ZOOM=35;
export const STOREFRONT_BUILDER_MAX_ZOOM=130;

export type StorefrontBuilderCanvasFrameGeometry={
  width:string;
  scaledWidth:string;
  scale:number;
  transform:string;
};

export function resolveStorefrontBuilderCanvasFrameGeometry(viewportWidth:number,zoomPercent:number):StorefrontBuilderCanvasFrameGeometry{
  const width=Math.max(1,Math.round(Number.isFinite(viewportWidth)?viewportWidth:1200));
  const zoom=Math.max(STOREFRONT_BUILDER_MIN_ZOOM,Math.min(STOREFRONT_BUILDER_MAX_ZOOM,Number.isFinite(zoomPercent)?zoomPercent:100));
  const scale=zoom/100;
  return{
    width:`${width}px`,
    scaledWidth:`${Math.round(width*scale)}px`,
    scale,
    transform:`scale(${scale})`,
  };
}

export function resolveStorefrontBuilderFitZoom(viewportWidth:number,availableWidth:number):number{
  const width=Math.max(1,Number.isFinite(viewportWidth)?viewportWidth:1200);
  const available=Math.max(1,Number.isFinite(availableWidth)?availableWidth:width);
  const raw=Math.floor((available/width)*100);
  return Math.max(STOREFRONT_BUILDER_MIN_ZOOM,Math.min(100,raw));
}
