import{PlatformDeviceLab}from'@/components/admin/platform-device-lab';
import{requirePlatformOperator}from'@/lib/auth/platform-operator';
import{normalizeDeviceLabDevice,normalizeDeviceLabTarget}from'@/lib/platform/device-lab';

type SearchValue=string|string[]|undefined;
type Props={searchParams:Promise<Record<string,SearchValue>>};
const first=(value:SearchValue)=>Array.isArray(value)?value[0]:value;

export default async function PlatformDeviceLabPage({searchParams}:Props){
  await requirePlatformOperator();
  const params=await searchParams;
  const device=normalizeDeviceLabDevice(first(params.device));
  const target=normalizeDeviceLabTarget(first(params.target));
  return <PlatformDeviceLab device={device} target={target}/>;
}
