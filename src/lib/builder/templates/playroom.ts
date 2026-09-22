import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_DEMO_CONTENT_POLICY,
  STOREFRONT_PAGE_SCHEMA_VERSION,
  STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  defineStorefrontTemplateManifest,
  type StorefrontBuilderPageType,
  type StorefrontGridSpan,
} from '@/lib/builder/storefront-foundation';
import {STOREFRONT_GLOBAL_STYLES_METADATA_KEY,STOREFRONT_GLOBAL_STYLES_VERSION} from '@/lib/builder/storefront-global-styles';
import {STOREFRONT_FIDELITY_ENGINE_VERSION,STOREFRONT_FIDELITY_METADATA_KEY} from '@/lib/builder/storefront-fidelity-engine';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

export const PLAYROOM_TEMPLATE_KEY='gaming.playroom' as const;
export const PLAYROOM_TEMPLATE_VERSION=1 as const;

export const PLAYROOM_VISUAL_DNA=Object.freeze({
  character:'playful-console-discovery-graphic-premium-social-gaming',
  category:'gaming-geek',
  position:'broad-gaming-console-discovery-store',
  palette:{background:'midnight-indigo',surface:'soft-ink-violet',text:'warm-ivory',accentPrimary:'controlled-coral',accentSecondary:'electric-cobalt',accentTertiary:'limited-lime'},
  typography:{display:'bold-rounded-geometric-sans',interface:'clean-sans',data:'compact-sans'},
  visualLanguage:['two-tier-commerce-header','neon-panel-system','layered-gaming-hero','platform-and-play-style-selectors','dense-commerce-grid','compatibility-and-gift-pair','community-strip'],
  imagery:'original-controller-setup-multiplayer-and-gift-artwork-without-embedded-ui-copy',
  density:'energetic-but-ordered',
  exclusions:['rgb-rainbow-chaos','military-esports-black-red','childish-toy-store','fake-release-countdown','fake-review-score','fake-platform-compatibility','loot-box-gambling-ui','pc-builder-duplication','collector-vault-duplication'],
} as const);

export const PLAYROOM_DESIGN_TOKENS=Object.freeze({
  '--shoporation-color-background':'#0B0A1A',
  '--shoporation-color-surface':'#15142C',
  '--shoporation-color-surface-muted':'#211F3E',
  '--shoporation-color-text':'#FFF7E8',
  '--shoporation-color-muted-text':'#B8B4C7',
  '--shoporation-color-border':'#373259',
  '--shoporation-color-primary':'#5C7CFA',
  '--shoporation-color-primary-contrast':'#FFFFFF',
  '--shoporation-color-accent':'var(--merchant-accent, #FF6B5E)',
  '--shoporation-color-accent-secondary':'#5C7CFA',
  '--shoporation-color-accent-tertiary':'#B8E34A',
  '--shoporation-heading-font':'var(--merchant-heading-font, "Avenir Next", "Segoe UI", Arial, sans-serif)',
  '--shoporation-body-font':'var(--merchant-body-font, "Segoe UI", Arial, sans-serif)',
} as const);

export const PLAYROOM_ENGINE_CONTRACT=Object.freeze({
  requiredForFullExperience:['E1','E2','E3','E6','E7','E10','E13'] as const,
  integration:{
    E1:'shared-page-schema-runtime',E2:'catalog-search-channel-and-product-eligibility-authority',E3:'game-finder-over-existing-eligible-products',
    E6:'platform-and-accessory-compatibility-evidence',E7:'structured-platform-genre-player-and-product-facts',E10:'gaming-guides-reviews-and-editorial-content-authority',E13:'provider-neutral-cart-checkout-and-final-validation',
  },
  authorityRule:'discovery-never-invents-release-date-rating-review-score-platform-support-price-stock-or-order-authority',
  compatibilityPrinciples:{unknownIsCompatible:false,explainable:true,serverFinalValidation:true,noSilentReplacement:true},
  separation:{rigForge:'no-pc-build-configurator',lootVault:'no-collector-drop-or-merch-vault-authority'},
} as const);

export const PLAYROOM_DISCOVERY_PATH=['Válassz platformot','Nézd meg az újdonságokat','Találd meg a játékot','Játssz együtt','Egészítsd ki'] as const;
export const PLAYROOM_HOME_SECTION_ORDER=['Commerce Header','Gaming Hero','USP Row','Play Style & Platform','Gaming Setup','Player 2','Upgrade Your Game Night','Featured Games','Platform Compatibility & Gift','Play Together Community','Footer'] as const;

