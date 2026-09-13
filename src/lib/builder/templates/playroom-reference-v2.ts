import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom';

export const PLAYROOM_REFERENCE_V2_TEMPLATE_VERSION=2 as const;

const node=(input:StorefrontComponentNode):StorefrontComponentNode=>input;
const span=(desktop:number,tablet=12,mobile=12):StorefrontComponentNode['responsive']=>({desktop:{gridSpan:desktop},tablet:{gridSpan:tablet},mobile:{gridSpan:mobile}});
const stack=(id:string,children:StorefrontComponentNode[],responsive?:StorefrontComponentNode['responsive'],style?:Record<string,unknown>,gap='s'):StorefrontComponentNode=>node({
  id,componentKey:'layout.stack',componentVersion:1,
  config:{direction:'vertical',gap,align:'stretch',justify:'start',...(style?{style}:{})},
  ...(responsive?{responsive}:{}),children,
});
const grid=(id:string,children:StorefrontComponentNode[],style?:Record<string,unknown>,gap='xs'):StorefrontComponentNode=>node({
  id,componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap,align:'stretch',...(style?{style}:{})},children,
});
const section=(id:string,children:StorefrontComponentNode[],style?:Record<string,unknown>,innerStyle?:Record<string,unknown>):StorefrontComponentNode=>node({
  id,componentKey:'layout.section',componentVersion:1,
  config:{tone:'background',spacing:'none',width:'full',...(style?{style}:{})},
  children:[node({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'full',spacing:'none',...(innerStyle?{style:innerStyle}:{})},children})],
});
const heading=(id:string,text:string,level=2,style?:Record<string,unknown>,accentText?:string,accentStyle?:Record<string,unknown>):StorefrontComponentNode=>node({
  id,componentKey:'content.heading',componentVersion:1,
  config:{text,level,align:'left',tone:'text',typography:{fontToken:'heading',fontWeight:900,lineHeight:.9,letterSpacingEm:-.05},...(accentText?{accentText}:{}),...(accentStyle?{accentStyle}:{}),...(style?{style}:{})},
});
const copy=(id:string,text:string,style?:Record<string,unknown>,as:'p'|'small'|'strong'='p'):StorefrontComponentNode=>node({
  id,componentKey:'content.text',componentVersion:1,config:{text,as,align:'left',tone:'text',typography:{fontToken:'body',lineHeight:1.4},...(style?{style}:{})},
});
const button=(id:string,label:string,href:string,variant:'primary'|'secondary'|'ghost'='primary',style?:Record<string,unknown>):StorefrontComponentNode=>node({
  id,componentKey:'content.button',componentVersion:1,config:{label,href,variant,size:'m',ariaLabel:label,...(style?{style}:{})},
});
const image=(id:string,src:string,alt:string,style?:Record<string,unknown>,responsive?:StorefrontComponentNode['responsive']):StorefrontComponentNode=>node({
  id,componentKey:'content.image',componentVersion:1,config:{src,alt,width:1200,height:720,fit:'cover',loading:id==='playroom-hero-art'?'eager':'lazy',radius:'none',objectPosition:'center',...(style?{style}:{})},...(responsive?{responsive}:{}),
});
const link=(id:string,label:string,href:string)=>button(id,label,href,'ghost',{padding:'0',border:'0',borderRadius:'0',fontSize:'.72rem',fontWeight:600,color:'#b7c7da'});

