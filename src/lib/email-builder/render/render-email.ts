import type { EmailBlock, EmailRenderContext, RenderedEmail } from '../types';
import { resolveEmailString } from '../bindings';
import { evaluateEmailConditions } from '../conditions';
import { mergeEmailDesignTokens, type EmailDesignTokens } from '../tokens';
import { emailBlockRegistry } from '../registry';
import { validateEmailDocument } from '../validation';

const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]??char));
const textValue=(value:unknown)=>typeof value==='string'?value:'';
const safeHref=(value:string)=>{try{const url=new URL(value);if(url.protocol!=='http:'&&url.protocol!=='https:')throw new Error('UNSAFE_EMAIL_URL');return url.toString();}catch(error){if(value.startsWith('/')&&!value.startsWith('//'))return value;throw error instanceof Error&&error.message==='UNSAFE_EMAIL_URL'?error:new Error('INVALID_EMAIL_URL');}};
const money=(value:number,currency='HUF')=>new Intl.NumberFormat('hu-HU',{style:'currency',currency,maximumFractionDigits:currency==='HUF'?0:2}).format(value);
const resolve=(value:unknown,context:EmailRenderContext)=>resolveEmailString(textValue(value),context);

function requireContext(block:EmailBlock,context:EmailRenderContext){
  const required=emailBlockRegistry[block.type].requiredContext;
  if(required&&!context[required])throw new Error(`EMAIL_CONTEXT_MISSING:${required}:${block.id}`);
}

function renderBlock(block:EmailBlock,context:EmailRenderContext,tokens:EmailDesignTokens):{html:string;text:string}{
  requireContext(block,context);
  const c=block.content as Record<string,unknown>;
  const muted=tokens.colors.muted,border=tokens.colors.border,primary=tokens.colors.primary,text=tokens.colors.text;
  if(block.type==='header'){
    const brand=resolve(c.brandText,context)||context.store.name,logo=context.store.logoUrl;
    const logoHtml=c.showLogo!==false&&logo?`<img src="${escapeHtml(safeHref(logo))}" alt="${escapeHtml(brand)}" style="display:block;max-width:180px;max-height:64px;border:0">`:`<div style="font-size:20px;font-weight:700;color:${text}">${escapeHtml(brand)}</div>`;
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.xl}px">${logoHtml}</td></tr>`,text:brand};
  }
  if(block.type==='heading'){
    const value=resolve(c.text,context),level=c.level==='h1'?'h1':c.level==='h3'?'h3':'h2',size=level==='h1'?32:level==='h2'?24:19,align=c.align==='center'?'center':c.align==='right'?'right':'left';
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.m}px;text-align:${align}"><${level} style="margin:0;font-family:${tokens.typography.headingFontFamily};font-size:${size}px;line-height:1.2;color:${text};font-weight:600">${escapeHtml(value)}</${level}></td></tr>`,text:value};
  }
  if(block.type==='text'){
    const value=resolve(c.text,context),align=c.align==='center'?'center':c.align==='right'?'right':'left';
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.m}px;text-align:${align};font-size:${tokens.typography.bodySize}px;line-height:${tokens.typography.lineHeight};color:${text}">${escapeHtml(value).replace(/\r?\n/g,'<br>')}</td></tr>`,text:value};
  }
  if(block.type==='button'){
    const label=resolve(c.label,context),href=safeHref(resolve(c.href,context)),align=c.align==='center'?'center':c.align==='right'?'right':'left';
    return{html:`<tr><td style="padding:${tokens.spacing.s}px 0 ${tokens.spacing.l}px;text-align:${align}"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;border-radius:${tokens.radius.button}px;background:${primary};color:#ffffff;text-decoration:none;font-weight:700">${escapeHtml(label)}</a></td></tr>`,text:`${label}: ${href}`};
  }
  if(block.type==='divider')return{html:`<tr><td style="padding:${tokens.spacing.s}px 0 ${tokens.spacing.l}px"><div style="border-top:1px solid ${border}"></div></td></tr>`,text:''};
  if(block.type==='spacer'){
    const key:'s'|'m'|'l'|'xl'=c.size==='s'?'s':c.size==='l'?'l':c.size==='xl'?'xl':'m';
    const height=tokens.spacing[key];
    return{html:`<tr><td height="${height}" style="height:${height}px;line-height:${height}px;font-size:1px">&nbsp;</td></tr>`,text:''};
  }
  if(block.type==='order-items'){
    const order=context.order!;const title=resolve(c.title,context)||'A rendelés tartalma';
    const rows=order.items.map(item=>`<tr><td style="padding:10px 0;border-bottom:1px solid ${border};color:${text}"><strong>${escapeHtml(item.name)}</strong>${item.variant?`<div style="font-size:12px;color:${muted}">${escapeHtml(item.variant)}</div>`:''}</td><td style="padding:10px 8px;border-bottom:1px solid ${border};text-align:center;color:${text}">${item.quantity}×</td><td style="padding:10px 0;border-bottom:1px solid ${border};text-align:right;color:${text}">${escapeHtml(money(item.lineTotal,order.currency||'HUF'))}</td></tr>`).join('');
    const lines=order.items.map(item=>`${item.name}${item.variant?` – ${item.variant}`:''}: ${item.quantity} × ${money(item.unitPrice,order.currency||'HUF')} = ${money(item.lineTotal,order.currency||'HUF')}`);
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.l}px"><h3 style="margin:0 0 8px;font-size:18px;color:${text}">${escapeHtml(title)}</h3><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table></td></tr>`,text:[title,...lines].join('\n')};
  }
  if(block.type==='order-summary'){
    const order=context.order!,currency=order.currency||'HUF',title=resolve(c.title,context)||'Összesítés';
    const items:[string,number][]=[['Részösszeg',order.subtotal],['Szállítás',order.shipping],...(order.discount>0?[['Kedvezmény',-order.discount] as [string,number]]:[]),['Végösszeg',order.total]];
    const rows=items.map(([label,value],index)=>`<tr><td style="padding:${index===items.length-1?'12px':'6px'} 0;color:${index===items.length-1?text:muted};${index===items.length-1?`border-top:1px solid ${border};font-weight:700`:''}">${label}</td><td style="padding:${index===items.length-1?'12px':'6px'} 0;text-align:right;color:${text};${index===items.length-1?`border-top:1px solid ${border};font-weight:700`:''}">${escapeHtml(money(value,currency))}</td></tr>`).join('');
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.l}px"><h3 style="margin:0 0 8px;font-size:18px;color:${text}">${escapeHtml(title)}</h3><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table></td></tr>`,text:[title,...items.map(([label,value])=>`${label}: ${money(value,currency)}`)].join('\n')};
  }
  if(block.type==='payment-info'){
    const payment=context.payment!,title=resolve(c.title,context)||'Banki átutalás adatai';
    const lines=[payment.accountHolder&&`Kedvezményezett: ${payment.accountHolder}`,payment.bankName&&`Bank: ${payment.bankName}`,payment.bankAccount&&`Bankszámlaszám / IBAN: ${payment.bankAccount}`,context.order?.number&&`Közlemény: ${context.order.number}`,payment.note].filter((item):item is string=>Boolean(item));
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.l}px"><div style="padding:${tokens.spacing.m}px;border:1px solid ${border};border-radius:${tokens.radius.card}px;background:${tokens.colors.surface}"><strong style="color:${text}">${escapeHtml(title)}</strong><div style="margin-top:8px;color:${text};line-height:${tokens.typography.lineHeight}">${lines.map(line=>escapeHtml(line)).join('<br>')}</div></div></td></tr>`,text:[title,...lines].join('\n')};
  }
  if(block.type==='address'){
    const kind=c.kind==='billing'?'billing':'shipping',address=kind==='billing'?context.billing?.address:context.shipping?.address;if(!address)return{html:'',text:''};
    const title=resolve(c.title,context)||(kind==='billing'?'Számlázási cím':'Szállítási cím');
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.m}px"><strong style="color:${text}">${escapeHtml(title)}</strong><div style="margin-top:6px;color:${muted};line-height:${tokens.typography.lineHeight}">${escapeHtml(address).replace(/\r?\n/g,'<br>')}</div></td></tr>`,text:`${title}\n${address}`};
  }
  if(block.type==='footer'){
    const value=resolve(c.text,context)||`${context.store.name} · értesítés`;
    return{html:`<tr><td style="padding:${tokens.spacing.l}px 0 0;border-top:1px solid ${border};font-size:${tokens.typography.smallSize}px;color:${muted};line-height:1.5">${escapeHtml(value)}</td></tr>`,text:value};
  }
  throw new Error(`UNSUPPORTED_EMAIL_BLOCK:${block.type}`);
}

