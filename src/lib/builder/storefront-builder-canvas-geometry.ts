export type StorefrontBuilderCanvasFrameGeometry={
  width:string;
  scaledWidth:string;
  scale:number;
  transform:string;
};

export function resolveStorefrontBuilderCanvasFrameGeometry(viewportWidth:number,zoomPercent:number):StorefrontBuilderCanvasFrameGeometry{
  const width=Math.max(1,Math.round(Number.isFinite(viewportWidth)?viewportWidth:1200));
  const zoom=Math.max(60,Math.min(130,Number.isFinite(zoomPercent)?zoomPercent:100));
  const scale=zoom/100;
  return{
    width:`${width}px`,
    scaledWidth:`${Math.round(width*scale)}px`,
    scale,
    transform:`scale(${scale})`,
  };
}
