import{requirePlatformOperator}from'@/lib/auth/platform-operator';
import{PlatformIncidentCenter}from'@/components/admin/platform-incident-center';

export const dynamic='force-dynamic';

export default async function PlatformIncidentPage(){
  await requirePlatformOperator();
  return <section className="adminMain">
    <span className="eyebrow">Shoperation · Platform Incident Intelligence</span>
    <h1 className="sectionTitle">Incidensközpont</h1>
    <p className="lead">Egy helyen jelennek meg a vásárlói, webshop-tulajdonosi és rendszereredetű technikai incidensek. A besorolás és minden javítási javaslat auditált; innen közvetlen production kódmódosítás nem indítható.</p>
    <PlatformIncidentCenter/>
  </section>;
}
