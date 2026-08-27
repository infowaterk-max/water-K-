export const orderStatusLabels: Record<string,string> = {
  draft:'Piszkozat', pending:'Függőben', paid:'Fizetve', processing:'Feldolgozás alatt', shipped:'Átadva a futárnak', completed:'Teljesítve', cancelled:'Törölve', refunded:'Visszatérítve'
};

export const paymentMethodLabels: Record<string,string> = {
  bank_transfer:'Banki átutalás', kh_card:'Online bankkártyás fizetés', cash_on_delivery:'Utánvét'
};

export const shippingMethodLabels: Record<string,string> = {
  foxpost:'FOXPOST', gls:'GLS', mpl:'MPL', pickup:'Személyes átvétel'
};

export function orderStatusLabel(value?: string|null){ return value ? (orderStatusLabels[value] ?? value) : '—'; }
export function paymentMethodLabel(value?: string|null){ return value ? (paymentMethodLabels[value] ?? value) : '—'; }
export function shippingMethodLabel(value?: string|null){ return value ? (shippingMethodLabels[value] ?? value) : '—'; }

export function orderProgress(status?: string|null){
  const steps=['Rendelés leadva','Fizetés','Feldolgozás','Szállítás','Teljesítve'];
  const active = status==='completed' ? 4 : status==='shipped' ? 3 : status==='processing' ? 2 : status==='paid' ? 1 : 0;
  const terminal = status==='cancelled' || status==='refunded';
  return {steps,active,terminal};
}
