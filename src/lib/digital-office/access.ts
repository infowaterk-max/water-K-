import 'server-only';
import {cache} from 'react';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {hasStoreCapability} from '@/lib/auth/store-capabilities';
import {getActiveStoreRoles,roleHasPermission} from '@/lib/auth/store-rbac';
import {getPlatformRole} from '@/lib/auth/platform-operator';
import {getFeatureEntitlementDecisions} from '@/lib/entitlements/access';
import {isCapabilityReleased} from '@/lib/entitlements/catalog';
import {getCurrentWebshopInstance} from '@/lib/instances/access';

const DIGITAL_OFFICE_FEATURES=['officeCommunication','officeCommunicationAdvanced','support','teamChat'] as const;

/**
 * Request-scoped Digital Office access snapshot.
 *
 * This only deduplicates reads inside one React Server Component request. It does
 * not persist authorization decisions between requests/users and does not relax
 * any auth, tenant, RBAC, capability or entitlement gate.
 */
export const getDigitalOfficeAccess=cache(async()=>{
  const actor=await getAdminRequestUser();
  if(!actor)return null;

  const instance=await getCurrentWebshopInstance();
  if(!instance)return null;

  const[platformRole,roles,featureDecisions]=await Promise.all([
    getPlatformRole(),
    getActiveStoreRoles(instance.id),
    getFeatureEntitlementDecisions(instance.id,DIGITAL_OFFICE_FEATURES),
  ]);

  const featureEnabled=(code:typeof DIGITAL_OFFICE_FEATURES[number])=>
    isCapabilityReleased(code)&&featureDecisions.get(code)?.enabled===true;

  const officeEmail=featureEnabled('officeCommunication');
  const advancedEmail=featureEnabled('officeCommunicationAdvanced');
  const supportEnabled=featureEnabled('support');
  const teamChat=featureEnabled('teamChat');
  const canSupport=roles.some(role=>roleHasPermission(role,'support.manage'));
  const canMarketing=roles.some(role=>roleHasPermission(role,'marketing.manage'));
  const canChat=teamChat&&await hasStoreCapability(instance.id,actor.id,'office.internal_chat',{
    resourceOwnerUserId:actor.id,
    resourceAssignedUserId:actor.id,
  });

  return{
    actor,
    scope:{
      instanceId:instance.id,
      organizationId:instance.organizationId,
      slug:instance.slug,
      isPlatform:Boolean(platformRole),
    },
    officeEmail,
    advancedEmail,
    supportEnabled,
    teamChat,
    canSupport,
    canMarketing,
    canChat,
  };
});
