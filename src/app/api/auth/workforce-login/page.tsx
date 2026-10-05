import type { Metadata } from 'next';
import { WorkforceAuthForm } from '@/lib/auth/workforce-auth-form';
import { normalizeStorefrontReturnTarget } from '@/lib/auth/storefront-return-target';
import { parseWorkforceSensitiveBoundary } from '@/lib/auth/workforce-assurance-policy';

export const metadata:Metadata={
  title:'Shoperation staff belépés',
  description:'Biztonságos staff és admin belépés.',
  robots:{index:false,follow:false},
};

type Props={searchParams:Promise<{next?:string|string[];boundary?:string|string[]}>};

export default async function StaffLoginPage({searchParams}:Props){
  const query=await searchParams;
  const rawNext=Array.isArray(query.next)?query.next[0]:query.next;
  const normalized=normalizeStorefrontReturnTarget(rawNext);
  const returnTo=normalized&&(normalized==='/admin'||normalized.startsWith('/admin/'))?normalized:'/admin';

  const rawBoundary=Array.isArray(query.boundary)?query.boundary[0]:query.boundary;
  const parsedBoundary=parseWorkforceSensitiveBoundary(rawBoundary);
  const boundary=parsedBoundary??'none';

  return <main className="section accountPage">
    <div className="shell">
      <span className="eyebrow">Shoperation Workforce</span>
      <h1 className="sectionTitle">Staff és admin belépés</h1>
      <p className="lead">A jelszavas azonosítás után a Shoperation a munkaköri jogosultságodhoz tartozó hitelesítési szintet kéri. A vásárlói fiók ettől külön marad.</p>
      <WorkforceAuthForm returnTo={returnTo} boundary={boundary}/>
    </div>
  </main>;
}
