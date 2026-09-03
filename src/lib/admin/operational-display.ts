import { orderStatusLabel } from '@/lib/order-display';

export const humanizeCode=(value?:string|null)=>{
  if(!value)return '—';
  return value.replace(/[._-]+/g,' ').replace(/\b\p{L}/gu,match=>match.toLocaleUpperCase('hu-HU'));
};

const map=(value:string|null|undefined,labels:Record<string,string>)=>value?(labels[value]??humanizeCode(value)):'—';

export const severityLabels:Record<string,string>={
  critical:'Kritikus',high:'Magas',medium:'Közepes',warning:'Figyelmeztetés',low:'Alacsony',info:'Tájékoztató',
};
export const environmentLabels:Record<string,string>={
  preview:'Preview',staging:'Staging',production:'Production',
};
export const rolloutDecisionLabels:Record<string,string>={
  go:'GO · Mehet',no_go:'NO-GO · Megállítva',nogo:'NO-GO · Megállítva',hold:'Tartás',rollback:'Visszaállítás',
};
export const operationalStatusLabels:Record<string,string>={
  open:'Nyitott',new:'Új',queued:'Sorban',blocked:'Blokkolt',ready_to_pack:'Csomagolható',packing:'Csomagolás alatt',packed:'Becsomagolva',ready_to_ship:'Feladásra kész',shipped:'Feladva',completed:'Lezárt',cancelled:'Törölve',on_hold:'Felfüggesztve',
};
export const customerTierLabels:Record<string,string>={
  standard:'Standard',regular:'Visszatérő',valuable:'Értékes',high_value:'Magas értékű',vip:'VIP',at_risk:'Megtartást igényel',
};
export const alertStatusLabels:Record<string,string>={
  open:'Nyitott',acknowledged:'Átvett',snoozed:'Elhalasztva',resolved:'Megoldott',closed:'Lezárt',
};
export const taskStatusLabels:Record<string,string>={
  open:'Nyitott',todo:'Teendő',in_progress:'Folyamatban',blocked:'Blokkolt',done:'Kész',completed:'Kész',cancelled:'Törölve',
};
export const recoveryStatusLabels:Record<string,string>={
  ready:'Kész',degraded:'Figyelmet igényel',blocked:'Blokkolt',planned:'Tervezett',running:'Folyamatban',passed:'Sikeres',failed:'Sikertelen',success:'Sikeres',warning:'Figyelmeztetés',stale:'Elavult',fresh:'Friss',unknown:'Nincs mérés',open:'Nyitott',acknowledged:'Átvett',
};
export const criticalityLabels:Record<string,string>={
  critical:'Kritikus',high:'Magas',medium:'Közepes',low:'Alacsony',
};
export const releaseRiskLabels:Record<string,string>={
  standard:'Standard',high_impact:'Magas hatású',low:'Alacsony',medium:'Közepes',high:'Magas',critical:'Kritikus',
};
export const releaseStatusLabels:Record<string,string>={
  draft:'Vázlat',evaluated:'Értékelt',ready:'Kiadásra kész',approved:'Jóváhagyott',rejected:'Elutasított',expired:'Lejárt',cancelled:'Megszakított',observing:'Megfigyelés',degraded:'Figyelmet igényel',rollback_recommended:'Visszaállítás javasolt',stable:'Stabil',closed:'Lezárt',
};
export const ciStatusLabels:Record<string,string>={
  pending:'Függőben',success:'Zöld',failure:'Hibás',failed:'Hibás',running:'Folyamatban',unknown:'Nincs eredmény',
};

export const severityLabel=(value?:string|null)=>map(value,severityLabels);
export const environmentLabel=(value?:string|null)=>map(value,environmentLabels);
export const rolloutDecisionLabel=(value?:string|null)=>map(value,rolloutDecisionLabels);
export const operationalStatusLabel=(value?:string|null)=>map(value,operationalStatusLabels);
export const customerTierLabel=(value?:string|null)=>map(value,customerTierLabels);
export const alertStatusLabel=(value?:string|null)=>map(value,alertStatusLabels);
export const taskStatusLabel=(value?:string|null)=>map(value,taskStatusLabels);
export const recoveryStatusLabel=(value?:string|null)=>map(value,recoveryStatusLabels);
export const criticalityLabel=(value?:string|null)=>map(value,criticalityLabels);
export const releaseRiskLabel=(value?:string|null)=>map(value,releaseRiskLabels);
export const releaseStatusLabel=(value?:string|null)=>map(value,releaseStatusLabels);
export const ciStatusLabel=(value?:string|null)=>map(value,ciStatusLabels);
export const commerceStatusLabel=(value?:string|null)=>orderStatusLabel(value);

export const stateTone=(value?:string|null)=>{
  if(!value)return 'neutral';
  if(['success','passed','pass','ready','stable','completed','done','closed','resolved','go','active'].includes(value))return 'ok';
  if(['critical','failure','failed','blocked','no_go','nogo','rollback_recommended'].includes(value))return 'danger';
  if(['high','warning','degraded','stale','pending','observing','on_hold','snoozed'].includes(value))return 'warning';
  return 'neutral';
};

export const displayRecommendation=(value?:string|null)=>{
  if(!value)return '—';
  return /^[a-z0-9_.-]+$/i.test(value)?humanizeCode(value):value;
};
