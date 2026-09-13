import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_DEMO_CONTENT_POLICY,
  STOREFRONT_PAGE_SCHEMA_VERSION,
  STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  defineStorefrontTemplateManifest,
  type StorefrontBuilderPageType,
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
const responsive=(desktop:number,tablet=desktop,mobile=12):StorefrontComponentNode['responsive']=>({desktop:{gridSpan:desktop},tablet:{gridSpan:tablet},mobile:{gridSpan:mobile}});
const neonPanel={background:'linear-gradient(145deg,#191734 0%,#111025 100%)',border:'1px solid #373259',borderRadius:'1.25rem',boxShadow:'0 24px 70px rgba(0,0,0,.28)'} as const;
const softPanel={background:'#15142C',border:'1px solid #373259',borderRadius:'1rem'} as const;
const headingStyle={fontWeight:900,letterSpacing:'-.045em',lineHeight:'.96'} as const;
const section=(id:string,children:StorefrontComponentNode[],tone='background',options?:{spacing?:string;style?:Record<string,unknown>;innerStyle?:Record<string,unknown>;presentation?:string}):StorefrontComponentNode=>node({
  id,componentKey:'layout.section',componentVersion:1,
  config:{tone,spacing:options?.spacing??'xl',width:'full',...(options?.presentation?{presentation:options.presentation}:{}),...(options?.style?{style:options.style}:{})},
  children:[node({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'m',...(options?.innerStyle?{style:options.innerStyle}:{})},children})],
});
const grid=(id:string,children:StorefrontComponentNode[],columns=12,gap='m',style?:Record<string,unknown>):StorefrontComponentNode=>node({id,componentKey:'layout.grid',componentVersion:1,config:{columns,gap,align:'stretch',...(style?{style}:{})},children});
const stack=(id:string,children:StorefrontComponentNode[],span?:StorefrontComponentNode['responsive'],style?:Record<string,unknown>):StorefrontComponentNode=>node({id,componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'m',align:'stretch',justify:'start',...(style?{style}:{})},...(span?{responsive:span}:{}),children});
const heading=(id:string,value:string,level=2,style?:Record<string,unknown>):StorefrontComponentNode=>node({id,componentKey:'content.heading',componentVersion:1,config:{text:value,level,align:'left',tone:'text',typography:{fontToken:'geometric-sans',fontWeight:level===1?900:800,lineHeight:level===1?.92:1.02,letterSpacingEm:level===1?-.055:-.03},...(style?{style}:{})}});
const copy=(id:string,value:string,style?:Record<string,unknown>):StorefrontComponentNode=>node({id,componentKey:'content.text',componentVersion:1,config:{text:value,as:'p',align:'left',tone:'muted',typography:{fontToken:'system-sans',lineHeight:1.58},...(style?{style}:{})}});
const button=(id:string,label:string,href:string,variant:'primary'|'secondary'|'ghost'='primary'):StorefrontComponentNode=>node({id,componentKey:'content.button',componentVersion:1,config:{label,href,variant,size:'l',ariaLabel:label,style:{borderRadius:'.75rem',fontWeight:800}}});
const image=(id:string,src:string,alt:string,span?:StorefrontComponentNode['responsive']):StorefrontComponentNode=>node({id,componentKey:'content.image',componentVersion:1,config:{src,alt,width:1200,height:900,fit:'cover',loading:'lazy',radius:'l',objectPosition:'center',style:{boxShadow:'0 30px 80px rgba(0,0,0,.34)'}},...(span?{responsive:span}:{})});