const node=(input:StorefrontComponentNode):StorefrontComponentNode=>input;
const responsive=(desktop:StorefrontGridSpan,tablet:StorefrontGridSpan=desktop,mobile:StorefrontGridSpan=12):StorefrontComponentNode['responsive']=>({desktop:{gridSpan:desktop},tablet:{gridSpan:tablet},mobile:{gridSpan:mobile}});
const neonPanel={background:'linear-gradient(145deg,rgba(31,29,65,.96) 0%,rgba(17,16,37,.98) 72%,rgba(11,10,26,.99) 100%)',border:'1px solid rgba(92,124,250,.34)',borderRadius:'1.25rem',boxShadow:'0 28px 90px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.03)'} as const;
const section=(id:string,children:StorefrontComponentNode[],tone='background',options?:{spacing?:string;style?:Record<string,unknown>;innerStyle?:Record<string,unknown>;presentation?:string}):StorefrontComponentNode=>node({
  id,componentKey:'layout.section',componentVersion:1,
  config:{tone,spacing:options?.spacing??'xl',width:'full',...(options?.presentation?{presentation:options.presentation}:{}),...(options?.style?{style:options.style}:{})},
  children:[node({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'m',...(options?.innerStyle?{style:options.innerStyle}:{})},children})],
});
const grid=(id:string,children:StorefrontComponentNode[],columns=12,gap='m',style?:Record<string,unknown>):StorefrontComponentNode=>node({id,componentKey:'layout.grid',componentVersion:1,config:{columns,gap,align:'stretch',...(style?{style}:{})},children});
const stack=(id:string,children:StorefrontComponentNode[],span?:StorefrontComponentNode['responsive'],style?:Record<string,unknown>):StorefrontComponentNode=>node({id,componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'m',align:'stretch',justify:'start',...(style?{style}:{})},...(span?{responsive:span}:{}),children});
const heading=(id:string,value:string,level=2,style?:Record<string,unknown>):StorefrontComponentNode=>node({id,componentKey:'content.heading',componentVersion:1,config:{text:value,level,align:'left',tone:'text',typography:{fontToken:'heading',fontWeight:level===1?900:800,lineHeight:level===1?.92:1.02,letterSpacingEm:level===1?-.055:-.03},...(style?{style}:{})}});
const copy=(id:string,value:string,style?:Record<string,unknown>):StorefrontComponentNode=>node({id,componentKey:'content.text',componentVersion:1,config:{text:value,as:'p',align:'left',tone:'muted',typography:{fontToken:'body',lineHeight:1.58},...(style?{style}:{})}});
const button=(id:string,label:string,href:string,variant:'primary'|'secondary'|'ghost'='primary'):StorefrontComponentNode=>node({id,componentKey:'content.button',componentVersion:1,config:{label,href,variant,size:'l',ariaLabel:label,style:{borderRadius:'.75rem',fontWeight:800,boxShadow:variant==='primary'?'0 12px 34px rgba(92,124,250,.25)':'none'}}});
const image=(id:string,src:string,alt:string,span?:StorefrontComponentNode['responsive'],style?:Record<string,unknown>,presentation?:string):StorefrontComponentNode=>node({id,componentKey:'content.image',componentVersion:1,config:{src,alt,width:1200,height:900,fit:'cover',loading:id==='playroom-hero-art'?'eager':'lazy',radius:'l',objectPosition:'center',...(presentation?{presentation}:{}),style:{boxShadow:'0 30px 80px rgba(0,0,0,.34)',...(style??{})}},...(span?{responsive:span}:{})});
const eyebrow=(id:string,value:string,color='#B8E34A'):StorefrontComponentNode=>node({id,componentKey:'content.text',componentVersion:1,config:{text:value,as:'strong',align:'left',tone:'text',style:{color,fontWeight:900,letterSpacing:'.16em',fontSize:'.69rem',textTransform:'uppercase'}}});

const NAV_ITEMS=[
  {label:'Játékok',href:'/webaruhaz'},
  {label:'Platformok',href:'/webaruhaz?filter=platform'},
  {label:'Közös játék',href:'/webaruhaz?filter=multiplayer'},
  {label:'Kiegészítők',href:'/webaruhaz?filter=accessory'},
  {label:'Ajándék',href:'/webaruhaz?filter=gift'},
  {label:'Útmutatók',href:'/blog'},
] as const;
const UTILITY_ITEMS=[{label:'Fiókom',href:'/fiokom',symbol:'◎'},{label:'Kedvencek',href:'/kedvencek',symbol:'♡'},{label:'Kosár',href:'/kosar',symbol:'▣'}] as const;
const header=(prefix:string):StorefrontComponentNode=>node({
  id:`${prefix}-header`,componentKey:'system.commerce-header',componentVersion:1,
  config:{
    brandLabel:'Playroom',brandHref:'/',logoUrl:'/storefront/playroom/brand-mark.svg',logoAlt:'Playroom gamepad jel',tagline:'PLAY · DISCOVER · TOGETHER',utilityItems:UTILITY_ITEMS,tone:'background',sticky:true,presentation:'commerce-two-tier',
    style:{background:'rgba(7,8,26,.96)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(92,124,250,.28)',boxShadow:'0 16px 46px rgba(0,0,0,.22)'},
    innerStyle:{paddingTop:'.85rem',paddingBottom:'.7rem'},
    brandStyle:{fontSize:'1.02rem'},taglineStyle:{color:'#8FDFFF',letterSpacing:'.12em'},logoStyle:{width:'2.65rem',height:'2.65rem'},utilityStyle:{gap:'.55rem'},
    styleSlots:{navigationFrame:{base:{borderTop:'1px solid rgba(92,124,250,.2)',paddingTop:'.55rem'}},utilityItem:{base:{background:'rgba(21,20,44,.9)',border:'1px solid rgba(92,124,250,.36)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.03)'}}},
  },
  bindings:{brandLabel:{path:'brand.name',fallback:'Playroom'},brandHref:{path:'brand.homeHref',fallback:'/'},logoUrl:{path:'brand.logoUrl',fallback:'/storefront/playroom/brand-mark.svg'}},
  children:[
    node({id:`${prefix}-search`,componentKey:'system.search',componentVersion:1,config:{action:'/kereses',queryParam:'q',placeholder:'Keress játékot, platformot vagy kiegészítőt…',buttonLabel:'Keresés',ariaLabel:'Keresés a webshopban',presentation:'commerce',style:{background:'rgba(17,16,37,.9)',border:'1px solid rgba(92,124,250,.42)',boxShadow:'0 0 0 1px rgba(92,124,250,.06), inset 0 1px 0 rgba(255,255,255,.02)'},inputStyle:{color:'#FFF7E8'},buttonStyle:{background:'linear-gradient(135deg,#5C7CFA 0%,#4465ED 100%)'}}}),
    node({id:`${prefix}-nav`,componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',items:NAV_ITEMS,layout:'horizontal',style:{fontWeight:800,fontSize:'.82rem',letterSpacing:'.025em'}}}),
  ],
});
const footerFallback=[
  {id:'play',title:'Játssz',items:[{label:'Játékok',href:'/webaruhaz'},{label:'Game Finder',href:'/oldal/game-finder'},{label:'Platformok',href:'/webaruhaz?filter=platform'}]},
  {id:'together',title:'Együtt',items:[{label:'Közös játék',href:'/webaruhaz?filter=multiplayer'},{label:'Ajándék',href:'/webaruhaz?filter=gift'},{label:'Kiegészítők',href:'/webaruhaz?filter=accessory'}]},
  {id:'learn',title:'Fedezd fel',items:[{label:'Útmutatók',href:'/blog'},{label:'GYIK',href:'/gyik'},{label:'Kapcsolat',href:'/kapcsolat'}]},
];
const footer=(prefix:string):StorefrontComponentNode=>node({id:`${prefix}-footer`,componentKey:'editorial.footer',componentVersion:1,config:{brandLabel:'Playroom',columns:footerFallback,copyright:'© Playroom',tone:'background'},bindings:{brandLabel:{path:'brand.name',fallback:'Playroom'},copyright:{path:'brand.copyright',fallback:'© Playroom'}}});

const globalStyleState={version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{background:'#0b0a1a',surface:'#15142c',surfaceMuted:'#211f3e',text:'#fff7e8',mutedText:'#b8b4c7',border:'#373259',primary:'#5c7cfa',primaryContrast:'#ffffff',accent:'#ff6b5e',accentSecondary:'#5c7cfa',accentTertiary:'#b8e34a',headingFont:'geometric-sans',bodyFont:'system-sans',spacingScale:'comfortable',radiusScale:'soft'}} as const;
const fidelityState={engineVersion:STOREFRONT_FIDELITY_ENGINE_VERSION,editMode:'normal',designGuard:{mode:'warn'}} as const;
const base=(pageKey:string,pageType:StorefrontBuilderPageType,sections:StorefrontComponentNode[],metadata:Record<string,unknown>={}):StorefrontPageDocument=>({
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey,pageType,templateKey:PLAYROOM_TEMPLATE_KEY,templateVersion:PLAYROOM_TEMPLATE_VERSION,
  metadata:{scaleOutTemplate:'Playroom',templateCategory:'gaming-geek',visualDNA:PLAYROOM_VISUAL_DNA.character,[STOREFRONT_GLOBAL_STYLES_METADATA_KEY]:globalStyleState,[STOREFRONT_FIDELITY_METADATA_KEY]:fidelityState,...metadata},sections,
});
const productGrid=(id:string,title:string,path:string,columns=4):StorefrontComponentNode=>node({id,componentKey:'commerce.product-grid',componentVersion:1,config:{title,products:[],columns,presentation:'standard',showBadges:true,showCompareAt:true,showCta:true,ctaLabel:'Megnézem',imageRatio:'4 / 5',emptyLabel:'Jelenleg nincs megjeleníthető termék.',currency:'HUF',styleSlots:{root:{base:{gap:'1.5rem'}},grid:{base:{gap:'1rem'}},card:{base:{background:'linear-gradient(180deg,#1A1835 0%,#111025 100%)',border:'1px solid rgba(92,124,250,.34)',borderRadius:'1rem',padding:'.72rem',boxShadow:'0 22px 54px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.03)'}},media:{base:{borderRadius:'.78rem',background:'#0E0D22'}},badge:{base:{background:'#B8E34A',color:'#0B0A1A',borderRadius:'999px',fontWeight:900}},cta:{base:{borderRadius:'.65rem',background:'#5C7CFA',color:'#FFFFFF'}}}},bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:[]}}});
const recommendations=(id:string,title:string,path:string):StorefrontComponentNode=>node({id,componentKey:'commerce.recommendation-row',componentVersion:1,config:{title,products:[],columns:4,emptyLabel:'Jelenleg nincs kapcsolódó ajánlat.',currency:'HUF',showCta:true,ctaLabel:'Megnézem',imageRatio:'4 / 5',styleSlots:{card:{base:{background:'#15142C',border:'1px solid #373259',borderRadius:'1rem',padding:'.65rem'}}}},bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:[]}}});
const pageIntro=(id:string,eyebrowValue:string,title:string,description:string):StorefrontComponentNode=>section(id,[stack(`${id}-stack`,[eyebrow(`${id}-eyebrow`,eyebrowValue),heading(`${id}-title`,title,1,{maxWidth:'18ch'}),copy(`${id}-copy`,description,{maxWidth:'64ch'})],undefined,{maxWidth:'70rem'})],'background',{spacing:'l',style:{background:'linear-gradient(180deg,#111025 0%,#0B0A1A 100%)'}});
const simple=(key:string,type:StorefrontBuilderPageType,title:string,description:string,eyebrowValue='Playroom'):StorefrontPageDocument=>{const p=key.replaceAll('.','-');return base(key,type,[header(p),pageIntro(`${p}-intro`,eyebrowValue,title,description),section(`${p}-panel`,[stack(`${p}-panel-content`,[heading(`${p}-panel-title`,'Játssz a saját ritmusodban',2),copy(`${p}-panel-copy`,'Ez a Playroom oldal ugyanazt a szerkeszthető, reszponzív Page Schema és Global Styles rendszert használja, mint a teljes storefront.')],undefined,neonPanel)],'background',{spacing:'l'}),footer(p)],{visualPreset:'playroom-neon-content'});};