const header=node({
  id:'playroom-home-header',componentKey:'system.commerce-header',componentVersion:1,
  config:{
    brandLabel:'SHOPORATION',brandHref:'/',logoUrl:'/storefront/playroom/brand-mark.svg',logoAlt:'Shoperation Playroom gamepad jel',tagline:'PLAYROOM',
    utilityItems:[{label:'Kedvenceim',href:'/kedvencek',symbol:'♡'},{label:'Fiókom',href:'/fiokom',symbol:'♙'},{label:'Kosár',href:'/kosar',symbol:'⌑'}],
    tone:'background',sticky:true,presentation:'commerce-two-tier',showUtilityLabels:true,categoryTriggerSymbol:'☰',categoryTriggerHref:'/webaruhaz',navTagline:'JÁTÉK. KÖZÖSSÉG. ÉLMÉNY.',
    style:{background:'rgba(2,12,27,.98)',borderBottom:'1px solid rgba(54,225,255,.24)',boxShadow:'0 10px 34px rgba(0,0,0,.32)'},
    innerStyle:{maxWidth:'none',padding:'.52rem 2.4rem .34rem',gap:'.42rem'},
    brandStyle:{fontSize:'1rem',fontWeight:950,letterSpacing:'.025em'},taglineStyle:{color:'#32e8df',fontSize:'.64rem',letterSpacing:'.24em',fontWeight:900},logoStyle:{width:'2.65rem',height:'2.65rem'},
    utilityStyle:{gap:'.72rem'},
    styleSlots:{
      topRow:{base:{minHeight:'2.9rem'}},searchFrame:{base:{maxWidth:'38rem',justifySelf:'center',width:'100%'}},
      utilityItem:{base:{border:'0',background:'transparent',padding:'.28rem .2rem',borderRadius:'.25rem'}},utilityLabel:{base:{fontSize:'.72rem',fontWeight:650}},
      navigationFrame:{base:{borderTop:'1px solid rgba(69,194,255,.16)',paddingTop:'.34rem',minHeight:'2.05rem',gap:'1rem'}},
      categoryTrigger:{base:{fontSize:'1rem',paddingRight:'.35rem',color:'#f4f7ff'}},navTagline:{base:{color:'#9db2c9'}},
    },
  },
  children:[
    node({id:'playroom-home-search',componentKey:'system.search',componentVersion:1,config:{action:'/kereses',queryParam:'q',placeholder:'Keresés játékra, konzolra, kiegészítőre…',buttonLabel:'⌕',ariaLabel:'Keresés a webshopban',presentation:'commerce',style:{height:'2.45rem',background:'#f8fbff',border:'1px solid #5adfff',borderRadius:'.36rem',boxShadow:'0 0 22px rgba(38,194,255,.08)'},inputStyle:{color:'#16304e',fontSize:'.78rem'},buttonStyle:{background:'#06152d',color:'#fff',fontSize:'1.05rem',padding:'.45rem .8rem'}}),
    node({id:'playroom-home-nav',componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',layout:'horizontal',items:[
      {label:'Játékok',href:'/webaruhaz'},{label:'Konzolok',href:'/webaruhaz?category=console'},{label:'Kiegészítők',href:'/webaruhaz?category=accessory'},{label:'Gaming setup',href:'/webaruhaz?collection=setup'},{label:'Merchandise',href:'/webaruhaz?category=merch'},{label:'Ajándékötletek',href:'/webaruhaz?filter=gift'},{label:'Újdonságok',href:'/webaruhaz?sort=new'},{label:'Akciók',href:'/webaruhaz?filter=sale'},{label:'Playroom Magazin',href:'/blog'},
    ],style:{gap:'2rem',fontSize:'.75rem',fontWeight:750,color:'#f2f6ff'}}}),
  ],
});

const trustStrip=grid('playroom-trust-grid',[
  stack('playroom-trust-shipping',[copy('playroom-trust-shipping-icon','▱',{fontSize:'1.1rem',color:'#bdeaff'},'strong'),copy('playroom-trust-shipping-title','Szállítás',{fontSize:'.66rem',fontWeight:800},'strong'),copy('playroom-trust-shipping-copy','Részletek a pénztárban',{fontSize:'.58rem',color:'#9eb3c9'})],span(3,6,12),{display:'grid',gridTemplateColumns:'1.6rem 1fr',columnGap:'.35rem',rowGap:'.05rem',padding:'.38rem .55rem'}),
  stack('playroom-trust-warranty',[copy('playroom-trust-warranty-icon','◇',{fontSize:'1.1rem',color:'#bdeaff'},'strong'),copy('playroom-trust-warranty-title','Garancia',{fontSize:'.66rem',fontWeight:800},'strong'),copy('playroom-trust-warranty-copy','Termékadat szerint',{fontSize:'.58rem',color:'#9eb3c9'})],span(3,6,12),{display:'grid',gridTemplateColumns:'1.6rem 1fr',columnGap:'.35rem',rowGap:'.05rem',padding:'.38rem .55rem'}),
  stack('playroom-trust-return',[copy('playroom-trust-return-icon','⬡',{fontSize:'1.1rem',color:'#bdeaff'},'strong'),copy('playroom-trust-return-title','Elállás',{fontSize:'.66rem',fontWeight:800},'strong'),copy('playroom-trust-return-copy','Jogi feltételek szerint',{fontSize:'.58rem',color:'#9eb3c9'})],span(3,6,12),{display:'grid',gridTemplateColumns:'1.6rem 1fr',columnGap:'.35rem',rowGap:'.05rem',padding:'.38rem .55rem'}),
  stack('playroom-trust-community',[copy('playroom-trust-community-icon','♧',{fontSize:'1.1rem',color:'#bdeaff'},'strong'),copy('playroom-trust-community-title','Gamer közösség',{fontSize:'.66rem',fontWeight:800},'strong'),copy('playroom-trust-community-copy','Tippek, hírek, események',{fontSize:'.58rem',color:'#9eb3c9'})],span(3,6,12),{display:'grid',gridTemplateColumns:'1.6rem 1fr',columnGap:'.35rem',rowGap:'.05rem',padding:'.38rem .55rem'}),
],{position:'absolute',left:'.7rem',right:'.7rem',bottom:'.45rem',zIndex:4,background:'rgba(2,12,28,.82)',backdropFilter:'blur(12px)',border:'1px solid rgba(89,216,255,.18)',borderRadius:'.55rem'},'none');

