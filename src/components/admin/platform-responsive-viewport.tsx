'use client';

import{useEffect,useMemo,useRef,useState,type ReactNode}from'react';
import{usePathname,useSearchParams}from'next/navigation';
import styles from'./platform-device-lab.module.css';
import{PlatformDeviceViewButtons}from'./platform-device-lab-launcher';
import{buildDeviceLabPreviewSrc,canUsePlatformDevicePreview,DEVICE_LAB_CHANGE_EVENT,DEVICE_LAB_PRESETS,DEVICE_LAB_ROUTE_MESSAGE,DEVICE_LAB_STORAGE_KEY,normalizeDeviceLabDevice,normalizeDeviceLabTarget,type DeviceLabDevice}from'@/lib/platform/device-lab';

function currentAdminRoute(pathname:string,searchParams:URLSearchParams){
  const params=new URLSearchParams(searchParams);
  params.delete('__shoperation_device_preview');
  const search=params.toString();
  return normalizeDeviceLabTarget(`${pathname}${search?`?${search}`:''}${typeof window!=='undefined'?window.location.hash:''}`);
}

export function PlatformResponsiveViewport({enabled,children}:{enabled:boolean;children:ReactNode}){
  const pathname=usePathname()||'/admin/platform',searchParams=useSearchParams(),frameRef=useRef<HTMLIFrameElement>(null);
  const[ready,setReady]=useState(false),[framed,setFramed]=useState(false),[previewAvailable,setPreviewAvailable]=useState(false),[device,setDevice]=useState<DeviceLabDevice>('desktop'),[frameRoute,setFrameRoute]=useState('/admin/platform'),[previewSrc,setPreviewSrc]=useState(''),[windowSize,setWindowSize]=useState({width:1440,height:900});

  useEffect(()=>{
    const isFramed=window.self!==window.top;
    setFramed(isFramed);
    const route=currentAdminRoute(pathname,new URLSearchParams(window.location.search));
    setFrameRoute(route);
    if(isFramed){
      window.parent.postMessage({type:DEVICE_LAB_ROUTE_MESSAGE,route},window.location.origin);
      setPreviewAvailable(false);
      setReady(true);
      return;
    }
    const available=enabled&&canUsePlatformDevicePreview();
    setPreviewAvailable(available);
    const stored=available?normalizeDeviceLabDevice(window.localStorage.getItem(DEVICE_LAB_STORAGE_KEY)):'desktop';
    setDevice(stored);
    if(stored!=='desktop')setPreviewSrc(buildDeviceLabPreviewSrc(route));
    else setPreviewSrc('');
    setWindowSize({width:window.innerWidth,height:window.innerHeight});
    setReady(true);
  },[enabled,pathname,searchParams]);

  useEffect(()=>{
    if(!ready||framed||!enabled)return;
    const onDevice=(event:Event)=>{
      if(!canUsePlatformDevicePreview()){
        setPreviewAvailable(false);
        setDevice('desktop');
        setPreviewSrc('');
        return;
      }
      setPreviewAvailable(true);
      const next=event instanceof CustomEvent?normalizeDeviceLabDevice(event.detail):normalizeDeviceLabDevice(window.localStorage.getItem(DEVICE_LAB_STORAGE_KEY));
      setDevice(previous=>{
        if(previous==='desktop'&&next!=='desktop')setPreviewSrc(buildDeviceLabPreviewSrc(frameRoute));
        return next;
      });
    };
    const onResize=()=>{
      setWindowSize({width:window.innerWidth,height:window.innerHeight});
      if(!canUsePlatformDevicePreview()){
        setPreviewAvailable(false);
        setDevice('desktop');
        setPreviewSrc('');
      }else setPreviewAvailable(true);
    };
    const onMessage=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin||event.source!==frameRef.current?.contentWindow)return;
      if(!event.data||event.data.type!==DEVICE_LAB_ROUTE_MESSAGE)return;
      const route=normalizeDeviceLabTarget(event.data.route);
      setFrameRoute(route);
      window.history.replaceState(window.history.state,'',route);
    };
    window.addEventListener(DEVICE_LAB_CHANGE_EVENT,onDevice);
    window.addEventListener('storage',onDevice);
    window.addEventListener('resize',onResize);
    window.addEventListener('message',onMessage);
    return()=>{
      window.removeEventListener(DEVICE_LAB_CHANGE_EVENT,onDevice);
      window.removeEventListener('storage',onDevice);
      window.removeEventListener('resize',onResize);
      window.removeEventListener('message',onMessage);
    };
  },[enabled,frameRoute,framed,ready]);

  const selectDevice=(next:DeviceLabDevice)=>{
    if(!canUsePlatformDevicePreview())return;
    window.localStorage.setItem(DEVICE_LAB_STORAGE_KEY,next);
    if(next==='desktop'){
      window.location.assign(frameRoute);
      return;
    }
    if(device==='desktop')setPreviewSrc(buildDeviceLabPreviewSrc(frameRoute));
    setDevice(next);
  };

  const preset=DEVICE_LAB_PRESETS[device],railWidth=62,padding=28;
  const scale=useMemo(()=>{
    if(device==='desktop')return 1;
    const widthScale=(windowSize.width-railWidth-padding)/preset.width;
    const heightScale=(windowSize.height-padding)/preset.height;
    return Math.min(1,Math.max(.25,Math.min(widthScale,heightScale)));
  },[device,preset.height,preset.width,windowSize.height,windowSize.width]);

  if(!ready||!enabled||framed||!previewAvailable||device==='desktop')return <>{children}</>;

  return <div className={styles.viewportShell} data-platform-device-view={device}>
    <aside className={styles.modeRail} aria-label="Eszköznézet váltó">
      <PlatformDeviceViewButtons active={device} onSelect={selectDevice}/>
    </aside>
    <div className={styles.viewportCanvas}>
      <div className={styles.scaledFrame} style={{width:Math.round(preset.width*scale),height:Math.round(preset.height*scale)}}>
        <iframe ref={frameRef} className={styles.frame} src={previewSrc||buildDeviceLabPreviewSrc(frameRoute)} title={`${preset.label} admin nézet`} style={{width:preset.width,height:preset.height,transform:`scale(${scale})`}}/>
      </div>
    </div>
  </div>;
}