const trustItem=(id:string,symbol:string,title:string,description:string,span:StorefrontComponentNode['responsive']=responsive(3,6,12),symbolColor='#B8E34A')=>stack(id,[node({id:`${id}-symbol`,componentKey:'content.text',componentVersion:1,config:{text:symbol,as:'strong',align:'left',tone:'text',style:{display:'grid',placeItems:'center',width:'2.35rem',height:'2.35rem',borderRadius:'.75rem',background:'rgba(92,124,250,.12)',border:'1px solid rgba(92,124,250,.32)',color:symbolColor,fontSize:'1.2rem',boxShadow:'0 8px 22px rgba(0,0,0,.18)'}}}),heading(`${id}-title`,title,3,{fontSize:'1rem',letterSpacing:'-.01em'}),copy(`${id}-copy`,description,{fontSize:'.82rem'})],span,{padding:'1.05rem',minHeight:'9rem',background:'linear-gradient(160deg,rgba(28,26,58,.98),rgba(16,15,35,.98))',border:'1px solid rgba(92,124,250,.26)',borderRadius:'.9rem',boxShadow:'0 18px 48px rgba(0,0,0,.22)'});
const promoCard=(id:string,title:string,description:string,href:string,accent:string,artSrc:string,artAlt:string)=>stack(id,[image(`${id}-art`,artSrc,artAlt,undefined,{boxShadow:'none',border:'1px solid rgba(255,255,255,.04)',background:'#0E0D22'}),heading(`${id}-title`,title,3,{fontSize:'1.25rem'}),copy(`${id}-copy`,description,{fontSize:'.9rem'}),button(`${id}-cta`,'Felfedezem',href,'ghost')],responsive(4,6,12),{padding:'.78rem',minHeight:'19rem',background:`linear-gradient(155deg,${accent} 0%,rgba(21,20,44,.98) 46%,rgba(12,11,29,.99) 100%)`,border:'1px solid rgba(92,124,250,.28)',borderRadius:'1rem',boxShadow:'0 24px 58px rgba(0,0,0,.28)'});
const miniNote=(id:string,title:string,description:string,color:string)=>stack(id,[eyebrow(`${id}-label`,title,color),copy(`${id}-copy`,description,{fontSize:'.75rem',color:'#D7D4E3'})],responsive(4,4,12),{padding:'.78rem .9rem',background:'rgba(12,11,30,.72)',border:'1px solid rgba(92,124,250,.22)',borderRadius:'.75rem'});

