import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';

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

  it('keeps the digital-commerce labels localized explicitly',()=>{
    const serialized=JSON.stringify(PLAYROOM_V20_TEMPLATE_PACKAGE.pages);
    for(const expected of['TERMÉKDOKUMENTUMOK','VÁSÁRLÁS UTÁN','SAJÁT TÁR','ÜGYFÉLSZOLGÁLAT'])expect(serialized).toContain(expected);
    for(const forbidden of['PRODUCT FILES','AFTER PURCHASE','PLAYER LIBRARY','PLAYER SUPPORT'])expect(serialized).not.toContain(forbidden);
  });
});
