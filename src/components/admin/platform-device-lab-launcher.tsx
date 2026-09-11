'use client';

import{useEffect,useState,type ReactNode}from'react';
import{usePathname,useRouter}from'next/navigation';
import styles from'./platform-device-lab.module.css';
import{DEVICE_LAB_ROUTE,normalizeDeviceLabDevice,normalizeDeviceLabTarget,type DeviceLabDevice}from'@/lib/platform/device-lab';

function DesktopIcon(){return <svg viewBox="0 0 28 24" aria-hidden="true"><rect x="3" y="3.5" width="22" height="14" rx="2.2"/><path d="M10 21h8M14 17.5V21"/></svg>}
function TabletIcon(){return <svg viewBox="0 0 28 24" aria-hidden="true"><rect x="2.5" y="4.2" width="23" height="15.6" rx="2.8"/><circle cx="14" cy="6.5" r=".65"/></svg>}
function MobileIcon(){return <svg viewBox="0 0 28 24" aria-hidden="true"><rect x="8.7" y="2.4" width="10.6" height="19.2" rx="2.7"/><path d="M12.2 5h3.6M13.2 18.9h1.6"/></svg>}

const devices:[DeviceLabDevice,string,()=>ReactNode][]=[
  ['desktop','Asztali nézet',DesktopIcon],
  ['tablet','Táblagépes nézet',TabletIcon],
  ['mobile','Mobilnézet',MobileIcon],
];

function currentTarget(pathname:string){
  if(typeof window==='undefined')return normalizeDeviceLabTarget(pathname);
  if(pathname===DEVICE_LAB_ROUTE){
    return normalizeDeviceLabTarget(new URLSearchParams(window.location.search).get('target'));
  }
  return normalizeDeviceLabTarget(`${pathname}${window.location.search}${window.location.hash}`);
}

export function PlatformDeviceLabLauncher(){
  const pathname=usePathname()||'/admin/platform',router=useRouter();
  const[active,setActive]=useState<DeviceLabDevice|null>(null);
  useEffect(()=>{
    const sync=()=>setActive(pathname===DEVICE_LAB_ROUTE?normalizeDeviceLabDevice(new URLSearchParams(window.location.search).get('device')):null);
    sync();window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);
  },[pathname]);
  const open=(device:DeviceLabDevice)=>{
    const params=new URLSearchParams({device,target:currentTarget(pathname)});
    setActive(device);router.push(`${DEVICE_LAB_ROUTE}?${params.toString()}`);
  };
  return <section className={styles.launcher} aria-label="Responsive Device Lab">
    <span className={styles.launcherLabel}>Eszköznézet</span>
    <div className={styles.launcherButtons}>
      {devices.map(([device,label,Icon])=><button key={device} type="button" className={`${styles.deviceButton}${active===device?` ${styles.deviceButtonActive}`:''}`} aria-label={label} title={label} aria-pressed={active===device} onClick={()=>open(device)}><Icon/></button>)}
    </div>
  </section>;
}
