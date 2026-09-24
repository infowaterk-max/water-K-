import type {StorefrontGridSpan} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontDemoFixture} from '@/lib/builder/storefront-template-installation';
import type {StorefrontTemplateFactoryMediaAsset} from '@/lib/builder/template-factory/scaffold';
import {
  LOOT_VAULT_HOME_PAGE,
  LOOT_VAULT_CATALOG_PAGE,
  LOOT_VAULT_PRODUCT_PAGE,
  LOOT_VAULT_CART_PAGE,
  LOOT_VAULT_CHECKOUT_PAGE,
  LOOT_VAULT_ACCOUNT_PAGE,
  LOOT_VAULT_SEARCH_PAGE,
  LOOT_VAULT_CONTENT_PAGE,
  LOOT_VAULT_BLOG_INDEX_PAGE,
  LOOT_VAULT_BLOG_ARTICLE_PAGE,
  LOOT_VAULT_FAQ_PAGE,
  LOOT_VAULT_CONTACT_PAGE,
  LOOT_VAULT_LEGAL_PAGE,
  LOOT_VAULT_NOT_FOUND_PAGE,
} from '@/lib/builder/templates/loot-vault';
import {CANONICAL_ACCOUNT_CAPABILITIES} from '@/lib/account/account-capabilities';

const MEDIA={
  hero:'/storefront-demo/loot-vault-v2/hero-cinematic.webp',
  universe1:'/storefront-demo/loot-vault-v2/category-galaxy.webp',
  universe2:'/storefront-demo/loot-vault-v2/category-heroes.webp',
  universe3:'/storefront-demo/loot-vault-v2/category-anime.webp',
  universe4:'/storefront-demo/loot-vault-v2/category-fantasy.webp',
  universe5:'/storefront-demo/loot-vault-v2/category-miniatures.webp',
  universe6:'/storefront-demo/loot-vault-v2/category-retro.webp',
  product1:'/storefront-demo/loot-vault-v2/product-figure.webp',
  product2:'/storefront-demo/loot-vault-v2/product-statue.webp',
  product3:'/storefront-demo/loot-vault-v2/product-edition.webp',
  product4:'/storefront-demo/loot-vault-v2/product-relic.webp',
  editorial1:'/storefront-demo/loot-vault-v2/background-archive.webp',
  editorial2:'/storefront-demo/loot-vault-v2/category-miniatures.webp',
  background:'/storefront-demo/loot-vault-v2/background-archive.webp',
} as const;

const LOOT_VAULT_PRODUCT_FALLBACKS=Object.freeze([
  {id:'vault-sentinel',name:'Vault Sentinel prémium figura',href:'/termek/vault-sentinel',image:MEDIA.product1,imageAlt:'Vault Sentinel prémium gyűjtői figura',price:89990,badge:'LIMITÁLT',stockLabel:'Raktáron'},
  {id:'mythic-wing',name:'Mythic Wing gyűjtői szobor',href:'/termek/mythic-wing',image:MEDIA.product2,imageAlt:'Mythic Wing fantasy gyűjtői szobor',price:129990,badge:'EXKLUZÍV',stockLabel:'Raktáron'},
  {id:'ancient-warrior',name:'Ancient Warrior gyűjtői kiadás',href:'/termek/ancient-warrior',image:MEDIA.product3,imageAlt:'Ancient Warrior gyűjtői kiadás',price:59990,badge:'ELŐRENDELÉS',stockLabel:'Előrendelhető'},
  {id:'archive-relic',name:'Archívum gyűjtői relikvia',href:'/termek/collector-archive',image:MEDIA.product4,imageAlt:'Sötét sci-fi gyűjtői relikvia',price:74990,badge:'ÚJDONSÁG',stockLabel:'Raktáron'},
]);

const n=(value:StorefrontComponentNode):StorefrontComponentNode=>value;
const responsive=(desktop:StorefrontGridSpan,tablet:StorefrontGridSpan=desktop,mobile:StorefrontGridSpan=12):StorefrontComponentNode['responsive']=>({desktop:{gridSpan:desktop},tablet:{gridSpan:tablet},mobile:{gridSpan:mobile}});

export const createLootVaultV2ShellHeader=()=>n({
  id:'loot-vault-shell-header',
  componentKey:'system.commerce-header',
  componentVersion:1,
  config:{
    brandLabel:'Loot Vault',
    brandHref:'/',
    tagline:'GYŰJTŐI VAULT',
    utilityItems:[
      {label:'Kedvenceim',href:'/kedvencek',symbol:'♡'},
      {label:'Fiókom',href:'/fiokom',symbol:'♙'},
      {label:'Kosár',href:'/kosar',symbol:'⌑'},
    ],
    tone:'background',
    sticky:true,
    presentation:'commerce-two-tier',
    showUtilityLabels:true,
    categoryTriggerSymbol:'☰',
    categoryTriggerLabel:'Univerzumok',
    categoryTriggerHref:'/webaruhaz',
    navTagline:'FANDOM. GYŰJTEMÉNY. TÖRTÉNETEK.',
    style:{background:'rgba(13,14,15,.97)',borderBottom:'1px solid rgba(165,122,69,.34)',boxShadow:'0 18px 48px rgba(0,0,0,.38)'},
    innerStyle:{maxWidth:'none',padding:'.78rem clamp(1rem,4vw,3.6rem) .5rem',gap:'.55rem'},
    brandStyle:{fontFamily:'var(--shoporation-heading-font)',fontSize:'1.42rem',fontWeight:900,letterSpacing:'.025em',color:'#f5e7d0',textShadow:'0 2px 18px rgba(205,145,70,.16)'},
    taglineStyle:{color:'#c8a872',fontSize:'.64rem',letterSpacing:'.16em',fontWeight:850},
    styleSlots:{
      topRow:{base:{minHeight:'3.35rem'}},
      searchFrame:{base:{maxWidth:'42rem',justifySelf:'center',width:'100%'}},
      utilityItem:{base:{border:'1px solid rgba(165,122,69,.28)',background:'linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.012))',borderRadius:'.72rem'}},
      navigationFrame:{base:{borderTop:'1px solid rgba(165,122,69,.18)',paddingTop:'.5rem',minHeight:'2.1rem'}},
      navTagline:{base:{color:'#9a9184'}},
    },
  },
  children:[
    n({id:'loot-vault-shell-search',componentKey:'system.search',componentVersion:1,config:{action:'/kereses',queryParam:'q',placeholder:'Keresés termékre, univerzumra…',buttonLabel:'⌕',ariaLabel:'Keresés a Loot Vaultban',presentation:'commerce',style:{height:'2.55rem',background:'#17191a',border:'1px solid rgba(165,122,69,.4)',borderRadius:'.75rem'},inputStyle:{color:'#f3ebdd',fontSize:'.78rem'},buttonStyle:{background:'#a57a45',color:'#0d0e0f',fontSize:'1rem',padding:'.45rem .9rem'}}}),
    n({id:'loot-vault-shell-nav',componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',layout:'horizontal',items:[
      {label:'Figurák',href:'/webaruhaz?category=figures'},
      {label:'Művészeti könyvek',href:'/webaruhaz?category=art-books'},
      {label:'Kiegészítők',href:'/webaruhaz?category=accessories'},
      {label:'Limitált kiadások',href:'/webaruhaz?filter=limited'},
      {label:'Előrendelések',href:'/webaruhaz?filter=preorder'},
      {label:'Vault Magazin',href:'/blog'},
    ],style:{gap:'.9rem',fontSize:'.68rem',fontWeight:760,color:'#f3ebdd'}}}),
  ],
});

export const createLootVaultV2ShellFooter=()=>n({
  id:'loot-vault-shell-footer',
  componentKey:'layout.section',
  componentVersion:1,
  config:{tone:'primary',spacing:'l',width:'full',style:{background:'#0a0b0c',borderTop:'1px solid rgba(165,122,69,.28)'}},
  children:[n({
    id:'loot-vault-shell-footer-content',
    componentKey:'editorial.footer',
    componentVersion:1,
    config:{
      brandLabel:'Loot Vault',
      columns:[
        {id:'vault',title:'Vault',items:[{label:'Webáruház',href:'/webaruhaz'},{label:'Kedvencek',href:'/kedvencek'},{label:'Kosár',href:'/kosar'},{label:'Pénztár',href:'/penztar'}]},
        {id:'journal',title:'Felfedezés',items:[{label:'Vault Magazin',href:'/blog'},{label:'Rólunk',href:'/oldal/rolunk'},{label:'GYIK',href:'/gyik'},{label:'Kapcsolat',href:'/kapcsolat'}]},
        {id:'service',title:'Vásárlási információk',items:[{label:'Szállítás és fizetés',href:'/szallitas-es-fizetes'},{label:'Visszaküldés',href:'/oldal/visszakuldes'},{label:'Fiókom',href:'/fiokom'}]},
        {id:'legal',title:'Jogi információk',items:[{label:'ÁSZF',href:'/aszf'},{label:'Adatvédelem',href:'/adatvedelem'},{label:'Impresszum',href:'/impresszum'}]},
      ],
      copyright:'© Loot Vault',
      tone:'primary',
    },
  })],
});

const section=(id:string,children:StorefrontComponentNode[],style:Record<string,unknown>={})=>n({
  id,componentKey:'layout.section',componentVersion:1,
  config:{tone:'background',spacing:'xl',width:'full',style:{background:'#0d0e0f',...style}},
  children:[n({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'m'},children})],
});
const grid=(id:string,children:StorefrontComponentNode[],gap='1.2rem')=>n({id,componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap,align:'stretch'},children});
const stack=(id:string,children:StorefrontComponentNode[],span:StorefrontGridSpan=12,style:Record<string,unknown>={})=>n({id,componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'.8rem',align:'stretch',justify:'start',style},responsive:responsive(span,span===3?6:span,12),children});
const heading=(id:string,value:string,level=2,style:Record<string,unknown>={})=>n({id,componentKey:'content.heading',componentVersion:1,config:{text:value,level,align:'left',tone:'text',typography:{fontToken:'heading',fontWeight:800,lineHeight:level===1?.92:1.02,letterSpacingEm:level===1?-.04:-.02},style:{color:'#f3ebdd',...style}}});
const text=(id:string,value:string,style:Record<string,unknown>={})=>n({id,componentKey:'content.text',componentVersion:1,config:{text:value,as:'p',align:'left',tone:'text',typography:{fontToken:'body',lineHeight:1.58},style:{color:'#a9a397',...style}}});
const button=(id:string,label:string,href:string,variant:'primary'|'secondary'='primary')=>n({id,componentKey:'content.button',componentVersion:1,config:{label,href,variant,size:'m',ariaLabel:label,style:variant==='primary'?{borderRadius:'.42rem',fontWeight:850,letterSpacing:'.02em',background:'linear-gradient(180deg,#efbf73,#c88f43)',color:'#171009',border:'1px solid #f2ca86',boxShadow:'0 10px 30px rgba(202,143,65,.22)'}:{borderRadius:'.42rem',fontWeight:800,letterSpacing:'.02em',background:'transparent',color:'#e8cfaa',border:'1px solid rgba(214,163,91,.5)'}}});
const image=(id:string,src:string,alt:string,span:StorefrontGridSpan=12,style:Record<string,unknown>={})=>n({
  id,componentKey:'content.image',componentVersion:1,
  config:{
    src,alt,width:1600,height:1000,fit:'cover',loading:id.includes('hero')?'eager':'lazy',radius:'none',objectPosition:'center center',
    artDirection:{desktop:{src,objectFit:'cover',objectPosition:'center center'},tablet:{src,objectFit:'cover',objectPosition:'center center'},mobile:{src,objectFit:'cover',objectPosition:'center center'}},
    style:{width:'100%',minHeight:'12rem',borderRadius:'.65rem',filter:'saturate(1.02) contrast(1.06) brightness(.96)',...style},
  },
  responsive:responsive(span,span===7?7:span,12),
});
const badge=(id:string,value:string)=>n({id,componentKey:'content.text',componentVersion:1,config:{text:value,as:'strong',align:'left',tone:'text',style:{display:'inline-flex',width:'fit-content',padding:'.28rem .48rem',border:'1px solid rgba(183,138,80,.62)',borderRadius:'999px',color:'#e3c89d',fontSize:'.63rem',fontWeight:850,letterSpacing:'.09em',textTransform:'uppercase'}}});

