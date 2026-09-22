import Link from 'next/link';
import type {CommerceRecoveryAccountModel} from '@/lib/commerce/commerce-automation-recovery';

export function CommerceRecoveryPanel({model,loadError}:{model:CommerceRecoveryAccountModel;loadError:boolean}){
  return <section className="featurePanel" id="naprakesz" data-commerce-recovery-version={model.engineVersion}>
    <div className="sectionIntro"><div><span className="eyebrow">Naprakész</span><h2>Folytatás és újravásárlás</h2><p className="muted">Mentett kosár, aktuális utánpótlási folyamatok és korábbi vásárlások egy helyen. A rendelés véglegesítése előtt mindig az aktuális ár, készlet és rendelési szabály érvényes.</p></div></div>
    {loadError?<div className="errorNotice" role="alert"><strong>A vásárlási folyamatok egy része most nem tölthető be.</strong><p>Nem mutatunk üres állapotot olyan adatra, amelynek betöltése hibás volt.</p></div>:null}
    {!loadError&&model.activeProcesses.length===0?<div className="accountEmptyState"><h3>Nincs félbehagyott vagy esedékes folyamat.</h3><p className="muted">Ha lesz mentett kosár vagy valós utánpótlási jelzés, itt jelenik meg.</p></div>:null}
    {model.activeProcesses.length?<div className="cards accountFeatureGrid" id="ujrarendeles">{model.activeProcesses.map(process=><article className="card" key={process.id}><span className="badge">{process.kind==='saved-checkout'?'Mentett kosár':process.kind==='replenishment'?'Utánpótlás':process.kind==='post-purchase'?'Vásárlás után':'Visszatérés'}</span><h3>{process.title}</h3><p className="muted">{process.detail}</p>{process.href&&process.actionLabel?<Link className="textLink" href={process.href}>{process.actionLabel}</Link>:null}</article>)}</div>:null}
    <div className="sectionIntro" id="korabbi-vasarlasok"><div><span className="eyebrow">Korábban vásárolt</span><h3>Gyors visszatalálás</h3></div></div>
    {model.recentlyPurchased.length?<div className="cards accountFeatureGrid">{model.recentlyPurchased.slice(0,8).map(item=><article className="card" key={`${item.orderId}:${item.variantId}`}><strong>{item.label}</strong><p className="muted">Korábbi mennyiség: {item.quantity} db · {new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(item.purchasedAt))}</p>{item.href?<Link className="textLink" href={item.href}>Korábbi rendelés megnyitása</Link>:null}</article>)}</div>:!loadError?<p className="muted">Még nincs korábbi vásárlás, amelyből visszatérési lehetőséget tudnánk mutatni.</p>:null}
    <p className="muted"><small>Az újrarendelés nem előfizetés: nincs automatikus ismétlődő rendelés vagy terhelés, és nincs csendes termék- vagy mennyiségcsere.</small></p>
  </section>;
}
