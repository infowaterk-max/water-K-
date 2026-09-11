import type { EmailBlock, EmailRenderContext, RenderedEmail } from '../types';
import { getEmailBinding, resolveEmailString } from '../bindings';
import { emailRichTextSource, parseEmailRichText, sourceToEmailRichText, type EmailRichTextNode } from '../rich-text';
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

function primaryRichText(c:Record<string,unknown>,field:'text'|'label'){
  const source=textValue(c[field]);
  const stored=parseEmailRichText(c.richText);
  return stored&&emailRichTextSource(stored)===source?stored:sourceToEmailRichText(source);
}
function richNodeValue(node:EmailRichTextNode,context:EmailRenderContext){
  if(node.type==='text')return node.text;
  const value=getEmailBinding(context,node.key);
  return value===null||value===undefined?'':String(value);
}
function renderInlineRich(nodes:EmailRichTextNode[],context:EmailRenderContext,allowLinks=true){
  let html='',text='';
  for(const node of nodes){
    const value=richNodeValue(node,context);text+=value;
    let fragment=escapeHtml(value).replace(/\r?\n/g,'<br>');
    if(node.type==='binding')fragment=`<span data-email-binding-key="${escapeHtml(node.key)}">${fragment}</span>`;
    if(node.marks?.bold)fragment=`<strong style="font-weight:700">${fragment}</strong>`;
    if(node.marks?.italic)fragment=`<em style="font-style:italic">${fragment}</em>`;
    if(allowLinks&&node.marks?.href){const href=safeHref(resolveEmailString(node.marks.href,context));fragment=`<a data-email-inline-link="true" href="${escapeHtml(href)}" style="color:inherit;text-decoration:underline">${fragment}</a>`;}
    html+=fragment;
  }
  return{html,text};
}