const PLAYROOM_STYLE_OPTIONS=[
  {id:'solo',label:'Solo',href:'/webaruhaz?play=solo',selected:true},
  {id:'coop',label:'Co-op',href:'/webaruhaz?play=coop'},
  {id:'party',label:'Party',href:'/webaruhaz?play=party'},
  {id:'racing',label:'Racing',href:'/webaruhaz?genre=racing'},
  {id:'adventure',label:'Adventure',href:'/webaruhaz?genre=adventure'},
  {id:'family',label:'Family',href:'/webaruhaz?play=family'},
] as const;
const PLAYROOM_PLATFORM_ITEMS=[
  {id:'pc',label:'PC',href:'/webaruhaz?platform=pc'},
  {id:'playstation',label:'PlayStation',href:'/webaruhaz?platform=playstation'},
  {id:'xbox',label:'Xbox',href:'/webaruhaz?platform=xbox'},
  {id:'nintendo',label:'Nintendo',href:'/webaruhaz?platform=nintendo'},
  {id:'handheld',label:'Handheld',href:'/webaruhaz?platform=handheld'},
  {id:'mobile',label:'Mobile',href:'/webaruhaz?platform=mobile'},
] as const;

export const PLAYROOM_HOME_PAGE=base('playroom.home','home',[
  header('playroom-home'),
  section('playroom-hero',[
    grid('playroom-hero-grid',[
      stack('playroom-hero-copy',[
        eyebrow('playroom-hero-kicker','PLAYROOM / GAMING STORE'),
        node({id:'playroom-hero-title',componentKey:'content.heading',componentVersion:1,config:{text:'PLAY YOUR WAY.\nOWN THE NIGHT.',level:1,align:'left',tone:'text',accentText:'YOUR WAY',typography:{fontToken:'display',fontSizeRem:5.1,fontWeight:900,lineHeight:.84,letterSpacingEm:-.067,maxWidthCh:13},accentStyle:{color:'#FF6B5E'}}}),
        copy('playroom-hero-support','Platform, játékstílus és közös élmények szerint fedezd fel a valóban elérhető játékokat és kiegészítőket.',{maxWidth:'52ch',fontSize:'1.04rem',color:'#D7D4E3'}),
        node({id:'playroom-hero-actions',componentKey:'layout.stack',componentVersion:1,config:{direction:'horizontal',gap:'s',align:'center',justify:'start',style:{mobile:{flexDirection:'column',alignItems:'stretch'}}},children:[button('playroom-hero-primary','Játékok felfedezése','/webaruhaz','primary'),button('playroom-hero-secondary','Game Finder','#playroom-selectors','secondary')]}),
        grid('playroom-hero-notes',[miniNote('playroom-hero-note-discover','DISCOVER','Valódi katalógusból.','#B8E34A'),miniNote('playroom-hero-note-platform','PLATFORM','Strukturált adatokkal.','#8FDFFF'),miniNote('playroom-hero-note-together','TOGETHER','Közös játékra hangolva.','#FF8C82')],12,'s'),
      ],responsive(6,6,12),{padding:'clamp(1rem,2vw,2rem) 0'}),
      image('playroom-hero-art','/storefront/playroom/hero-neon.svg','Neon gaming kontroller, fénykapu és lebegő játék-szimbólumok',responsive(6,6,12),{boxShadow:'0 34px 100px rgba(0,0,0,.42),0 0 64px rgba(92,124,250,.12)'}),
    ],12,'l',{alignItems:'center'}),
  ],'background',{spacing:'xl',style:{background:'radial-gradient(circle at 76% 18%,rgba(62,93,255,.24),transparent 32%),radial-gradient(circle at 94% 58%,rgba(255,80,168,.12),transparent 26%),radial-gradient(circle at 10% 76%,rgba(255,107,94,.1),transparent 27%),linear-gradient(180deg,#08091D 0%,#0B0A1A 62%,#0E0C22 100%)',borderBottom:'1px solid rgba(92,124,250,.14)'}}),
  section('playroom-trust',[grid('playroom-trust-grid',[
    trustItem('playroom-trust-discovery','✦','Valódi játékok','A felfedezés a webshop tényleges katalógusából épül.',responsive(3,6,12),'#B8E34A'),
    trustItem('playroom-trust-platform','◫','Platform szerint','A platformadatok strukturált termékadatokra támaszkodnak.',responsive(3,6,12),'#8FDFFF'),
    trustItem('playroom-trust-together','∞','Játékra együtt','Közös játékhoz szervezett, szerkeszthető felfedezési utak.',responsive(3,6,12),'#FF8C82'),
    trustItem('playroom-trust-safe','✓','Biztonságos checkout','A végső rendelési validáció a közös commerce authority feladata.',responsive(3,6,12),'#B8E34A'),
  ],12,'s')],'background',{spacing:'s',style:{background:'linear-gradient(180deg,#0E0C22 0%,#0B0A1A 100%)'}}),
  section('playroom-selectors',[
    grid('playroom-selector-grid',[
      stack('playroom-style-card',[
        eyebrow('playroom-style-reference-label','MIT JÁTSZUNK MA?','#FF6B5E'),
        heading('playroom-style-heading','How do you play?',2),
        copy('playroom-style-copy','Válassz játékstílust, majd folytasd a felfedezést.',{color:'#D7D4E3'}),
        node({id:'playroom-game-finder',componentKey:'guided.finder',componentVersion:1,config:{
          eyebrow:'PLAY STYLE',title:'Találd meg a következő játékod',copy:'A találatok kizárólag a jogosult katalógusból érkeznek.',stepTitle:'1. lépés',stepCopy:'Válassz játékstílust.',question:'Ma hogyan játszanál?',options:PLAYROOM_STYLE_OPTIONS,progressLabel:'1 / 3',actionLabel:'Mutasd a találatokat',actionHref:'#playroom-featured-games',resultStatus:'',presentation:'editorial-choice-grid',columns:3,
          asideImage:'/storefront/playroom/play-style-neon.svg',asideImageAlt:'Neon gamer jelenet kontrollerrel',asideTitle:'PLAY YOUR WAY',asideCopy:'Solo, co-op, party vagy családi este.',
          styleSlots:{root:{base:{background:'rgba(10,9,28,.72)',border:'1px solid rgba(92,124,250,.3)',borderRadius:'1rem',overflow:'hidden'}},content:{base:{background:'linear-gradient(145deg,rgba(21,20,44,.88),rgba(12,11,30,.94))'}},option:{base:{borderRadius:'.8rem',background:'rgba(33,31,62,.9)',border:'1px solid rgba(92,124,250,.3)'}},optionActive:{base:{background:'rgba(92,124,250,.24)',border:'1px solid #5C7CFA'}},aside:{base:{background:'#111025'}},asideImage:{base:{opacity:.96}}},
        },bindings:{stepTitle:{path:'finder.currentStep.title',fallback:'1. lépés'},stepCopy:{path:'finder.currentStep.copy',fallback:'Válassz játékstílust.'},question:{path:'finder.currentQuestion.label',fallback:'Ma hogyan játszanál?'},options:{path:'finder.currentQuestion.options',fallback:PLAYROOM_STYLE_OPTIONS},progressLabel:{path:'finder.progressLabel',fallback:'1 / 3'},actionHref:{path:'finder.resultHref',fallback:'#playroom-featured-games'},resultStatus:{path:'finder.resultStatus',fallback:''}}}),
      ],responsive(7,12,12),{...neonPanel,padding:'.85rem'}),
      stack('playroom-platform-card',[
        eyebrow('playroom-platform-reference-label','VÁLASZD KI A PLATFORMOD','#8FDFFF'),
        heading('playroom-platform-heading','Choose your platform',2),
        copy('playroom-platform-copy','Ugorj közvetlenül a neked releváns platform-válogatásra.',{color:'#D7D4E3'}),
        image('playroom-platform-art','/storefront/playroom/platform-neon.svg','Neon konzolok, kézikonzol, monitor és kontroller',undefined,{boxShadow:'none',background:'#0D0C22'}),
        node({id:'playroom-platform-navigation',componentKey:'guided.attribute-navigation',componentVersion:1,config:{eyebrow:'PLATFORM',title:'Mivel játszol?',copy:'Szerkeszthető, platform-alapú belépési pontok.',columns:3,presentation:'cards',items:PLAYROOM_PLATFORM_ITEMS,styleSlots:{root:{base:{background:'transparent'}},grid:{base:{gap:'.55rem'}},card:{base:{background:'rgba(17,16,37,.88)',border:'1px solid rgba(92,124,250,.28)',borderRadius:'.8rem'}},label:{base:{fontWeight:850}}}}}),
      ],responsive(5,12,12),{...neonPanel,padding:'.85rem'}),
    ],12,'m'),
  ],'background',{spacing:'l',style:{background:'radial-gradient(circle at 14% 40%,rgba(255,107,94,.08),transparent 28%),radial-gradient(circle at 88% 48%,rgba(92,124,250,.12),transparent 32%),#0B0A1A'}}),
  section('playroom-setup',[
    grid('playroom-setup-grid',[
      image('playroom-setup-image','/storefront/playroom/setup-neon.svg','Neon gaming setup monitorral, fejhallgatóval, billentyűzettel és kontrollerrel',responsive(7,6,12),{boxShadow:'none'}),
      stack('playroom-setup-copy',[
        eyebrow('playroom-setup-kicker',"TONIGHT'S SETUP",'#8FDFFF'),
        heading('playroom-setup-title','Build the night around your game.',2),
        copy('playroom-setup-text','Játékok, kontrollerek és kiegészítők egy vizuális útvonalon — a termékadatok és az elérhetőség továbbra is a közös commerce motorból érkeznek.',{color:'#D7D4E3'}),
        button('playroom-setup-cta','Setup válogatás','/webaruhaz?collection=setup','secondary'),
      ],responsive(5,6,12),{padding:'clamp(1rem,3vw,2.7rem)',justifyContent:'center'}),
    ],12,'l',{alignItems:'center',...neonPanel,padding:'.7rem'}),
  ],'background',{spacing:'l',style:{background:'linear-gradient(180deg,#0B0A1A 0%,#0E0D24 100%)'}}),
  section('playroom-player-two',[
    grid('playroom-player-two-grid',[
      stack('playroom-player-two-copy',[
        eyebrow('playroom-player-two-kicker','PLAYER 2 READY','#FF6B5E'),
        heading('playroom-player-two-title','A jobb esték nem egyszemélyesek.',2),
        copy('playroom-player-two-text','Fedezd fel a kanapés, online és családi közös játékhoz szervezett útvonalakat.',{color:'#D7D4E3'}),
        button('playroom-player-two-cta','Közös játékok','/webaruhaz?filter=multiplayer'),
      ],responsive(5,6,12),{padding:'clamp(1rem,3vw,2.5rem)',justifyContent:'center'}),
      image('playroom-player-two-image','/storefront/playroom/player-two.svg','Két játékos közös neon gaming jelenetben',responsive(7,6,12),{boxShadow:'none'}),
    ],12,'l',{alignItems:'center',...neonPanel,padding:'.7rem'}),
  ],'background',{spacing:'l',style:{background:'radial-gradient(circle at 78% 54%,rgba(184,227,74,.07),transparent 28%),radial-gradient(circle at 18% 28%,rgba(255,107,94,.07),transparent 26%),#0B0A1A'}}),
  section('playroom-upgrade',[
    eyebrow('playroom-upgrade-kicker','UPGRADE YOUR GAME NIGHT','#B8E34A'),
    heading('playroom-upgrade-heading','Upgrade your game night',2,{maxWidth:'22ch'}),
    grid('playroom-upgrade-grid',[
      promoCard('playroom-upgrade-audio','Hear every move','Headsetek és hangkiegészítők a koncentráltabb játékélményhez.','/webaruhaz?type=audio','rgba(92,124,250,.24)','/storefront/playroom/audio-neon.svg','Neon fejhallgató'),
      promoCard('playroom-upgrade-control','Take control','Kontrollerek és input kiegészítők többféle játékstílushoz.','/webaruhaz?type=controller','rgba(255,107,94,.2)','/storefront/playroom/controller-neon.svg','Neon kontroller'),
      promoCard('playroom-upgrade-space','Own your space','Setup-kiegészítők a rendezettebb, kényelmesebb gaming térhez.','/webaruhaz?collection=setup','rgba(184,227,74,.13)','/storefront/playroom/chair-neon.svg','Neon gaming szék'),
    ],12,'m'),
  ],'background',{spacing:'l',style:{background:'linear-gradient(180deg,#0B0A1A 0%,#0E0C24 50%,#0B0A1A 100%)'}}),
  section('playroom-featured-games',[
    eyebrow('playroom-featured-kicker','NEW RELEASES / TRENDING NOW','#8FDFFF'),
    productGrid('playroomFeaturedGames','Featured games & gear','catalog.existingCommerceProducts',4),
  ],'background',{spacing:'l',style:{background:'radial-gradient(circle at 82% 16%,rgba(92,124,250,.1),transparent 25%),#0B0A1A'}}),
  section('playroom-platform-match',[
    grid('playroom-platform-gift-grid',[
      stack('playroom-compatibility-card',[
        image('playroom-compatibility-art','/storefront/playroom/compatibility-neon.svg','Neon platform-eszközök és összekapcsolt kompatibilitási motívumok',undefined,{boxShadow:'none'}),
        node({id:'playroom-platform-match-status',componentKey:'compatibility.status',componentVersion:1,config:{title:'Platform Compatibility',status:'unknown',compatibleLabel:'Kompatibilis',incompatibleLabel:'Nem kompatibilis',unknownLabel:'Ismeretlen',copy:'Az ismeretlen platform- vagy kiegészítő-kompatibilitás nem számít kompatibilisnek.'},bindings:{status:{path:'compatibility.status',fallback:'unknown'},copy:{path:'compatibility.summary',fallback:'Az ismeretlen platform- vagy kiegészítő-kompatibilitás nem számít kompatibilisnek.'}}}),
      ],responsive(6,6,12),{...neonPanel,padding:'.85rem'}),
      stack('playroom-gift-card',[
        image('playroom-gift-image','/storefront/playroom/gift-neon.svg','Neon gaming ajándékdoboz kontroller motívummal',undefined,{boxShadow:'none'}),
        eyebrow('playroom-gift-kicker','GIFT MODE','#B8E34A'),
        heading('playroom-gift-title','Ajándék, amivel tényleg lehet játszani.',2),
        copy('playroom-gift-copy','Böngéssz ajándékötletek között anélkül, hogy a sablon kitalált készletet, árat vagy kompatibilitást állítana.',{color:'#D7D4E3'}),
        button('playroom-gift-cta','Ajándékötletek','/webaruhaz?filter=gift','secondary'),
      ],responsive(6,6,12),{...neonPanel,padding:'.85rem'}),
    ],12,'m'),
  ],'background',{spacing:'l',style:{background:'linear-gradient(180deg,#0B0A1A 0%,#0F0D27 100%)'}}),
  section('playroom-play-together',[
    image('playroom-community-art','/storefront/playroom/community-neon.svg','Neon közösségi játékos-sziluettek és gamepad motívumok',responsive(12,12,12),{boxShadow:'none',border:'1px solid rgba(92,124,250,.2)'}),
    heading('playroom-community-title','PLAY TOGETHER',2,{textAlign:'center',fontSize:'clamp(2.8rem,7vw,6.5rem)',letterSpacing:'-.06em'}),
    copy('playroom-community-copy','A Playroom közösségi ritmusa: fedezd fel, válassz, hívd a többieket, és folytasd ott, ahol a játék kezdődik.',{textAlign:'center',maxWidth:'70ch',margin:'0 auto',color:'#E1DEEB'}),
    grid('playroom-community-grid',[
      trustItem('playroom-community-one','01','Discover','Találd meg a neked való játékstílust.',responsive(4,4,12),'#B8E34A'),
      trustItem('playroom-community-two','02','Match','Ellenőrizd a rendelkezésre álló platform-információt.',responsive(4,4,12),'#8FDFFF'),
      trustItem('playroom-community-three','03','Play','Lépj tovább a valódi termék- és rendelési folyamatba.',responsive(4,4,12),'#FF8C82'),
    ],12,'m'),
  ],'background',{spacing:'l',style:{background:'radial-gradient(circle at 50% 0%,rgba(92,124,250,.28),transparent 36%),linear-gradient(180deg,#14113A 0%,#0E0D28 55%,#09091C 100%)',borderTop:'1px solid rgba(92,124,250,.2)',borderBottom:'1px solid rgba(92,124,250,.2)'}}),
  footer('playroom-home'),
],{sectionOrder:PLAYROOM_HOME_SECTION_ORDER,discoveryPath:PLAYROOM_DISCOVERY_PATH,visualPreset:'neon-gaming-reference-recovery',engineBinding:'E2+E3+E6+E7+E10',visualAuthority:'Neon Gamer Webáruház Kezdőlap',fidelityRecovery:true});

