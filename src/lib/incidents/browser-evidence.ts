export type IncidentViewportEvidence={width:number;height:number};

export function captureIncidentViewportEvidence():IncidentViewportEvidence|undefined{
  if(typeof window==='undefined')return undefined;
  const width=Math.round(window.innerWidth);
  const height=Math.round(window.innerHeight);
  if(!Number.isFinite(width)||!Number.isFinite(height))return undefined;
  if(width<240||height<240||width>10000||height>10000)return undefined;
  return{width,height};
}
