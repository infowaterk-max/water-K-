export const orderStatusLabels: Record<string,string> = {
  draft:'Piszkozat',
  pending:'Függőben',
  pending_payment:'Fizetésre vár',
  pending_transfer:'Átutalásra vár',
  paid:'Fizetve',
  processing:'Feldolgozás alatt',
  shipped:'Átadva a szállítónak',
  completed:'Teljesítve',
  cancelled:'Törölve',
  refunded:'Visszatérítve',
};

export const paymentMethodLabels: Record<string,string> = {
  bank_transfer:'Banki átutalás',
  kh_card:'Online bankkártyás fizetés',
  cash_on_delivery:'Utánvét',
  stripe:'Stripe bankkártya',
  simplepay:'SimplePay bankkártya',
  barion:'Barion bankkártya',
};

export const shippingMethodLabels: Record<string,string> = {
  foxpost:'FOXPOST',
  gls:'GLS',
  mpl:'MPL',
  packeta:'Packeta',
  dpd:'DPD',
  expressone:'Express One',
  pickup:'Személyes átvétel',
  external_logistics:'Külső logisztikai partner',
  external_gls_home:'GLS Házhozszállítás',
  external_mpl_home:'MPL Házhozszállítás',
  external_mpl_automata:'Posta / Csomagautomata',
  external_mpl_postapont:'Postapontok (COOP/MOL)',
  external_foxpost:'FOXPOST',
  external_gls_parcel:'GLS CsomagPont / Automata',
};

const fallbackLabel=(value?:string|null)=>value?value.replace(/[_-]+/g,' ').replace(/^./,c=>c.toLocaleUpperCase('hu-HU')):'—';

export function orderStatusLabel(value?: string|null){ return value ? (orderStatusLabels[value] ?? fallbackLabel(value)) : '—'; }
export function paymentMethodLabel(value?: string|null){ return value ? (paymentMethodLabels[value] ?? fallbackLabel(value)) : '—'; }
export function shippingMethodLabel(value?: string|null){ return value ? (shippingMethodLabels[value] ?? fallbackLabel(value)) : '—'; }

export function orderProgress(status?: string|null){
  const steps=['Rendelés leadva','Fizetés','Feldolgozás','Szállítás','Teljesítve'];
  const active =
    status==='completed' ? 4 :
    status==='shipped' ? 3 :
    status==='processing' ? 2 :
    status==='paid' ? 1 :
    0;
  const terminal = status==='cancelled' || status==='refunded';
  return {steps,active,terminal};
}

export function orderStatusDescription(status?:string|null,paymentMethod?:string|null,shippingMethod?:string|null){
  if(status==='pending_transfer'||(status==='pending'&&paymentMethod==='bank_transfer'))return 'A rendelésed rögzítettük. A feldolgozás a banki átutalás beérkezése után indul.';
  if(status==='pending_payment'||(status==='pending'&&paymentMethod==='kh_card'))return 'A rendelésed rögzítettük, a fizetés visszaigazolására várunk.';
  if(status==='pending')return 'A rendelésed rögzítettük, a következő feldolgozási lépés visszaigazolására várunk.';
  if(status==='paid')return 'A fizetés rendben megérkezett. A rendelés hamarosan feldolgozásba kerül.';
  if(status==='processing'&&shippingMethod==='pickup')return 'A rendelésedet összekészítjük személyes átvételre.';
  if(status==='processing')return 'A rendelésedet összekészítjük a szállításhoz.';
  if(status==='shipped'&&shippingMethod==='pickup')return 'A rendelésed átvehető vagy az átvétel egyeztetése folyamatban van.';
  if(status==='shipped')return 'A csomagot átadtuk a szállítónak. Ha van nyomkövetési azonosító, lent közvetlenül követheted.';
  if(status==='completed')return 'A rendelést teljesítettük. Köszönjük a vásárlást!';
  if(status==='cancelled')return 'Ez a rendelés törölve lett, további feldolgozás nem történik.';
  if(status==='refunded')return 'A rendelés visszatérített állapotban van.';
  return 'A rendelés állapotát itt mindig az aktuális feldolgozási adatok alapján látod.';
}