function renderBlock(block:EmailBlock,context:EmailRenderContext,tokens:EmailDesignTokens):{html:string;text:string}{
  requireContext(block,context);
  const c=block.content as Record<string,unknown>;
  const muted=tokens.colors.muted,border=tokens.colors.border,primary=tokens.colors.primary,text=tokens.colors.text,secondary=tokens.colors.secondary,surface=tokens.colors.surface;
  if(block.type==='header'){
    const brand=resolve(c.brandText,context)||context.store.name,logo=context.store.logoUrl;
    const logoHtml=c.showLogo!==false&&logo?`<img src="${escapeHtml(safeHref(logo))}" alt="${escapeHtml(brand)}" style="display:block;max-width:172px;max-height:58px;border:0">`:`<div style="font-size:18px;line-height:1.25;font-weight:700;letter-spacing:.01em;color:${text}">${escapeHtml(brand)}</div>`;
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.xl}px">${logoHtml}</td></tr>`,text:brand};
  }
  if(block.type==='heading'){
    const rich=renderInlineRich(primaryRichText(c,'text'),context),level=c.level==='h1'?'h1':c.level==='h3'?'h3':'h2',size=level==='h1'?36:level==='h2'?26:20,align=c.align==='center'?'center':c.align==='right'?'right':'left';
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.m}px;text-align:${align}"><${level} class="email-${level}" style="margin:0;font-family:${tokens.typography.headingFontFamily};font-size:${size}px;line-height:1.16;color:${text};font-weight:600;letter-spacing:-.015em">${rich.html}</${level}></td></tr>`,text:rich.text};
  }
  if(block.type==='text'){
    const rich=renderInlineRich(primaryRichText(c,'text'),context),align=c.align==='center'?'center':c.align==='right'?'right':'left';
    return{html:`<tr><td style="padding:0 0 ${tokens.spacing.l}px;text-align:${align};font-size:${tokens.typography.bodySize}px;line-height:${tokens.typography.lineHeight};color:${text}">${rich.html}</td></tr>`,text:rich.text};
  }
  if(block.type==='button'){
    const rich=renderInlineRich(primaryRichText(c,'label'),context,false),href=safeHref(resolve(c.href,context)),align=c.align==='center'?'center':c.align==='right'?'right':'left';
    return{html:`<tr><td style="padding:${tokens.spacing.xs}px 0 ${tokens.spacing.l}px;text-align:${align}"><a class="email-button" href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;border-radius:${tokens.radius.button}px;background:${primary};color:#ffffff;text-decoration:none;font-size:14px;line-height:1.2;font-weight:700;letter-spacing:.005em">${rich.html}</a></td></tr>`,text:`${rich.text}: ${href}`};
  }
  if(block.type==='divider')return{html:`<tr><td style="padding:${tokens.spacing.s}px 0 ${tokens.spacing.l}px"><div style="border-top:1px solid ${border}"></div></td></tr>`,text:''};
  if(block.type==='spacer'){
    const key:'s'|'m'|'l'|'xl'=c.size==='s'?'s':c.size==='l'?'l':c.size==='xl'?'xl':'m';
    const height=tokens.spacing[key];
    return{html:`<tr><td height="${height}" style="height:${height}px;line-height:${height}px;font-size:1px">&nbsp;</td></tr>`,text:''};
  }
  if(block.type==='order-items'){
    const order=context.order!;const title=resolve(c.title,context)||'A rendelés tartalma';
    const rows=order.items.map((item,index)=>`<tr><td style="padding:14px 16px;${index<order.items.length-1?`border-bottom:1px solid ${border};`:''}color:${text};vertical-align:top"><strong style="font-size:14px;line-height:1.35">${escapeHtml(item.name)}</strong>${item.variant?`<div style="margin-top:3px;font-size:11px;line-height:1.35;color:${muted}">${escapeHtml(item.variant)}</div>`:''}</td><td style="padding:14px 8px;${index<order.items.length-1?`border-bottom:1px solid ${border};`:''}text-align:center;color:${muted};font-size:13px;vertical-align:top;white-space:nowrap">${item.quantity}×</td><td style="padding:14px 16px 14px 8px;${index<order.items.length-1?`border-bottom:1px solid ${border};`:''}text-align:right;color:${text};font-size:14px;font-weight:600;vertical-align:top;white-space:nowrap">${escapeHtml(money(item.lineTotal,order.currency||'HUF'))}</td></tr>`).join('');
    const lines=order.items.map(item=>`${item.name}${item.variant?` – ${item.variant}`:''}: ${item.quantity} × ${money(item.unitPrice,order.currency||'HUF')} = ${money(item.lineTotal,order.currency||'HUF')}`);
    return{html:`<tr><td style="padding:${tokens.spacing.xs}px 0 ${tokens.spacing.l}px"><h3 style="margin:0 0 10px;font-family:${tokens.typography.fontFamily};font-size:15px;line-height:1.35;color:${text};font-weight:700">${escapeHtml(title)}</h3><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid ${border};border-radius:${tokens.radius.card}px;background:${surface}">${rows}</table></td></tr>`,text:[title,...lines].join('\n')};
  }
  if(block.type==='order-summary'){
    const order=context.order!,currency=order.currency||'HUF',title=resolve(c.title,context)||'Összesítés';
    const items:[string,number][]=[['Részösszeg',order.subtotal],['Szállítás',order.shipping],...(order.discount>0?[['Kedvezmény',-order.discount] as [string,number]]:[]),['Végösszeg',order.total]];
    const rows=items.map(([label,value],index)=>`<tr><td style="padding:${index===items.length-1?'13px 16px':'7px 16px'};color:${index===items.length-1?text:muted};${index===items.length-1?`border-top:1px solid ${border};font-weight:700`:''};font-size:13px">${label}</td><td style="padding:${index===items.length-1?'13px 16px':'7px 16px'};text-align:right;color:${text};${index===items.length-1?`border-top:1px solid ${border};font-weight:700`:''};font-size:13px;white-space:nowrap">${escapeHtml(money(value,currency))}</td></tr>`).join('');
    return{html:`<tr><td style="padding:${tokens.spacing.xs}px 0 ${tokens.spacing.l}px"><h3 style="margin:0 0 10px;font-family:${tokens.typography.fontFamily};font-size:15px;line-height:1.35;color:${text};font-weight:700">${escapeHtml(title)}</h3><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid ${border};border-radius:${tokens.radius.card}px;background:${secondary}">${rows}</table></td></tr>`,text:[title,...items.map(([label,value])=>`${label}: ${money(value,currency)}`)].join('\n')};
  }
  if(block.type==='payment-info'){
    const payment=context.payment!,title=resolve(c.title,context)||'Banki átutalás adatai';
    const accountHolder=payment.accountHolder&&`Kedvezményezett: ${payment.accountHolder}`,bankName=payment.bankName&&`Bank: ${payment.bankName}`,account=payment.bankAccount&&`Bankszámlaszám / IBAN: ${payment.bankAccount}`,reference=context.order?.number&&`Közlemény: ${context.order.number}`;
    const lines=[accountHolder,bankName,account,reference,payment.note].filter((item):item is string=>Boolean(item));
    const htmlLines=[accountHolder&&escapeHtml(accountHolder),bankName&&escapeHtml(bankName),account&&`<span class="email-iban" style="word-break:break-word;overflow-wrap:anywhere">${escapeHtml(account)}</span>`,reference&&escapeHtml(reference),payment.note&&escapeHtml(payment.note)].filter(Boolean).join('<br>');
    return{html:`<tr><td style="padding:${tokens.spacing.xs}px 0 ${tokens.spacing.l}px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid ${border};border-radius:${tokens.radius.card}px;background:${surface}"><tr><td style="padding:18px 18px 17px"><strong style="display:block;color:${text};font-size:14px;line-height:1.35">${escapeHtml(title)}</strong><div style="margin-top:9px;color:${text};font-size:13px;line-height:1.65">${htmlLines}</div></td></tr></table></td></tr>`,text:[title,...lines].join('\n')};
  }
  if(block.type==='address'){
    const kind=c.kind==='billing'?'billing':'shipping',address=kind==='billing'?context.billing?.address:context.shipping?.address;if(!address)return{html:'',text:''};
    const title=resolve(c.title,context)||(kind==='billing'?'Számlázási cím':'Szállítási cím');
    return{html:`<tr><td style="padding:${tokens.spacing.xs}px 0 ${tokens.spacing.m}px"><div style="font-size:11px;line-height:1.3;text-transform:uppercase;letter-spacing:.07em;font-weight:700;color:${muted}">${escapeHtml(title)}</div><div style="margin-top:7px;color:${text};font-size:13px;line-height:1.55">${escapeHtml(address).replace(/\r?\n/g,'<br>')}</div></td></tr>`,text:`${title}\n${address}`};
  }
  if(block.type==='footer'){
    const value=resolve(c.text,context)||`${context.store.name} · értesítés`,support=context.store.supportEmail;
    const supportHtml=support?`<div style="margin-top:5px">Segítség: <a href="mailto:${escapeHtml(support)}" style="color:${primary};text-decoration:none">${escapeHtml(support)}</a></div>`:'';
    return{html:`<tr><td style="padding:${tokens.spacing.xl}px 0 0;border-top:1px solid ${border};font-size:${tokens.typography.smallSize}px;color:${muted};line-height:1.55">${escapeHtml(value)}${supportHtml}</td></tr>`,text:[value,support?`Segítség: ${support}`:''].filter(Boolean).join('\n')};
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
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>.email-hide-desktop{display:none!important}@media(max-width:640px){.email-shell{width:100%!important}.email-pad{padding:28px 24px!important}.email-hide-desktop{display:table-row!important}.email-hide-mobile{display:none!important}.email-h1{font-size:30px!important;line-height:1.16!important}.email-h2{font-size:23px!important}.email-h3{font-size:19px!important}.email-iban{word-break:break-all!important;overflow-wrap:anywhere!important}.email-button{padding:13px 18px!important}}</style></head><body style="margin:0;padding:0;background:${tokens.colors.background};font-family:${tokens.typography.fontFamily};color:${tokens.colors.text};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:${tokens.colors.background}"><tr><td align="center" style="padding:${tokens.spacing.xxl}px ${tokens.spacing.m}px"><table role="presentation" class="email-shell" width="${tokens.container.maxWidth}" cellspacing="0" cellpadding="0" style="width:${tokens.container.maxWidth}px;max-width:100%;background:${tokens.colors.surface};border:1px solid ${tokens.colors.border};border-top:4px solid ${tokens.colors.primary};border-radius:${tokens.radius.card}px"><tr><td class="email-pad" style="padding:${tokens.spacing.xl}px ${tokens.spacing.xl}px ${tokens.spacing.xl}px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%">${body}</table></td></tr></table></td></tr></table></body></html>`;
  return{subject,preheader,html,text:`${subject}\n\n${textBody}`.trim(),warnings:validation.warnings};
}
