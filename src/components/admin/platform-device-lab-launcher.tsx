'use client';

import{useEffect,useState,type ReactNode}from'react';
import styles from'./platform-device-lab.module.css';
import{canUsePlatformDevicePreview,DEVICE_LAB_CHANGE_EVENT,DEVICE_LAB_STORAGE_KEY,normalizeDeviceLabDevice,type DeviceLabDevice}from'@/lib/platform/device-lab';

export function DesktopIcon(){return <svg viewBox="0 0 28 24" aria-hidden="true"><rect x="3" y="3.5" width="22" height="14" rx="2.2"/><path d="M10 21h8M14 17.5V21"/></svg>}
export function TabletIcon(){return <svg viewBox="0 0 28 24" aria-hidden="true"><rect x="2.5" y="4.2" width="23" height="15.6" rx="2.8"/><circle cx="14" cy="6.5" r=".65"/></svg>}
export function MobileIcon(){return <svg viewBox="0 0 28 24" aria-hidden="true"><rect x="8.7" y="2.4" width="10.6" height="19.2" rx="2.7"/><path d="M12.2 5h3.6M13.2 18.9h1.6"/></svg>}

const devices:[DeviceLabDevice,string,()=>ReactNode][]=[
  ['desktop','Asztali nézet',DesktopIcon],
  ['tablet','Táblagépes nézet',TabletIcon],
  ['mobile','Mobilnézet',MobileIcon],
];

export function setPlatformDeviceView(device:DeviceLabDevice){
  if(typeof window==='undefined'||!canUsePlatformDevicePreview())return;
  window.localStorage.setItem(DEVICE_LAB_STORAGE_KEY,device);
  window.dispatchEvent(new CustomEvent<DeviceLabDevice>(DEVICE_LAB_CHANGE_EVENT,{detail:device}));
}

export function PlatformDeviceViewButtons({active,onSelect}:{active:DeviceLabDevice;onSelect?:(device:DeviceLabDevice)=>void}){
  return <div className={styles.launcherButtons}>
    {devices.map(([device,label,Icon])=><button key={device} type="button" className={`${styles.deviceButton}${active===device?` ${styles.deviceButtonActive}`:''}`} aria-label={label} title={label} aria-pressed={active===device} onClick={()=>onSelect?onSelect(device):setPlatformDeviceView(device)}><Icon/></button>)}
  </div>;
}

export function PlatformDeviceLabLauncher(){
  const[active,setActive]=useState<DeviceLabDevice>('desktop'),[available,setAvailable]=useState(false);
  useEffect(()=>{
    const syncAvailability=()=>setAvailable(window.self===window.top&&canUsePlatformDevicePreview());
    syncAvailability();
    setActive(normalizeDeviceLabDevice(window.localStorage.getItem(DEVICE_LAB_STORAGE_KEY)));
    const sync=(event:Event)=>{
      if(event instanceof CustomEvent)setActive(normalizeDeviceLabDevice(event.detail));
      else setActive(normalizeDeviceLabDevice(window.localStorage.getItem(DEVICE_LAB_STORAGE_KEY)));
    };
    window.addEventListener(DEVICE_LAB_CHANGE_EVENT,sync);
    window.addEventListener('storage',sync);
    window.addEventListener('resize',syncAvailability);
    return()=>{window.removeEventListener(DEVICE_LAB_CHANGE_EVENT,sync);window.removeEventListener('storage',sync);window.removeEventListener('resize',syncAvailability)};
  },[]);
  if(!available)return null;
  return <section className={styles.launcher} aria-label="Eszköznézet">
    <span className={styles.launcherLabel}>Eszköznézet</span>
    <PlatformDeviceViewButtons active={active}/>
  </section>;
}