const boundHeading=(id:string,path:string,fallback:string,level=1,style:Record<string,unknown>={})=>n({
  id,componentKey:'content.heading',componentVersion:1,
  config:{text:fallback,level,align:'left',tone:'text',typography:{fontToken:'heading',fontWeight:800,lineHeight:level===1?.94:1.05,letterSpacingEm:level===1?-.035:-.02},style:{color:'#f3ebdd',...style}},
  bindings:{text:{path,fallback}},
});
const boundText=(id:string,path:string,fallback:string,style:Record<string,unknown>={})=>n({
  id,componentKey:'content.text',componentVersion:1,
  config:{text:fallback,as:'p',align:'left',tone:'text',typography:{fontToken:'body',lineHeight:1.68},style:{color:'#b9b1a5',whiteSpace:'pre-line',...style}},
  bindings:{text:{path,fallback}},
});

const universeCard=(id:string,title:string,copy:string,src:string)=>stack(id,[
  image(`${id}-image`,src,`${title} — ${copy}`,12,{height:'10rem',minHeight:'10rem'}),
  heading(`${id}-title`,title,3,{fontSize:'.95rem'}),
],2,{padding:'.48rem',background:'linear-gradient(180deg,#17191a,#111314)',border:'1px solid rgba(165,122,69,.3)',borderRadius:'.68rem',boxShadow:'0 16px 30px rgba(0,0,0,.28)'});

const productCard=(id:string,badgeText:string,title:string,price:string,src:string)=>stack(id,[
  badge(`${id}-badge`,badgeText),
  image(`${id}-image`,src,title,12,{height:'18rem',minHeight:'18rem'}),
  heading(`${id}-title`,title,3,{fontSize:'1.05rem'}),
  text(`${id}-price`,price,{fontSize:'1rem',fontWeight:800,color:'#e3c89d'}),
  button(`${id}-cta`,'Részletek','/webaruhaz'),
],3,{padding:'.65rem',background:'linear-gradient(180deg,#1b1d1d,#111314)',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.78rem',boxShadow:'0 22px 44px rgba(0,0,0,.28)'});

const commerceProductGrid=(id:string,title:string,path:string,columns=4)=>n({
  id,componentKey:'commerce.product-grid',componentVersion:1,
  config:{
    title,products:LOOT_VAULT_PRODUCT_FALLBACKS,columns,presentation:'loot-vault',showBadges:true,showCompareAt:true,showCta:false,showPurchaseActions:true,purchaseLabel:'Kosárba',wishlistLabel:'Kedvencekhez',imageRatio:'4 / 5',
    emptyLabel:'Jelenleg nincs megjeleníthető gyűjtői darab.',currency:'HUF',
    styleSlots:{
      root:{base:{gap:'1rem'}},
      title:{base:{fontFamily:'var(--shoporation-heading-font)',fontSize:'clamp(1.75rem,3vw,2.7rem)',fontWeight:800,color:'#f3ebdd'}},
      grid:{base:{gap:'.85rem'}},
      card:{base:{padding:'.6rem',gap:'.55rem',background:'linear-gradient(180deg,#1a1c1c,#101212)',border:'1px solid rgba(186,135,68,.42)',borderRadius:'.72rem',boxShadow:'0 18px 44px rgba(0,0,0,.34)'}},
      media:{base:{borderRadius:'.5rem',background:'#0a0b0c',boxShadow:'inset 0 0 0 1px rgba(255,255,255,.025)'}},
      image:{base:{filter:'saturate(1.04) contrast(1.05)'}},
      badge:{base:{background:'#d6a24f',color:'#160f08',borderRadius:'.28rem',fontWeight:900,boxShadow:'0 6px 18px rgba(0,0,0,.28)'}},
      name:{base:{fontFamily:'var(--shoporation-heading-font)',fontWeight:760,fontSize:'1rem',lineHeight:1.18,color:'#f4ecdf'}},
      price:{base:{color:'#e6c28c',fontSize:'1rem',fontWeight:850}},
      comparePrice:{base:{color:'#77746e'}},
      stock:{base:{color:'#9f998f',fontSize:'.7rem'}},
      actions:{base:{marginTop:'.15rem'}},
      purchaseAction:{base:{borderRadius:'.38rem',background:'#d7a14d',color:'#151008',fontWeight:900,padding:'.62rem .7rem'}},
      wishlistAction:{base:{borderRadius:'.38rem',borderColor:'rgba(214,162,79,.55)',background:'#121414',color:'#e4c18e'}},
      cardLinkHover:{desktop:{transform:'translateY(-2px)',filter:'brightness(1.05)'}},
      cardLinkFocus:{desktop:{boxShadow:'0 0 0 3px rgba(214,162,79,.45)'}},
    },
  },
  bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:LOOT_VAULT_PRODUCT_FALLBACKS}},
});

const override=(source:StorefrontPageDocument,sections:StorefrontComponentNode[],metadata:Record<string,unknown>)=>({
  ...structuredClone(source),
  sections,
  metadata:{...(source.metadata??{}),factoryVisualPack:'loot-vault-v2-reference-pack-v1',...metadata},
});

