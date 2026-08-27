export type CommunicationPurpose='transactional'|'marketing';
export type CommunicationTemplate={key:string;purpose:CommunicationPurpose;subject:string;description:string};
export const communicationTemplates:CommunicationTemplate[]=[
 {key:'payment_followup',purpose:'transactional',subject:'Water-K rendelésed fizetése',description:'Fizetésre váró rendelés operatív utánkövetése.'},
 {key:'order_status',purpose:'transactional',subject:'Water-K rendelési állapot',description:'Rendelés teljesítéséhez kapcsolódó állapotüzenet.'},
 {key:'support_reply',purpose:'transactional',subject:'Válasz érkezett a Water-K ügyedhez',description:'Ügyfélszolgálati adminválasz értesítése.'},
 {key:'return_status',purpose:'transactional',subject:'Water-K visszaküldési ügy frissítés',description:'Visszáru- vagy visszatérítési ügy állapotváltozása.'},
 {key:'winback_90d',purpose:'marketing',subject:'Water-K – újra itt az ideje?',description:'90+ napja inaktív, marketing-hozzájárulással rendelkező ügyfél.'},
 {key:'repeat_30d',purpose:'marketing',subject:'Water-K – ideje lehet az utánpótlásnak',description:'30–89 napja inaktív visszatérő ügyfél, aktív marketing-hozzájárulással.'}
];
export function getCommunicationTemplate(key:string){return communicationTemplates.find(t=>t.key===key)??null;}
