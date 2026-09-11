'use client';

import Link from'next/link';
import{useEffect,useMemo,useRef,useState}from'react';
import styles from'./platform-device-lab.module.css';
import{buildDeviceLabPreviewSrc,DEVICE_LAB_PRESETS,type DeviceLabDevice}from'@/lib/platform/device-lab';

export function PlatformDeviceLab({device,target}:{device:DeviceLabDevice;target:string}){
  const canvasRef=useRef<HTMLDivElement>(null),[availableWidth,setAvailableWidth]=useState(0),[rotated,setRotated]=useState(false),[frameVersion,setFrameVersion]=useState(0),[loading,setLoading]=useState(true);
  useEffect(()=>{
    const node=canvasRef.current;if(!node)return;
    const measure=()=>setAvailableWidth(node.clientWidth);
    measure();
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
    observer?.observe(node);window.addEventListener('resize',measure);
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure)};
  },[]);
  useEffect(()=>{setRotated(false);setLoading(true)},[device,target]);
  const preset=DEVICE_LAB_PRESETS[device],width=rotated&&device!=='desktop'?preset.height:preset.width,height=rotated&&device!=='desktop'?preset.width:preset.height;
  const scale=availableWidth>0?Math.min(1,Math.max(.2,(availableWidth-44)/width)):.6;
  const displayWidth=Math.max(1,Math.round(width*scale)),displayHeight=Math.max(1,Math.round(height*scale));
  const src=useMemo(()=>buildDeviceLabPreviewSrc(target),[target]);
  const refresh=()=>{setLoading(true);setFrameVersion(value=>value+1)};
  return <section className={styles.lab} data-platform-device-lab="true">
    <header className={styles.labHeader}>
      <div className={styles.labHeading}>
        <span className={styles.eyebrow}>Platform QA · Responsive Preview</span>
        <h1>Device Lab</h1>
        <p>Ugyanazt az admin felületet valódi iframe viewportban ellenőrizheted. A CSS media query-k a kiválasztott eszköz szélességét kapják, nem a számítógépes böngésző teljes szélességét.</p>
      </div>
      <div className={styles.toolbar} aria-label="Device Lab műveletek">
        <button className={styles.toolbarButton} type="button" onClick={()=>setRotated(value=>!value)} disabled={device==='desktop'} aria-pressed={rotated}>↻ Forgatás</button>
        <button className={styles.toolbarButton} type="button" onClick={refresh}>↻ Frissítés</button>
        <Link className={styles.toolbarLink} href={target}>Eredeti nézet</Link>
      </div>
    </header>
    <div className={styles.metaBar}>
      <div className={styles.metaPrimary}><strong>{preset.label}</strong><span className={styles.dimensions}>{width} × {height}px</span>{loading&&<span className={styles.loading} aria-live="polite"><span className={styles.loadingDot} aria-hidden="true"/>Betöltés…</span>}</div>
      <span className={styles.target} title={target}>{target}</span>
    </div>
    <div className={styles.previewShell}>
      <div className={styles.previewCanvas} ref={canvasRef}>
        <div className={styles.scaledFrame} style={{width:displayWidth,height:displayHeight}}>
          <iframe key={`${src}-${frameVersion}-${width}x${height}`} className={styles.frame} src={src} title={`${preset.label} admin előnézet`} style={{width,height,transform:`scale(${scale})`}} onLoad={()=>setLoading(false)}/>
        </div>
      </div>
    </div>
  </section>;
}