const hero=stack('playroom-hero',[
  image('playroom-hero-art','/storefront/playroom/hero-room-v2.svg','Neon gamer szoba három játékossal, nagy monitorral és közösségi játékhangulattal',{position:'absolute',inset:'0',width:'100%',height:'100%',minHeight:'100%',objectFit:'cover',objectPosition:'center',opacity:.98}),
  stack('playroom-hero-copy',[
    heading('playroom-hero-title','MIT\nJÁTSZUNK\nMA?',1,{fontSize:'clamp(3rem,4.8vw,5rem)',maxWidth:'8ch',textTransform:'uppercase',filter:'drop-shadow(0 4px 16px rgba(0,0,0,.48))'},'JÁTSZUNK',{color:'#34e8ff'}),
    copy('playroom-hero-support','Játékok. Konzolok. Kiegészítők. Közös élmények. Egy helyen.',{maxWidth:'34ch',fontSize:'.86rem',fontWeight:650,color:'#f2f6ff',textWrap:'balance'}),
    button('playroom-hero-primary','Fedezd fel a lehetőségeket  →','/webaruhaz','primary',{background:'linear-gradient(90deg,#ff4cae,#ff72b8)',color:'#071021',border:'0',borderRadius:'.38rem',fontWeight:900,padding:'.72rem 1rem',boxShadow:'0 12px 30px rgba(255,64,176,.26)'}),
  ],undefined,{position:'relative',zIndex:3,width:'48%',minHeight:'14.1rem',padding:'1.25rem 1.35rem',justifyContent:'center',background:'linear-gradient(90deg,rgba(2,10,24,.95) 0%,rgba(2,10,24,.72) 68%,rgba(2,10,24,0) 100%)'},'xs'),
  trustStrip,
],span(8,12,12),{position:'relative',minHeight:'18.2rem',overflow:'hidden',border:'1px solid rgba(51,205,255,.22)',borderRadius:'.65rem',background:'#071328',boxShadow:'0 18px 52px rgba(0,0,0,.36)'},'none');

