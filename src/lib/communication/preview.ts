import { getCommunicationTemplate } from './templates';

const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;

export function renderCommunicationPreview(templateKey: string, payload: Record<string, unknown> = {}) {
  const template = getCommunicationTemplate(templateKey);
  if (!template) return null;
  const name = text(payload.name, text(payload.customerName, 'Vásárlónk'));
  const orderNumber = text(payload.orderNumber);
  let body = '';
  switch (templateKey) {
    case 'payment_followup':
      body = `Kedves ${name}!\n\nA ${orderNumber ? orderNumber + ' számú ' : ''}Water-K rendelésed fizetése még függőben van. Ha a fizetést már elvégezted, nincs további teendőd.\n\nÜdvözlettel:\nWater-K`;
      break;
    case 'support_reply':
      body = `Kedves ${name}!\n\n${orderNumber ? `Kapcsolódó rendelés: ${orderNumber}\n\n` : ''}${text(payload.replyPreview, template.description)}\n\nErre az e-mailre válaszolva folytathatod a beszélgetést.\n\nWater-K`;
      break;
    case 'repeat_30d':
      body = `Kedves ${name}!\n\nKorábbi Water-K vásárlásod alapján időszerű lehet az utánpótlás. Ha szeretnéd, nézd meg az aktuális kínálatot a webáruházban.\n\nEzt az üzenetet marketing-hozzájárulásod alapján kapod.\nWater-K`;
      break;
    case 'winback_90d':
      body = `Kedves ${name}!\n\nRégebben vásároltál Water-K terméket. Szeretnénk jelezni, hogy továbbra is elérhető a webáruházban.\n\nEzt az üzenetet marketing-hozzájárulásod alapján kapod.\nWater-K`;
      break;
    default:
      body = `Kedves ${name}!\n\n${template.description}\n\nWater-K`;
  }
  return { subject: template.subject, body, purpose: template.purpose };
}
