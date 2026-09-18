export type StorefrontBuilderCanvasFrameGeometry={
  width:string;
  zoom:number;
};

export function resolveStorefrontBuilderCanvasFrameGeometry(viewportWidth:number,zoomPercent:number):StorefrontBuilderCanvasFrameGeometry{
  const width=Math.max(1,Math.round(Number.isFinite(viewportWidth)?viewportWidth:1200));
  const zoom=Math.max(60,Math.min(130,Number.isFinite(zoomPercent)?zoomPercent:100));
  return{
    width:`${width}px`,
    zoom:zoom/100,
  };
}
