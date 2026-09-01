import 'server-only';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getPlatformRole } from '@/lib/auth/platform-operator';
import { hasStorePermission, type StorePermission } from '@/lib/auth/store-rbac';

export type StoreContext={instanceId:string;organizationId:string|null;slug:string;isPlatform:boolean};

export async function getCurrentStoreContext():Promise<StoreContext|null>{
  const [instance,platformRole]=await Promise.all([getCurrentWebshopInstance(),getPlatformRole()]);
  if(!instance)return null;
  return {instanceId:instance.id,organizationId:instance.organizationId,slug:instance.slug,isPlatform:Boolean(platformRole)};
}

export async function requireCurrentStoreContext(permission?:StorePermission):Promise<StoreContext>{
  const context=await getCurrentStoreContext();
  if(!context)throw new Error('Nincs aktív webshop kontextus.');
  if(permission&&!context.isPlatform&&!(await hasStorePermission(context.instanceId,permission)))throw new Error('Nincs jogosultság ehhez a webshop művelethez.');
  return context;
}

export function assertSameStore(expectedInstanceId:string,actualInstanceId:string|null|undefined){
  if(!actualInstanceId||actualInstanceId!==expectedInstanceId)throw new Error('Tenant scope mismatch.');
}