export function orderNextAction(status?:string|null,paymentMethod?:string|null,shippingMethod?:string|null){
  if(status==='pending_transfer'||(status==='pending'&&paymentMethod==='bank_transfer'))return {title:'Következő lépés',text:'Teljesítsd az átutalást a rendeléshez kapott fizetési adatok szerint. Jóváírás után a rendelés továbbhalad.'};
  if(status==='pending_payment'||(status==='pending'&&paymentMethod==='kh_card'))return {title:'Következő lépés',text:'Ha a fizetést már elvégezted, nincs további teendőd. A szolgáltatói visszaigazolás után frissül a rendelés.'};
  if(status==='paid')return {title:'Nincs teendőd',text:'A fizetés megérkezett; a következő lépés az összekészítés.'};
  if(status==='processing')return {title:'Nincs teendőd',text:shippingMethod==='pickup'?'Az átvételhez készítjük össze a rendelést.':'A csomag feladásra készül.'};
  if(status==='shipped')return {title:shippingMethod==='pickup'?'Átvétel':'Csomagkövetés',text:shippingMethod==='pickup'?'A rendelés az átvételi szakaszban van.':'A nyomkövetési azonosítóval a szállító oldalán követheted a csomagot.'};
  if(status==='completed')return {title:'Újrarendelés',text:'Ha ismét szükséged van a termékekre, egy kattintással visszateheted őket a kosárba.'};
  if(status==='cancelled'||status==='refunded')return {title:'Lezárt rendelés',text:'Ehhez a rendeléshez nincs további automatikus feldolgozási lépés.'};
  return {title:'Rendelés folyamatban',text:'Az állapot változásakor ez az oldal az új információkat mutatja.'};
}

export function trackingProviderUrl(shippingMethod?:string|null){
  if(shippingMethod==='foxpost'||shippingMethod==='external_foxpost')return 'https://foxpost.hu/csomagkovetes/';
  if(shippingMethod==='gls'||shippingMethod==='external_gls_home'||shippingMethod==='external_gls_parcel')return 'https://gls-group.com/HU/hu/csomagkovetes/';
  if(shippingMethod==='mpl'||shippingMethod==='external_mpl_home'||shippingMethod==='external_mpl_automata'||shippingMethod==='external_mpl_postapont')return 'https://www.posta.hu/nyomkovetes/nyitooldal';
  return null;
}

export function orderEventLabel(eventType?:string|null,fromStatus?:string|null,toStatus?:string|null,metadata?:Record<string,unknown>|null){
  if(eventType==='order_created')return 'Rendelés létrehozva';
  if(eventType==='status_changed')return `${orderStatusLabel(fromStatus)} → ${orderStatusLabel(toStatus)}`;
  if(eventType==='invoice_created')return 'Számla elkészült';
  if(eventType==='invoice_reconciled')return 'Számla egyeztetve';
  if(eventType==='invoice_manual_required')return 'Kézi számlázás szükséges';
  if(eventType==='shipment_created')return 'Csomagfeladás létrehozva';
  if(eventType==='payment_started')return 'Fizetés elindítva';
  if(eventType==='payment_retried')return 'Fizetés újraindítva';
  if(eventType==='payment_confirmed')return 'Fizetés hitelesítve';
  if(eventType==='payment_failed')return 'Fizetés sikertelen';
  if(eventType==='payment_cancelled')return 'Fizetés megszakítva';
  if(eventType==='payment_refunded')return 'Fizetés visszatérítve';
  if(eventType==='logistics_order_email_sent')return 'Logisztikai partner értesítve';
  if(eventType==='email_sent'){
    const template=String(metadata?.template??'');
    if(template==='order_confirmation')return 'Rendelési visszaigazolás elküldve';
    if(template==='payment_confirmed')return 'Fizetési visszaigazolás elküldve';
    if(template==='order_shipped')return 'Szállítási értesítés elküldve';
    if(template==='order_completed')return 'Teljesítési értesítés elküldve';
    return 'E-mail értesítés elküldve';
  }
  return 'Rendelés frissítve';
}