function decorateBlockHtml(block:EmailBlock,html:string){
  if(!html)return html;
  const classes=['email-block',block.responsive.hideOnDesktop?'email-hide-desktop':'',block.responsive.hideOnMobile?'email-hide-mobile':'',block.responsive.stackOnMobile?'email-stack-mobile':''].filter(Boolean).join(' ');
  return html.replace('<tr',`<tr class="${classes}" data-email-block-id="${escapeHtml(block.id)}"`);
}

export function renderEmail(input:unknown,context:EmailRenderContext):RenderedEmail{
  const validation=validateEmailDocument(input);if(!validation.ok||!validation.document)throw new Error(`EMAIL_DOCUMENT_INVALID:${validation.errors.join('|')}`);
  const document=validation.document,tokens=mergeEmailDesignTokens(document.design),visibleBlocks=document.blocks.filter(block=>evaluateEmailConditions(block.conditions,context)),rendered=visibleBlocks.map(block=>({block,...renderBlock(block,context,tokens)}));
  const subject=resolveEmailString(document.subject,context),preheader=resolveEmailString(document.preheader,context);
  const body=rendered.map(item=>decorateBlockHtml(item.block,item.html)).join(''),textBody=rendered.map(item=>item.text).filter(Boolean).join('\n\n');
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>.email-hide-desktop{display:none!important}@media(max-width:640px){.email-shell{width:100%!important}.email-pad{padding:20px!important}.email-hide-desktop{display:table-row!important}.email-hide-mobile{display:none!important}}</style></head><body style="margin:0;background:${tokens.colors.background};font-family:${tokens.typography.fontFamily};color:${tokens.colors.text}"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${tokens.colors.background}"><tr><td align="center" style="padding:${tokens.spacing.xl}px ${tokens.spacing.m}px"><table role="presentation" class="email-shell" width="${tokens.container.maxWidth}" cellspacing="0" cellpadding="0" style="width:${tokens.container.maxWidth}px;max-width:100%;background:${tokens.colors.surface};border-radius:${tokens.radius.card}px"><tr><td class="email-pad" style="padding:${tokens.spacing.xl}px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${body}</table></td></tr></table></td></tr></table></body></html>`;
  return{subject,preheader,html,text:`${subject}\n\n${textBody}`.trim(),warnings:validation.warnings};
}
