import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {WorkforceCredentialForm} from '@/lib/auth/workforce-credential-form';
import {normalizeWorkforceReturnTarget} from '@/lib/auth/workforce-return-target';

export const metadata:Metadata={
  title:'Shoperation workforce jelszó',
  description:'Workforce meghívás és jelszó-visszaállítás.',
  robots:{index:false,follow:false},
};

type Props={searchParams:Promise<{flow?:string|string[];next?:string|string[]}>};

const first=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;

export default async function WorkforceCredentialPage({searchParams}:Props){
  const query=await searchParams;
  const flow=first(query.flow);
  if(flow!=='invite'&&flow!=='recovery')notFound();
  const returnTo=normalizeWorkforceReturnTarget(first(query.next))??'/admin';
  return <main className="section accountPage">
    <div className="shell">
      <span className="eyebrow">Shoperation Workforce</span>
      <h1 className="sectionTitle">{flow==='invite'?'Munkatársi meghívás befejezése':'Új workforce jelszó beállítása'}</h1>
      <WorkforceCredentialForm flow={flow} returnTo={returnTo}/>
    </div>
  </main>;
}