const NAV_ITEMS=[
  {label:'Játékok',href:'/webaruhaz'},{label:'Platformok',href:'/webaruhaz?filter=platform'},{label:'Közös játék',href:'/webaruhaz?filter=multiplayer'},{label:'Ajándék',href:'/webaruhaz?filter=gift'},{label:'Útmutatók',href:'/blog'},
] as const;
const UTILITY_ITEMS=[{label:'Fiókom',href:'/fiokom',symbol:'◎'},{label:'Kedvencek',href:'/kedvencek',symbol:'♡'},{label:'Kosár',href:'/kosar',symbol:'▢'}] as const;
const header=(prefix:string):StorefrontComponentNode=>node({
  id:`${prefix}-header`,componentKey:'system.commerce-header',componentVersion:1,
  config:{brandLabel:'Playroom',brandHref:'/',logoUrl:'',logoAlt:'Márkalogó',tagline:'PLAY · DISCOVER · TOGETHER',utilityItems:UTILITY_ITEMS,tone:'background',sticky:true,presentation:'commerce-two-tier',style:{background:'rgba(11,10,26,.96)',backdropFilter:'blur(16px)'},styleSlots:{navigationFrame:{base:{borderTop:'1px solid #373259'}},utilityItem:{base:{background:'#15142C'}}}},
  bindings:{brandLabel:{path:'brand.name',fallback:'Playroom'},brandHref:{path:'brand.homeHref',fallback:'/'},logoUrl:{path:'brand.logoUrl',fallback:''}},
  children:[
    node({id:`${prefix}-search`,componentKey:'system.search',componentVersion:1,config:{action:'/kereses',queryParam:'q',placeholder:'Keress játékot, platformot vagy kiegészítőt…',buttonLabel:'Keresés',ariaLabel:'Keresés a webshopban',presentation:'commerce',style:{background:'#15142C',border:'1px solid #373259',boxShadow:'0 0 0 1px rgba(92,124,250,.08)'},buttonStyle:{background:'#5C7CFA'}}}),
    node({id:`${prefix}-nav`,componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',items:NAV_ITEMS,layout:'horizontal',style:{fontWeight:750,fontSize:'.83rem',letterSpacing:'.02em'}}}),
  ],
});
const footerFallback=[
  {id:'play',title:'Játssz',items:[{label:'Játékok',href:'/webaruhaz'},{label:'Game Finder',href:'/oldal/game-finder'},{label:'Platformok',href:'/webaruhaz?filter=platform'}]},
  {id:'together',title:'Együtt',items:[{label:'Közös játék',href:'/webaruhaz?filter=multiplayer'},{label:'Ajándék',href:'/webaruhaz?filter=gift'},{label:'Kiegészítők',href:'/webaruhaz?filter=accessory'}]},
  {id:'learn',title:'Fedezd fel',items:[{label:'Útmutatók',href:'/blog'},{label:'GYIK',href:'/gyik'},{label:'Kapcsolat',href:'/kapcsolat'}]},
];
const footer=(prefix:string):StorefrontComponentNode=>node({id:`${prefix}-footer`,componentKey:'editorial.footer',componentVersion:1,config:{brandLabel:'Playroom',columns:footerFallback,copyright:'© Playroom',tone:'primary'},bindings:{brandLabel:{path:'brand.name',fallback:'Playroom'},copyright:{path:'brand.copyright',fallback:'© Playroom'}}});

const globalStyleState={version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{background:'#0b0a1a',surface:'#15142c',surfaceMuted:'#211f3e',text:'#fff7e8',mutedText:'#b8b4c7',border:'#373259',primary:'#5c7cfa',primaryContrast:'#ffffff',accent:'#ff6b5e',accentSecondary:'#5c7cfa',accentTertiary:'#b8e34a',headingFont:'geometric-sans',bodyFont:'system-sans',spacingScale:'comfortable',radiusScale:'soft'}} as const;
const fidelityState={engineVersion:STOREFRONT_FIDELITY_ENGINE_VERSION,editMode:'normal',designGuard:{mode:'warn'}} as const;
const base=(pageKey:string,pageType:StorefrontBuilderPageType,sections:StorefrontComponentNode[],metadata:Record<string,unknown>={}):StorefrontPageDocument=>({
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey,pageType,templateKey:PLAYROOM_TEMPLATE_KEY,templateVersion:PLAYROOM_TEMPLATE_VERSION,
  metadata:{scaleOutTemplate:'Playroom',templateCategory:'gaming-geek',visualDNA:PLAYROOM_VISUAL_DNA.character,[STOREFRONT_GLOBAL_STYLES_METADATA_KEY]:globalStyleState,[STOREFRONT_FIDELITY_METADATA_KEY]:fidelityState,...metadata},sections,
});
const productGrid=(id:string,title:string,path:string,columns=4):StorefrontComponentNode=>node({id,componentKey:'commerce.product-grid',componentVersion:1,config:{title,products:[],columns,presentation:'standard',showBadges:true,showCompareAt:true,showCta:true,ctaLabel:'Megnézem',imageRatio:'4 / 5',emptyLabel:'Jelenleg nincs megjeleníthető termék.',currency:'HUF',styleSlots:{root:{base:{gap:'1.5rem'}},grid:{base:{gap:'1rem'}},card:{base:{background:'#15142C',border:'1px solid #373259',borderRadius:'1rem',padding:'.7rem',boxShadow:'0 20px 44px rgba(0,0,0,.2)'}},media:{base:{borderRadius:'.75rem'}},badge:{base:{background:'#B8E34A',color:'#0B0A1A',borderRadius:'999px'}},cta:{base:{borderRadius:'.65rem'}}}},bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:[]}}});
const recommendations=(id:string,title:string,path:string):StorefrontComponentNode=>node({id,componentKey:'commerce.recommendation-row',componentVersion:1,config:{title,products:[],columns:4,emptyLabel:'Jelenleg nincs kapcsolódó ajánlat.',currency:'HUF',showCta:true,ctaLabel:'Megnézem',imageRatio:'4 / 5',styleSlots:{card:{base:{background:'#15142C',border:'1px solid #373259',borderRadius:'1rem',padding:'.65rem'}}}},bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:[]}}});
const pageIntro=(id:string,eyebrow:string,title:string,description:string):StorefrontComponentNode=>section(id,[stack(`${id}-stack`,[node({id:`${id}-eyebrow`,componentKey:'content.text',componentVersion:1,config:{text:eyebrow,as:'small',align:'left',tone:'text',style:{color:'#B8E34A',fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase'}}}),heading(`${id}-title`,title,1,{maxWidth:'18ch'}),copy(`${id}-copy`,description,{maxWidth:'64ch'})],undefined,{maxWidth:'70rem'})],'background',{spacing:'l',style:{background:'linear-gradient(180deg,#111025 0%,#0B0A1A 100%)'}});
const simple=(key:string,type:StorefrontBuilderPageType,title:string,description:string,eyebrow='Playroom'):StorefrontPageDocument=>{const p=key.replaceAll('.','-');return base(key,type,[header(p),pageIntro(`${p}-intro`,eyebrow,title,description),section(`${p}-panel`,[stack(`${p}-panel-content`,[heading(`${p}-panel-title`,'Játssz a saját ritmusodban',2),copy(`${p}-panel-copy`,'Ez a Playroom oldal ugyanazt a szerkeszthető, reszponzív Page Schema és Global Styles rendszert használja, mint a teljes storefront.')],undefined,neonPanel)],'background',{spacing:'l'}),footer(p)],{visualPreset:'playroom-neon-content'});};

const trustItem=(id:string,symbol:string,title:string,description:string)=>stack(id,[node({id:`${id}-symbol`,componentKey:'content.text',componentVersion:1,config:{text:symbol,as:'strong',align:'left',tone:'text',style:{color:'#B8E34A',fontSize:'1.25rem'}}}),heading(`${id}-title`,title,3,{fontSize:'1rem',letterSpacing:'-.01em'}),copy(`${id}-copy`,description,{fontSize:'.82rem'})],undefined,{padding:'1rem',background:'#15142C',border:'1px solid #373259',borderRadius:'.85rem'});
const promoCard=(id:string,title:string,description:string,href:string,accent:string)=>stack(id,[heading(`${id}-title`,title,3,{fontSize:'1.25rem'}),copy(`${id}-copy`,description,{fontSize:'.9rem'}),button(`${id}-cta`,'Felfedezem',href,'ghost')],undefined,{padding:'1.25rem',minHeight:'12rem',background:`linear-gradient(145deg,${accent} 0%,#15142C 72%)`,border:'1px solid #373259',borderRadius:'1rem',boxShadow:'0 18px 42px rgba(0,0,0,.22)'});

export const PLAYROOM_HOME_PAGE=base('playroom.home','home',[
  header('playroom-home'),
  section('playroom-hero',[
    grid('playroom-hero-grid',[
      stack('playroom-hero-copy',[node({id:'playroom-hero-kicker',componentKey:'content.text',componentVersion:1,config:{text:'PLAYROOM / GAMING STORE',as:'strong',align:'left',tone:'text',style:{color:'#B8E34A',fontWeight:850,letterSpacing:'.15em',fontSize:'.72rem'}}}),node({id:'playroom-hero-title',componentKey:'content.heading',componentVersion:1,config:{text:'PLAY YOUR WAY.\nOWN THE NIGHT.',level:1,align:'left',tone:'text',accentText:'YOUR WAY',typography:{fontToken:'geometric-sans',fontSizeRem:4.8,fontWeight:900,lineHeight:.86,letterSpacingEm:-.065,maxWidthCh:13},accentStyle:{color:'#FF6B5E'}}}),copy('playroom-hero-support','Platform, játékstílus és közös élmények szerint fedezd fel a valóban elérhető játékokat és kiegészítőket.',{maxWidth:'54ch',fontSize:'1.04rem'}),node({id:'playroom-hero-actions',componentKey:'layout.stack',componentVersion:1,config:{direction:'horizontal',gap:'s',align:'center',justify:'start',style:{mobile:{flexDirection:'column',alignItems:'stretch'}}},children:[button('playroom-hero-primary','Játékok felfedezése','/webaruhaz','primary'),button('playroom-hero-secondary','Game Finder','#playroom-selectors','secondary')]})],responsive(7,6,12),{padding:'clamp(1rem,2vw,2rem) 0'}),
      image('playroom-hero-art','/storefront/playroom/hero-neon.svg','Neon gaming kontroller és absztrakt fények',responsive(5,6,12)),
    ],12,'l',{alignItems:'center'}),
  ],'background',{spacing:'xl',style:{background:'radial-gradient(circle at 80% 20%,rgba(92,124,250,.16),transparent 36%),radial-gradient(circle at 15% 80%,rgba(255,107,94,.13),transparent 30%),#0B0A1A'}}),
  section('playroom-trust',[grid('playroom-trust-grid',[trustItem('playroom-trust-discovery','✦','Valódi kínálat','A felfedezés a webshop tényleges katalógusából épül.'),trustItem('playroom-trust-platform','⌁','Platform szerint','A platformadatok strukturált termékadatokra támaszkodnak.'),trustItem('playroom-trust-together','∞','Játssz együtt','Közös játékhoz szervezett, szerkeszthető felfedezési utak.'),trustItem('playroom-trust-safe','✓','Biztonságos checkout','A végső rendelési validáció a közös commerce authority feladata.')],4,'s')],'background',{spacing:'s'}),
  section('playroom-selectors',[
    grid('playroom-selector-grid',[
      stack('playroom-style-card',[heading('playroom-style-heading','How do you play?',2),copy('playroom-style-copy','Válassz játékstílust, majd folytasd a felfedezést.'),node({id:'playroom-game-finder',componentKey:'guided.finder',componentVersion:1,config:{eyebrow:'PLAY STYLE',title:'Találd meg a következő játékod',copy:'A találatok kizárólag a jogosult katalógusból érkeznek.',stepTitle:'1. lépés',stepCopy:'Válassz játékstílust.',question:'Ma hogyan játszanál?',options:[],progressLabel:'1 / 3',actionLabel:'Mutasd a találatokat',actionHref:'#playroom-featured-games',resultStatus:'',presentation:'cards',columns:2,styleSlots:{root:{base:{background:'#111025',border:'1px solid #373259',borderRadius:'1rem',padding:'1rem'}}}},bindings:{stepTitle:{path:'finder.currentStep.title',fallback:'1. lépés'},stepCopy:{path:'finder.currentStep.copy',fallback:'Válassz játékstílust.'},question:{path:'finder.currentQuestion.label',fallback:'Ma hogyan játszanál?'},options:{path:'finder.currentQuestion.options',fallback:[]},progressLabel:{path:'finder.progressLabel',fallback:'1 / 3'},actionHref:{path:'finder.resultHref',fallback:'#playroom-featured-games'},resultStatus:{path:'finder.resultStatus',fallback:''}}})],responsive(6,6,12),neonPanel),
      stack('playroom-platform-card',[heading('playroom-platform-heading','Choose your platform',2),copy('playroom-platform-copy','Ugorj közvetlenül a neked releváns platform-válogatásra.'),node({id:'playroom-platform-navigation',componentKey:'guided.attribute-navigation',componentVersion:1,config:{eyebrow:'PLATFORM',title:'Mivel játszol?',copy:'Szerkeszthető, platform-alapú belépési pontok.',columns:2,presentation:'cards',items:[{id:'console-a',label:'Console',href:'/webaruhaz?platform=console'},{id:'handheld',label:'Handheld',href:'/webaruhaz?platform=handheld'},{id:'pc',label:'PC',href:'/webaruhaz?platform=pc'},{id:'accessory',label:'Accessories',href:'/webaruhaz?type=accessory'}],styleSlots:{root:{base:{background:'#111025',border:'1px solid #373259',borderRadius:'1rem',padding:'1rem'}}}}})],responsive(6,6,12),neonPanel),
    ],12,'m'),
  ],'background',{spacing:'l'}),
  section('playroom-setup',[
    grid('playroom-setup-grid',[image('playroom-setup-image','/storefront/playroom/setup-neon.svg','Neon gaming setup monitorral és kontrollerrel',responsive(7,6,12)),stack('playroom-setup-copy',[node({id:'playroom-setup-kicker',componentKey:'content.text',componentVersion:1,config:{text:'GAMING SETUP',as:'strong',align:'left',tone:'text',style:{color:'#5C7CFA',fontWeight:850,letterSpacing:'.15em'}}}),heading('playroom-setup-title','Build the night around your game.',2),copy('playroom-setup-text','Játékok, kontrollerek és kiegészítők egy vizuális útvonalon — a termékadatok és az elérhetőség továbbra is a közös commerce motorból érkeznek.'),button('playroom-setup-cta','Setup válogatás','/webaruhaz?collection=setup','secondary')],responsive(5,6,12),{padding:'clamp(1rem,3vw,2.5rem)',justifyContent:'center'})],12,'l',{alignItems:'center'}),
  ],'surface',{spacing:'l',style:neonPanel}),
  section('playroom-player-two',[
    grid('playroom-player-two-grid',[stack('playroom-player-two-copy',[node({id:'playroom-player-two-kicker',componentKey:'content.text',componentVersion:1,config:{text:'PLAYER 2 READY',as:'strong',align:'left',tone:'text',style:{color:'#FF6B5E',fontWeight:850,letterSpacing:'.15em'}}}),heading('playroom-player-two-title','A jobb esték nem egyszemélyesek.',2),copy('playroom-player-two-text','Fedezd fel a kanapés, online és családi közös játékhoz szervezett útvonalakat.'),button('playroom-player-two-cta','Közös játékok','/webaruhaz?filter=multiplayer')],responsive(5,6,12),{padding:'clamp(1rem,3vw,2.5rem)',justifyContent:'center'}),image('playroom-player-two-image','/storefront/playroom/player-two.svg','Két játékos közös neon gaming jelenetben',responsive(7,6,12))],12,'l',{alignItems:'center'}),
  ],'background',{spacing:'l'}),
  section('playroom-upgrade',[heading('playroom-upgrade-heading','Upgrade your game night',2,{maxWidth:'18ch'}),grid('playroom-upgrade-grid',[promoCard('playroom-upgrade-audio','Hear every move','Headsetek és hangkiegészítők a koncentráltabb játékélményhez.','/webaruhaz?type=audio','rgba(92,124,250,.26)'),promoCard('playroom-upgrade-control','Take control','Kontrollerek és input kiegészítők többféle játékstílushoz.','/webaruhaz?type=controller','rgba(255,107,94,.22)'),promoCard('playroom-upgrade-space','Own your space','Setup-kiegészítők a rendezettebb, kényelmesebb gaming térhez.','/webaruhaz?collection=setup','rgba(184,227,74,.15)')],3,'m')],'background',{spacing:'l'}),
  section('playroom-featured-games',[productGrid('playroomFeaturedGames','Featured games & gear','catalog.existingCommerceProducts',4)],'background',{spacing:'l'}),
  section('playroom-platform-match',[
    grid('playroom-platform-gift-grid',[node({id:'playroom-platform-match-status',componentKey:'compatibility.status',componentVersion:1,config:{title:'Platform Compatibility',status:'unknown',compatibleLabel:'Kompatibilis',incompatibleLabel:'Nem kompatibilis',unknownLabel:'Ismeretlen',copy:'Az ismeretlen platform- vagy kiegészítő-kompatibilitás nem számít kompatibilisnek.'},bindings:{status:{path:'compatibility.status',fallback:'unknown'},copy:{path:'compatibility.summary',fallback:'Az ismeretlen platform- vagy kiegészítő-kompatibilitás nem számít kompatibilisnek.'}},responsive:responsive(6,6,12)}),stack('playroom-gift-card',[image('playroom-gift-image','/storefront/playroom/gift-neon.svg','Neon gaming ajándékdoboz kontroller motívummal'),node({id:'playroom-gift-kicker',componentKey:'content.text',componentVersion:1,config:{text:'GIFT MODE',as:'strong',align:'left',tone:'text',style:{color:'#B8E34A',fontWeight:850,letterSpacing:'.15em'}}}),heading('playroom-gift-title','Ajándék, amivel tényleg lehet játszani.',2),copy('playroom-gift-copy','Böngéssz ajándékötletek között anélkül, hogy a sablon kitalált készletet, árat vagy kompatibilitást állítana.'),button('playroom-gift-cta','Ajándékötletek','/webaruhaz?filter=gift','secondary')],responsive(6,6,12),neonPanel)],12,'m'),
  ],'surface',{spacing:'l'}),
  section('playroom-play-together',[heading('playroom-community-title','PLAY TOGETHER',2,{textAlign:'center',fontSize:'clamp(2.6rem,7vw,6.5rem)',letterSpacing:'-.06em'}),copy('playroom-community-copy','A Playroom közösségi ritmusa: fedezd fel, válassz, hívd a többieket, és folytasd ott, ahol a játék kezdődik.',{textAlign:'center',maxWidth:'70ch',margin:'0 auto'}),grid('playroom-community-grid',[trustItem('playroom-community-one','01','Discover','Találd meg a neked való játékstílust.'),trustItem('playroom-community-two','02','Match','Ellenőrizd a rendelkezésre álló platform-információt.'),trustItem('playroom-community-three','03','Play','Lépj tovább a valódi termék- és rendelési folyamatba.')],3,'m')],'primary',{spacing:'l',style:{background:'linear-gradient(135deg,#4E46D8 0%,#15142C 65%,#0B0A1A 100%)'}}),
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
      node({id:'playroom-product-purchase',componentKey:'content.button',componentVersion:1,config:{label:'Kosárba teszem',href:'#purchase',variant:'primary',size:'l',ariaLabel:'Kosárba teszem',style:{width:'100%',justifyContent:'center'}}}),
    ],responsive(5,5,12),{position:'relative'}),
  ],12,'l',{alignItems:'start'})]),
  section('playroom-product-facts',[node({id:'playroom-product-key-specs',componentKey:'commerce.key-specs',componentVersion:1,config:{title:'Játékadatok',items:[],columns:4,missingLabel:'Nincs megadva'},bindings:{items:{path:'product.keySpecs',fallback:[]}}}),node({id:'playroom-product-compatibility',componentKey:'compatibility.evidence',componentVersion:1,config:{title:'Platform Compatibility',evidence:[],emptyLabel:'Nincs ellenőrizhető kompatibilitási adat.'},bindings:{evidence:{path:'compatibility.productEvidence',fallback:[]}}})],'surface'),
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
  section('playroom-checkout-body',[grid('playroom-checkout-grid',[stack('playroom-checkout-guidance',[heading('playroom-checkout-guidance-title','Biztonságos rendelési folyamat',2),copy('playroom-checkout-guidance-copy','A sablon nem tárol és nem talál ki fizetési titkokat vagy szolgáltatói állapotot. A végső rendelés-validáció az E13 feladata.')],responsive(7,7,12),neonPanel),node({id:'playroom-checkout-summary',componentKey:'commerce.checkout-summary',componentVersion:1,config:{lines:[],subtotal:'',shipping:'',total:'',currency:'HUF',secureLabel:'Biztonságos rendelés'},bindings:{lines:{path:'checkout.lines',fallback:[]},subtotal:{path:'checkout.subtotal',fallback:''},shipping:{path:'checkout.shipping',fallback:''},total:{path:'checkout.total',fallback:''}},responsive:responsive(5,5,12)})],12,'l')]),footer('playroom-checkout'),
],{engineBinding:'E13',visualPreset:'playroom-neon-checkout'});

export const PLAYROOM_ACCOUNT_PAGE=simple('playroom.account','account','Fiókom','Rendelések, mentett elemek és visszatérési pontok a jogosultságok szerint.','ACCOUNT');
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