const playStyleOptions=[
  {id:'solo',label:'Solo',href:'/webaruhaz?play=solo',symbol:'●',selected:true},{id:'coop',label:'Co-op',href:'/webaruhaz?play=coop',symbol:'∞'},{id:'party',label:'Party',href:'/webaruhaz?play=party',symbol:'✦'},{id:'racing',label:'Racing',href:'/webaruhaz?genre=racing',symbol:'◈'},{id:'adventure',label:'Adventure',href:'/webaruhaz?genre=adventure',symbol:'▲'},{id:'family',label:'Family',href:'/webaruhaz?play=family',symbol:'♧'},
];
const platformItems=[
  {id:'playsphere',label:'▰ PlaySphere',href:'/webaruhaz?platform=playsphere'},{id:'boxone',label:'◉ BoxOne',href:'/webaruhaz?platform=boxone'},{id:'nintari',label:'▣ Nintari',href:'/webaruhaz?platform=nintari'},{id:'pc',label:'▭ PC',href:'/webaruhaz?platform=pc'},{id:'handheld',label:'▱ Handheld',href:'/webaruhaz?platform=handheld'},{id:'mobile',label:'▯ Mobile',href:'/webaruhaz?platform=mobile'},
];
const selectors=stack('playroom-selectors',[
  stack('playroom-style-card',[
    heading('playroom-style-heading','Válaszd ki a játékstílusod',3,{fontSize:'1rem',letterSpacing:'-.02em'}),
    node({id:'playroom-game-finder',componentKey:'guided.finder',componentVersion:1,config:{eyebrow:'',title:'',copy:'',stepTitle:'',stepCopy:'',question:'',options:playStyleOptions,progressLabel:'',actionLabel:'',actionHref:'#playroom-featured-games',resultStatus:'',presentation:'editorial-choice-grid',columns:6,asideImage:'',asideTitle:'',asideCopy:'',styleSlots:{root:{base:{gridTemplateColumns:'1fr',border:'0',background:'transparent'}},content:{base:{padding:'0',gap:'0'}},eyebrow:{base:{display:'none'}},title:{base:{display:'none'}},copy:{base:{display:'none'}},action:{base:{display:'none'}},aside:{base:{display:'none'}},options:{base:{gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:'.42rem'}},option:{base:{minHeight:'4.65rem',padding:'.48rem .2rem',borderRadius:'.45rem',background:'linear-gradient(180deg,#0b2742,#07192d)',border:'1px solid rgba(76,208,255,.25)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04)'}},optionActive:{base:{background:'linear-gradient(180deg,#122b68,#123d83)',border:'1px solid #2c8cff',boxShadow:'0 0 20px rgba(43,117,255,.28)'}},optionMedia:{base:{fontSize:'1.4rem',color:'#4feaff'}},optionLabel:{base:{fontSize:'.62rem',fontWeight:800}}}},bindings:{stepTitle:{path:'finder.currentStep.title',fallback:''},stepCopy:{path:'finder.currentStep.copy',fallback:''},question:{path:'finder.currentQuestion.label',fallback:''},options:{path:'finder.currentQuestion.options',fallback:playStyleOptions},progressLabel:{path:'finder.progressLabel',fallback:''},actionHref:{path:'finder.resultHref',fallback:'#playroom-featured-games'},resultStatus:{path:'finder.resultStatus',fallback:''}}}),
  ],undefined,{padding:'.62rem .7rem .7rem',background:'linear-gradient(180deg,rgba(7,32,55,.98),rgba(5,23,42,.98))',border:'1px solid rgba(50,199,255,.25)',borderRadius:'.6rem'},'xs'),
  stack('playroom-platform-card',[
    heading('playroom-platform-heading','Válaszd ki a platformod',3,{fontSize:'1rem',letterSpacing:'-.02em'}),
    node({id:'playroom-platform-navigation',componentKey:'guided.attribute-navigation',componentVersion:1,config:{eyebrow:'',title:'',copy:'',columns:5,presentation:'cards',items:platformItems,styleSlots:{root:{base:{gap:'0',background:'transparent'}},eyebrow:{base:{display:'none'}},header:{base:{display:'none'}},grid:{base:{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:'.42rem'}},card:{base:{display:'grid',placeItems:'center',minHeight:'4.5rem',padding:'.45rem .18rem',borderRadius:'.45rem',background:'linear-gradient(180deg,#0a2946,#06182d)',border:'1px solid rgba(76,208,255,.24)',fontSize:'.58rem',fontWeight:800,textAlign:'center',lineHeight:1.25}}}}}),
  ],undefined,{padding:'.62rem .7rem .7rem',background:'linear-gradient(180deg,rgba(7,32,55,.98),rgba(5,23,42,.98))',border:'1px solid rgba(50,199,255,.25)',borderRadius:'.6rem'},'xs'),
],span(4,12,12),{gap:'.48rem'},'xs');

const heroComposition=section('playroom-hero-composition',[grid('playroom-hero-composition-grid',[hero,selectors],{alignItems:'stretch'},'xs')],{padding:'.5rem 1.1rem 0',background:'radial-gradient(circle at 70% 10%,rgba(22,79,140,.22),transparent 30%),#020b17'});

