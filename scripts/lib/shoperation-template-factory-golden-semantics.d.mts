export const DEFAULT_LOCAL_GOLDEN_POLICY:Readonly<{
  windowSizePx:number;
  maxMismatchRatio:number;
  minMismatchPixels:number;
}>;

export function localGoldenMismatch(
  maskData:Uint8Array|Uint8ClampedArray,
  width:number,
  height:number,
  policy?:Readonly<{
    windowSizePx:number;
    maxMismatchRatio:number;
    minMismatchPixels:number;
  }>,
):{
  passed:boolean;
  windowSizePx:number;
  stridePx?:number;
  maxMismatchRatio:number;
  minMismatchPixels:number;
  peakMismatchRatio:number;
  peakMismatchPixels:number;
  peakRegion:{x:number;y:number;width:number;height:number}|null;
};
