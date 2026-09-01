export type CommunicationPurpose='transactional'|'marketing';
export type CommunicationTemplate={key:string;purpose:CommunicationPurpose;subject:string;description:string};
export const communicationTemplates:CommunicationTemplate[]=[
 {key:'payment_followup',purpose:'transactional',subject:'Rendelésed fizetése',description:'Fizetésre váró rendelés operatív utánkövetése.'},
 {key:'order_status',purpose:'transactional',subject:'Rendelési állapot frissítés',description:'Rendelés teljesítéséhez kapcsolódó állapotüzenet.'},
 {key:'support_reply',purpose:'transactional',subject:'Válasz érkezett az ügyedhez',description:'Ügyfélszolgálati adminválasz értesítése.'},
 {key:'return_status',purpose:'transactional',subject:'Visszaküldési ügy frissítés',description:'Visszáru- vagy visszatérítési ügy állapotváltozása.'},
 {key:'stock_available',purpose:'transactional',subject:'A figyelt termék újra készleten van',description:'A vásárló által kért készletértesítés, amikor a kiválasztott termékváltozat újra elérhető.'},
 {key:'winback_90d',purpose:'marketing',subject:'Újra itt az ideje?',description:'90+ napja inaktív, marketing-hozzájárulással rendelkező ügyfél.'},
 {key:'repeat_30d',purpose:'marketing',subject:'Ideje lehet az utánpótlásnak',description:'30–89 napja inaktív visszatérő ügyfél, aktív marketing-hozzájárulással.'},
 {key:'abandoned_checkout',purpose:'marketing',subject:'Félbehagytad a rendelésed?',description:'Bejelentkezett, hozzájárulással rendelkező ügyfél érvényes elhagyott checkoutjának helyreállítása.'}
];
export function getCommunicationTemplate(key:string){return communicationTemplates.find(t=>t.key===key)??null;}