const setup=stack('playroom-setup',[
  image('playroom-setup-image','/storefront/playroom/setup-neon.svg','Gaming setup konzollal, kontrollerekkel, headsettel és RGB világítással',{position:'absolute',right:'0',bottom:'0',width:'58%',height:'100%',minHeight:'100%',objectFit:'contain',objectPosition:'right bottom'}),
  stack('playroom-setup-copy',[
    heading('playroom-setup-title','GAMER SETUP CSOMAG',2,{fontSize:'1.25rem',color:'#ff54cf'}),
    copy('playroom-setup-lead','Minden, amire egy legendás estéd kell.',{fontSize:'.68rem',color:'#e8f2ff'}),
    copy('playroom-setup-benefits','✓ NextGen konzol\n✓ Vezeték nélküli kontroller\n✓ Surround gaming headset\n✓ RGB töltőállomás\n✓ Exkluzív gamer szőnyeg',{whiteSpace:'pre-line',fontSize:'.65rem',lineHeight:1.5,color:'#d9f7ff'}),
    button('playroom-setup-cta','Teljes csomag megtekintése  →','/webaruhaz?collection=setup','secondary',{background:'#f8fbff',color:'#09152a',border:'0',borderRadius:'.32rem',fontSize:'.65rem',fontWeight:850,padding:'.52rem .7rem'}),
  ],undefined,{position:'relative',zIndex:2,width:'52%',padding:'.8rem .9rem'},'xs'),
],span(5,12,12),{position:'relative',minHeight:'12.7rem',overflow:'hidden',background:'radial-gradient(circle at 80% 55%,rgba(36,103,255,.32),transparent 42%),linear-gradient(135deg,#091c3c,#17134b)',border:'1px solid rgba(49,199,255,.28)',borderRadius:'.55rem'},'none');

const playerCard=(id:string,title:string,copyText:string,src:string)=>stack(id,[image(`${id}-image`,src,title,{height:'5.2rem',objectFit:'cover',borderRadius:'.38rem'}),copy(`${id}-title`,title,{fontSize:'.68rem',fontWeight:850},'strong'),copy(`${id}-copy`,copyText,{fontSize:'.56rem',color:'#a9bed3'})],span(3,6,12),{padding:'.38rem',background:'linear-gradient(180deg,#0d2a48,#071a2e)',border:'1px solid rgba(71,205,255,.2)',borderRadius:'.45rem'},'xs');
const playerTwo=stack('playroom-player-two',[
  heading('playroom-player-two-title','PLAYER 2 READY?',2,{fontSize:'1.25rem',color:'#35eddf'}),
  copy('playroom-player-two-text','Közös élmények, dupla móka.',{fontSize:'.66rem',color:'#d4e4f5'}),
  grid('playroom-player-two-grid',[
    playerCard('playroom-player-controller','Kontrollerek','Játsszatok együtt!','/storefront/playroom/controller-neon.svg'),
    playerCard('playroom-player-headset','Gaming headsetek','Tiszta kommunikáció','/storefront/playroom/audio-neon.svg'),
    playerCard('playroom-player-family','Családi játékok','Minden korosztálynak','/storefront/playroom/player-two.svg'),
    playerCard('playroom-player-couch','Kanapés co-op','Együtt a legjobb','/storefront/playroom/gift-neon.svg'),
  ],undefined,'xs'),
],span(4,12,12),{padding:'.72rem',minHeight:'12.7rem',background:'linear-gradient(155deg,#07263b,#071b31 72%,#0f1d3a)',border:'1px solid rgba(52,228,218,.26)',borderRadius:'.55rem'},'xs');

