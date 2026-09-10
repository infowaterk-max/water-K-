import './communication-app-final.css';
import './mobile-desktop-compat.css';
import './digital-office-height-final.css';
import './digital-office-workspace-redesign.css';
import './digital-office-context-redesign.css';
import './team-chat-composer-hardening.css';
import type {ReactNode} from 'react';
import {AdminMobileDesktopCompat} from '@/components/admin/admin-mobile-desktop-compat';
import {DigitalOfficeMobileController} from '@/components/admin/digital-office-mobile-controller';
import {DigitalOfficeNavigation} from '@/components/navigation/digital-office-navigation';
import {getDigitalOfficeAccess} from '@/lib/digital-office/access';

export default async function DigitalOfficeLayout({children}:{children:ReactNode}){
  const access=await getDigitalOfficeAccess();

  return <div className="digitalOfficeShell">
    <AdminMobileDesktopCompat/>
    <DigitalOfficeNavigation
      officeEmail={access?.officeEmail??false}
      canChat={access?.canChat??false}
      advancedEmail={access?.advancedEmail??false}
      canSupport={access?.canSupport??false}
      canMarketing={access?.canMarketing??false}
    />
    <DigitalOfficeMobileController/>
    {children}
  </div>;
}
