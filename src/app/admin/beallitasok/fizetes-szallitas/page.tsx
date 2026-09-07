import Link from 'next/link';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { getCommerceProviders,type CommerceProviderType,isProviderCheckoutReady } from '@/lib/commerce/providers';
import { configuredEnvironmentFields,getProviderGuide } from '@/lib/commerce/onboarding';
import { getCommunicationIdentity } from '@/lib/communication/identity';
import { updateCommerceProviderAction,verifyCommerceProviderAction } from './actions';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{tab?:string;provider?:string}>};
const modeLabel={manual:'Kézi mód',api:'API integráció',builtin:'Beépített integráció',custom:'Egyedi API'} as const;
const stepLabel={selection:'Szolgáltató kiválasztása',contract:'Szerződés',credentials:'Hitelesítő adatok',verification:'Kapcsolatellenőrzés',ready:'Használatra kész'} as const;

function environmentLabel(code:string){if(code==='stripe')return process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')?'Éles':'Teszt';if(code==='simplepay')return process.env.SIMPLEPAY_ENV==='live'?'Éles':'Sandbox';if(code==='barion')return process.env.BARION_ENV==='live'?'Éles':'Sandbox';if(code==='kh_card')return process.env.KH_ENVIRONMENT==='live'?'Éles':'Teszt';return null}
function resolveType(tab?:string):CommerceProviderType{if(tab==='szallitas')return'shipping';if(tab==='szamlazas')return'invoice';return'payment'}
function tabValue(type:CommerceProviderType){if(type==='shipping')return'szallitas';if(type==='invoice')return'szamlazas';return'fizetes'}
function titleFor(type:CommerceProviderType){if(type==='shipping')return'Szállítási módok';if(type==='invoice')return'Számlázás';return'Fizetési módok'}
function providerHref(type:CommerceProviderType,provider:string){const params=new URLSearchParams({tab:tabValue(type),provider});return`/admin/beallitasok/fizetes-szallitas?${params.toString()}`}

export default async function Page({searchParams}:Props){
  await requireCurrentStoreContext('store.manage');
  const q=await searchParams,type=resolveType(q.tab);
  const[providerResult,identity]=await Promise.all([
    getCommerceProviders(type,{throwOnError:true}).then(data=>({data,error:false})).catch(()=>({data:[],error:true})),
    getCommunicationIdentity(),
  ]);
  const providers=providerResult.data,loadError=providerResult.error;
  const selectedProvider=providers.find(provider=>provider.code===q.provider)??null;
  const guide=selectedProvider?getProviderGuide(selectedProvider.code,selectedProvider.connectionMode):null;
  const present=guide?configuredEnvironmentFields(guide.requirements):[];
  const externalLogistics=selectedProvider?.adapterKey==='external_logistics_email';
  const logisticsEmail=String(selectedProvider?.configuration.logistics_email??'');
  const bankTransfer=selectedProvider?.code==='bank_transfer';
  const bankAccountHolder=String(selectedProvider?.configuration.account_holder??'');
  const bankName=String(selectedProvider?.configuration.bank_name??'');
  const bankAccount=String(selectedProvider?.configuration.bank_account??'');
  const transferNote=String(selectedProvider?.configuration.transfer_note??'');
  const bankTransferComplete=bankAccountHolder.trim().length>=2&&/^[A-Z0-9]{8,34}$/.test(bankAccount.replace(/[\s-]+/g,'').toUpperCase());
  const complete=selectedProvider&&guide?(externalLogistics?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(logisticsEmail):bankTransfer?bankTransferComplete:(guide.requirements.length===0||present.length===guide.requirements.length)):false;
  const ready=selectedProvider?isProviderCheckoutReady(selectedProvider):false;
  const environment=selectedProvider?environmentLabel(selectedProvider.code):null;
  const callbackUrl=selectedProvider?.type==='payment'&&selectedProvider.paymentFlow==='online_redirect'?`${identity.siteUrl}/api/payments/${selectedProvider.code}/webhook`:null;
  const readyLabel=selectedProvider?.type==='invoice'?'Automatikus számlázásra kész':externalLogistics?'E-mailes teljesítés kész':'Pénztárban használható';

  return <section className="adminMain">
    <span className="eyebrow">Shoperation · Beállítások</span>
    <h1 className="sectionTitle">{titleFor(type)}</h1>
    <p className="lead">Előbb válassz szolgáltatót. A szerződés, hitelesítő adatok, ellenőrzés és aktiválás részletei csak a kiválasztott szolgáltatónál nyílnak meg.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A szolgáltatói beállítások most nem tölthetők be.</strong> Fizetési, szállítási vagy számlázási kapcsolatot addig nem módosítunk.</div>}
    <div className="actions">
      <Link className={`btn ${type==='payment'?'btnPrimary':'btnGhost'}`} href="/admin/beallitasok/fizetes-szallitas?tab=fizetes">Fizetési módok</Link>
      <Link className={`btn ${type==='shipping'?'btnPrimary':'btnGhost'}`} href="/admin/beallitasok/fizetes-szallitas?tab=szallitas">Szállítási módok</Link>
      <Link className={`btn ${type==='invoice'?'btnPrimary':'btnGhost'}`} href="/admin/beallitasok/fizetes-szallitas?tab=szamlazas">Számlázás</Link>
    </div>
    {type==='payment'&&<div className="card"><strong>Egységes fizetési callback</strong><p className="muted">Az online szolgáltatók saját adapteren keresztül ugyanabba a Shoperation fizetési eseményrendszerbe érkeznek. A provider URL mintája:</p><code>{identity.siteUrl}/api/payments/&lt;szolgáltató&gt;/webhook</code></div>}
    {type==='invoice'&&<div className="card"><strong>Automatikus számlázás</strong><p className="muted">Sikeres és ellenőrzött számlázókapcsolat esetén a Shoperation a rendelési folyamatból automatikusan készíti a számlázási munkát. Ha nincs aktív adapter, a rendszer kézi számlázási figyelmeztetést hagy a rendelésen.</p></div>}

    {!loadError&&<section className="card">
      <div className="adminToolbar"><div><span className="eyebrow">1. lépés</span><h2>Válassz szolgáltatót</h2></div>{selectedProvider&&<Link className="btn btnGhost" href={`/admin/beallitasok/fizetes-szallitas?tab=${tabValue(type)}`}>Szolgáltatóváltás</Link>}</div>
      <p className="muted">Ezen a szinten csak a választáshoz szükséges összefoglaló látszik. A technikai részletek nem terhelik a képernyőt addig, amíg nincs kiválasztott szolgáltató.</p>
      <div className="cards">{providers.map(provider=>{const providerReady=isProviderCheckoutReady(provider),selected=provider.code===selectedProvider?.code;return <article className="card" key={provider.code}><div className="adminToolbar"><div><span className="badge">{modeLabel[provider.connectionMode]}</span><h3>{provider.displayLabel??provider.name}</h3></div><span className="badge">{providerReady?'Használatra kész':provider.enabled?'Beállítás alatt':'Kikapcsolva'}</span></div><p className="muted">{provider.name}</p><Link className={`btn ${selected?'btnPrimary':'btnGhost'}`} href={providerHref(type,provider.code)} aria-current={selected?'page':undefined}>{selected?'Kiválasztva · részletek lent':'Kiválasztás és beállítás'}</Link></article>})}</div>
      {!providers.length&&<p className="muted">Ehhez a kategóriához jelenleg nincs választható szolgáltató.</p>}
    </section>}

    {selectedProvider&&guide&&<article className="card">
      <div className="adminToolbar"><div><span className="eyebrow">2. lépés · kiválasztott szolgáltató</span><span className="badge">{modeLabel[selectedProvider.connectionMode]}</span><h2>{selectedProvider.name}</h2></div><span className="badge">{ready?readyLabel:selectedProvider.connectionStatus==='error'?'Kapcsolati hiba':selectedProvider.enabled&&complete?'Hitelesítésre vár':selectedProvider.enabled?'Beállítás szükséges':'Nincs bekapcsolva'}</span></div>
      {environment&&<p><span className="badge">{environment} környezet</span></p>}
      <p className="muted">{guide.contract}</p>
      <div className="card"><strong>Bekötési folyamat · {stepLabel[selectedProvider.onboardingStep]}</strong>{externalLogistics?<p className="muted">Nincs szükség futárcéges API-szerződésre. A partner a rendelési adatokat tranzakciós e-mailben kapja meg.</p>:guide.requirements.length===0?<p className="muted">Nincs szükség API-kulcsra.</p>:<ul>{guide.requirements.map(requirement=><li key={requirement.key}>{present.includes(requirement.key)?'✓':'○'} {requirement.label}{requirement.secret?' · titkos adat':''}</li>)}</ul>}<p className="muted">{externalLogistics?'A mód akkor használható, ha érvényes logisztikai partner e-mail cím van beállítva.':guide.verification}</p>{guide.notes&&<p className="muted">{guide.notes}</p>}{callbackUrl&&<><strong>Callback / webhook URL</strong><p><code>{callbackUrl}</code></p></>}{selectedProvider.lastTestMessage&&<><strong>Legutóbbi kapcsolatellenőrzés</strong><p className="muted">{selectedProvider.lastTestMessage}{selectedProvider.lastTestedAt?` · ${new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(selectedProvider.lastTestedAt))}`:''}</p></>}</div>
      <form action={updateCommerceProviderAction} className="adminForm"><input type="hidden" name="providerCode" value={selectedProvider.code}/><label>Adminban megjelenő név<input name="displayLabel" defaultValue={selectedProvider.displayLabel??selectedProvider.name}/></label>{type==='shipping'&&<label>Szállítási díj (Ft)<input name="feeHuf" type="number" min="0" defaultValue={selectedProvider.feeHuf??0}/></label>}{externalLogistics&&<label>Logisztikai partner e-mail<input name="logisticsEmail" type="email" required defaultValue={logisticsEmail} placeholder="raktar@partner.hu"/></label>}{bankTransfer&&<div className="card"><strong>Átutalási adatok</strong><p className="muted">Ezek nem titkos API-adatok: a vásárló a rendelési visszaigazolásban és a sikeres rendelési oldalon látja őket.</p><label>Kedvezményezett neve<input name="bankAccountHolder" required defaultValue={bankAccountHolder} placeholder="Cégnév / számlatulajdonos"/></label><label>Bank neve<input name="bankName" defaultValue={bankName} placeholder="Bank neve (opcionális)"/></label><label>Bankszámlaszám / IBAN<input name="bankAccount" required defaultValue={bankAccount} placeholder="HU00 0000 0000 0000 0000 0000 0000"/></label><label>További átutalási tájékoztató<textarea name="transferNote" rows={3} defaultValue={transferNote} placeholder="Pl. feldolgozás 1–2 munkanap"/></label></div>}<div className="actions"><button className="btn btnPrimary" name="enabled" value={selectedProvider.enabled?'true':'false'}>Beállítások mentése</button><button className="btn btnGhost" name="enabled" value={selectedProvider.enabled?'false':'true'}>{selectedProvider.enabled?'Kikapcsolás':'Bekapcsolás'}</button></div></form>
      {selectedProvider.enabled&&selectedProvider.connectionMode!=='manual'&&<form action={verifyCommerceProviderAction}><input type="hidden" name="providerCode" value={selectedProvider.code}/><button className="btn btnGhost">Kapcsolat ellenőrzése</button></form>}
      <p className="muted">A titkos API-kulcsok nem jelennek meg és nem kerülnek böngészőbe vagy adatbázis-konfigurációba; kizárólag szerveroldali titokként kezeljük őket.</p>
    </article>}
  </section>;
}
