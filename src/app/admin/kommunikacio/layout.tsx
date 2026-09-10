import './communication-app-final.css';
import './mobile-desktop-compat.css';
import './digital-office-height-final.css';
import './digital-office-workspace-redesign.css';
import './digital-office-context-redesign.css';
import './team-chat-composer-hardening.css';
import './digital-office-performance-hardening.css';
import {Suspense,type ReactNode} from 'react';
import {AdminMobileDesktopCompat} from '@/components/admin/admin-mobile-desktop-compat';
import {DigitalOfficeMobileController} from '@/components/admin/digital-office-mobile-controller';
import {DigitalOfficeNavigation} from '@/components/navigation/digital-office-navigation';
import {getDigitalOfficeAccess} from '@/lib/digital-office/access';

async function DigitalOfficeAuthorizedNavigation(){
  const access=await getDigitalOfficeAccess();
  return <DigitalOfficeNavigation
    officeEmail={access?.officeEmail??false}
    canChat={access?.canChat??false}
    advancedEmail={access?.advancedEmail??false}
    canSupport={access?.canSupport??false}
    canMarketing={access?.canMarketing??false}
  />;
}

function DigitalOfficeNavigationFallback(){
  return <div className="digitalOfficeWorkspaceBar digitalOfficeWorkspaceBarLoading" aria-hidden="true">
    <div className="digitalOfficeWorkspaceBrand">
      <span className="digitalOfficeWorkspaceMark">DI</span>
      <div><strong>Digitális Iroda</strong><small>Kommunikációs munkatér</small></div>
    </div>
    <div className="digitalOfficeWorkspaceTabsSkeleton"><i/><i/><i/><i/></div>
  </div>;
}

export default function DigitalOfficeLayout({children}:{children:ReactNode}){
  return <div className="digitalOfficeShell">
    <AdminMobileDesktopCompat/>
    <Suspense fallback={<DigitalOfficeNavigationFallback/>}>
      <DigitalOfficeAuthorizedNavigation/>
    </Suspense>
    <DigitalOfficeMobileController/>
    {children}
  </div>;
}