export const PLAYROOM_CATALOG_PAGE=base('playroom.catalog','catalog',[
  header('playroom-catalog'),
  pageIntro('playroom-catalog-head','CATALOG','Játékok és kiegészítők','Platform, játékstílus és strukturált termékadatok szerint böngészhető kínálat.'),
  section('playroom-catalog-guidance',[node({id:'playroom-catalog-guided-nav',componentKey:'guided.attribute-navigation',componentVersion:1,config:{eyebrow:'DISCOVER',title:'Platform és játékstílus',copy:'Szűkítsd a kínálatot a számodra releváns belépési pontokkal.',columns:4,items:[{id:'platform',label:'Platform',href:'#catalog'},{id:'coop',label:'Co-op',href:'#catalog'},{id:'family',label:'Family',href:'#catalog'},{id:'accessory',label:'Accessories',href:'#catalog'}],presentation:'cards'}})]),
  section('playroom-catalog-body',[grid('playroom-catalog-layout',[node({id:'playroom-catalog-facets',componentKey:'commerce.catalog-facets',componentVersion:1,config:{title:'Szűrés',facets:[],clearHref:'/webaruhaz',clearLabel:'Törlés'},bindings:{facets:{path:'catalog.facets',fallback:[]},clearHref:{path:'catalog.clearHref',fallback:'/webaruhaz'}},responsive:responsive(3,4,12)}),node({...productGrid('playroomCatalogGrid','Válogatás','catalog.existingCommerceProducts',3),responsive:responsive(9,8,12)})],12,'l')]),
  footer('playroom-catalog'),
],{engineBinding:'E2+E7',visualPreset:'playroom-neon-catalog'});