export const LOOT_VAULT_V2_HOME_PAGE=override(LOOT_VAULT_HOME_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-hero',[
    stack('loot-v2-hero-stage',[
      image('loot-v2-hero-art',MEDIA.hero,'Cinematikus fantasy jelenet gyűjtői Loot Vault hangulattal',12,{position:'absolute',inset:'0',height:'100%',minHeight:'100%',borderRadius:'0',filter:'sepia(.24) saturate(1.08) contrast(1.12) brightness(.76)'}),
      stack('loot-v2-hero-copy',[
        badge('loot-v2-hero-kicker','FANDOM · GYŰJTEMÉNY · TÖRTÉNETEK'),
        heading('loot-v2-hero-title','A történetek nem érnek véget.',1,{fontSize:'clamp(2.7rem,6vw,5.8rem)',maxWidth:'9ch',textShadow:'0 8px 34px rgba(0,0,0,.66)'}),
        text('loot-v2-hero-copy-text','Fedezd fel a kedvenc univerzumaidat. Gyűjts. Játssz. Légy részese.',{fontSize:'1.05rem',maxWidth:'31rem',color:'#e2d8c9',textShadow:'0 3px 18px rgba(0,0,0,.72)'}),
        button('loot-v2-hero-cta','Válaszd ki az univerzumodat','#loot-v2-universes'),
      ],12,{position:'relative',zIndex:2,width:'min(100%,45rem)',minHeight:'34rem',justifyContent:'center',padding:'clamp(2rem,6vw,5.4rem)',background:'linear-gradient(90deg,rgba(8,9,10,.92) 0%,rgba(8,9,10,.72) 58%,rgba(8,9,10,.08) 100%)'}),
    ],12,{position:'relative',minHeight:'34rem',overflow:'hidden',border:'1px solid rgba(183,138,80,.38)',borderRadius:'.9rem',boxShadow:'0 38px 90px rgba(0,0,0,.52)'}),
  ],{background:'radial-gradient(circle at 72% 20%,rgba(165,122,69,.14),transparent 30%),#0d0e0f'}),
  section('loot-v2-universes',[
    badge('loot-v2-universes-kicker','UNIVERZUMOK'),
    heading('loot-v2-universes-title','Válassz világot. Építs gyűjteményt.',2,{fontSize:'clamp(2rem,4vw,3.6rem)'}),
    grid('loot-v2-universe-grid',[
      universeCard('loot-v2-universe-1','Sci-fi legendák','Ikonikus világok és karakterközpontú gyűjtői darabok.',MEDIA.universe1),
      universeCard('loot-v2-universe-2','Fantasy birodalmak','Sötét fantasy, relikviák és prémium kiadások.',MEDIA.universe2),
      universeCard('loot-v2-universe-3','Anime & manga','Figurák, művészeti albumok és karakteres vitrindarabok.',MEDIA.universe3),
      universeCard('loot-v2-universe-4','Képregénykultúra','Hősök, anti-hősök és limitált gyűjtői kiadások.',MEDIA.universe4),
      universeCard('loot-v2-universe-5','Retro gaming','Nosztalgia, ikonikus hardver és vitrindarabok.',MEDIA.universe5),
      universeCard('loot-v2-universe-6','Sötét válogatás','Komorabb, atmoszférikus gyűjtői válogatás.',MEDIA.universe6),
    ],'.8rem'),
  ],{background:'#141616'}),
  section('loot-v2-limited',[
    badge('loot-v2-limited-kicker','VÁLOGATOTT DARABOK'),
    heading('loot-v2-limited-title','Limitált kiadások & exkluzív válogatás',2,{fontSize:'clamp(2rem,4vw,3.4rem)'}),
    text('loot-v2-limited-copy','Ritka darabok. Valódi gyűjtőknek. A státuszok mindig a valós készlet- és kiadási adatokból érkeznek.'),
    commerceProductGrid('loot-v2-product-grid','', 'catalog.featured',4),
  ],{background:'linear-gradient(180deg,#0f1111,#171919)'}),
  section('loot-v2-editorial',[
    grid('loot-v2-editorial-grid',[
      stack('loot-v2-editorial-copy',[
        badge('loot-v2-editorial-kicker','TÖBB MINT HOBBI'),
        heading('loot-v2-editorial-title','Gyűjtőknek. Rajongóknak. Történeteknek.',2,{fontSize:'clamp(2.2rem,5vw,4.4rem)',maxWidth:'10ch'}),
        text('loot-v2-editorial-text','Figurák, művészeti albumok, relikviák és limitált kiadások egy olyan környezetben, ahol a tárgy mögötti történet is számít.',{fontSize:'1rem'}),
        button('loot-v2-editorial-cta','Fedezd fel a kollekciókat','/webaruhaz'),
      ],5,{padding:'clamp(1rem,3vw,2.4rem)'}),
      image('loot-v2-editorial-image',MEDIA.editorial1,'Gyűjtői polc figurákkal és művészeti tárgyakkal',7,{height:'29rem',minHeight:'24rem'}),
    ]),
  ],{background:'radial-gradient(circle at 18% 50%,rgba(83,105,93,.18),transparent 34%),#111313'}),
  section('loot-v2-benefits',[
    grid('loot-v2-benefit-grid',[
      stack('loot-v2-benefit-1',[badge('loot-v2-benefit-1-icon','01'),heading('loot-v2-benefit-1-title','Előrendelési támogatás',3),text('loot-v2-benefit-1-text','Átlátható státuszok és valódi kiadási információk.')],3,{padding:'1rem',background:'linear-gradient(180deg,#141616,#101212)',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.6rem',boxShadow:'0 14px 36px rgba(0,0,0,.22)'}),
      stack('loot-v2-benefit-2',[badge('loot-v2-benefit-2-icon','02'),heading('loot-v2-benefit-2-title','Ellenőrzött termékadatok',3),text('loot-v2-benefit-2-text','Ritkaság és kiadás csak strukturált katalógusadatból.')],3,{padding:'1rem',background:'linear-gradient(180deg,#141616,#101212)',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.6rem',boxShadow:'0 14px 36px rgba(0,0,0,.22)'}),
      stack('loot-v2-benefit-3',[badge('loot-v2-benefit-3-icon','03'),heading('loot-v2-benefit-3-title','Biztonságos vásárlás',3),text('loot-v2-benefit-3-text','Átlátható kosár, pénztár és rendelési folyamat.')],3,{padding:'1rem',background:'linear-gradient(180deg,#141616,#101212)',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.6rem',boxShadow:'0 14px 36px rgba(0,0,0,.22)'}),
      stack('loot-v2-benefit-4',[badge('loot-v2-benefit-4-icon','04'),heading('loot-v2-benefit-4-title','Rajongói felfedezés',3),text('loot-v2-benefit-4-text','Univerzumok és történetek szerencsejátékos mechanika nélkül.')],3,{padding:'1rem',background:'linear-gradient(180deg,#141616,#101212)',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.6rem',boxShadow:'0 14px 36px rgba(0,0,0,.22)'}),
    ]),
  ],{background:'#0d0e0f'}),
  createLootVaultV2ShellFooter(),
],{referenceComposition:'accepted-2026-09-06',referenceCritical:true});

export const LOOT_VAULT_V2_CATALOG_PAGE=override(LOOT_VAULT_CATALOG_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-catalog-hero',[
    grid('loot-v2-catalog-hero-grid',[
      stack('loot-v2-catalog-copy',[
        badge('loot-v2-catalog-kicker','LOOT VAULT KATALÓGUS'),
        heading('loot-v2-catalog-title','Találd meg a következő vitrindarabot.',1,{fontSize:'clamp(2.7rem,6vw,5.2rem)',maxWidth:'11ch'}),
        text('loot-v2-catalog-text','Szűrj univerzum, formátum és gyűjtői jellemzők szerint.'),
      ],5,{padding:'1rem 0'}),
      image('loot-v2-catalog-background',MEDIA.background,'Sötét, neonfényes gyűjtői tér',7,{height:'21rem',minHeight:'18rem'}),
    ]),
  ],{background:'linear-gradient(180deg,#111313,#0d0e0f)'}),
  section('loot-v2-catalog-body',[
    grid('loot-v2-catalog-layout',[
      n({id:'loot-v2-catalog-facets',componentKey:'commerce.catalog-facets',componentVersion:1,config:{title:'Szűrők',facets:[],clearHref:'/webaruhaz',clearLabel:'Törlés'},bindings:{facets:{path:'catalog.facets',fallback:[]},clearHref:{path:'catalog.clearHref',fallback:'/webaruhaz'}},responsive:responsive(3,4,12)}),
      n({...commerceProductGrid('loot-v2-catalog-products','Gyűjtői válogatás','catalog.products',3),responsive:responsive(9,8,12)}),
    ]),
  ],{background:'#0d0e0f'}),
  createLootVaultV2ShellFooter(),
],{referenceComposition:'accepted-2026-09-06',referenceCritical:true});

const gallery=[
  {src:MEDIA.product1,alt:'Prémium gyűjtői figura sötét vitrinkörnyezetben'},
  {src:MEDIA.product2,alt:'Fantasy gyűjtői szobor részlet'},
  {src:MEDIA.product3,alt:'Dramatikus gyűjtői miniatűr kiadás'},
  {src:MEDIA.product4,alt:'Sötét sci-fi gyűjtői relikvia'},
];

export const LOOT_VAULT_V2_PRODUCT_PAGE=override(LOOT_VAULT_PRODUCT_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-product-main',[
    grid('loot-v2-product-layout',[
      n({id:'loot-v2-product-gallery',componentKey:'commerce.product-gallery',componentVersion:1,config:{images:gallery,aspectRatio:'4 / 5',thumbnailPosition:'bottom',presentation:'editorial-thumbnails',styleSlots:{root:{base:{gap:'.7rem'}},main:{base:{border:'1px solid rgba(183,138,80,.4)',borderRadius:'.75rem',background:'#0b0c0d',boxShadow:'0 28px 70px rgba(0,0,0,.38)'}},mainImage:{base:{filter:'saturate(1.03) contrast(1.04)'}},thumbnail:{base:{borderRadius:'.42rem',borderColor:'rgba(183,138,80,.28)',background:'#111314'}},thumbnailActive:{base:{boxShadow:'0 0 0 2px rgba(214,162,79,.56)'}},thumbnailHover:{desktop:{transform:'translateY(-2px)',filter:'brightness(1.08)'}},thumbnailFocus:{desktop:{boxShadow:'0 0 0 3px rgba(214,162,79,.42)'}}}},bindings:{images:{path:'product.gallery',fallback:gallery}},responsive:responsive(7,7,12)}),
      stack('loot-v2-product-buybox',[
        badge('loot-v2-product-eyebrow','LOOT VAULT'),
        n({id:'loot-v2-product-info',componentKey:'commerce.product-info',componentVersion:1,config:{eyebrow:'Loot Vault',title:'Gyűjtői kiadás',price:'59 990 Ft',compareAtPrice:'',description:'Kurált gyűjtői termék részletes kiadási és készletinformációkkal.',stockLabel:'Raktáron',badges:['Gyűjtői kiadás'],currency:'HUF',presentation:'loot-vault',styleSlots:{root:{base:{gap:'.8rem'}},badges:{base:{gap:'.35rem'}},badge:{base:{borderColor:'rgba(214,162,79,.6)',color:'#e9c990',borderRadius:'999px'}},eyebrow:{base:{color:'#b99b70'}},title:{base:{fontWeight:780,color:'#f3ebdd'}},price:{base:{fontSize:'1.35rem',color:'#e6c28c'}},description:{base:{color:'#b9b1a5',lineHeight:1.65}},stock:{base:{color:'#c6bda9'}}}},bindings:{title:{path:'product.name',fallback:'Gyűjtői kiadás'},price:{path:'pricing.displayPrice',fallback:'59 990 Ft'},compareAtPrice:{path:'pricing.compareAtPrice',fallback:''},description:{path:'product.description',fallback:'Kurált gyűjtői termék részletes kiadási és készletinformációkkal.'},stockLabel:{path:'inventory.stockLabel',fallback:'Raktáron'},badges:{path:'product.badges',fallback:['Gyűjtői kiadás']}}}),
        n({id:'loot-v2-product-option',componentKey:'commerce.option-selector',componentVersion:1,config:{label:'Változat',options:[]},bindings:{label:{path:'variant.optionLabel',fallback:'Változat'},options:{path:'variant.optionOptions',fallback:[]}}}),
        n({id:'loot-v2-product-specs',componentKey:'commerce.key-specs',componentVersion:1,config:{title:'Gyűjtői adatok',items:[],columns:2,missingLabel:'Nincs megadva'},bindings:{items:{path:'product.keySpecs',fallback:[]}}}),
        n({id:'loot-v2-product-purchase',componentKey:'commerce.purchase-controls',componentVersion:1,config:{productId:'',variantId:'',slug:'',name:'Gyűjtői kiadás',unitPrice:0,availableQuantity:0,minimumQuantity:1,orderMultiple:1,purchaseLabel:'Kosárba',wishlistLabel:'Kedvencekhez',currency:'HUF',presentation:'loot-vault',styleSlots:{root:{base:{gridTemplateColumns:'5.2rem minmax(0,1fr) 2.9rem',gap:'.45rem'}},quantity:{base:{borderColor:'rgba(214,162,79,.36)',background:'#111314',color:'#f3ebdd'}},purchase:{base:{borderRadius:'.4rem',background:'#d7a14d',borderColor:'#d7a14d',color:'#151008',fontWeight:900}},wishlist:{base:{borderRadius:'.4rem',borderColor:'rgba(214,162,79,.55)',background:'#111314',color:'#e4c18e'}}}},bindings:{productId:{path:'product.id'},variantId:{path:'variant.id'},slug:{path:'product.slug'},name:{path:'product.name',fallback:'Gyűjtői kiadás'},unitPrice:{path:'pricing.unitPrice'},availableQuantity:{path:'inventory.availableQuantity'},minimumQuantity:{path:'inventory.minimumQuantity'},orderMultiple:{path:'inventory.orderMultiple'},purchaseLabel:{path:'commerce.purchaseLabel',fallback:'Kosárba'},wishlistLabel:{path:'commerce.wishlistLabel',fallback:'Kedvencekhez'}}}),
      ],5,{padding:'clamp(1rem,3vw,2rem)',background:'#17191a',border:'1px solid rgba(165,122,69,.26)',borderRadius:'.85rem'}),
    ]),
  ],{background:'#0d0e0f'}),
  section('loot-v2-product-story',[
    grid('loot-v2-product-story-grid',[
      image('loot-v2-product-story-image',MEDIA.editorial2,'Gyűjtői vitrin több karakterrel és bemutatótárggyal',6,{height:'24rem',minHeight:'21rem'}),
      stack('loot-v2-product-story-copy',[
        badge('loot-v2-product-story-kicker','A KIADÁS MÖGÖTT'),
        heading('loot-v2-product-story-title','A tárgy mögött mindig van egy történet.',2,{fontSize:'clamp(2rem,4vw,3.5rem)'}),
        text('loot-v2-product-story-text','A ritkaság, számozás és exkluzivitás csak ellenőrzött termékadatként jelenik meg. A tárgy történetet kap, mesterséges sürgetést nem.'),
        button('loot-v2-product-story-cta','Vault Magazin','/blog','secondary'),
      ],6,{padding:'1rem'}),
    ]),
  ],{background:'#151717'}),
  createLootVaultV2ShellFooter(),
],{referenceComposition:'accepted-2026-09-06',referenceCritical:true});

