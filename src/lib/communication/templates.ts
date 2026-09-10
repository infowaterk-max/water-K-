export type CommunicationPurpose='transactional'|'marketing';
export type CommunicationTemplate={key:string;purpose:CommunicationPurpose;subject:string;description:string};
export const communicationTemplates:CommunicationTemplate[]=[
 {key:'payment_followup',purpose:'transactional',subject:'Rendelésed fizetése',description:'Fizetésre váró rendelés operatív utánkövetése.'},
 {key:'order_status',purpose:'transactional',subject:'Rendelési állapot frissítés',description:'Rendelés teljesítéséhez kapcsolódó állapotüzenet.'},
 {key:'support_reply',purpose:'transactional',subject:'Válasz érkezett az ügyedhez',description:'Ügyfélszolgálati adminválasz értesítése.'},
 {key:'return_status',purpose:'transactional',subject:'Visszaküldési ügy frissítés',description:'Visszáru- vagy visszatérítési ügy állapotváltozása.'},
 {key:'stock_available',purpose:'transactional',subject:'A figyelt termék újra készleten van',description:'A vásárló által kért készletértesítés, amikor a kiválasztott termékváltozat újra elérhető.'},
 {key:'trial_inactivity_5d',purpose:'transactional',subject:'Folytasd a 30 napos Shoperation próbaidőszakot',description:'Öt napos trial-inaktivitás után küldött platformfiók-emlékeztető.'},
 {key:'trial_expiry_7d',purpose:'transactional',subject:'7 nap van hátra a Shoperation próbaidőszakból',description:'A trial lejárata előtti egyhetes státuszértesítő.'},
 {key:'trial_expiry_2d',purpose:'transactional',subject:'2 nap van hátra a Shoperation próbaidőszakból',description:'A trial lejárata előtti végső emlékeztető.'},
 {key:'trial_evaluation_ready',purpose:'transactional',subject:'Elkészült a Shoperation Business Pulse értékelésed',description:'A 30 napos trial végén elkészült Business Pulse és csomagajánlás értesítője.'},
 {key:'winback_90d',purpose:'marketing',subject:'Újra itt az ideje?',description:'90+ napja inaktív, marketing-hozzájárulással rendelkező ügyfél.'},
 {key:'repeat_30d',purpose:'marketing',subject:'Ideje lehet az utánpótlásnak',description:'30–89 napja inaktív visszatérő ügyfél, aktív marketing-hozzájárulással.'},
 {key:'abandoned_checkout',purpose:'marketing',subject:'Félbehagytad a rendelésed?',description:'Bejelentkezett, hozzájárulással rendelkező ügyfél érvényes elhagyott checkoutjának helyreállítása.'}
];
export function getCommunicationTemplate(key:string){return communicationTemplates.find(t=>t.key===key)??null;}
