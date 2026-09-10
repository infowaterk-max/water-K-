'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

type Props={officeEmail:boolean;canChat:boolean;advancedEmail:boolean;canSupport:boolean;canMarketing:boolean};
type Item={href:string;label:string;match?:string;exact?:boolean};

export function DigitalOfficeNavigation({officeEmail,canChat,advancedEmail,canSupport,canMarketing}:Props){
  const pathname=usePathname();
  const items:Item[]=[
    {href:'/admin/kommunikacio',label:'Kezdőlap',exact:true},
    ...(officeEmail&&canSupport?[{href:'/admin/kommunikacio/iroda',label:'E-mail',match:'/admin/kommunikacio/iroda'}]:[]),
    ...(canChat?[{href:'/admin/kommunikacio/chat',label:'Team Chat',match:'/admin/kommunikacio/chat'}]:[]),
    ...(officeEmail&&canSupport?[{href:'/admin/kommunikacio#feladatok',label:'Feladatok'}]:[]),
    ...(advancedEmail&&canMarketing?[{href:'/admin/kommunikacio/felugyelet?status=approval',label:'Jóváhagyások'}]:[]),
    ...(advancedEmail&&canMarketing?[{href:'/admin/kommunikacio/felugyelet',label:'Küldési központ',match:'/admin/kommunikacio/felugyelet'}]:[]),
    ...(canMarketing?[{href:'/admin/email-sablonok',label:'E-mail sablonok',match:'/admin/email-sablonok'}]:[]),
  ];
  const active=(item:Item)=>item.exact?pathname==='/admin/kommunikacio':Boolean(item.match&&(pathname===item.match||pathname.startsWith(`${item.match}/`)));

  return <div className="digitalOfficeWorkspaceBar">
    <Link href="/admin/kommunikacio" className="digitalOfficeWorkspaceBrand" aria-label="Digitális Iroda kezdőlap">
      <span className="digitalOfficeWorkspaceMark" aria-hidden="true">DI</span>
      <div><strong>Digitális Iroda</strong><small>Kommunikációs munkatér</small></div>
    </Link>
    <nav className="digitalOfficeWorkspaceTabs" aria-label="Digitális Iroda nézetek">
      {items.map(item=><Link key={item.href} href={item.href} aria-current={active(item)?'page':undefined}>{item.label}</Link>)}
    </nav>
  </div>;
}
