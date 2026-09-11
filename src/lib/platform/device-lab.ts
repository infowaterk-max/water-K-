export type DeviceLabDevice='desktop'|'tablet'|'mobile';

export const DEVICE_LAB_ROUTE='/admin/platform/device-lab';
export const DEVICE_LAB_DEFAULT_TARGET='/admin/platform';
export const DEVICE_LAB_PREVIEW_QUERY='__shoperation_device_preview';

export const DEVICE_LAB_PRESETS={
  desktop:{label:'Asztali',width:1440,height:900},
  tablet:{label:'Táblagép',width:768,height:1024},
  mobile:{label:'Mobil',width:390,height:844},
} as const satisfies Record<DeviceLabDevice,{label:string;width:number;height:number}>;

export function normalizeDeviceLabDevice(value:string|null|undefined):DeviceLabDevice{
  if(value==='tablet'||value==='mobile')return value;
  return'desktop';
}

export function normalizeDeviceLabTarget(value:string|null|undefined){
  if(!value||value.length>2048)return DEVICE_LAB_DEFAULT_TARGET;
  try{
    const base=new URL('https://device-lab.internal');
    const parsed=new URL(value,base);
    const isInternal=parsed.origin===base.origin;
    const isAdmin=parsed.pathname==='/admin'||parsed.pathname.startsWith('/admin/');
    const isRecursive=parsed.pathname===DEVICE_LAB_ROUTE||parsed.pathname.startsWith(`${DEVICE_LAB_ROUTE}/`);
    if(!isInternal||!isAdmin||isRecursive)return DEVICE_LAB_DEFAULT_TARGET;
    parsed.searchParams.delete(DEVICE_LAB_PREVIEW_QUERY);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }catch{
    return DEVICE_LAB_DEFAULT_TARGET;
  }
}

export function buildDeviceLabPreviewSrc(target:string){
  const normalized=normalizeDeviceLabTarget(target);
  const parsed=new URL(normalized,'https://device-lab.internal');
  parsed.searchParams.set(DEVICE_LAB_PREVIEW_QUERY,'1');
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