const upgradeTile=(id:string,title:string,subtitle:string,src:string)=>stack(id,[image(`${id}-image`,src,title,{height:'5rem',objectFit:'cover',borderRadius:'.35rem'}),copy(`${id}-title`,title,{fontSize:'.63rem',fontWeight:850},'strong'),copy(`${id}-copy`,subtitle,{fontSize:'.52rem',color:'#a9bed3'})],span(3,6,12),{padding:'.34rem',background:'linear-gradient(180deg,#271744,#0b1830)',border:'1px solid rgba(255,74,199,.18)',borderRadius:'.42rem'},'xs');
const upgrade=stack('playroom-upgrade',[
  heading('playroom-upgrade-heading','UPGRADE YOUR GAME NIGHT',2,{fontSize:'1.15rem',color:'#ffa04d'}),
  copy('playroom-upgrade-copy','Több, mint játék. Teljes élmény.',{fontSize:'.62rem',color:'#d7e2f1'}),
  grid('playroom-upgrade-grid',[
    upgradeTile('playroom-upgrade-monitor','Gaming monitor','Látványban az erő','/storefront/playroom/monitor-v2.svg'),
    upgradeTile('playroom-upgrade-audio','Audio','Hang, ami átvisz','/storefront/playroom/audio-neon.svg'),
    upgradeTile('playroom-upgrade-light','Világítás','Hangulat a szobádban','/storefront/playroom/lighting-v2.svg'),
    upgradeTile('playroom-upgrade-chair','Gaming szék','Kényelem hosszú távon','/storefront/playroom/chair-neon.svg'),
  ],undefined,'xs'),
],span(3,12,12),{padding:'.72rem',minHeight:'12.7rem',background:'radial-gradient(circle at 82% 20%,rgba(255,70,188,.18),transparent 38%),linear-gradient(150deg,#101c39,#11142f)',border:'1px solid rgba(95,155,255,.25)',borderRadius:'.55rem'},'xs');

const merchandising=section('playroom-merchandising',[grid('playroom-merchandising-grid',[setup,playerTwo,upgrade],{alignItems:'stretch'},'xs')],{padding:'.48rem 1.1rem 0',background:'#020b17'});

const featured=stack('playroom-featured-games',[
  stack('playroom-featured-head',[heading('playroom-featured-heading','Újdonságok & Kiemelt játékok',2,{fontSize:'1.05rem'}),copy('playroom-featured-subtitle','A webshop tényleges kínálatából.',{fontSize:'.58rem',color:'#9fb5ca'})],undefined,undefined,'none'),
  node({id:'playroomFeaturedGames',componentKey:'commerce.product-grid',componentVersion:1,config:{title:'',products:[],columns:4,presentation:'standard',showBadges:true,showCompareAt:true,showCta:true,ctaLabel:'Megnézem',imageRatio:'16 / 10',emptyLabel:'Jelenleg nincs megjeleníthető termék.',currency:'HUF',styleSlots:{root:{base:{gap:'.45rem'}},grid:{base:{gap:'.4rem'}},card:{base:{background:'linear-gradient(180deg,#0b2945,#07182c)',border:'1px solid rgba(66,202,255,.2)',borderRadius:'.42rem',padding:'.35rem',boxShadow:'0 10px 24px rgba(0,0,0,.22)'}},media:{base:{borderRadius:'.3rem',background:'#071226'}},badge:{base:{borderRadius:'.2rem',fontSize:'.52rem',fontWeight:900}},cta:{base:{borderRadius:'.25rem',fontSize:'.56rem',padding:'.4rem .55rem'}}}},bindings:{title:{path:'content.playroomFeaturedGames.title',fallback:''},products:{path:'catalog.existingCommerceProducts',fallback:[]}}}),
],span(7,12,12),{padding:'.65rem .72rem',minHeight:'11.6rem',background:'linear-gradient(180deg,#061a2e,#041425)',border:'1px solid rgba(61,199,255,.24)',borderRadius:'.55rem'},'xs');

const compatibility=stack('playroom-compatibility-card',[
  heading('playroom-compatibility-title','Platform kompatibilitás',3,{fontSize:'1rem'}),
  grid('playroom-compatibility-layout',[
    image('playroom-compatibility-art','/storefront/playroom/compatibility-neon.svg','Kontroller és platform kompatibilitási illusztráció',{height:'6.4rem',objectFit:'contain'},span(5,12,12)),
    stack('playroom-compatibility-status-wrap',[
      node({id:'playroom-platform-match-status',componentKey:'compatibility.status',componentVersion:1,config:{title:'Kompatibilitási állapot',status:'unknown',compatibleLabel:'Kompatibilis',incompatibleLabel:'Nem kompatibilis',unknownLabel:'Ismeretlen',copy:'Az ismeretlen kompatibilitás nem számít kompatibilisnek.'},bindings:{status:{path:'compatibility.status',fallback:'unknown'},copy:{path:'compatibility.summary',fallback:'Az ismeretlen kompatibilitás nem számít kompatibilisnek.'}}}),
    ],span(7,12,12),{justifyContent:'center'},'xs'),
  ],undefined,'xs'),
],span(7,12,12),{padding:'.65rem',background:'linear-gradient(160deg,#0a2944,#071a31)',border:'1px solid rgba(66,199,255,.22)',borderRadius:'.5rem'},'xs');

