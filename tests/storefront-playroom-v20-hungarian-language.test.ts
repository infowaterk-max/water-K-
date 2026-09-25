import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v19-canonical';
import {normalizeStorefrontTemplateRuntimeComposition} from '@/lib/builder/storefront-template-runtime-normalization';

const TEXT_KEYS=new Set([
  'text','label','title','copy','eyebrow','buttonLabel','ctaLabel','emptyLabel','placeholder','ariaLabel',
  'alt','imageAlt','inputLabel','consentLabel','nameLabel','emailLabel','orderNumberLabel','categoryLabel',
  'subjectLabel','messageLabel','successLead','documentCenterLabel','downloadLabel','loginLabel','pendingLabel',
  'digitalTitle','orderTitle','productTitle','physicalLabel','digitalLabel','mixedLabel','compatibleLabel',
  'incompatibleLabel','unknownLabel','description','excerpt','navTagline','brandLabel','brandAlt','categoryTriggerLabel'
]);

const collect=(value:unknown,key=''):string[]=>{
  if(typeof value==='string')return TEXT_KEYS.has(key)||/Label$|Title$|Copy$|Text$|Alt$/.test(key)?[value]:[];
  if(Array.isArray(value))return value.flatMap(item=>collect(item,key));
  if(!value||typeof value!=='object')return[];
  return Object.entries(value as Record<string,unknown>).flatMap(([childKey,child])=>collect(child,childKey));
};

const FORBIDDEN=[
  /PRODUCT FILES/i,
  /PLAYER SUPPORT/i,
  /AFTER PURCHASE/i,
  /PLAYER LIBRARY/i,
  /JOIN THE PLAYROOM/i,
  /DISCOVER \/ PLAY \/ REPEAT/i,
  /PLAY TOGETHER/i,
  /GIFT MODE/i,
  /GAME NIGHT READY/i,
  /SEARCH THE PLAYROOM/i,
  /READY PLAYER CHECKOUT/i,
  /SECURE CHECKOUT/i,
  /^SECURE$/i,
  /^SUMMARY$/i,
  /GUIDED ACCORDION/i,
  /^SHIPPING$/i,
  /^PAYMENT$/i,
  /Provider-neutral/i,
  /Semantic slot/i,
  /Desktop order summary/i,
  /template-local/i,
  /provider\/add-on/i,
  /PLAYER PROFILE/i,
  /\bORDERS\b/i,
  /\bSAVED\b/i,
  /\bPROFILE\b/i,
  /NEXT MOVE/i,
  /HELP CENTER/i,
  /STILL STUCK/i,
  /ORDER HELP/i,
  /PRODUCT HELP/i,
  /LEGAL \/ PRIVACY/i,
  /GAME OVER/i,
  /BROWSE \/ FILTER/i,
  /\bSTOCK\b/i,
  /\bPRICE\b/i,
  /\bAVAILABILITY\b/i,
  /\bCHECKOUT\b/i,
  /\bDATA\b/i,
  /\bMATCH\b/i,
  /\bNEXT\b/i,
  /\bGUIDE\b/i,
  /\bREAD\b/i,
  /THE STORY/i,
  /\bSETUP\b/i,
  /\bMerchandise\b/i,
  /\bHandheld\b/i,
  /\bMobile\b/i,
  /\bSolo\b/i,
  /\bParty\b/i,
  /\bRacing\b/i,
  /\bAdventure\b/i,
  /\bFamily\b/i,
  /\bgaming\b/i,
  /\bmultiplayer\b/i,
  /\bco-op\b/i,
];

describe('Playroom v20 Hungarian storefront language gate',()=>{
  it('keeps customer-facing template copy Hungarian apart from brands and standard abbreviations',()=>{
    const texts=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.flatMap(page=>page.sections.flatMap(section=>collect(section)));
    const violations=texts.flatMap(value=>FORBIDDEN.some(pattern=>pattern.test(value))?[value]:[]);
    expect(violations).toEqual([]);
  });

  it('localizes already-persisted Playroom v20 checkout drafts at runtime',()=>{
    const historical=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    const persisted={...structuredClone(historical),templateVersion:20};
    const normalized=normalizeStorefrontTemplateRuntimeComposition(persisted);
    const serialized=JSON.stringify(normalized.sections);
    for(const expected of['BIZTONSÁGOS PÉNZTÁR','BIZTONSÁG','ÖSSZESÍTÉS','VEZETETT PÉNZTÁR','SZÁLLÍTÁS','FIZETÉS'])expect(serialized).toContain(expected);
    for(const forbidden of['SECURE CHECKOUT','SECURE','SUMMARY','GUIDED ACCORDION','SHIPPING','PAYMENT','Provider-neutral','Semantic slot','Desktop order summary.'])expect(serialized).not.toContain(forbidden);
  });

  it('keeps the digital-commerce labels localized explicitly',()=>{
    const serialized=JSON.stringify(PLAYROOM_V20_TEMPLATE_PACKAGE.pages);
    for(const expected of['LETÖLTÉSEK','Dokumentumok','Digitális termék','Letöltéseim','Fiókom','ÜGYFÉLSZOLGÁLAT'])expect(serialized).toContain(expected);
    for(const forbidden of['PRODUCT FILES','AFTER PURCHASE','PLAYER LIBRARY','PLAYER SUPPORT'])expect(serialized).not.toContain(forbidden);
  });
});
