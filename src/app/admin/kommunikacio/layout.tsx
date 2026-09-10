import './communication-app-final.css';
import './mobile-desktop-compat.css';
import './chat-dock-overflow-fix.css';
import type {ReactNode} from 'react';
import {AdminMobileDesktopCompat} from '@/components/admin/admin-mobile-desktop-compat';
import {DigitalOfficeMobileController} from '@/components/admin/digital-office-mobile-controller';
import {DigitalOfficeNavigation} from '@/components/navigation/digital-office-navigation';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {hasStoreCapability} from '@/lib/auth/store-capabilities';
import {getCurrentWebshopInstance} from '@/lib/instances/access';
import {hasCurrentPlanFeature} from '@/lib/plans/access';

export default async function DigitalOfficeLayout({children}:{children:ReactNode}){
  const[officeEmail,advancedEmail,teamChat,actor,instance]=await Promise.all([
    hasCurrentPlanFeature('officeCommunication'),
    hasCurrentPlanFeature('officeCommunicationAdvanced'),
    hasCurrentPlanFeature('teamChat'),
    getAdminRequestUser(),
    getCurrentWebshopInstance(),
  ]);

  let canChat=false;
  if(teamChat&&actor&&instance){
    canChat=await hasStoreCapability(instance.id,actor.id,'office.internal_chat',{
      resourceOwnerUserId:actor.id,
      resourceAssignedUserId:actor.id,
    });
  }

  return <div className="digitalOfficeShell">
    <AdminMobileDesktopCompat/>
    <DigitalOfficeNavigation officeEmail={officeEmail} canChat={canChat} advancedEmail={advancedEmail}/>
    <DigitalOfficeMobileController/>
    {children}
  </div>;
}
