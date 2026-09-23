import type {StorefrontGridSpan} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontDemoFixture} from '@/lib/builder/storefront-template-installation';
import type {StorefrontTemplateFactoryMediaAsset} from '@/lib/builder/template-factory/scaffold';
import {
  LOOT_VAULT_HOME_PAGE,
  LOOT_VAULT_CATALOG_PAGE,
  LOOT_VAULT_PRODUCT_PAGE,
  LOOT_VAULT_BLOG_INDEX_PAGE,
  LOOT_VAULT_BLOG_ARTICLE_PAGE,
} from '@/lib/builder/templates/loot-vault';

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
  editorial1:'/storefront-demo/loot-vault-v2/editorial-collector-room.webp',
  editorial2:'/storefront-demo/loot-vault-v2/editorial-vault-shelf.webp',
  background:'/storefront-demo/loot-vault-v2/background-archive.webp',
} as const;

const LOOT_VAULT_PRODUCT_FALLBACKS=Object.freeze([
  {id:'vault-sentinel',name:'Vault Sentinel prémium figura',href:'/webaruhaz',image:MEDIA.product1,imageAlt:'Vault Sentinel prémium gyűjtői figura',price:89990,badge:'LIMITÁLT',stockLabel:'Raktáron'},
  {id:'mythic-wing',name:'Mythic Wing gyűjtői szobor',href:'/webaruhaz',image:MEDIA.product2,imageAlt:'Mythic Wing fantasy gyűjtői szobor',price:129990,badge:'EXKLUZÍV',stockLabel:'Raktáron'},
  {id:'ancient-warrior',name:'Ancient Warrior gyűjtői kiadás',href:'/webaruhaz',image:MEDIA.product3,imageAlt:'Ancient Warrior gyűjtői kiadás',price:59990,badge:'ELŐRENDELÉS',stockLabel:'Előrendelhető'},
  {id:'archive-relic',name:'Archívum gyűjtői relikvia',href:'/webaruhaz',image:MEDIA.product4,imageAlt:'Sötét sci-fi gyűjtői relikvia',price:74990,badge:'ÚJDONSÁG',stockLabel:'Raktáron'},
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
    innerStyle:{maxWidth:'none',padding:'.7rem clamp(1rem,4vw,3.6rem) .45rem',gap:'.5rem'},
    brandStyle:{fontFamily:'var(--shoporation-heading-font)',fontSize:'1.15rem',fontWeight:800,letterSpacing:'.03em'},
    taglineStyle:{color:'#bda98d',fontSize:'.62rem',letterSpacing:'.18em',fontWeight:800},
    styleSlots:{
      topRow:{base:{minHeight:'3rem'}},
      searchFrame:{base:{maxWidth:'42rem',justifySelf:'center',width:'100%'}},
      utilityItem:{base:{border:'1px solid rgba(165,122,69,.22)',background:'rgba(255,255,255,.02)',borderRadius:'.85rem'}},
      navigationFrame:{base:{borderTop:'1px solid rgba(165,122,69,.16)',paddingTop:'.42rem',minHeight:'2rem'}},
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
        {id:'vault',title:'Vault',items:[{label:'Gyűjtemények',href:'/webaruhaz'},{label:'Előrendelések',href:'/webaruhaz?filter=preorder'},{label:'Szállítás',href:'/oldal/szallitas'}]},
        {id:'journal',title:'Felfedezés',items:[{label:'Vault Magazin',href:'/blog'},{label:'GYIK',href:'/gyik'},{label:'Kapcsolat',href:'/kapcsolat'}]},
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

const universeCard=(id:string,title:string,copy:string,src:string)=>stack(id,[
  image(`${id}-image`,src,title,12,{height:'13.5rem',minHeight:'13.5rem'}),
  heading(`${id}-title`,title,3,{fontSize:'1.08rem'}),
  text(`${id}-copy`,copy,{fontSize:'.76rem'}),
],2,{padding:'.55rem',background:'linear-gradient(180deg,#17191a,#111314)',border:'1px solid rgba(165,122,69,.24)',borderRadius:'.75rem',boxShadow:'0 18px 34px rgba(0,0,0,.24)'});

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
    title,products:LOOT_VAULT_PRODUCT_FALLBACKS,columns,presentation:'loot-vault',showBadges:true,showCompareAt:true,showCta:true,ctaLabel:'Részletek',imageRatio:'4 / 5',
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
      cta:{base:{borderRadius:'.38rem',background:'#d7a14d',color:'#151008',fontWeight:900,padding:'.62rem .7rem'}},
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
      image('loot-v2-hero-art',MEDIA.hero,'Cinematikus fantasy jelenet gyűjtői Loot Vault hangulattal',12,{position:'absolute',inset:'0',height:'100%',minHeight:'100%',borderRadius:'0',filter:'saturate(1.08) contrast(1.08) brightness(.9)'}),
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
    text('loot-v2-limited-copy','Ritka darabok. Valódi gyűjtőknek. A státuszokat mindig a katalógus valós adatai adják.'),
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
  section('loot-v2-story',[
    grid('loot-v2-story-grid',[
      image('loot-v2-story-image',MEDIA.editorial2,'Gazdag popkulturális gyűjtemény vitrinszerű elrendezésben',6,{height:'25rem',minHeight:'22rem'}),
      stack('loot-v2-story-copy',[
        badge('loot-v2-story-kicker','VAULT MAGAZIN'),
        heading('loot-v2-story-title','Tárgyak, kiadások, történetek.',2,{fontSize:'clamp(2rem,4vw,3.6rem)'}),
        text('loot-v2-story-text','Szerkesztett háttéranyagok a gyűjtői kultúráról — mesterséges ritkaság és hamis sürgetés nélkül.'),
        button('loot-v2-story-cta','Olvasd a Vault Magazint','/blog','secondary'),
      ],6,{padding:'clamp(1rem,3vw,2.2rem)'}),
    ]),
  ],{background:'#171919'}),
  section('loot-v2-benefits',[
    grid('loot-v2-benefit-grid',[
      stack('loot-v2-benefit-1',[badge('loot-v2-benefit-1-icon','01'),heading('loot-v2-benefit-1-title','Előrendelési támogatás',3),text('loot-v2-benefit-1-text','Átlátható státuszok és valódi kiadási információk.')],3,{padding:'1rem',border:'1px solid rgba(165,122,69,.24)',borderRadius:'.6rem'}),
      stack('loot-v2-benefit-2',[badge('loot-v2-benefit-2-icon','02'),heading('loot-v2-benefit-2-title','Ellenőrzött termékadatok',3),text('loot-v2-benefit-2-text','Ritkaság és kiadás csak strukturált katalógusadatból.')],3,{padding:'1rem',border:'1px solid rgba(165,122,69,.24)',borderRadius:'.6rem'}),
      stack('loot-v2-benefit-3',[badge('loot-v2-benefit-3-icon','03'),heading('loot-v2-benefit-3-title','Biztonságos vásárlás',3),text('loot-v2-benefit-3-text','A közös Shoperation checkout és rendelési authority.')],3,{padding:'1rem',border:'1px solid rgba(165,122,69,.24)',borderRadius:'.6rem'}),
      stack('loot-v2-benefit-4',[badge('loot-v2-benefit-4-icon','04'),heading('loot-v2-benefit-4-title','Rajongói felfedezés',3),text('loot-v2-benefit-4-text','Univerzumok és történetek szerencsejátékos mechanika nélkül.')],3,{padding:'1rem',border:'1px solid rgba(165,122,69,.24)',borderRadius:'.6rem'}),
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
        text('loot-v2-catalog-text','Szűrj univerzum, formátum és strukturált gyűjtői adatok szerint.'),
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
        n({id:'loot-v2-product-info',componentKey:'commerce.product-info',componentVersion:1,config:{eyebrow:'Loot Vault',title:'Gyűjtői kiadás',price:'59 990 Ft',compareAtPrice:'',description:'Kurált gyűjtői termék részletes, strukturált adatokkal.',stockLabel:'Raktáron',badges:['Gyűjtői kiadás'],currency:'HUF',presentation:'loot-vault',styleSlots:{root:{base:{gap:'.8rem'}},badges:{base:{gap:'.35rem'}},badge:{base:{borderColor:'rgba(214,162,79,.6)',color:'#e9c990',borderRadius:'999px'}},eyebrow:{base:{color:'#b99b70'}},title:{base:{fontWeight:780,color:'#f3ebdd'}},price:{base:{fontSize:'1.35rem',color:'#e6c28c'}},description:{base:{color:'#b9b1a5',lineHeight:1.65}},stock:{base:{color:'#c6bda9'}}}},bindings:{title:{path:'product.name',fallback:'Gyűjtői kiadás'},price:{path:'pricing.displayPrice',fallback:'59 990 Ft'},compareAtPrice:{path:'pricing.compareAtPrice',fallback:''},description:{path:'product.description',fallback:'Kurált gyűjtői termék részletes, strukturált adatokkal.'},stockLabel:{path:'inventory.stockLabel',fallback:'Raktáron'},badges:{path:'product.badges',fallback:['Gyűjtői kiadás']}}}),
        n({id:'loot-v2-product-option',componentKey:'commerce.option-selector',componentVersion:1,config:{label:'Változat',options:[]},bindings:{label:{path:'variant.optionLabel',fallback:'Változat'},options:{path:'variant.optionOptions',fallback:[]}}}),
        n({id:'loot-v2-product-specs',componentKey:'commerce.key-specs',componentVersion:1,config:{title:'Gyűjtői adatok',items:[],columns:2,missingLabel:'Nincs megadva'},bindings:{items:{path:'product.keySpecs',fallback:[]}}}),
        button('loot-v2-product-buy','Kosárba teszem','#purchase'),
      ],5,{padding:'clamp(1rem,3vw,2rem)',background:'#17191a',border:'1px solid rgba(165,122,69,.26)',borderRadius:'.85rem'}),
    ]),
  ],{background:'#0d0e0f'}),
  section('loot-v2-product-story',[
    grid('loot-v2-product-story-grid',[
      image('loot-v2-product-story-image',MEDIA.editorial2,'Gyűjtői vitrin több karakterrel és bemutatótárggyal',6,{height:'24rem',minHeight:'21rem'}),
      stack('loot-v2-product-story-copy',[
        badge('loot-v2-product-story-kicker','A KIADÁS MÖGÖTT'),
        heading('loot-v2-product-story-title','A tárgy mögött mindig van egy történet.',2,{fontSize:'clamp(2rem,4vw,3.5rem)'}),
        text('loot-v2-product-story-text','A ritkaság, számozás és exkluzivitás csak valódi strukturált termékadatból jelenhet meg. A sablon történetet ad, nem mesterséges hiányérzetet.'),
        button('loot-v2-product-story-cta','Vault Magazin','/blog','secondary'),
      ],6,{padding:'1rem'}),
    ]),
  ],{background:'#151717'}),
  createLootVaultV2ShellFooter(),
],{referenceComposition:'accepted-2026-09-06',referenceCritical:true});

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
        heading('loot-v2-article-title','Mitől lesz egy tárgy gyűjtői darab?',1,{fontSize:'clamp(2.5rem,5vw,4.6rem)'}),
        text('loot-v2-article-lead','Szerkesztett háttéranyag a tárgy, a kiadás és a közösségi jelentés kapcsolatáról.',{fontSize:'1.05rem'}),
        text('loot-v2-article-body','A Loot Vault magazin nem gyárt mesterséges ritkaságot. A vizuális történetmesélés mellett a kiadás, előrendelés, készlet és ár továbbra is a közös kereskedelmi authorityból érkezik.',{fontSize:'.95rem'}),
      ],6,{padding:'1rem'}),
      image('loot-v2-article-image',MEDIA.editorial2,'Popkulturális gyűjtemény részletes vitrinben',6,{height:'30rem',minHeight:'24rem'}),
    ]),
  ],{background:'linear-gradient(180deg,#111313,#0d0e0f)'}),
  createLootVaultV2ShellFooter(),
],{referenceComposition:'accepted-2026-09-06',referenceCritical:true});

export const LOOT_VAULT_V2_PAGE_OVERRIDES=Object.freeze({
  home:LOOT_VAULT_V2_HOME_PAGE,
  catalog:LOOT_VAULT_V2_CATALOG_PAGE,
  product:LOOT_VAULT_V2_PRODUCT_PAGE,
  'blog-index':LOOT_VAULT_V2_BLOG_INDEX_PAGE,
  'blog-article':LOOT_VAULT_V2_BLOG_ARTICLE_PAGE,
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
  {key:'editorial-1',state:'ready',role:'editorial',src:MEDIA.editorial1,alt:'Gyűjtői polc figurákkal és művészeti tárgyakkal',pageTypes:['home','blog-index'],representative:true,aspectRatio:'3:2'},
  {key:'editorial-2',state:'ready',role:'editorial',src:MEDIA.editorial2,alt:'Gazdag popkulturális gyűjtemény',pageTypes:['home','blog-article'],representative:true,aspectRatio:'3:2'},
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
]);
