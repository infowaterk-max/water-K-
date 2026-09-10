'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

type Props={officeEmail:boolean;canChat:boolean;advancedEmail:boolean};

export function DigitalOfficeNavigation({officeEmail,canChat,advancedEmail}:Props){
  const pathname=usePathname();
  const items=[
    ...(officeEmail?[{href:'/admin/kommunikacio/iroda',label:'Ügyféllevelezés'}]:[]),
    ...(canChat?[{href:'/admin/kommunikacio/chat',label:'Team Chat'}]:[]),
    ...(advancedEmail?[{href:'/admin/kommunikacio/felugyelet',label:'Küldési központ'}]:[]),
    ...(officeEmail?[{href:'/admin/kommunikacio/tiltolista',label:'Tiltólista'}]:[]),
  ];
  const active=(href:string)=>pathname===href||pathname.startsWith(`${href}/`);

  return <div className="digitalOfficeWorkspaceBar">
    <div className="digitalOfficeWorkspaceBrand">
      <span className="digitalOfficeWorkspaceMark" aria-hidden="true">DI</span>
      <div><strong>Digitális Iroda</strong><small>Kommunikációs munkatér</small></div>
    </div>
    <nav className="digitalOfficeWorkspaceTabs" aria-label="Digitális Iroda nézetek">
      {items.map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?'page':undefined}>{item.label}</Link>)}
    </nav>
  </div>;
}