const gift=stack('playroom-gift-card',[
  image('playroom-gift-image','/storefront/playroom/gift-neon.svg','Neon gaming ajándékdoboz',{height:'6.2rem',objectFit:'cover',borderRadius:'.4rem'}),
  heading('playroom-gift-title','AJÁNDÉKOT KERESEL?',3,{fontSize:'1rem',color:'#a88aff'}),
  copy('playroom-gift-copy','Játékos ajándékötletek minden korosztálynak.',{fontSize:'.58rem',color:'#d1dded'}),
  button('playroom-gift-cta','Ajándékötletek  →','/webaruhaz?filter=gift','secondary',{background:'#f6f8ff',color:'#11162d',border:'0',borderRadius:'.3rem',fontSize:'.58rem',fontWeight:850,padding:'.45rem .55rem'}),
],span(5,12,12),{padding:'.6rem',background:'radial-gradient(circle at 70% 20%,rgba(255,52,207,.35),transparent 42%),linear-gradient(145deg,#171047,#23104d)',border:'1px solid rgba(174,89,255,.35)',borderRadius:'.5rem'},'xs');

const platformGift=stack('playroom-platform-match',[grid('playroom-platform-gift-grid',[compatibility,gift],undefined,'xs')],span(5,12,12),undefined,'none');
const commerce=section('playroom-commerce',[grid('playroom-commerce-grid',[featured,platformGift],{alignItems:'stretch'},'xs')],{padding:'.48rem 1.1rem 0',background:'#020b17'});

const community=section('playroom-play-together',[
  stack('playroom-community-stage',[
    image('playroom-community-art','/storefront/playroom/community-neon.svg','Gaming közösségi jelenet és kontroller motívumok',{position:'absolute',inset:'0',width:'100%',height:'100%',minHeight:'100%',objectFit:'cover',opacity:.34}),
    grid('playroom-community-grid',[
      stack('playroom-community-copy',[heading('playroom-community-title','PLAY TOGETHER',2,{fontSize:'1.45rem',color:'#d86cff'}),copy('playroom-community-copy-text','Játék összehoz. Fedezd fel új világokat, ossz meg élményeket.',{fontSize:'.62rem',color:'#d6e2f0'})],span(3,12,12),{justifyContent:'center'},'none'),
      stack('playroom-community-benefits',[copy('playroom-community-benefit-text','⬡  Termékek    ◇  Hivatalos információk    ▱  Szállítás    ⊕  Feltételek    ♧  Játékos közösség',{fontSize:'.62rem',fontWeight:750,color:'#e6f4ff',whiteSpace:'nowrap'})],span(6,12,12),{justifyContent:'center'},'none'),
      stack('playroom-community-cta',[button('playroom-community-button','Csatlakozz a közösséghez  →','/blog','primary',{width:'100%',background:'linear-gradient(90deg,#1687ff,#21bcff)',border:'0',borderRadius:'.38rem',fontSize:'.63rem',fontWeight:850,padding:'.58rem .7rem'})],span(3,12,12),{justifyContent:'center'},'none'),
    ],{position:'relative',zIndex:2,alignItems:'center'},'xs'),
  ],undefined,{position:'relative',minHeight:'4rem',overflow:'hidden',padding:'.45rem .7rem',background:'linear-gradient(90deg,#0c153c,#20115b)',border:'1px solid rgba(113,93,255,.34)',borderRadius:'.5rem'},'none'),
],{padding:'.48rem 1.1rem 0',background:'#020b17'});