export const PLAYROOM_PRODUCT_PAGE=base('playroom.product','product',[
  header('playroom-product'),
  section('playroom-product-main',[grid('playroom-product-grid',[
    node({id:'playroom-product-gallery',componentKey:'commerce.product-gallery',componentVersion:1,config:{images:[],aspectRatio:'4 / 5',thumbnailPosition:'left',presentation:'editorial-thumbnails',styleSlots:{main:{base:{background:'#15142C',border:'1px solid #373259',borderRadius:'1rem'}}}},bindings:{images:{path:'product.gallery',fallback:[]}},responsive:responsive(7,7,12)}),
    stack('playroom-product-buybox',[
      node({id:'playroom-product-info',componentKey:'commerce.product-info',componentVersion:1,config:{eyebrow:'Playroom',title:'Játék',price:'',compareAtPrice:'',description:'',stockLabel:'',badges:[],currency:'HUF',styleSlots:{root:{base:{background:'#15142C',border:'1px solid #373259',borderRadius:'1rem',padding:'1.25rem'}}}},bindings:{title:{path:'product.name',fallback:'Játék'},description:{path:'product.description',fallback:''},price:{path:'pricing.displayPrice',fallback:''},compareAtPrice:{path:'pricing.compareAtPrice',fallback:''},stockLabel:{path:'inventory.stockLabel',fallback:''},badges:{path:'product.badges',fallback:[]}}}),
      node({id:'playroom-product-reviews',componentKey:'commerce.review-summary',componentVersion:1,config:{rating:0,count:0,label:'Még nincs értékelés'},bindings:{rating:{path:'reviews.summary.rating',fallback:0},count:{path:'reviews.summary.count',fallback:0},label:{path:'reviews.summary.label',fallback:'Még nincs értékelés'}}}),
      node({id:'playroom-product-options',componentKey:'commerce.option-selector',componentVersion:1,config:{label:'Kiadás',options:[]},bindings:{label:{path:'variant.optionLabel',fallback:'Kiadás'},options:{path:'variant.optionOptions',fallback:[]}}}),
      node({id:'playroom-product-purchase',componentKey:'content.button',componentVersion:1,config:{label:'Kosárba teszem',href:'#purchase',variant:'primary',size:'l',ariaLabel:'Kosárba teszem',style:{width:'100%',justifyContent:'center'}},bindings:{label:{path:'commerce.purchaseLabel',fallback:'Kosárba teszem'},href:{path:'commerce.purchaseHref',fallback:'#purchase'}}}),
    ],responsive(5,5,12),{position:'relative'}),
  ],12,'l',{alignItems:'start'})]),
  section('playroom-product-facts',[node({id:'playroom-product-key-specs',componentKey:'commerce.key-specs',componentVersion:1,config:{title:'Játékadatok',items:[],columns:4,missingLabel:'Nincs megadva'},bindings:{items:{path:'product.keySpecs',fallback:[]}}}),node({id:'playroom-product-compatibility',componentKey:'compatibility.evidence',componentVersion:1,config:{title:'Platform Compatibility',items:[],emptyLabel:'Nincs ellenőrizhető kompatibilitási adat.'},bindings:{items:{path:'compatibility.productEvidence',fallback:[]}}})],'surface'),
  section('playroom-product-recommendations',[recommendations('playroomProductRecommendations','Ezek is érdekelhetnek','recommendations.products')]),
  footer('playroom-product'),
],{engineBinding:'E2+E6+E7+E13',visualPreset:'playroom-neon-pdp'});