export const LOOT_VAULT_V2_ACCOUNT_PAGE=override(LOOT_VAULT_ACCOUNT_PAGE,[
  createLootVaultV2ShellHeader(),
  n({
    id:'loot-v2-account-auth-public',
    componentKey:'layout.section',
    componentVersion:1,
    config:{
      authPublic:true,
      tone:'background',
      spacing:'l',
      width:'full',
      style:{
        background:'radial-gradient(circle at 78% 22%,rgba(165,122,69,.18),transparent 32%),linear-gradient(180deg,#111313,#0d0e0f)',
        borderBottom:'1px solid rgba(165,122,69,.18)',
      },
    },
    children:[n({
      id:'loot-v2-account-auth-container',
      componentKey:'layout.container',
      componentVersion:1,
      config:{width:'content',spacing:'m'},
      children:[grid('loot-v2-account-auth-grid',[
        stack('loot-v2-account-auth-copy',[
          badge('loot-v2-account-auth-kicker','VAULT ACCESS'),
          heading('loot-v2-account-auth-title','Lépj be a saját gyűjtői teredbe.',1,{fontSize:'clamp(2.15rem,5vw,4.4rem)',maxWidth:'11ch'}),
          text('loot-v2-account-auth-text','Rendelések, kívánságlista, letöltések és gyűjtői fiókadatok egy sötét, letisztult Vault felületen.',{fontSize:'1rem',maxWidth:'34rem'}),
        ],7,{padding:'clamp(.4rem,2vw,1.2rem) 0'}),
        stack('loot-v2-account-auth-note',[
          badge('loot-v2-account-auth-note-kicker','BIZTONSÁGOS BELÉPÉS'),
          heading('loot-v2-account-auth-note-title','A hozzáférés shared. A megjelenés Loot Vault.',3,{fontSize:'1.15rem'}),
          text('loot-v2-account-auth-note-text','A hitelesítés közös platformlogikát használ, a vizuális környezet viszont ennek a sablonnak a saját designrendszerét követi.',{fontSize:'.85rem'}),
        ],5,{padding:'1rem',background:'linear-gradient(180deg,rgba(32,35,34,.92),rgba(17,19,19,.96))',border:'1px solid rgba(165,122,69,.34)',borderRadius:'.75rem',boxShadow:'0 18px 46px rgba(0,0,0,.3)'}),
      ],'1rem')],
    })],
  }),
  section('loot-v2-account-demo',[
    badge('loot-v2-account-demo-kicker','FIÓKOM · PLATFORM DEMÓ'),
    heading('loot-v2-account-demo-title','Minden vásárlói funkció egy helyen.',2,{fontSize:'clamp(2rem,4vw,3.4rem)'}),
    text('loot-v2-account-demo-copy','A belépés után ugyanebben a Loot Vault vizuális rendszerben érhetők el a rendeléseid, letöltéseid, dokumentumaid, kedvenceid, ügyeid és fiókadataid.'),
    n({id:'loot-v2-account-capability-navigation',componentKey:'system.navigation',componentVersion:1,config:{
      ariaLabel:'Fiók funkciók',
      layout:'horizontal',
      presentation:'account-capability-demo',
      items:CANONICAL_ACCOUNT_CAPABILITIES.filter(item=>!item.optional).map(item=>({label:item.label,href:item.href})),
      style:{gap:'.55rem',fontSize:'.72rem',fontWeight:760,color:'#f3ebdd',flexWrap:'wrap'},
    }}),
    grid('loot-v2-account-capability-cards',[
      stack('loot-v2-account-card-orders',[badge('loot-v2-account-card-orders-kicker','RENDELÉSEK'),heading('loot-v2-account-card-orders-title','Rendeléseim',3),text('loot-v2-account-card-orders-copy','Aktív és korábbi rendelések, állapotok, követés és dokumentumok.'),button('loot-v2-account-card-orders-cta','Rendeléseim','/fiokom#rendelesek','secondary')],4,{padding:'1rem',background:'#17191a',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.7rem'}),
      stack('loot-v2-account-card-downloads',[badge('loot-v2-account-card-downloads-kicker','DIGITÁLIS'),heading('loot-v2-account-card-downloads-title','Letöltéseim',3),text('loot-v2-account-card-downloads-copy','Vásárlás után elérhető digitális tartalmak és fájlok.'),button('loot-v2-account-card-downloads-cta','Letöltéseim','/fiokom/letoltesek','secondary')],4,{padding:'1rem',background:'#17191a',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.7rem'}),
      stack('loot-v2-account-card-wishlist',[badge('loot-v2-account-card-wishlist-kicker','MENTETT'),heading('loot-v2-account-card-wishlist-title','Kívánságlista',3),text('loot-v2-account-card-wishlist-copy','Mentett termékek és gyors visszatérés a kiválasztott gyűjtői darabokhoz.'),button('loot-v2-account-card-wishlist-cta','Kívánságlista','/fiokom/kivansaglista','secondary')],4,{padding:'1rem',background:'#17191a',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.7rem'}),
      stack('loot-v2-account-card-documents',[badge('loot-v2-account-card-documents-kicker','DOKUMENTUMOK'),heading('loot-v2-account-card-documents-title','Dokumentumaim',3),text('loot-v2-account-card-documents-copy','Rendelési dokumentumok, számlák és termékhez kapcsolódó fájlok.'),button('loot-v2-account-card-documents-cta','Dokumentumaim','/fiokom/dokumentumok','secondary')],4,{padding:'1rem',background:'#17191a',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.7rem'}),
      stack('loot-v2-account-card-cases',[badge('loot-v2-account-card-cases-kicker','ÜGYINTÉZÉS'),heading('loot-v2-account-card-cases-title','Ügyeim és visszaküldés',3),text('loot-v2-account-card-cases-copy','Követhető ügyfélszolgálati és visszaküldési folyamatok rendeléshez kötve.'),button('loot-v2-account-card-cases-cta','Ügyeim','/fiokom/ugyek','secondary')],4,{padding:'1rem',background:'#17191a',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.7rem'}),
      stack('loot-v2-account-card-profile',[badge('loot-v2-account-card-profile-kicker','PROFIL'),heading('loot-v2-account-card-profile-title','Fiókadatok',3),text('loot-v2-account-card-profile-copy','Profil-, számlázási és kommunikációs beállítások a canonical account felületen.'),button('loot-v2-account-card-profile-cta','Fiókadatok','/fiokom#fiokadatok','secondary')],4,{padding:'1rem',background:'#17191a',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.7rem'}),
    ],'.8rem'),
  ],{background:'#0d0e0f'}),
  createLootVaultV2ShellFooter(),
],{
  authComposition:'template-owned-v1',
  authPreset:'loot-vault-v2-vault-access',
  systemSurfaceComposition:'template-owned',
});

const lootVaultBlogHighlights=[
  {id:'loot-v2-blog-highlight-1',slug:'gyujtoszoba-mint-szemelyes-univerzum',title:'A gyűjtőszoba mint személyes univerzum',copy:'Vitrinek, fények és történetek: így lesz a gyűjteményből karakteres tér.',image:MEDIA.editorial1},
  {id:'loot-v2-blog-highlight-2',slug:'mitol-ertek-egy-limitalt-kiadas',title:'Mitől érték egy limitált kiadás?',copy:'Kiadás, állapot és eredet — a látvány mögött mindig valódi termékadat áll.',image:MEDIA.editorial2},
  {id:'loot-v2-blog-highlight-3',slug:'fantasy-scifi-retro-egy-helyen',title:'Fantasy, sci-fi és retro egy helyen',copy:'Eltérő világok, közös gyűjtői nyelv és következetes vizuális ritmus.',image:MEDIA.background},
] as const;

export const LOOT_VAULT_V2_BLOG_INDEX_PAGE=override(LOOT_VAULT_BLOG_INDEX_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-blog-hero',[
    grid('loot-v2-blog-grid',[
      stack('loot-v2-blog-copy',[
        badge('loot-v2-blog-kicker','VAULT MAGAZIN'),
        heading('loot-v2-blog-title','Történetek a vitrinen túl.',1,{fontSize:'clamp(2.6rem,5vw,4.8rem)'}),
        text('loot-v2-blog-text','Univerzumok, alkotók, kiadások és gyűjtői kultúra szerkesztett anyagokban.'),
      ],5,{padding:'1rem'}),
      image('loot-v2-blog-image',MEDIA.editorial1,'Gyűjtői polc és művészeti tárgyak',7,{height:'24rem',minHeight:'20rem'}),
    ]),
  ],{background:'#111313'}),
  section('loot-v2-blog-featured',[
    n({
      id:'loot-v2-blog-featured-story',
      componentKey:'story.feature',
      componentVersion:1,
      config:{
        eyebrow:'KIEMELT VAULT TÖRTÉNET',
        title:'A tárgy mögött mindig van egy világ.',
        copy:'Szerkesztett történetek alkotókról, kiadásokról és gyűjtői kultúráról — külön a valós ár-, készlet- és termékadat authoritytól.',
        image:MEDIA.editorial2,
        imageAlt:'Kurált Loot Vault gyűjtői történet',
        ctaLabel:'Kiemelt történet megnyitása',
        ctaHref:'/blog/gyujtoszoba-mint-szemelyes-univerzum',
        imagePosition:'right',
        tone:'surface',
        presentation:'loot-vault',
        styleSlots:{
          root:{base:{background:'linear-gradient(145deg,#171919,#101212)',border:'1px solid rgba(165,122,69,.3)',borderRadius:'.78rem',boxShadow:'0 22px 50px rgba(0,0,0,.3)'}},
          eyebrow:{base:{color:'#d5ad72'}},
          title:{base:{color:'#f3ebdd'}},
          copy:{base:{color:'#b9b1a5'}},
          action:{base:{background:'#d7a14d',color:'#151008',borderRadius:'.42rem',fontWeight:900}},
          media:{base:{borderRadius:'.62rem'}},
        },
      },
      bindings:{
        title:{path:'content.featuredStory.title',fallback:'A tárgy mögött mindig van egy világ.'},
        copy:{path:'content.featuredStory.copy',fallback:'Szerkesztett történetek alkotókról, kiadásokról és gyűjtői kultúráról.'},
        image:{path:'content.featuredStory.image',fallback:MEDIA.editorial2},
        ctaHref:{path:'content.featuredStory.href',fallback:'/blog/gyujtoszoba-mint-szemelyes-univerzum'},
      },
    }),
  ],{background:'#111313'}),
  section('loot-v2-blog-highlights',[
    badge('loot-v2-blog-highlights-kicker','KIEMELT TÖRTÉNETEK'),
    heading('loot-v2-blog-highlights-title','Belépő a gyűjtői világokba.',2,{fontSize:'clamp(2rem,4vw,3.4rem)'}),
    grid('loot-v2-blog-highlights-grid',lootVaultBlogHighlights.map(item=>stack(item.id,[
      image(`${item.id}-image`,item.image,item.title,12,{height:'15rem',minHeight:'13rem'}),
      heading(`${item.id}-title`,item.title,3,{fontSize:'1.15rem'}),
      text(`${item.id}-copy`,item.copy,{fontSize:'.82rem'}),
      button(`${item.id}-cta`,'Olvasom',`/blog/${item.slug}`,'secondary'),
    ],4,{padding:'.65rem',background:'linear-gradient(180deg,#171919,#101212)',border:'1px solid rgba(165,122,69,.26)',borderRadius:'.72rem',boxShadow:'0 18px 42px rgba(0,0,0,.28)'}))),
  ],{background:'#0d0e0f'}),
  section('loot-v2-blog-list',[
    n({id:'loot-v2-story-index',componentKey:'story.index',componentVersion:1,config:{eyebrow:'Friss történetek',title:'Vault Magazin',items:[],columns:3,emptyLabel:'Hamarosan új történetek érkeznek.'},bindings:{items:{path:'content.journalItems',fallback:[]}}}),
  ],{background:'#0d0e0f'}),
  createLootVaultV2ShellFooter(),
],{referenceComposition:'accepted-2026-09-06',referenceCritical:true});

export const LOOT_VAULT_V2_BLOG_ARTICLE_PAGE=override(LOOT_VAULT_BLOG_ARTICLE_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-article',[
    grid('loot-v2-article-grid',[
      stack('loot-v2-article-copy',[
        badge('loot-v2-article-kicker','VAULT TÖRTÉNET'),
        boundHeading('loot-v2-article-title','content.article.title','Mitől lesz egy tárgy gyűjtői darab?',1,{fontSize:'clamp(2.5rem,5vw,4.6rem)'}),
        boundText('loot-v2-article-lead','content.article.summary','Szerkesztett háttéranyag a tárgy, a kiadás és a közösségi jelentés kapcsolatáról.',{fontSize:'1.05rem'}),
        boundText('loot-v2-article-body','content.article.body','A Loot Vault magazin nem gyárt mesterséges ritkaságot. A kiadás, előrendelés, készlet és ár mindig a webshop valós adataiból érkezik.',{fontSize:'.95rem'}),
      ],6,{padding:'1rem'}),
      image('loot-v2-article-image',MEDIA.editorial2,'Popkulturális gyűjtemény részletes vitrinben',6,{height:'30rem',minHeight:'24rem'}),
    ]),
  ],{background:'linear-gradient(180deg,#111313,#0d0e0f)'}),
  createLootVaultV2ShellFooter(),
],{referenceComposition:'accepted-2026-09-06',referenceCritical:true});


export const LOOT_VAULT_V2_CART_PAGE=override(LOOT_VAULT_CART_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-cart-intro',[
    grid('loot-v2-cart-intro-grid',[
      stack('loot-v2-cart-intro-copy',[
        badge('loot-v2-cart-kicker','VAULT KOSÁR'),
        heading('loot-v2-cart-title','A kiválasztott darabok, egy helyen.',1,{fontSize:'clamp(2.4rem,5vw,4.5rem)',maxWidth:'12ch'}),
        text('loot-v2-cart-copy','Módosíts mennyiséget, használd a kuponodat, vagy folytasd a pénztárhoz. A kosár működését a közös commerce authority kezeli.'),
      ],8,{padding:'clamp(.5rem,2vw,1.25rem) 0'}),
      stack('loot-v2-cart-note',[
        badge('loot-v2-cart-note-kicker','RENDELÉSI ÚTVONAL'),
        heading('loot-v2-cart-note-title','Kosár → Pénztár → Visszaigazolás',3,{fontSize:'1.15rem'}),
        text('loot-v2-cart-note-copy','Ugyanez a folyamat működik minden belépési pontból: termékkártyáról, PDP-ről és a kosár ikonból is.',{fontSize:'.84rem'}),
      ],4,{padding:'1rem',background:'#17191a',border:'1px solid rgba(165,122,69,.32)',borderRadius:'.72rem'}),
    ]),
  ],{background:'radial-gradient(circle at 82% 12%,rgba(165,122,69,.12),transparent 30%),#0d0e0f'}),
  section('loot-v2-cart-live',[
    n({id:'loot-v2-cart-summary',componentKey:'commerce.cart-summary',componentVersion:1,config:{
      lines:[],subtotal:'',discount:0,total:'',currency:'HUF',checkoutHref:'/penztar',checkoutLabel:'Tovább a pénztárhoz',
      emptyLabel:'A kosarad jelenleg üres.',emptyCtaLabel:'Fedezd fel a Vaultot',emptyCtaHref:'/webaruhaz',
      showQuantityControls:true,showRemoveControl:true,showCouponEntry:true,couponLabel:'Van kuponkódod?',couponPlaceholder:'Kuponkód',couponApplyLabel:'Alkalmazás',
      styleSlots:{
        root:{base:{padding:'clamp(1rem,2vw,1.5rem)',background:'#151717',border:'1px solid rgba(165,122,69,.3)',borderRadius:'.8rem'}},
        title:{base:{color:'#f3ebdd'}},line:{base:{borderColor:'rgba(165,122,69,.2)'}},summary:{base:{background:'#111313',padding:'1rem',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}},
        checkout:{base:{borderRadius:'.42rem',background:'#d7a14d',color:'#151008',fontWeight:900}},
      },
    },bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},discount:{path:'cart.discount',fallback:0},total:{path:'cart.total',fallback:''},couponCode:{path:'cart.couponCode',fallback:''}}}),
  ],{background:'#0d0e0f'}),
  section('loot-v2-cart-assurance',[
    grid('loot-v2-cart-assurance-grid',[
      stack('loot-v2-cart-assurance-1',[badge('loot-v2-cart-assurance-1-kicker','01'),heading('loot-v2-cart-assurance-1-title','Átlátható kosár',3),text('loot-v2-cart-assurance-1-copy','Mennyiség, kupon és végösszeg ugyanabban a közös kosárfolyamatban.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-cart-assurance-2',[badge('loot-v2-cart-assurance-2-kicker','02'),heading('loot-v2-cart-assurance-2-title','Biztonságos pénztár',3),text('loot-v2-cart-assurance-2-copy','A szállítási és fizetési lehetőségek a közös E13 pénztárban jelennek meg.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-cart-assurance-3',[badge('loot-v2-cart-assurance-3-kicker','03'),heading('loot-v2-cart-assurance-3-title','Fiókos folytatás',3),text('loot-v2-cart-assurance-3-copy','A rendelés, dokumentumok és letöltések később a Fiókom felületein követhetők.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
    ]),
  ],{background:'#111313'}),
  createLootVaultV2ShellFooter(),
],{engineBinding:'E13',routePresentation:'template-native-shared-cart'});

export const LOOT_VAULT_V2_CHECKOUT_PAGE=override(LOOT_VAULT_CHECKOUT_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-checkout-intro',[
    grid('loot-v2-checkout-intro-grid',[
      stack('loot-v2-checkout-copy',[
        badge('loot-v2-checkout-kicker','BIZTONSÁGOS PÉNZTÁR'),
        heading('loot-v2-checkout-title','Véglegesítsd a rendelést, lépésről lépésre.',1,{fontSize:'clamp(2.35rem,5vw,4.4rem)',maxWidth:'13ch'}),
        text('loot-v2-checkout-copy-text','Szállítás, fizetés és összesítés ugyanabban a provider-neutral E13 folyamatban. A Loot Vault a vizuális nyelvet adja, nem másolja a tranzakciós logikát.'),
      ],8,{padding:'clamp(.5rem,2vw,1.25rem) 0'}),
      stack('loot-v2-checkout-status',[
        badge('loot-v2-checkout-status-kicker','4 LÉPÉSES FOLYAMAT'),
        heading('loot-v2-checkout-status-title','Kosár · Szállítás · Fizetés · Összesítés',3,{fontSize:'1.12rem'}),
        text('loot-v2-checkout-status-copy','A tényleges fizetési és szállítási módokat mindig az aktív webshop-konfiguráció szolgáltatja.',{fontSize:'.84rem'}),
      ],4,{padding:'1rem',background:'linear-gradient(180deg,#1a1c1c,#111313)',border:'1px solid rgba(165,122,69,.34)',borderRadius:'.72rem'}),
    ]),
  ],{background:'radial-gradient(circle at 78% 18%,rgba(165,122,69,.14),transparent 30%),#0d0e0f'}),
  section('loot-v2-checkout-live',[
    n({id:'loot-v2-checkout-summary',componentKey:'commerce.checkout-summary',componentVersion:1,config:{
      lines:[],subtotal:'',shipping:'',total:'',currency:'HUF',secureLabel:'Biztonságos rendelés · közös E13 checkout',
      styleSlots:{
        root:{base:{background:'#151717',border:'1px solid rgba(165,122,69,.3)',borderRadius:'.8rem',boxShadow:'0 22px 50px rgba(0,0,0,.3)'}},
        title:{base:{color:'#f3ebdd'}},row:{base:{color:'#c6bba9'}},totalRow:{base:{color:'#e6c28c',fontSize:'1.05rem'}},secure:{base:{color:'#9f998f'}},
      },
    },bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},shipping:{path:'cart.shipping',fallback:''},total:{path:'cart.total',fallback:''}}}),
  ],{background:'#0d0e0f'}),
  section('loot-v2-checkout-benefits',[
    grid('loot-v2-checkout-benefits-grid',[
      stack('loot-v2-checkout-benefit-1',[badge('loot-v2-checkout-benefit-1-kicker','SZÁLLÍTÁS'),heading('loot-v2-checkout-benefit-1-title','Csak elérhető módok',3),text('loot-v2-checkout-benefit-1-copy','A cím és a rendelés paraméterei alapján a pénztár az aktív szállítási lehetőségeket mutatja.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-checkout-benefit-2',[badge('loot-v2-checkout-benefit-2-kicker','FIZETÉS'),heading('loot-v2-checkout-benefit-2-title','Provider-neutral authority',3),text('loot-v2-checkout-benefit-2-copy','A sablon nem tartalmaz fizetési motort; a közös checkout szolgáltatói adapterei maradnak az authority.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-checkout-benefit-3',[badge('loot-v2-checkout-benefit-3-kicker','FIÓK'),heading('loot-v2-checkout-benefit-3-title','Rendelés után is folytatódik',3),text('loot-v2-checkout-benefit-3-copy','Rendeléskövetés, dokumentumok és digitális letöltések a vásárlói fiók canonical felületein.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
    ]),
  ],{background:'#111313'}),
  createLootVaultV2ShellFooter(),
],{engineBinding:'E13',checkoutPresentation:'shared-guided-checkout',routePresentation:'template-native-shared-checkout'});

export const LOOT_VAULT_V2_SEARCH_PAGE=override(LOOT_VAULT_SEARCH_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-search-intro',[
    grid('loot-v2-search-intro-grid',[
      stack('loot-v2-search-copy',[
        badge('loot-v2-search-kicker','VAULT SEARCH'),
        heading('loot-v2-search-title','Találd meg a keresett világot vagy darabot.',1,{fontSize:'clamp(2.4rem,5vw,4.5rem)',maxWidth:'13ch'}),
        text('loot-v2-search-copy-text','A közös Product Discovery authority keresési eredményei ugyanabban a Loot Vault kártyarendszerben jelennek meg.'),
      ],7,{padding:'1rem 0'}),
      image('loot-v2-search-image',MEDIA.background,'Sötét gyűjtői archívum keresési háttérként',5,{height:'17rem',minHeight:'15rem'}),
    ]),
  ],{background:'#111313'}),
  section('loot-v2-search-results',[
    commerceProductGrid('loot-v2-search-products','Keresési találatok','search.results',4),
  ],{background:'#0d0e0f'}),
  section('loot-v2-search-help',[
    grid('loot-v2-search-help-grid',[
      stack('loot-v2-search-help-1',[badge('loot-v2-search-help-1-kicker','SZŰRÉS'),heading('loot-v2-search-help-1-title','Univerzum és formátum',3),text('loot-v2-search-help-1-copy','A keresés és katalógus ugyanarra a Product Discovery authorityre épül.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-search-help-2',[badge('loot-v2-search-help-2-kicker','TERMÉKADAT'),heading('loot-v2-search-help-2-title','Valódi készlet és ár',3),text('loot-v2-search-help-2-copy','A találati kártyák nem template-local termékadatot használnak.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-search-help-3',[badge('loot-v2-search-help-3-kicker','KEDVENCEK'),heading('loot-v2-search-help-3-title','Mentsd el későbbre',3),text('loot-v2-search-help-3-copy','A kívánságlista ugyanahhoz a canonical account authorityhez kapcsolódik.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
    ]),
  ],{background:'#111313'}),
  createLootVaultV2ShellFooter(),
],{engineBinding:'E2+E7',routePresentation:'loot-vault-v2-discovery'});

export const LOOT_VAULT_V2_CONTENT_PAGE=override(LOOT_VAULT_CONTENT_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-content-hero',[
    grid('loot-v2-content-hero-grid',[
      stack('loot-v2-content-copy',[
        badge('loot-v2-content-kicker','LOOT VAULT · INFORMÁCIÓ'),
        boundHeading('loot-v2-content-title','content.page.title','Rólunk',1,{fontSize:'clamp(2.5rem,5vw,4.7rem)',maxWidth:'12ch'}),
        boundText('loot-v2-content-summary','content.page.summary','A gyűjtői kultúra, a hiteles termékadat és a prémium kereskedelmi élmény találkozása.',{fontSize:'1.03rem',maxWidth:'42rem'}),
      ],6,{padding:'clamp(1rem,3vw,2rem) 0'}),
      image('loot-v2-content-image',MEDIA.editorial1,'Kurált Loot Vault archívum',6,{height:'24rem',minHeight:'20rem'}),
    ]),
  ],{background:'linear-gradient(180deg,#111313,#0d0e0f)'}),
  section('loot-v2-content-body',[
    grid('loot-v2-content-body-grid',[
      stack('loot-v2-content-article',[
        badge('loot-v2-content-article-kicker','TÖRTÉNET ÉS INFORMÁCIÓ'),
        boundText('loot-v2-content-body-copy','content.page.body','A Loot Vault a Shoperation közös commerce motorjaira épülő, történetközpontú gyűjtői storefront bemutatója.',{fontSize:'1rem'}),
      ],8,{padding:'clamp(1.1rem,3vw,2rem)',background:'#151717',border:'1px solid rgba(165,122,69,.26)',borderRadius:'.78rem'}),
      stack('loot-v2-content-links',[
        badge('loot-v2-content-links-kicker','HASZNOS OLDALAK'),
        heading('loot-v2-content-links-title','Folytasd innen.',3,{fontSize:'1.2rem'}),
        button('loot-v2-content-links-shop','Webáruház','/webaruhaz','secondary'),
        button('loot-v2-content-links-shipping','Szállítás és fizetés','/szallitas-es-fizetes','secondary'),
        button('loot-v2-content-links-contact','Kapcsolat','/kapcsolat','secondary'),
      ],4,{padding:'1rem',background:'#111313',border:'1px solid rgba(165,122,69,.26)',borderRadius:'.78rem'}),
    ]),
  ],{background:'#0d0e0f'}),
  section('loot-v2-content-values',[
    grid('loot-v2-content-values-grid',[
      stack('loot-v2-content-value-1',[badge('loot-v2-content-value-1-kicker','01'),heading('loot-v2-content-value-1-title','Valódi termékadat',3),text('loot-v2-content-value-1-copy','Kiadás, készlet, ár és elérhetőség közös strukturált authorityból érkezik.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-content-value-2',[badge('loot-v2-content-value-2-kicker','02'),heading('loot-v2-content-value-2-title','Történetközpontú bemutatás',3),text('loot-v2-content-value-2-copy','Az Editorial engine a termék mögötti világot is megmutatja, mesterséges scarcity nélkül.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-content-value-3',[badge('loot-v2-content-value-3-kicker','03'),heading('loot-v2-content-value-3-title','Közös commerce folyamat',3),text('loot-v2-content-value-3-copy','Kosár, checkout, account és support platform-authority marad, Loot Vault presentationnel.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
    ]),
  ],{background:'#111313'}),
  createLootVaultV2ShellFooter(),
],{contentRole:'dynamic-information-page',engineBinding:'E1+E10',dynamicBindingAuthority:'content.page'});

export const LOOT_VAULT_V2_FAQ_PAGE=override(LOOT_VAULT_FAQ_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-faq-hero',[
    badge('loot-v2-faq-kicker','SEGÍTSÉG · GYAKORI KÉRDÉSEK'),
    heading('loot-v2-faq-title','A legfontosabb válaszok egy helyen.',1,{fontSize:'clamp(2.4rem,5vw,4.4rem)',maxWidth:'13ch'}),
    text('loot-v2-faq-copy','Rendelés, előrendelés, szállítás, fizetés és vásárlás utáni ügyintézés a Loot Vault vizuális rendszerében.'),
  ],{background:'radial-gradient(circle at 80% 10%,rgba(165,122,69,.14),transparent 28%),#0d0e0f'}),
  section('loot-v2-faq-groups',[
    grid('loot-v2-faq-grid',[
      stack('loot-v2-faq-order',[
        badge('loot-v2-faq-order-kicker','RENDELÉS'),
        heading('loot-v2-faq-order-title','Hogyan működik a vásárlás?',3),
        text('loot-v2-faq-order-copy','Tedd kosárba a terméket, ellenőrizd a mennyiséget, majd haladj tovább a vezetett pénztárhoz.'),
        button('loot-v2-faq-order-cta','Kosár megnyitása','/kosar','secondary'),
      ],4,{padding:'1.1rem',background:'#151717',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.72rem'}),
      stack('loot-v2-faq-shipping',[
        badge('loot-v2-faq-shipping-kicker','SZÁLLÍTÁS ÉS FIZETÉS'),
        heading('loot-v2-faq-shipping-title','Milyen lehetőségek érhetők el?',3),
        text('loot-v2-faq-shipping-copy','A pénztár kizárólag az adott webshophoz ténylegesen aktivált szolgáltatói módokat kínálja.'),
        button('loot-v2-faq-shipping-cta','Szállítás és fizetés','/szallitas-es-fizetes','secondary'),
      ],4,{padding:'1.1rem',background:'#151717',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.72rem'}),
      stack('loot-v2-faq-account',[
        badge('loot-v2-faq-account-kicker','FIÓK ÉS ÜGYINTÉZÉS'),
        heading('loot-v2-faq-account-title','Hol követhetem a rendelést?',3),
        text('loot-v2-faq-account-copy','A Fiókom alatt elérhetők a rendelések, dokumentumok, letöltések, ügyek és visszaküldési folyamatok.'),
        button('loot-v2-faq-account-cta','Fiókom','/fiokom','secondary'),
      ],4,{padding:'1.1rem',background:'#151717',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.72rem'}),
    ]),
  ],{background:'#0d0e0f'}),
  section('loot-v2-faq-help',[
    grid('loot-v2-faq-help-grid',[
      stack('loot-v2-faq-help-copy',[
        badge('loot-v2-faq-help-kicker','NEM TALÁLTAD A VÁLASZT?'),
        heading('loot-v2-faq-help-title','Indíts valódi ügyfélszolgálati megkeresést.',2,{fontSize:'clamp(1.9rem,4vw,3.2rem)'}),
        text('loot-v2-faq-help-copy-text','A Kapcsolat oldalon a shared support authority követhető ügyet hoz létre.'),
      ],8,{padding:'1rem'}),
      stack('loot-v2-faq-help-action',[button('loot-v2-faq-help-cta','Kapcsolat','/kapcsolat')],4,{justifyContent:'center',padding:'1rem'}),
    ]),
  ],{background:'#111313'}),
  createLootVaultV2ShellFooter(),
],{contentRole:'support-faq',routePresentation:'loot-vault-v2-support'});

export const LOOT_VAULT_V2_CONTACT_PAGE=override(LOOT_VAULT_CONTACT_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-contact-hero',[
    grid('loot-v2-contact-hero-grid',[
      stack('loot-v2-contact-copy',[
        badge('loot-v2-contact-kicker','LOOT VAULT · ÜGYFÉLSZOLGÁLAT'),
        heading('loot-v2-contact-title','Segítünk a rendelés előtt és után is.',1,{fontSize:'clamp(2.4rem,5vw,4.4rem)',maxWidth:'13ch'}),
        text('loot-v2-contact-copy-text','Termékválasztás, rendelés, számla, szállítás vagy visszaküldés esetén a közös support authority kezeli a megkeresést.'),
      ],7,{padding:'1rem 0'}),
      stack('loot-v2-contact-shortcuts',[
        badge('loot-v2-contact-shortcuts-kicker','GYORS ÚTVONALAK'),
        button('loot-v2-contact-orders','Rendeléseim','/fiokom#rendelesek','secondary'),
        button('loot-v2-contact-returns','Visszaküldés','/fiokom/visszakuldes','secondary'),
        button('loot-v2-contact-faq','GYIK','/gyik','secondary'),
      ],5,{padding:'1rem',background:'#17191a',border:'1px solid rgba(165,122,69,.3)',borderRadius:'.72rem'}),
    ]),
  ],{background:'radial-gradient(circle at 78% 18%,rgba(165,122,69,.14),transparent 30%),#0d0e0f'}),
  section('loot-v2-contact-location',[
    grid('loot-v2-contact-location-grid',[
      stack('loot-v2-contact-map-card',[
        badge('loot-v2-contact-map-kicker','ÜZLETÜNK HELYE'),
        heading('loot-v2-contact-map-title','Találj meg minket a Vaultban.',2,{fontSize:'clamp(1.8rem,3.5vw,2.8rem)'}),
        text('loot-v2-contact-map-copy','Minta bemutatóhely egy fiktív címmel; a blokk a Builderben a kereskedő saját adataira szerkeszthető.',{fontSize:'.86rem'}),
        stack('loot-v2-contact-map-stage',[
          text('loot-v2-contact-map-street-1','Arany Kocka utca',{position:'absolute',top:'21%',left:'9%',fontSize:'.68rem',color:'#7f817e',transform:'rotate(-7deg)',letterSpacing:'.03em'}),
          text('loot-v2-contact-map-street-2','Vault köz',{position:'absolute',top:'58%',left:'13%',fontSize:'.68rem',color:'#777b78',transform:'rotate(8deg)',letterSpacing:'.03em'}),
          text('loot-v2-contact-map-street-3','Relikvia sétány',{position:'absolute',top:'34%',right:'7%',fontSize:'.68rem',color:'#7f817e',transform:'rotate(62deg)',letterSpacing:'.03em'}),
          text('loot-v2-contact-map-street-4','Gyűjtők tere',{position:'absolute',bottom:'12%',right:'22%',fontSize:'.68rem',color:'#777b78',transform:'rotate(-10deg)',letterSpacing:'.03em'}),
          text('loot-v2-contact-map-pin','●',{position:'absolute',top:'42%',left:'52%',fontSize:'2.25rem',lineHeight:1,color:'#e3ad5b',textShadow:'0 0 0 7px rgba(227,173,91,.13),0 10px 24px rgba(0,0,0,.55)',transform:'translate(-50%,-50%)'}),
          stack('loot-v2-contact-map-address',[
            badge('loot-v2-contact-map-address-kicker','LOOT VAULT'),
            heading('loot-v2-contact-map-address-title','1054 Budapest',3,{fontSize:'1rem'}),
            text('loot-v2-contact-map-address-copy','Arany Kocka utca 12.',{fontSize:'.78rem',color:'#d1c4b0'}),
          ],12,{position:'absolute',left:'7%',bottom:'7%',width:'min(78%,22rem)',padding:'.85rem',background:'rgba(13,14,15,.94)',border:'1px solid rgba(214,163,91,.56)',borderRadius:'.62rem',boxShadow:'0 16px 34px rgba(0,0,0,.46)',backdropFilter:'blur(8px)'}),
        ],12,{
          position:'relative',
          minHeight:'24rem',
          overflow:'hidden',
          border:'1px solid rgba(165,122,69,.34)',
          borderRadius:'.72rem',
          background:[
            'radial-gradient(circle at 52% 42%,rgba(222,164,83,.14) 0 2%,transparent 3%)',
            'linear-gradient(8deg,transparent 0 22%,rgba(101,111,108,.24) 22% 24%,transparent 24% 58%,rgba(101,111,108,.18) 58% 60%,transparent 60%)',
            'linear-gradient(63deg,transparent 0 15%,rgba(99,107,105,.19) 15% 17%,transparent 17% 47%,rgba(99,107,105,.2) 47% 49%,transparent 49% 76%,rgba(99,107,105,.16) 76% 78%,transparent 78%)',
            'repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 33px)',
            'repeating-linear-gradient(90deg,rgba(255,255,255,.015) 0 1px,transparent 1px 42px)',
            'linear-gradient(145deg,#1d2221,#121616 58%,#0d1010)',
          ].join(','),
          boxShadow:'inset 0 0 60px rgba(0,0,0,.44),0 22px 50px rgba(0,0,0,.3)',
        }),
      ],7,{padding:'1rem',background:'linear-gradient(180deg,#17191a,#111313)',border:'1px solid rgba(165,122,69,.3)',borderRadius:'.8rem'}),

      stack('loot-v2-contact-company-card',[
        badge('loot-v2-contact-company-kicker','ELÉRHETŐSÉGEINK'),
        heading('loot-v2-contact-company-title','Loot Vault Collectibles Kft.',2,{fontSize:'clamp(1.7rem,3vw,2.45rem)'}),
        text('loot-v2-contact-company-intro','A mintaadatok a sablon működését demonstrálják; telepítés után a kereskedő saját kapcsolati adatai kerülnek ide.',{fontSize:'.84rem'}),
        stack('loot-v2-contact-company-address',[
          badge('loot-v2-contact-company-address-label','CÍM'),
          text('loot-v2-contact-company-address-value','1054 Budapest, Arany Kocka utca 12.',{fontSize:'.92rem',color:'#eee1cf'}),
        ],12,{padding:'.8rem 0',borderBottom:'1px solid rgba(165,122,69,.18)'}),
        stack('loot-v2-contact-company-phone',[
          badge('loot-v2-contact-company-phone-label','TELEFON'),
          text('loot-v2-contact-company-phone-value','+36 30 555 0187',{fontSize:'.92rem',color:'#eee1cf'}),
        ],12,{padding:'.8rem 0',borderBottom:'1px solid rgba(165,122,69,.18)'}),
        stack('loot-v2-contact-company-email',[
          badge('loot-v2-contact-company-email-label','E-MAIL'),
          text('loot-v2-contact-company-email-value','ugyfelszolgalat@lootvault.hu',{fontSize:'.92rem',color:'#eee1cf',overflowWrap:'anywhere'}),
        ],12,{padding:'.8rem 0',borderBottom:'1px solid rgba(165,122,69,.18)'}),
        stack('loot-v2-contact-company-hours',[
          badge('loot-v2-contact-company-hours-label','NYITVATARTÁS'),
          text('loot-v2-contact-company-hours-value','H–P: 10:00–18:00',{fontSize:'.92rem',color:'#eee1cf'}),
        ],12,{padding:'.8rem 0',borderBottom:'1px solid rgba(165,122,69,.18)'}),
        stack('loot-v2-contact-company-pickup',[
          badge('loot-v2-contact-company-pickup-label','SZEMÉLYES ÁTVÉTEL'),
          text('loot-v2-contact-company-pickup-value','Személyes átvétel előzetes egyeztetéssel lehetséges.',{fontSize:'.88rem',color:'#c9bdac'}),
        ],12,{padding:'.8rem 0 0'}),
      ],5,{padding:'clamp(1.1rem,3vw,1.7rem)',background:'radial-gradient(circle at 100% 0%,rgba(165,122,69,.11),transparent 36%),linear-gradient(180deg,#17191a,#111313)',border:'1px solid rgba(165,122,69,.3)',borderRadius:'.8rem',boxShadow:'0 22px 50px rgba(0,0,0,.3)'}),
    ]),
  ],{background:'#111313'}),

  section('loot-v2-contact-form-section',[
    n({id:'loot-v2-contact-form',componentKey:'support.contact-form',componentVersion:1,config:{
      eyebrow:'KAPCSOLAT',
      title:'Írj nekünk.',
      copy:'Válaszd ki a témát, add meg az elérhetőségedet és írd le röviden, miben segíthetünk.',
      nameLabel:'Név',emailLabel:'E-mail',orderNumberLabel:'Rendelési szám',categoryLabel:'Téma',subjectLabel:'Tárgy',messageLabel:'Üzenet',
      buttonLabel:'Üzenet elküldése',successLead:'Köszönjük, a megkeresésed rögzítettük.',
      tone:'surface',
    }}),
  ],{background:'#0d0e0f'}),
  section('loot-v2-contact-assurance',[
    grid('loot-v2-contact-assurance-grid',[
      stack('loot-v2-contact-assurance-1',[badge('loot-v2-contact-assurance-1-kicker','RENDELÉS'),heading('loot-v2-contact-assurance-1-title','Add meg a rendelési számot',3),text('loot-v2-contact-assurance-1-copy','Így a support folyamat gyorsabban azonosíthatja a kapcsolódó vásárlást.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-contact-assurance-2',[badge('loot-v2-contact-assurance-2-kicker','KÖVETHETŐ'),heading('loot-v2-contact-assurance-2-title','Valódi support ticket',3),text('loot-v2-contact-assurance-2-copy','Az űrlap nem díszlet: a közös platform support endpointját használja.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-contact-assurance-3',[badge('loot-v2-contact-assurance-3-kicker','ÖNKISZOLGÁLÁS'),heading('loot-v2-contact-assurance-3-title','Fiók és GYIK',3),text('loot-v2-contact-assurance-3-copy','Rendeléskövetéshez, dokumentumokhoz és visszaküldéshez a canonical fiókfelületek is elérhetők.')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
    ]),
  ],{background:'#111313'}),
  createLootVaultV2ShellFooter(),
],{engineBinding:'shared-support',routePresentation:'loot-vault-v2-support'});

export const LOOT_VAULT_V2_LEGAL_PAGE=override(LOOT_VAULT_LEGAL_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-legal-hero',[
    badge('loot-v2-legal-kicker','JOGI ÉS VÁSÁRLÁSI INFORMÁCIÓK'),
    heading('loot-v2-legal-title','Átlátható információk a vásárlás minden pontján.',1,{fontSize:'clamp(2.35rem,5vw,4.3rem)',maxWidth:'14ch'}),
    text('loot-v2-legal-copy','A kereskedő saját jogi dokumentumai és a platform aktív szállítási/fizetési információi ugyanabban a Loot Vault presentationben érhetők el.'),
  ],{background:'radial-gradient(circle at 82% 12%,rgba(165,122,69,.14),transparent 30%),#0d0e0f'}),
  section('loot-v2-legal-links',[
    grid('loot-v2-legal-links-grid',[
      stack('loot-v2-legal-terms',[badge('loot-v2-legal-terms-kicker','SZERZŐDÉSI FELTÉTELEK'),heading('loot-v2-legal-terms-title','ÁSZF',3),text('loot-v2-legal-terms-copy','Rendelési, teljesítési és szerződéses feltételek a kereskedő jóváhagyott tartalmából.'),button('loot-v2-legal-terms-cta','ÁSZF megnyitása','/aszf','secondary')],4,{padding:'1.1rem',background:'#151717',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.72rem'}),
      stack('loot-v2-legal-privacy',[badge('loot-v2-legal-privacy-kicker','ADATKEZELÉS'),heading('loot-v2-legal-privacy-title','Adatvédelem',3),text('loot-v2-legal-privacy-copy','A tényleges adatkezelési és adatfeldolgozói információk a közzétett tájékoztatóból érkeznek.'),button('loot-v2-legal-privacy-cta','Adatvédelem','/adatvedelem','secondary')],4,{padding:'1.1rem',background:'#151717',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.72rem'}),
      stack('loot-v2-legal-imprint',[badge('loot-v2-legal-imprint-kicker','ÜZEMELTETŐ'),heading('loot-v2-legal-imprint-title','Impresszum',3),text('loot-v2-legal-imprint-copy','A webshop üzemeltetőjének közzétett adatai külön jogi felületen jelennek meg.'),button('loot-v2-legal-imprint-cta','Impresszum','/impresszum','secondary')],4,{padding:'1.1rem',background:'#151717',border:'1px solid rgba(165,122,69,.28)',borderRadius:'.72rem'}),
    ]),
  ],{background:'#0d0e0f'}),
  section('loot-v2-legal-commerce',[
    grid('loot-v2-legal-commerce-grid',[
      stack('loot-v2-legal-commerce-copy',[
        badge('loot-v2-legal-commerce-kicker','VÁSÁRLÁSI INFORMÁCIÓ'),
        heading('loot-v2-legal-commerce-title','Szállítás és fizetés',2,{fontSize:'clamp(1.9rem,4vw,3.2rem)'}),
        text('loot-v2-legal-commerce-copy-text','Az aktív szolgáltatói lehetőségeket és a rendelési folyamatot külön információs oldal mutatja.'),
      ],8,{padding:'1rem'}),
      stack('loot-v2-legal-commerce-action',[button('loot-v2-legal-commerce-cta','Szállítás és fizetés','/szallitas-es-fizetes')],4,{justifyContent:'center',padding:'1rem'}),
    ]),
  ],{background:'#111313'}),
  createLootVaultV2ShellFooter(),
],{contentRole:'legal-information-hub',routePresentation:'loot-vault-v2-legal'});

export const LOOT_VAULT_V2_NOT_FOUND_PAGE=override(LOOT_VAULT_NOT_FOUND_PAGE,[
  createLootVaultV2ShellHeader(),
  section('loot-v2-not-found',[
    grid('loot-v2-not-found-grid',[
      stack('loot-v2-not-found-copy',[
        badge('loot-v2-not-found-kicker','404 · ELTŰNT A VAULTBAN'),
        heading('loot-v2-not-found-title','Ez az oldal nincs a gyűjteményben.',1,{fontSize:'clamp(2.6rem,6vw,5rem)',maxWidth:'11ch'}),
        text('loot-v2-not-found-copy-text','A keresett útvonal nem található. Térj vissza a főoldalra, keress rá egy termékre, vagy folytasd a katalógusban.'),
        button('loot-v2-not-found-home','Vissza a főoldalra','/'),
        button('loot-v2-not-found-shop','Webáruház','/webaruhaz','secondary'),
      ],7,{padding:'clamp(1rem,4vw,3rem) 0'}),
      image('loot-v2-not-found-image',MEDIA.background,'Sötét Loot Vault archívum',5,{height:'25rem',minHeight:'20rem',filter:'saturate(.65) contrast(1.08) brightness(.68)'}),
    ]),
  ],{background:'radial-gradient(circle at 75% 25%,rgba(165,122,69,.14),transparent 32%),#0d0e0f'}),
  section('loot-v2-not-found-links',[
    grid('loot-v2-not-found-links-grid',[
      stack('loot-v2-not-found-link-1',[badge('loot-v2-not-found-link-1-kicker','KERESÉS'),heading('loot-v2-not-found-link-1-title','Keresés',3),button('loot-v2-not-found-link-1-cta','Keresés a Vaultban','/kereses','secondary')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-not-found-link-2',[badge('loot-v2-not-found-link-2-kicker','MAGAZIN'),heading('loot-v2-not-found-link-2-title','Történetek',3),button('loot-v2-not-found-link-2-cta','Vault Magazin','/blog','secondary')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
      stack('loot-v2-not-found-link-3',[badge('loot-v2-not-found-link-3-kicker','SEGÍTSÉG'),heading('loot-v2-not-found-link-3-title','Kapcsolat',3),button('loot-v2-not-found-link-3-cta','Ügyfélszolgálat','/kapcsolat','secondary')],4,{padding:'1rem',background:'#151717',border:'1px solid rgba(165,122,69,.22)',borderRadius:'.65rem'}),
    ]),
  ],{background:'#111313'}),
  createLootVaultV2ShellFooter(),
],{contentRole:'not-found-navigation-hub',routePresentation:'loot-vault-v2-system'});

export const LOOT_VAULT_V2_PAGE_OVERRIDES=Object.freeze({
  home:LOOT_VAULT_V2_HOME_PAGE,
  catalog:LOOT_VAULT_V2_CATALOG_PAGE,
  product:LOOT_VAULT_V2_PRODUCT_PAGE,
  cart:LOOT_VAULT_V2_CART_PAGE,
  checkout:LOOT_VAULT_V2_CHECKOUT_PAGE,
  account:LOOT_VAULT_V2_ACCOUNT_PAGE,
  search:LOOT_VAULT_V2_SEARCH_PAGE,
  content:LOOT_VAULT_V2_CONTENT_PAGE,
  'blog-index':LOOT_VAULT_V2_BLOG_INDEX_PAGE,
  'blog-article':LOOT_VAULT_V2_BLOG_ARTICLE_PAGE,
  faq:LOOT_VAULT_V2_FAQ_PAGE,
  contact:LOOT_VAULT_V2_CONTACT_PAGE,
  legal:LOOT_VAULT_V2_LEGAL_PAGE,
  'not-found':LOOT_VAULT_V2_NOT_FOUND_PAGE,
});

export const LOOT_VAULT_V2_MEDIA_ASSETS:readonly StorefrontTemplateFactoryMediaAsset[]=Object.freeze([
  {key:'hero-main',state:'ready',role:'hero',src:MEDIA.hero,alt:'Cinematikus fantasy jelenet gyűjtői Loot Vault hangulattal',pageTypes:['home'],representative:true,aspectRatio:'16:9'},
  {key:'universe-1',state:'ready',role:'category',src:MEDIA.universe1,alt:'Gyűjtői figurák polcon',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-2',state:'ready',role:'category',src:MEDIA.universe2,alt:'Játék- és figuragyűjtemény',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-3',state:'ready',role:'category',src:MEDIA.universe3,alt:'Karakterfigurák gyűjtői displayen',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-4',state:'ready',role:'category',src:MEDIA.universe4,alt:'Anime figurák és emléktárgyak',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-5',state:'ready',role:'category',src:MEDIA.universe5,alt:'Vintage gyűjtői polc művészeti tárgyakkal',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-6',state:'ready',role:'category',src:MEDIA.universe6,alt:'Sötét neonfényes gyűjtői tér',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'product-1',state:'ready',role:'product',src:MEDIA.product1,alt:'Prémium gyűjtői figura',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-2',state:'ready',role:'product',src:MEDIA.product2,alt:'Fantasy gyűjtői szobor',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-3',state:'ready',role:'product',src:MEDIA.product3,alt:'Dramatikus gyűjtői miniatűr kiadás',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-4',state:'ready',role:'product',src:MEDIA.product4,alt:'Sötét sci-fi gyűjtői relikvia',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'editorial-1',state:'ready',role:'editorial',src:MEDIA.editorial1,alt:'Sötét gyűjtői archívum polcokkal és kiállított tárgyakkal',pageTypes:['home','blog-index'],representative:true,aspectRatio:'3:2'},
  {key:'editorial-2',state:'ready',role:'editorial',src:MEDIA.editorial2,alt:'Kurált miniatűr gyűjtemény és relikviák',pageTypes:['product','blog-article'],representative:true,aspectRatio:'3:2'},
  {key:'catalog-background',state:'ready',role:'background',src:MEDIA.background,alt:'Sötét, színes neonfényes enteriőr',pageTypes:['catalog'],representative:true,aspectRatio:'16:9'},
]);

export const LOOT_VAULT_V2_DEMO_FIXTURES:readonly StorefrontDemoFixture[]=Object.freeze([
  {entityType:'collection',entityKey:'vault-sci-fi',payload:{title:'Sci-fi legendák',handle:'vault-sci-fi',demo:true}},
  {entityType:'collection',entityKey:'vault-fantasy',payload:{title:'Fantasy birodalmak',handle:'vault-fantasy',demo:true}},
  {entityType:'collection',entityKey:'vault-anime',payload:{title:'Anime & manga',handle:'vault-anime',demo:true}},
  {entityType:'product',entityKey:'vault-sentinel',payload:{name:'Vault Sentinel prémium figura',slug:'vault-sentinel',kind:'collectible-figure',image:MEDIA.product1,demo:true}},
  {entityType:'product',entityKey:'mythic-wing',payload:{name:'Mythic Wing gyűjtői szobor',slug:'mythic-wing',kind:'collector-statue',image:MEDIA.product2,demo:true}},
  {entityType:'product',entityKey:'ancient-warrior',payload:{name:'Ancient Warrior gyűjtői kiadás',slug:'ancient-warrior',kind:'collector-edition',image:MEDIA.product3,demo:true}},
  {entityType:'product',entityKey:'collector-archive',payload:{name:'Archívum gyűjtői relikvia',slug:'collector-archive',kind:'display-edition',image:MEDIA.product4,demo:true}},
  {entityType:'content',entityKey:'vault-magazin',payload:{title:'Vault Magazin',kind:'collector-editorial',demo:true}},
  {entityType:'content',entityKey:'page-rolunk',payload:{kind:'page',slug:'rolunk',title:'Rólunk',excerpt:'A Loot Vault a gyűjtői kultúra, a hiteles termékadat és a prémium kereskedelmi élmény találkozása.',body:'A Loot Vault bemutatója megmutatja, hogyan épülhet fel egy történetközpontú gyűjtői webshop a Shoperation közös commerce motorjaira. A vizuális rendszer sablonspecifikus, az ár-, készlet-, rendelési és fizetési authority közös platformlogika.',status:'draft',demo:true,showroomReady:true}},
  {entityType:'content',entityKey:'page-szallitas',payload:{kind:'page',slug:'szallitas',title:'Szállítás',excerpt:'Átlátható szállítási lehetőségek a pénztár közös szolgáltatói beállításaival.',body:'A bemutató a Shoperation szállítási capability helyét és vásárlói útját demonstrálja. A tényleges futár, díj és határidő mindig a kereskedő aktív konfigurációjából érkezik.',status:'draft',demo:true,showroomReady:true}},
  {entityType:'content',entityKey:'page-fizetes',payload:{kind:'page',slug:'fizetes',title:'Fizetés',excerpt:'A fizetési lehetőségek a közös E13 checkout authority részei.',body:'A sablon a fizetési folyamat vizuális helyét és kapcsolatát mutatja. A tényleges szolgáltató és tranzakciós állapot nem template-local adat.',status:'draft',demo:true,showroomReady:true}},
  {entityType:'content',entityKey:'page-visszakuldes',payload:{kind:'page',slug:'visszakuldes',title:'Visszaküldés',excerpt:'A vásárlás utáni ügyintézés a Fiókom canonical felületeihez kapcsolódik.',body:'A visszaküldési folyamat a rendeléshez kötött közös platformképességet demonstrálja, a sablon csak a saját vizuális nyelvén prezentálja.',status:'draft',demo:true,showroomReady:true}},
  {entityType:'content',entityKey:'page-aszf',payload:{kind:'page',slug:'aszf',title:'Általános Szerződési Feltételek',excerpt:'A demo jogi felület a dokumentumstruktúrát mutatja, nem helyettesíti a kereskedő jogilag ellenőrzött ÁSZF-jét.',body:'A Loot Vault showroom az ÁSZF dokumentum megjelenési helyét demonstrálja. Éles kereskedői használat előtt a saját, jogilag ellenőrzött feltételeket kell közzétenni. A rendelés, szállítás és fizetés tényleges lehetőségeit a közös platformbeállítások szolgáltatják.',status:'draft',demo:true,showroomReady:true}},
  {entityType:'content',entityKey:'page-adatvedelem',payload:{kind:'page',slug:'adatvedelem',title:'Adatkezelési tájékoztató',excerpt:'A demo az adatkezelési dokumentum storefront helyét és vizuális prezentációját mutatja.',body:'Az éles webshop adatkezelési tájékoztatója a kereskedő saját adatkezelési gyakorlatát és tényleges adatfeldolgozóit tartalmazza. A Loot Vault showroom nem állít kitalált jogi tényeket.',status:'draft',demo:true,showroomReady:true}},
  {entityType:'content',entityKey:'page-impresszum',payload:{kind:'page',slug:'impresszum',title:'Impresszum',excerpt:'A webshop üzemeltetői adatainak canonical jogi felülete.',body:'A showroom a közzétett üzemeltetői adatok helyét és megjelenését demonstrálja. Éles használatban kizárólag a kereskedő tényleges cég- és kapcsolati adatai jelenhetnek meg.',status:'draft',demo:true,showroomReady:true}},
  {entityType:'content',entityKey:'blog-gyujtoszoba-mint-szemelyes-univerzum',payload:{kind:'blog',slug:'gyujtoszoba-mint-szemelyes-univerzum',title:'A gyűjtőszoba mint személyes univerzum',excerpt:'Vitrinek, fények és történetek: így lesz a gyűjteményből karakteres tér.',body:'A gyűjtemény bemutatása nem csak terméklista. A történet, az elrendezés és a hiteles termékadat együtt adja a prémium rajongói élményt.',status:'draft',demo:true,showroomReady:true}},
  {entityType:'content',entityKey:'blog-mitol-ertek-egy-limitalt-kiadas',payload:{kind:'blog',slug:'mitol-ertek-egy-limitalt-kiadas',title:'Mitől érték egy limitált kiadás?',excerpt:'Kiadás, állapot és eredet — a látvány mögött mindig valódi termékadat áll.',body:'A Loot Vault csak strukturált katalógusadatból mutat ritkaságot, kiadást vagy előrendelési állapotot; a sablon nem talál ki scarcity állítást.',status:'draft',demo:true,showroomReady:true}},
  {entityType:'content',entityKey:'blog-fantasy-scifi-retro-egy-helyen',payload:{kind:'blog',slug:'fantasy-scifi-retro-egy-helyen',title:'Fantasy, sci-fi és retro egy helyen',excerpt:'Eltérő világok, közös gyűjtői nyelv és következetes vizuális ritmus.',body:'A Product Discovery és Editorial engine együtt teszi lehetővé, hogy több gyűjtői univerzum egy közös, mégis szerkesztett storefrontban jelenjen meg.',status:'draft',demo:true,showroomReady:true}},
]);