const footer=section('playroom-home-footer',[
  grid('playroom-footer-grid',[
    stack('playroom-footer-brand',[image('playroom-footer-logo','/storefront/playroom/brand-mark.svg','Shoperation Playroom gamepad jel',{width:'2.6rem',height:'2.6rem',objectFit:'contain'}),heading('playroom-footer-brand-title','SHOPORATION',3,{fontSize:'.9rem'}),copy('playroom-footer-brand-subtitle','PLAYROOM',{fontSize:'.58rem',letterSpacing:'.2em',color:'#35e7df'},'strong'),copy('playroom-footer-brand-copy','Játék. Közösség. Élmény.',{fontSize:'.55rem',color:'#8fa4bb'})],span(2,6,12),undefined,'xs'),
    stack('playroom-footer-shop',[copy('playroom-footer-shop-title','Vásárlási információk',{fontSize:'.66rem',fontWeight:850},'strong'),link('playroom-footer-shipping','Szállítás','/oldal/szallitas'),link('playroom-footer-payment','Fizetés','/oldal/fizetes'),link('playroom-footer-return','Visszaküldés','/oldal/visszakuldes'),link('playroom-footer-faq','GYIK','/gyik')],span(2,6,12),undefined,'xs'),
    stack('playroom-footer-world',[copy('playroom-footer-world-title','Gaming világ',{fontSize:'.66rem',fontWeight:850},'strong'),link('playroom-footer-new','Újdonságok','/webaruhaz?sort=new'),link('playroom-footer-mag','Playroom Magazin','/blog'),link('playroom-footer-guides','Játékajánlók','/blog'),link('playroom-footer-events','Események','/blog')],span(2,6,12),undefined,'xs'),
    stack('playroom-footer-about',[copy('playroom-footer-about-title','Rólunk',{fontSize:'.66rem',fontWeight:850},'strong'),link('playroom-footer-story','Történetünk','/oldal/rolunk'),link('playroom-footer-sustain','Fenntarthatóság','/oldal/fenntarthatosag'),link('playroom-footer-career','Karrier','/oldal/karrier'),link('playroom-footer-contact','Kapcsolat','/kapcsolat')],span(2,6,12),undefined,'xs'),
    stack('playroom-footer-social',[copy('playroom-footer-social-title','Kövess minket',{fontSize:'.66rem',fontWeight:850},'strong'),copy('playroom-footer-social-icons','▶   ◎   ♪   f   ◉',{fontSize:'1rem',letterSpacing:'.12em',color:'#f4f7ff'}),copy('playroom-footer-social-copy','PLAY\nEXPLORE\nSHARE\nBELONG',{whiteSpace:'pre-line',fontSize:'.58rem',letterSpacing:'.25em',lineHeight:1.5,color:'#d36cff'},'strong')],span(4,12,12),{borderLeft:'1px solid rgba(89,139,191,.25)',paddingLeft:'1.2rem'},'xs'),
  ],{alignItems:'start'},'m'),
],{padding:'1rem 2.5rem 1.1rem',background:'linear-gradient(180deg,#03101e,#020914)',borderTop:'1px solid rgba(50,196,255,.18)'});

const legacyHome=PLAYROOM_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home');
if(!legacyHome)throw new Error('PLAYROOM_HOME_PAGE_MISSING');

export const PLAYROOM_REFERENCE_V2_HOME_PAGE:StorefrontPageDocument={
  ...legacyHome,
  templateVersion:PLAYROOM_REFERENCE_V2_TEMPLATE_VERSION,
  metadata:{
    ...(legacyHome.metadata??{}),
    canonicalUpgradeFromTemplateVersion:1,
    visualAuthority:'Neon Gamer Webáruház Kezdőlap',
    referenceFidelityRelease:'playroom-v2',
    visualPreset:'neon-gamer-commerce-reference-v2',
    fidelityRecovery:true,
    desktopComposition:'header / 8+4 hero-selectors / 5+4+3 merchandising / 7+5 commerce / community / footer',
  },
  sections:[header,heroComposition,merchandising,commerce,community,footer],
};

export const PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_TEMPLATE_PACKAGE,
  manifest:{...PLAYROOM_TEMPLATE_PACKAGE.manifest,templateVersion:PLAYROOM_REFERENCE_V2_TEMPLATE_VERSION},
  pages:PLAYROOM_TEMPLATE_PACKAGE.pages.map(page=>page.pageType==='home'?PLAYROOM_REFERENCE_V2_HOME_PAGE:{
    ...page,
    templateVersion:PLAYROOM_REFERENCE_V2_TEMPLATE_VERSION,
    metadata:{...(page.metadata??{}),canonicalUpgradeFromTemplateVersion:1,visualAuthority:'Neon Gamer Webáruház Kezdőlap',referenceFidelityRelease:'playroom-v2'},
  }),
};