export const PLAYROOM_SEARCH_PAGE=base('playroom.search','search',[
  header('playroom-search'),pageIntro('playroom-search-head','SEARCH','Keresési találatok','A keresés csak a jogosult, látható storefront kínálatot jeleníti meg.'),
  section('playroom-search-body',[grid('playroom-search-layout',[node({id:'playroom-search-facets',componentKey:'commerce.catalog-facets',componentVersion:1,config:{title:'Szűrés',facets:[],clearHref:'/kereses',clearLabel:'Törlés'},bindings:{facets:{path:'catalog.facets',fallback:[]}},responsive:responsive(3,4,12)}),node({...productGrid('playroomSearchResults','Találatok','catalog.existingCommerceProducts',3),responsive:responsive(9,8,12)})],12,'l')]),footer('playroom-search'),
],{engineBinding:'E2',visualPreset:'playroom-neon-search'});

export const PLAYROOM_CART_PAGE=base('playroom.cart','cart',[
  header('playroom-cart'),pageIntro('playroom-cart-head','CART','Kosár','A kosár a közös rendelési authority adatait jeleníti meg.'),
  section('playroom-cart-body',[node({id:'playroom-cart-summary',componentKey:'commerce.cart-summary',componentVersion:1,config:{lines:[],subtotal:'',total:'',currency:'HUF',checkoutHref:'/penztar',checkoutLabel:'Tovább a pénztárhoz',emptyLabel:'A kosarad jelenleg üres.'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},total:{path:'cart.total',fallback:''}}})]),footer('playroom-cart'),
],{engineBinding:'E13',visualPreset:'playroom-neon-cart'});

export const PLAYROOM_CHECKOUT_PAGE=base('playroom.checkout','checkout',[
  header('playroom-checkout'),pageIntro('playroom-checkout-head','CHECKOUT','Pénztár','Szállítás, fizetés és végső validáció a közös provider-neutral checkout authority alatt.'),
  section('playroom-checkout-body',[grid('playroom-checkout-grid',[stack('playroom-checkout-guidance',[heading('playroom-checkout-guidance-title','Biztonságos rendelési folyamat',2),copy('playroom-checkout-guidance-copy','A sablon nem tárol és nem talál ki fizetési titkokat vagy szolgáltatói állapotot. A végső rendelés-validáció az E13 feladata.')],responsive(7,7,12),neonPanel),node({id:'playroom-checkout-summary',componentKey:'commerce.checkout-summary',componentVersion:1,config:{lines:[],subtotal:'',shipping:'',total:'',currency:'HUF',secureLabel:'Biztonságos rendelés'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},shipping:{path:'cart.shipping',fallback:''},total:{path:'cart.total',fallback:''}},responsive:responsive(5,5,12)})],12,'l')]),footer('playroom-checkout'),
],{engineBinding:'E13',visualPreset:'playroom-neon-checkout'});

