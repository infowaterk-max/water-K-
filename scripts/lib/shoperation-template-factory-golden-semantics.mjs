export const DEFAULT_LOCAL_GOLDEN_POLICY=Object.freeze({
  windowSizePx:48,
  maxMismatchRatio:.12,
  minMismatchPixels:400,
});

export function localGoldenMismatch(maskData,width,height,policy=DEFAULT_LOCAL_GOLDEN_POLICY){
  const requestedWindow=Math.max(1,Math.floor(policy.windowSizePx));
  const windowSizePx=Math.min(requestedWindow,width,height);
  const maxMismatchRatio=Number(policy.maxMismatchRatio);
  const minMismatchPixels=Math.min(Math.max(1,Math.floor(policy.minMismatchPixels)),Math.max(1,windowSizePx*windowSizePx));
  if(width<=0||height<=0||windowSizePx<=0){
    return{passed:true,windowSizePx,maxMismatchRatio,minMismatchPixels,peakMismatchRatio:0,peakMismatchPixels:0,peakRegion:null};
  }

  const stride=Math.max(1,Math.floor(windowSizePx/2));
  const starts=length=>{
    if(length<=windowSizePx)return[0];
    const values=new Set([0,length-windowSizePx]);
    for(let start=0;start<=length-windowSizePx;start+=stride)values.add(start);
    return[...values].sort((a,b)=>a-b);
  };
  const xs=starts(width),ys=starts(height);
  const integralWidth=width+1;
  const integral=new Uint32Array((width+1)*(height+1));
  for(let y=0;y<height;y+=1){
    let row=0;
    for(let x=0;x<width;x+=1){
      if(maskData[(y*width+x)*4+3]>0)row+=1;
      integral[(y+1)*integralWidth+(x+1)]=integral[y*integralWidth+(x+1)]+row;
    }
  }
  const countRegion=(x,y,w,h)=>{
    const x2=x+w,y2=y+h;
    return integral[y2*integralWidth+x2]-integral[y*integralWidth+x2]-integral[y2*integralWidth+x]+integral[y*integralWidth+x];
  };

  let peakMismatchRatio=0,peakMismatchPixels=0,peakRegion=null,failed=false;
  for(const y of ys){
    for(const x of xs){
      const w=Math.min(windowSizePx,width-x),h=Math.min(windowSizePx,height-y);
      const area=w*h;
      const mismatchedPixels=countRegion(x,y,w,h);
      const mismatchRatio=area?mismatchedPixels/area:0;
      if(mismatchRatio>peakMismatchRatio||(mismatchRatio===peakMismatchRatio&&mismatchedPixels>peakMismatchPixels)){
        peakMismatchRatio=mismatchRatio;
        peakMismatchPixels=mismatchedPixels;
        peakRegion={x,y,width:w,height:h};
      }
      if(mismatchedPixels>=minMismatchPixels&&mismatchRatio>maxMismatchRatio)failed=true;
    }
  }
  return{
    passed:!failed,
    windowSizePx,
    stridePx:stride,
    maxMismatchRatio,
    minMismatchPixels,
    peakMismatchRatio,
    peakMismatchPixels,
    peakRegion,
  };
}
