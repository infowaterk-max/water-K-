export type StorefrontCookieConsentLayout='split'|'stacked'|'compact'|'panel';
export type StorefrontCookieConsentAlign='left'|'center'|'right';

export type StorefrontCookieConsentPreset={
  presetId:string;
  templateKey:string;
  layout:StorefrontCookieConsentLayout;
  align:StorefrontCookieConsentAlign;
  maxWidth:string;
  radius:string;
  borderWidth:string;
  shadow:string;
  backdropBlur:string;
  titleTransform:'none'|'uppercase';
  titleLetterSpacing:string;
  fallback:{
    surface:string;
    surfaceMuted:string;
    text:string;
    mutedText:string;
    border:string;
    primary:string;
    primaryContrast:string;
    accent:string;
  };
};

const p=(templateKey:string,presetId:string,layout:StorefrontCookieConsentLayout,align:StorefrontCookieConsentAlign,overrides:Partial<StorefrontCookieConsentPreset>={}):StorefrontCookieConsentPreset=>({
  templateKey,presetId,layout,align,
  maxWidth:'920px',
  radius:'24px',
  borderWidth:'1px',
  shadow:'0 24px 70px rgba(0,0,0,.24)',
  backdropBlur:'18px',
  titleTransform:'none',
  titleLetterSpacing:'0',
  fallback:{
    surface:'#ffffff',
    surfaceMuted:'#f4f5f7',
    text:'#171717',
    mutedText:'#667085',
    border:'#d8dce7',
    primary:'#171717',
    primaryContrast:'#ffffff',
    accent:'#2f7f6f',
  },
  ...overrides,
});

export const STOREFRONT_COOKIE_CONSENT_PRESETS:Readonly<Record<string,StorefrontCookieConsentPreset>>=Object.freeze({
  'outdoor.alpine-lodge':p('outdoor.alpine-lodge','alpine-lodge-cookie','panel','left',{radius:'18px',maxWidth:'860px'}),
  'beauty.beauty-lab':p('beauty.beauty-lab','beauty-lab-cookie','stacked','center',{radius:'28px',maxWidth:'760px'}),
  'tech.creator-station':p('tech.creator-station','creator-station-cookie','split','right',{radius:'16px',maxWidth:'900px'}),
  'beauty.derma-studio':p('beauty.derma-studio','derma-studio-cookie','compact','center',{radius:'999px',maxWidth:'980px'}),
  'fashion.editorial-atelier':p('fashion.editorial-atelier','editorial-atelier-cookie','panel','left',{radius:'4px',borderWidth:'2px',maxWidth:'820px'}),
  'home.gallery-edit':p('home.gallery-edit','gallery-edit-cookie','stacked','right',{radius:'12px',maxWidth:'720px'}),
  'jewelry.heritage-atelier':p('jewelry.heritage-atelier','heritage-atelier-cookie','panel','center',{radius:'6px',maxWidth:'800px',titleTransform:'uppercase',titleLetterSpacing:'.08em'}),
  'gaming.loot-vault':p('gaming.loot-vault','loot-vault-cookie','compact','right',{radius:'14px',borderWidth:'2px'}),
  'food.market-pantry':p('food.market-pantry','market-pantry-cookie','stacked','left',{radius:'22px',maxWidth:'780px'}),
  'jewelry.modern-luxe':p('jewelry.modern-luxe','modern-luxe-cookie','split','center',{radius:'2px',maxWidth:'900px',titleTransform:'uppercase',titleLetterSpacing:'.1em'}),
  'fashion.monarche':p('fashion.monarche','monarche-cookie','panel','right',{radius:'0px',borderWidth:'2px',maxWidth:'820px'}),
  'pet.my-pack':p('pet.my-pack','my-pack-cookie','stacked','left',{radius:'30px',maxWidth:'780px'}),
  'sport.performance-lab':p('sport.performance-lab','performance-lab-cookie','compact','right',{radius:'10px',maxWidth:'940px'}),
  'gaming.playroom':p('gaming.playroom','playroom-v20-cookie','panel','center',{
    radius:'20px',borderWidth:'1px',maxWidth:'820px',
    shadow:'0 22px 70px rgba(0,0,0,.48)',
    titleTransform:'uppercase',titleLetterSpacing:'.08em',
    fallback:{surface:'#16142b',surfaceMuted:'#201d3f',text:'#fff7e8',mutedText:'#b8b4c8',border:'#3d3766',primary:'#5c7cfa',primaryContrast:'#ffffff',accent:'#4de4e8'},
  }),
  'gaming.rig-forge':p('gaming.rig-forge','rig-forge-cookie','split','right',{radius:'8px',borderWidth:'2px',maxWidth:'900px'}),
  'beauty.ritual-house':p('beauty.ritual-house','ritual-house-cookie','stacked','center',{radius:'32px',maxWidth:'760px'}),
  'tech.spec-lab':p('tech.spec-lab','spec-lab-cookie','compact','left',{radius:'8px',maxWidth:'960px'}),
  'sport.sport-hub':p('sport.sport-hub','sport-hub-cookie','split','center',{radius:'18px',maxWidth:'900px'}),
  'jewelry.statement-lab':p('jewelry.statement-lab','statement-lab-cookie','panel','right',{radius:'10px',maxWidth:'820px',titleTransform:'uppercase',titleLetterSpacing:'.07em'}),
  'fashion.street-drop':p('fashion.street-drop','street-drop-cookie','compact','left',{radius:'12px',borderWidth:'2px',maxWidth:'940px'}),
  'food.table-gift':p('food.table-gift','table-gift-cookie','stacked','center',{radius:'24px',maxWidth:'760px'}),
  'tech.tech-deck':p('tech.tech-deck','tech-deck-cookie','split','right',{radius:'14px',maxWidth:'900px'}),
  'industrial.tool-depot':p('industrial.tool-depot','tool-depot-cookie','panel','left',{radius:'6px',borderWidth:'2px',maxWidth:'860px'}),
  'sport.trail-expedition':p('sport.trail-expedition','trail-expedition-cookie','panel','left',{radius:'16px',maxWidth:'840px'}),
});

export function getStorefrontCookieConsentPreset(templateKey:string|null|undefined):StorefrontCookieConsentPreset|null{
  if(!templateKey)return null;
  return STOREFRONT_COOKIE_CONSENT_PRESETS[templateKey]??null;
}

export function assertStorefrontCookieConsentPreset(templateKey:string):StorefrontCookieConsentPreset{
  const preset=getStorefrontCookieConsentPreset(templateKey);
  if(!preset)throw new Error(`STOREFRONT_COOKIE_PRESET_REQUIRED:${templateKey}`);
  return preset;
}