export const PLAYROOM_ACCOUNT_PAGE=base('playroom.account','account',[
  header('playroom-account'),
  section('playroom-account-auth-hero',[
    grid('playroom-account-auth-grid',[
      stack('playroom-account-auth-copy',[
        eyebrow('playroom-account-auth-eyebrow','PLAYER PROFILE','#8FDFFF'),
        heading('playroom-account-auth-title','Lépj vissza a játékba.',1,{maxWidth:'11ch'}),
        copy('playroom-account-auth-copy-text','Jelentkezz be a rendeléseidhez, letöltéseidhez és mentett játéklistáidhoz. A belépés és regisztráció ugyanazt a biztonságos közös fiókrendszert használja.',{maxWidth:'48ch'}),
        node({id:'playroom-account-auth-signal',componentKey:'content.text',componentVersion:1,config:{text:'PLAY · DISCOVER · TOGETHER',as:'strong',align:'left',tone:'text',style:{color:'#B8E34A',fontWeight:900,letterSpacing:'.16em',fontSize:'.72rem'}}}),
      ],responsive(7,7,12),{padding:'clamp(1.25rem,4vw,3.5rem)',minHeight:'24rem',justifyContent:'center',background:'radial-gradient(circle at 18% 12%,rgba(92,124,250,.28),transparent 38%),linear-gradient(145deg,#211F3E 0%,#111025 72%,#0B0A1A 100%)',border:'1px solid rgba(92,124,250,.38)',borderRadius:'1.35rem',boxShadow:'0 30px 90px rgba(0,0,0,.38)'}),
      stack('playroom-account-auth-status',[
        eyebrow('playroom-account-auth-status-label','FIÓK KÖZPONT','#FF6B5E'),
        heading('playroom-account-auth-status-title','Minden mentésed egy helyen',2,{fontSize:'1.65rem'}),
        copy('playroom-account-auth-status-copy','Rendelések · digitális letöltések · dokumentumok · kívánságlista'),
      ],responsive(5,5,12),{padding:'clamp(1.25rem,3vw,2.2rem)',justifyContent:'center',background:'linear-gradient(160deg,rgba(21,20,44,.98),rgba(11,10,26,.99))',border:'1px solid rgba(184,227,74,.28)',borderRadius:'1.35rem',boxShadow:'0 24px 70px rgba(0,0,0,.32)'}),
    ],12,'l')
  ],'background',{spacing:'l',style:{background:'linear-gradient(180deg,#0B0A1A 0%,#111025 52%,#0B0A1A 100%)'}}),
  footer('playroom-account'),
],{visualPreset:'playroom-auth-command-center',authComposition:'template-owned-v1'});
export const PLAYROOM_CONTENT_PAGE=simple('playroom.content','content','Playroom Guide','Szerkeszthető gaming útmutató és kampánytartalom ugyanabban a neon design systemben.','GUIDE');
export const PLAYROOM_BLOG_INDEX_PAGE=base('playroom.blog-index','blog-index',[
  header('playroom-blog-index'),pageIntro('playroom-blog-index-head','GUIDES & REVIEWS','Útmutatók','Gaming felfedezés, platform-választás és szerkesztőségi tartalom E10 authority-ből.'),section('playroom-blog-index-body',[node({id:'playroom-blog-index-preview',componentKey:'editorial.journal-preview',componentVersion:1,config:{title:'Friss útmutatók',items:[],columns:3,emptyLabel:'Hamarosan új útmutatók érkeznek.'},bindings:{items:{path:'content.guides.items',fallback:[]}}})]),footer('playroom-blog-index'),
],{engineBinding:'E10',visualPreset:'playroom-neon-editorial'});
export const PLAYROOM_BLOG_ARTICLE_PAGE=simple('playroom.blog-article','blog-article','Playroom Guide','Strukturált szerkesztőségi tartalom E10 authority-ből.','GUIDE');
export const PLAYROOM_FAQ_PAGE=simple('playroom.faq','faq','GYIK','Válaszok a vásárlás, platforminformáció és rendelési folyamat leggyakoribb kérdéseire.','HELP');
export const PLAYROOM_CONTACT_PAGE=simple('playroom.contact','contact','Kapcsolat','Kapcsolat a kereskedővel a saját márka és ügyfélszolgálati adatok szerint.','CONTACT');
export const PLAYROOM_LEGAL_PAGE=simple('playroom.legal','legal','Jogi információk','A kereskedő jogi és adatkezelési tartalmának helye.','LEGAL');
export const PLAYROOM_NOT_FOUND_PAGE=simple('playroom.not-found','not-found','404','A keresett oldal nem található. Folytasd a böngészést a játékok között.','GAME OVER?');

export const PLAYROOM_TEMPLATE_MANIFEST=defineStorefrontTemplateManifest({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,templateKey:PLAYROOM_TEMPLATE_KEY,templateVersion:PLAYROOM_TEMPLATE_VERSION,pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,minPlan:'alap',
  requiredFeatures:['catalog','inventory','orders','contentMarketing','productRecommendations','searchFiltering','commerceIntegrations'],
  pageTypes:['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'],
  responsive:{desktop:true,tablet:true,mobile:true},migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,demoContent:{namespace:'gaming-playroom',policy:STOREFRONT_DEMO_CONTENT_POLICY},
});
export const PLAYROOM_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  manifest:PLAYROOM_TEMPLATE_MANIFEST,
  pages:[PLAYROOM_HOME_PAGE,PLAYROOM_CATALOG_PAGE,PLAYROOM_PRODUCT_PAGE,PLAYROOM_SEARCH_PAGE,PLAYROOM_CART_PAGE,PLAYROOM_CHECKOUT_PAGE,PLAYROOM_ACCOUNT_PAGE,PLAYROOM_CONTENT_PAGE,PLAYROOM_BLOG_INDEX_PAGE,PLAYROOM_BLOG_ARTICLE_PAGE,PLAYROOM_FAQ_PAGE,PLAYROOM_CONTACT_PAGE,PLAYROOM_LEGAL_PAGE,PLAYROOM_NOT_FOUND_PAGE],
  demoFixtures:[
    {entityType:'collection',entityKey:'console-games',payload:{title:'Console Games',handle:'console-games',demo:true}},
    {entityType:'collection',entityKey:'play-together',payload:{title:'Play Together',handle:'play-together',demo:true}},
    {entityType:'product',entityKey:'playroom-adventure',payload:{name:'Playroom Adventure',slug:'playroom-adventure',kind:'game',demo:true}},
    {entityType:'product',entityKey:'playroom-controller',payload:{name:'Playroom Controller',slug:'playroom-controller',kind:'controller',demo:true}},
    {entityType:'content',entityKey:'platform-guide',payload:{title:'Platform Guide',kind:'gaming-guide',demo:true}},
  ],
};
