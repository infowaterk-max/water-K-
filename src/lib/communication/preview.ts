import { getCommunicationTemplate } from './templates';
import { brandedSubject } from './identity';

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
export function renderCommunicationPreview(templateKey:string,payload:Record<string,unknown>={},brandName='Water-K'){
 const template=getCommunicationTemplate(templateKey);if(!template)return null;const name=text(payload.name,text(payload.customerName,'Vásárlónk')),orderNumber=text(payload.orderNumber);let body='';
 switch(templateKey){
  case'payment_followup':body=`Kedves ${name}!\n\nA ${orderNumber?orderNumber+' számú ':''}rendelésed fizetése még függőben van. Ha a fizetést már elvégezted, nincs további teendőd.\n\nÜdvözlettel:\n${brandName}`;break;
  case'support_reply':body=`Kedves ${name}!\n\n${orderNumber?`Kapcsolódó rendelés: ${orderNumber}\n\n`:''}${text(payload.replyPreview,template.description)}\n\nErre az e-mailre válaszolva folytathatod a beszélgetést.\n\n${brandName}`;break;
  case'stock_available':{const productName=text(payload.productName,'A figyelt termék'),variantLabel=text(payload.variantLabel),productUrl=text(payload.productUrl,'/webaruhaz');body=`Kedves ${name}!\n\nJó hírünk van: ${productName}${variantLabel?` – ${variantLabel}`:''} újra készleten van.\n\nMegnézem: ${productUrl}\n\nEzt az üzenetet azért kapod, mert külön készletértesítést kértél erre a termékre.\n\n${brandName}`;break;}
  case'repeat_30d':body=`Kedves ${name}!\n\nKorábbi vásárlásod alapján időszerű lehet az utánpótlás. Ha szeretnéd, nézd meg az aktuális kínálatot a webáruházban.\n\nEzt az üzenetet marketing-hozzájárulásod alapján kapod.\n${brandName}`;break;
  case'winback_90d':body=`Kedves ${name}!\n\nRégebben vásároltál nálunk. Szeretnénk jelezni, hogy aktuális kínálatunk továbbra is elérhető a webáruházban.\n\nEzt az üzenetet marketing-hozzájárulásod alapján kapod.\n${brandName}`;break;
  default:body=`Kedves ${name}!\n\n${template.description}\n\n${brandName}`;
 }
 return{subject:brandedSubject(template.subject,brandName),body,purpose:template.purpose};
}
