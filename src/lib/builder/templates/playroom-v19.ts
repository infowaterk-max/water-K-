import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_V18_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v18';

export const PLAYROOM_V19_TEMPLATE_VERSION=19 as const;

type GridSpan=1|2|3|4|5|6|7|8|9|10|11|12;
type JsonRecord=Record<string,unknown>;
const n=(value:StorefrontComponentNode):StorefrontComponentNode=>value;
const clone=<T>(value:T):T=>structuredClone(value);
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const responsive=(desktop:GridSpan,tablet:GridSpan=desktop,mobile:GridSpan=12):StorefrontComponentNode['responsive']=>({desktop:{gridSpan:desktop},tablet:{gridSpan:tablet},mobile:{gridSpan:mobile}});

const SURFACE={background:'linear-gradient(155deg,rgba(11,34,62,.98),rgba(5,18,36,.99))',border:'1px solid rgba(75,216,255,.28)',borderRadius:'.72rem',boxShadow:'0 18px 44px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.025)'} as const;
const QUIET_SURFACE={background:'linear-gradient(180deg,#081a31,#051326)',border:'1px solid rgba(75,216,255,.18)',borderRadius:'.62rem'} as const;
const PAGE_BG={background:'radial-gradient(circle at 84% 8%,rgba(40,174,255,.11),transparent 24%),radial-gradient(circle at 12% 35%,rgba(255,65,181,.06),transparent 22%),#020b17'} as const;

const PHOTO={
  catalog:'https://images.pexels.com/photos/33888375/pexels-photo-33888375.jpeg?auto=compress&cs=tinysrgb&w=1600',
  product:'https://images.pexels.com/photos/7987293/pexels-photo-7987293.jpeg?auto=compress&cs=tinysrgb&w=1500',
  search:'https://images.pexels.com/photos/17784701/pexels-photo-17784701.jpeg?auto=compress&cs=tinysrgb&w=1600',
  community:'https://images.pexels.com/photos/7862405/pexels-photo-7862405.jpeg?auto=compress&cs=tinysrgb&w=1600',
  editorial:'https://images.pexels.com/photos/9071471/pexels-photo-9071471.jpeg?auto=compress&cs=tinysrgb&w=1600',
  audio:'https://images.pexels.com/photos/7858756/pexels-photo-7858756.jpeg?auto=compress&cs=tinysrgb&w=1400',
  gift:'https://images.pexels.com/photos/6045528/pexels-photo-6045528.jpeg?auto=compress&cs=tinysrgb&w=1400',
} as const;

const section=(id:string,children:StorefrontComponentNode[],style:JsonRecord=PAGE_BG,spacing='l')=>n({id,componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing,width:'full',style},children:[n({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'m'},children})]});
const grid=(id:string,children:StorefrontComponentNode[],gap='m',style:JsonRecord={})=>n({id,componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap,align:'stretch',style},children});
const stack=(id:string,children:StorefrontComponentNode[],span:GridSpan=12,style:JsonRecord={},gap='m')=>n({id,componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap,align:'stretch',justify:'start',style},responsive:responsive(span,span===12?12:Math.min(12,span+1) as GridSpan,12),children});
const eyebrow=(id:string,value:string,color='#55e7ff')=>n({id,componentKey:'content.text',componentVersion:1,config:{text:value,as:'strong',align:'left',tone:'text',style:{fontSize:'.67rem',fontWeight:900,letterSpacing:'.16em',textTransform:'uppercase',color}}});
const heading=(id:string,value:string,level=2,style:JsonRecord={},bindingPath?:string)=>n({id,componentKey:'content.heading',componentVersion:1,config:{text:value,level,align:'left',tone:'text',typography:{fontToken:'heading',fontWeight:900,lineHeight:level===1?.9:1.02,letterSpacingEm:level===1?-.05:-.03},style},...(bindingPath?{bindings:{text:{path:bindingPath,fallback:value}}}:{})});
const text=(id:string,value:string,style:JsonRecord={},bindingPath?:string)=>n({id,componentKey:'content.text',componentVersion:1,config:{text:value,as:'p',align:'left',tone:'text',typography:{fontToken:'body',lineHeight:1.6},style:{color:'#b8c9dc',...style}},...(bindingPath?{bindings:{text:{path:bindingPath,fallback:value}}}:{})});
const button=(id:string,label:string,href:string,variant:'primary'|'secondary'|'ghost'='primary')=>n({id,componentKey:'content.button',componentVersion:1,config:{label,href,variant,size:'m',ariaLabel:label,style:{borderRadius:'.4rem',fontWeight:900}}});
const image=(id:string,src:string,alt:string,span:GridSpan=12,objectPosition='center center',style:JsonRecord={},srcBinding?:string,altBinding?:string)=>n({id,componentKey:'content.image',componentVersion:1,config:{src,alt,width:1400,height:900,fit:'cover',loading:'lazy',radius:'none',objectPosition,artDirection:{desktop:{src,objectFit:'cover',objectPosition},tablet:{src,objectFit:'cover',objectPosition},mobile:{src,objectFit:'cover',objectPosition:'center center'}},style:{minHeight:'12rem',borderRadius:'.64rem',...style}},responsive:responsive(span,span,12),...((srcBinding||altBinding)?{bindings:{...(srcBinding?{src:{path:srcBinding,fallback:src}}:{}),...(altBinding?{alt:{path:altBinding,fallback:alt}}:{})}}:{})});
const infoCard=(id:string,kicker:string,title:string,copy:string,span:GridSpan=4,accent='#55e7ff')=>stack(id,[eyebrow(`${id}-kicker`,kicker,accent),heading(`${id}-title`,title,3,{fontSize:'1.05rem'}),text(`${id}-copy`,copy,{fontSize:'.82rem'})],span,{...QUIET_SURFACE,padding:'.9rem',minHeight:'8.6rem'},'s');

const acceptedHome=PLAYROOM_V18_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home');
if(!acceptedHome)throw new Error('PLAYROOM_V19_HOME_MISSING');
const acceptedHeader=acceptedHome.sections.find(node=>node.componentKey==='system.commerce-header');
const acceptedFooter=acceptedHome.sections.find(node=>node.componentKey==='editorial.footer');
if(!acceptedHeader||!acceptedFooter)throw new Error('PLAYROOM_V19_SHELL_MISSING');

function rekey(node:StorefrontComponentNode,prefix:string):StorefrontComponentNode{
  return{...clone(node),id:node.id.replace(/^playroom-home/,prefix),...(node.children?{children:node.children.map(child=>rekey(child,prefix))}:{})};
}
const shellHeader=(prefix:string)=>rekey(acceptedHeader,prefix);
const shellFooter=(prefix:string)=>rekey(acceptedFooter,prefix);

function findNode(page:StorefrontPageDocument,id:string):StorefrontComponentNode|undefined{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|undefined=>{for(const node of nodes){if(node.id===id)return node;const nested=walk(node.children??[]);if(nested)return nested;}return undefined;};
  return walk(page.sections);
}
const sourcePage=(pageType:StorefrontPageDocument['pageType'])=>{
  const page=PLAYROOM_V18_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===pageType);
  if(!page)throw new Error(`PLAYROOM_V19_SOURCE_PAGE_MISSING:${pageType}`);
  return page;
};

function withStyle(node:StorefrontComponentNode,patch:JsonRecord):StorefrontComponentNode{
  return{...clone(node),config:{...node.config,style:{...rec(node.config.style),...patch}}};
}
function withSlots(node:StorefrontComponentNode,patch:Record<string,JsonRecord>):StorefrontComponentNode{
  const current=rec(node.config.styleSlots);
  return{...clone(node),config:{...node.config,styleSlots:{...current,...Object.fromEntries(Object.entries(patch).map(([key,value])=>{const slot=rec(current[key]);return[key,{...slot,base:{...rec(slot.base),...value}}];}))}}};
}

function pageBase(source:StorefrontPageDocument,sections:StorefrontComponentNode[],metadata:JsonRecord={}):StorefrontPageDocument{
  return{
    ...source,
    templateVersion:PLAYROOM_V19_TEMPLATE_VERSION,
    metadata:{...(source.metadata??{}),canonicalUpgradeFromTemplateVersion:18,referenceFidelityRelease:'playroom-v19-full-page-family',pageFamilyVisualLanguage:'accepted-playroom-v18-home',sectionPresetSource:'canonical-top-level-page-sections',...metadata},
    sections,
  };
}

const platformItems=[
  {id:'pc',label:'PC',href:'/webaruhaz?platform=pc',image:'/playroom/platforms/pc.svg',imageAlt:'PC platform ikon'},
  {id:'playstation',label:'PlayStation',href:'/webaruhaz?platform=playstation',image:'/playroom/platforms/playstation.svg',imageAlt:'PlayStation platform ikon'},
  {id:'xbox',label:'Xbox',href:'/webaruhaz?platform=xbox',image:'/playroom/platforms/xbox.svg',imageAlt:'Xbox platform ikon'},
  {id:'nintendo',label:'Nintendo',href:'/webaruhaz?platform=nintendo',image:'/playroom/platforms/nintendo.svg',imageAlt:'Nintendo platform ikon'},
  {id:'handheld',label:'Handheld',href:'/webaruhaz?platform=handheld',image:'/playroom/platforms/handheld.svg',imageAlt:'Kézikonzol platform ikon'},
  {id:'mobile',label:'Mobile',href:'/webaruhaz?platform=mobile',image:'/playroom/platforms/mobile.svg',imageAlt:'Mobil platform ikon'},
];
const platformNav=(id:string)=>n({id,componentKey:'guided.attribute-navigation',componentVersion:1,config:{eyebrow:'PLATFORM',title:'Mivel játszol?',copy:'Ugorj a neked releváns kínálatra.',columns:3,presentation:'media-navigation',items:platformItems,styleSlots:{root:{base:{gap:'.4rem'}},grid:{base:{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:'.42rem'}},card:{base:{position:'relative',minHeight:'5.1rem',background:'linear-gradient(180deg,#0b2b49,#07182c)',border:'1px solid rgba(82,219,255,.32)',borderRadius:'.62rem',overflow:'hidden'}},media:{base:{aspectRatio:'1 / 1',minHeight:'5rem'}},mediaImage:{base:{width:'78%',height:'78%',margin:'8% 11% 14%',objectFit:'contain',filter:'drop-shadow(0 0 10px rgba(77,221,255,.32))'}},cardBody:{base:{position:'absolute',left:0,right:0,bottom:0,padding:'.28rem .18rem',textAlign:'center',background:'linear-gradient(180deg,transparent,rgba(3,10,22,.94) 44%)'}},label:{base:{fontSize:'.53rem',fontWeight:900}},itemCopy:{base:{display:'none'}}}}});

function catalogPage():StorefrontPageDocument{
  const source=sourcePage('catalog');
  const sourceBody=findNode(source,'playroom-catalog-body');
  if(!sourceBody)throw new Error('PLAYROOM_V19_CATALOG_BODY_MISSING');
  const body=withStyle(sourceBody,{background:'#020b17'});
  return pageBase(source,[
    shellHeader('playroom-catalog'),
    section('playroom-catalog-hero',[grid('playroom-catalog-hero-grid',[
      stack('playroom-catalog-hero-copy',[eyebrow('playroom-catalog-kicker','DISCOVER / PLAY / REPEAT','#ff63bf'),heading('playroom-catalog-title','Találd meg a következő játékod.',1,{fontSize:'clamp(2.6rem,5vw,4.8rem)',maxWidth:'11ch'}),text('playroom-catalog-copy','Platform, játékstílus és valódi katalógusadatok szerint böngéssz — ugyanabban a sötét, neon Playroom világban, mint a főoldalon.'),button('playroom-catalog-cta','Mutasd a kínálatot','#playroom-catalog-products')],5,{padding:'1.15rem 0',justifyContent:'center'}),image('playroom-catalog-hero-image',PHOTO.catalog,'RGB gaming setup a katalógus felfedezéshez',7,'center 55%',{minHeight:'19rem',filter:'saturate(1.18) contrast(1.08) brightness(.78)'})])],PAGE_BG,'l'),
    section('playroom-catalog-platform-presets',[eyebrow('playroom-catalog-platform-kicker','START WITH YOUR PLATFORM'),heading('playroom-catalog-platform-title','Platform szerint gyorsabban.',2),platformNav('playroom-catalog-platform-navigation')],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),
    {...body,id:'playroom-catalog-products'},
    section('playroom-catalog-discovery-presets',[grid('playroom-catalog-discovery-grid',[infoCard('playroom-catalog-discovery-coop','PLAY TOGETHER','Co-op és multiplayer','Közös játékra válogatott belépési pontok.',4,'#ff6fbd'),infoCard('playroom-catalog-discovery-setup','SETUP','Kiegészítők és setup','Kontrollerek, audio és gaming környezet egy helyen.',4,'#55e7ff'),infoCard('playroom-catalog-discovery-gift','GIFT MODE','Ajándékötletek','Játékos ajándékirányok anélkül, hogy a sablon készletet vagy árat találna ki.',4,'#b8e34a')])],PAGE_BG,'m'),
    shellFooter('playroom-catalog'),
  ],{visualPreset:'playroom-v19-catalog',engineBinding:'E2+E7'});
}

function productPage():StorefrontPageDocument{
  const source=sourcePage('product');
  const main=findNode(source,'playroom-product-main');
  const facts=findNode(source,'playroom-product-facts');
  const recommendations=findNode(source,'playroom-product-recommendations');
  if(!main||!facts||!recommendations)throw new Error('PLAYROOM_V19_PRODUCT_SOURCE_MISSING');
  const polishedMain=withStyle(main,{background:'radial-gradient(circle at 75% 8%,rgba(57,206,255,.1),transparent 24%),#020b17'});
  const gallery=findNode({ ...source, sections:[polishedMain] } as StorefrontPageDocument,'playroom-product-gallery');
  const buybox=findNode({ ...source, sections:[polishedMain] } as StorefrontPageDocument,'playroom-product-info');
  if(gallery)gallery.config=withSlots(gallery,{main:{background:'#07182c',border:'1px solid rgba(80,220,255,.28)',borderRadius:'.72rem'}}).config;
  if(buybox)buybox.config=withSlots(buybox,{root:{background:'linear-gradient(180deg,#0b2a48,#07182c)',border:'1px solid rgba(80,220,255,.28)',borderRadius:'.72rem',padding:'1.05rem'}}).config;
  return pageBase(source,[
    shellHeader('playroom-product'),
    polishedMain,
    section('playroom-product-confidence',[grid('playroom-product-confidence-grid',[infoCard('playroom-product-confidence-platform','PLATFORM','Kompatibilitás ellenőrzése','A platform-információt a kompatibilitási authority adja, nem a sablon.',4,'#55e7ff'),infoCard('playroom-product-confidence-stock','AVAILABILITY','Valós készlet','Készlet és elérhetőség a commerce adatokból érkezik.',4,'#b8e34a'),infoCard('playroom-product-confidence-checkout','CHECKOUT','Biztonságos rendelés','A végső rendelés-validáció a közös checkout motorban történik.',4,'#ff6fbd')])],{background:'linear-gradient(180deg,#020b17,#041326)'},'s'),
    withStyle(facts,{background:'#020b17'}),
    section('playroom-product-story-preset',[grid('playroom-product-story-grid',[image('playroom-product-story-image',PHOTO.product,'Kontroller részlet neon gaming fényben',6,'center 60%',{minHeight:'14rem',filter:'saturate(1.14) contrast(1.08) brightness(.86)'}),stack('playroom-product-story-copy',[eyebrow('playroom-product-story-kicker','GAME NIGHT READY','#ff6fbd'),heading('playroom-product-story-title','A termékoldal is a játékélmény része.',2),text('playroom-product-story-copy-text','Nagy média, világos vásárlási hierarchia, kompatibilitási segítség és visszafogott neon felületek — a vásárlási kontrollok mindig elsőbbséget kapnak.'),button('playroom-product-story-cta','Tovább a kapcsolódó ajánlatokhoz','#playroom-product-recommendations','secondary')],6,{...SURFACE,padding:'1rem',justifyContent:'center'})])],PAGE_BG,'m'),
    withStyle(recommendations,{background:'linear-gradient(180deg,#041326,#020b17)'}),
    shellFooter('playroom-product'),
  ],{visualPreset:'playroom-v19-pdp',engineBinding:'E2+E6+E7+E13',pdpGrid:'desktop-tablet-7-5-mobile-12-12'});
}

function searchPage():StorefrontPageDocument{
  const source=sourcePage('search');
  const results=findNode(source,'playroom-search-body');
  if(!results)throw new Error('PLAYROOM_V19_SEARCH_RESULTS_MISSING');
  return pageBase(source,[
    shellHeader('playroom-search'),
    section('playroom-search-hero',[grid('playroom-search-hero-grid',[stack('playroom-search-hero-copy',[eyebrow('playroom-search-kicker','SEARCH THE PLAYROOM'),heading('playroom-search-title','Mit keresel ma?',1,{fontSize:'clamp(2.5rem,5vw,4.6rem)'}),text('playroom-search-copy','Játék, platform vagy kiegészítő — a keresés csak a ténylegesen jogosult storefront kínálatból dolgozik.'),n({id:'playroom-search-primary',componentKey:'system.search',componentVersion:1,config:{action:'/kereses',queryParam:'q',placeholder:'Játék, platform, kontroller, headset…',buttonLabel:'Keresés',ariaLabel:'Keresés a Playroomban',presentation:'commerce',style:{height:'3rem',background:'#f7fbff',border:'1px solid #55e7ff',borderRadius:'.45rem'},inputStyle:{color:'#0a2744'},buttonStyle:{background:'#06152d',color:'#fff',fontWeight:900}}})],7,{justifyContent:'center'}),image('playroom-search-hero-image',PHOTO.search,'Neon gaming monitor és setup keresési vizuálhoz',5,'center 48%',{minHeight:'16rem',filter:'saturate(1.16) contrast(1.08) brightness(.78)'})])],PAGE_BG,'m'),
    withStyle(results,{background:'#020b17'}),
    section('playroom-search-shortcuts',[eyebrow('playroom-search-shortcuts-kicker','NEED A SHORTCUT?','#b8e34a'),platformNav('playroom-search-platform-navigation')],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),
    shellFooter('playroom-search'),
  ],{visualPreset:'playroom-v19-search',engineBinding:'E2'});
}

function cartPage():StorefrontPageDocument{
  const source=sourcePage('cart');
  const body=findNode(source,'playroom-cart-body');
  if(!body)throw new Error('PLAYROOM_V19_CART_BODY_MISSING');
  const cartSummary=findNode({ ...source, sections:[body] } as StorefrontPageDocument,'playroom-cart-summary');
  if(cartSummary)cartSummary.config=withSlots(cartSummary,{root:{background:'linear-gradient(180deg,#0b2a48,#07182c)',border:'1px solid rgba(80,220,255,.28)',borderRadius:'.72rem'},cta:{background:'#ff65bd',color:'#06152d',fontWeight:900,borderRadius:'.4rem'}}).config;
  return pageBase(source,[
    shellHeader('playroom-cart'),
    section('playroom-cart-intro',[eyebrow('playroom-cart-kicker','READY PLAYER CHECKOUT','#55e7ff'),heading('playroom-cart-title','A kosár legyen gyors, nem látványos akadály.',1,{fontSize:'clamp(2.2rem,4vw,3.7rem)'}),text('playroom-cart-copy','A Playroom karakter megmarad, de itt a termékek, mennyiségek és a továbbhaladás kapja a fő hangsúlyt.')],PAGE_BG,'m'),
    withStyle(body,{background:'#020b17'}),
    section('playroom-cart-recommendation-preset',[n({id:'playroom-cart-recommendations',componentKey:'commerce.recommendation-row',componentVersion:1,config:{title:'Még valami a játékesthez?',products:[],columns:4,emptyLabel:'Jelenleg nincs kapcsolódó ajánlat.',currency:'HUF',presentation:'standard',showCta:true,ctaLabel:'Megnézem',imageRatio:'4 / 5',styleSlots:{card:{base:{background:'linear-gradient(180deg,#0b2946,#06172b)',border:'1px solid rgba(79,216,255,.28)',borderRadius:'.62rem',padding:'.62rem'}}}},bindings:{title:{path:'content.playroomCartRecommendations.title',fallback:'Még valami a játékesthez?'},products:{path:'recommendations.products',fallback:[]}}})],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),
    section('playroom-cart-trust-preset',[grid('playroom-cart-trust-grid',[infoCard('playroom-cart-trust-stock','STOCK','Valós elérhetőség','A kosár nem talál ki készletet.',4,'#b8e34a'),infoCard('playroom-cart-trust-price','PRICE','Valós árak','Az ár és összegzés a commerce authorityból jön.',4,'#55e7ff'),infoCard('playroom-cart-trust-order','ORDER','Végső ellenőrzés','A checkout végén szerveroldali validáció történik.',4,'#ff6fbd')])],PAGE_BG,'s'),
    shellFooter('playroom-cart'),
  ],{visualPreset:'playroom-v19-cart',engineBinding:'E13',pageRhythm:'restrained'});
}

function checkoutPage():StorefrontPageDocument{
  const source=sourcePage('checkout');
  const body=findNode(source,'playroom-checkout-body');
  if(!body)throw new Error('PLAYROOM_V19_CHECKOUT_BODY_MISSING');
  const summary=findNode({ ...source, sections:[body] } as StorefrontPageDocument,'playroom-checkout-summary');
  if(summary)summary.config=withSlots(summary,{root:{background:'linear-gradient(180deg,#0b2a48,#07182c)',border:'1px solid rgba(80,220,255,.28)',borderRadius:'.72rem',padding:'1rem'}}).config;
  return pageBase(source,[
    shellHeader('playroom-checkout'),
    section('playroom-checkout-intro',[eyebrow('playroom-checkout-kicker','SECURE CHECKOUT','#b8e34a'),heading('playroom-checkout-title','Már csak a rendelés van hátra.',1,{fontSize:'clamp(2.15rem,4vw,3.6rem)'}),text('playroom-checkout-copy','A vizuális nyelv Playroom marad, a folyamat viszont a közös vezetett checkout contractot követi: Kosár → Szállítás → Fizetés → Összesítés.')],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),
    section('playroom-checkout-progress-preset',[grid('playroom-checkout-progress-grid',[infoCard('playroom-checkout-step-cart','01','Kosár','Termékek és mennyiségek ellenőrzése.',3,'#55e7ff'),infoCard('playroom-checkout-step-shipping','02','Szállítás','A checkout authority tölti ki és validálja.',3,'#55e7ff'),infoCard('playroom-checkout-step-payment','03','Fizetés','Provider-neutral fizetési lépés.',3,'#ff6fbd'),infoCard('playroom-checkout-step-summary','04','Összesítés','Végső ellenőrzés a rendelés előtt.',3,'#b8e34a')])],PAGE_BG,'s'),
    withStyle(body,{background:'#020b17'}),
    shellFooter('playroom-checkout'),
  ],{visualPreset:'playroom-v19-checkout',engineBinding:'E13',checkoutPresentation:'accordion-dropdown',checkoutFlow:['cart','shipping','payment','summary'],pageRhythm:'restrained'});
}

function accountPage():StorefrontPageDocument{
  const source=sourcePage('account');
  return pageBase(source,[shellHeader('playroom-account'),section('playroom-account-hero',[grid('playroom-account-hero-grid',[stack('playroom-account-copy',[eyebrow('playroom-account-kicker','PLAYER PROFILE','#55e7ff'),heading('playroom-account-title','A te Playroomod.',1,{fontSize:'clamp(2.5rem,5vw,4.6rem)'}),text('playroom-account-copy-text','Rendelések, mentett elemek és visszatérési pontok egy nyugodtabb, jól olvasható fiókfelületen.')],6,{justifyContent:'center'}),image('playroom-account-image',PHOTO.community,'Játékos közösség Playroom fiókoldalhoz',6,'center 48%',{minHeight:'16rem',filter:'saturate(1.12) contrast(1.06) brightness(.82)'})])],PAGE_BG,'m'),section('playroom-account-navigation-presets',[grid('playroom-account-navigation-grid',[infoCard('playroom-account-orders','ORDERS','Rendeléseim','Korábbi és folyamatban lévő rendelések elérési pontja.',4,'#55e7ff'),infoCard('playroom-account-favorites','SAVED','Kedvencek','Mentett játékok és kiegészítők visszatérési pontja.',4,'#ff6fbd'),infoCard('playroom-account-profile','PROFILE','Fiókadatok','A kereskedő által támogatott fiók- és kapcsolatkezelési felület.',4,'#b8e34a')])],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),shellFooter('playroom-account')],{visualPreset:'playroom-v19-account',pageRhythm:'calm'});
}

function contentPage():StorefrontPageDocument{
  const source=sourcePage('content');
  return pageBase(source,[shellHeader('playroom-content'),section('playroom-content-feature-preset',[grid('playroom-content-feature-grid',[image('playroom-content-feature-image',PHOTO.editorial,'Gaming útmutató szerkesztőségi képe',7,'center 48%',{minHeight:'20rem',filter:'saturate(1.08) contrast(1.06) brightness(.82)'},'content.page.image','content.page.imageAlt'),stack('playroom-content-feature-copy',[eyebrow('playroom-content-kicker','PLAYROOM GUIDE','#b8e34a'),heading('playroom-content-title','Játssz jobban, válassz könnyebben.',1,{fontSize:'clamp(2.35rem,4.5vw,4.25rem)'},'content.page.title'),text('playroom-content-lead','Szerkeszthető gaming útmutató ugyanabban a vizuális rendszerben, mint a storefront többi része.',{},'content.page.summary'),button('playroom-content-cta','Játékok felfedezése','/webaruhaz')],5,{...SURFACE,padding:'1.1rem',justifyContent:'center'})])],PAGE_BG,'l'),section('playroom-content-body-preset',[stack('playroom-content-body',[heading('playroom-content-body-title','Útmutató',2),text('playroom-content-body-copy','A tartalom helye a kereskedő saját szerkesztőségi szövegéhez. A Builderben a cím, kép, törzsszöveg és CTA külön mező marad.',{fontSize:'1rem',maxWidth:'72ch'},'content.page.body')],12,{...QUIET_SURFACE,padding:'1.2rem'})],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),shellFooter('playroom-content')],{visualPreset:'playroom-v19-content',engineBinding:'E10'});
}

function blogIndexPage():StorefrontPageDocument{
  const source=sourcePage('blog-index');
  const journal=findNode(source,'playroom-blog-index-body');
  if(!journal)throw new Error('PLAYROOM_V19_BLOG_INDEX_SOURCE_MISSING');
  return pageBase(source,[shellHeader('playroom-blog-index'),section('playroom-blog-index-feature-preset',[grid('playroom-blog-index-feature-grid',[stack('playroom-blog-index-feature-copy',[eyebrow('playroom-blog-index-kicker','PLAYROOM MAGAZIN','#ff6fbd'),heading('playroom-blog-index-title','Tippek. Útmutatók. Játékesték.',1,{fontSize:'clamp(2.5rem,5vw,4.7rem)'}),text('playroom-blog-index-copy','A magazinoldal vizuálisan ugyanahhoz a gaming világhoz tartozik, de az olvasás és a történetek hierarchiája kerül előtérbe.')],5,{justifyContent:'center'}),image('playroom-blog-index-feature-image',PHOTO.editorial,'Gaming magazin kiemelt történet képe',7,'center 48%',{minHeight:'19rem',filter:'saturate(1.1) contrast(1.06) brightness(.82)'})])],PAGE_BG,'l'),withStyle(journal,{background:'#020b17'}),section('playroom-blog-index-topic-presets',[grid('playroom-blog-index-topics',[infoCard('playroom-blog-topic-platform','PLATFORM','Platform guide','Segítség a választáshoz és kompatibilitási kontextushoz.',4,'#55e7ff'),infoCard('playroom-blog-topic-together','TOGETHER','Co-op esték','Ötletek közös játékhoz és kiegészítőkhöz.',4,'#ff6fbd'),infoCard('playroom-blog-topic-setup','SETUP','Setup tippek','Kontroller, audio és gaming tér inspiráció.',4,'#b8e34a')])],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),shellFooter('playroom-blog-index')],{visualPreset:'playroom-v19-editorial-index',engineBinding:'E10'});
}

function blogArticlePage():StorefrontPageDocument{
  const source=sourcePage('blog-article');
  return pageBase(source,[shellHeader('playroom-blog-article'),section('playroom-blog-article-hero',[eyebrow('playroom-blog-article-kicker','PLAYROOM MAGAZIN','#ff6fbd'),heading('playroom-blog-article-title','Playroom Guide',1,{fontSize:'clamp(2.4rem,5vw,4.7rem)',maxWidth:'15ch'},'content.article.title'),text('playroom-blog-article-lead','Gaming útmutató és szerkesztőségi történet.',{maxWidth:'62ch'},'content.article.summary'),image('playroom-blog-article-image',PHOTO.editorial,'Gaming magazin cikk kiemelt képe',12,'center 48%',{minHeight:'24rem',filter:'saturate(1.08) contrast(1.05) brightness(.82)'},'content.article.image','content.article.imageAlt')],PAGE_BG,'l'),section('playroom-blog-article-body-preset',[grid('playroom-blog-article-body-grid',[stack('playroom-blog-article-body',[heading('playroom-blog-article-body-title','A történet',2),text('playroom-blog-article-body-copy','A tényleges szerkesztőségi tartalom E10 authorityből érkezhet; a sablon itt a tipográfiai és vizuális keretet adja.',{fontSize:'1.02rem',maxWidth:'68ch'},'content.article.body')],8,{...QUIET_SURFACE,padding:'1.25rem'}),stack('playroom-blog-article-aside',[eyebrow('playroom-blog-article-aside-kicker','NEXT MOVE','#b8e34a'),heading('playroom-blog-article-aside-title','Folytasd a felfedezést',3),text('playroom-blog-article-aside-copy','Nézd meg a játékokat, platformokat és kiegészítőket.'),button('playroom-blog-article-aside-cta','Irány a webshop','/webaruhaz','secondary')],4,{...SURFACE,padding:'1rem'})])],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),shellFooter('playroom-blog-article')],{visualPreset:'playroom-v19-editorial-article',engineBinding:'E10'});
}

function faqPage():StorefrontPageDocument{
  const source=sourcePage('faq');
  const faqCard=(id:string,q:string,a:string)=>stack(id,[heading(`${id}-question`,q,3,{fontSize:'1.05rem'}),text(`${id}-answer`,a,{fontSize:'.9rem'})],12,{...QUIET_SURFACE,padding:'1rem'},'s');
  return pageBase(source,[shellHeader('playroom-faq'),section('playroom-faq-hero',[eyebrow('playroom-faq-kicker','HELP CENTER','#55e7ff'),heading('playroom-faq-title','Gyors válaszok, játékos zaj nélkül.',1,{fontSize:'clamp(2.35rem,4.5vw,4.2rem)'}),text('playroom-faq-copy','A GYIK ugyanazt a Playroom karaktert használja, de hosszabb olvasásra és gyors információkeresésre optimalizálva.')],PAGE_BG,'m'),section('playroom-faq-questions-preset',[stack('playroom-faq-list',[faqCard('playroom-faq-platform','Honnan tudom, hogy kompatibilis-e egy termék?','A kompatibilitást a strukturált termékadat és a compatibility authority határozza meg; az ismeretlen állapot nem számít kompatibilisnek.'),faqCard('playroom-faq-stock','A sablon mutat készletet és árat?','Igen, de kizárólag a valós commerce adatokból. A sablon nem talál ki készletet, árat vagy kedvezményt.'),faqCard('playroom-faq-order','Mi történik a pénztárnál?','A végső rendelési és fizetési validáció a közös provider-neutral checkout authority feladata.')],12,{gap:'.55rem'})],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),section('playroom-faq-help-cta-preset',[grid('playroom-faq-help-grid',[stack('playroom-faq-help-copy',[eyebrow('playroom-faq-help-kicker','STILL STUCK?','#ff6fbd'),heading('playroom-faq-help-title','Segítünk tovább.',2),text('playroom-faq-help-copy-text','Ha nem találtad meg a választ, lépj kapcsolatba a kereskedővel.'),button('playroom-faq-help-cta','Kapcsolat','/kapcsolat','secondary')],7,{...SURFACE,padding:'1rem'}),image('playroom-faq-help-image',PHOTO.audio,'Gaming headset ügyfélszolgálati hangulatkép',5,'center 65%',{minHeight:'12rem',filter:'saturate(1.12) contrast(1.05) brightness(.82)'})])],PAGE_BG,'m'),shellFooter('playroom-faq')],{visualPreset:'playroom-v19-faq',pageRhythm:'calm'});
}

function contactPage():StorefrontPageDocument{
  const source=sourcePage('contact');
  return pageBase(source,[shellHeader('playroom-contact'),section('playroom-contact-hero',[grid('playroom-contact-hero-grid',[stack('playroom-contact-copy',[eyebrow('playroom-contact-kicker','PLAYER SUPPORT','#55e7ff'),heading('playroom-contact-title','Beszéljünk.',1,{fontSize:'clamp(2.5rem,5vw,4.6rem)'}),text('playroom-contact-copy-text','A kapcsolatoldal a kereskedő saját elérhetőségeinek és ügyfélszolgálati folyamatainak vizuális kerete.')],6,{justifyContent:'center'}),image('playroom-contact-image',PHOTO.community,'Gaming közösség kapcsolatoldali képhez',6,'center 48%',{minHeight:'17rem',filter:'saturate(1.08) contrast(1.05) brightness(.8)'})])],PAGE_BG,'m'),section('playroom-contact-options-preset',[grid('playroom-contact-options-grid',[infoCard('playroom-contact-orders','ORDER HELP','Rendeléssel kapcsolatban','Rendelési kérdések és státuszok elérési pontja.',4,'#b8e34a'),infoCard('playroom-contact-product','PRODUCT HELP','Termék és kompatibilitás','Termékadatokkal és kompatibilitással kapcsolatos segítség.',4,'#55e7ff'),infoCard('playroom-contact-general','GENERAL','Általános kérdés','Egyéb ügyfélszolgálati kapcsolatfelvétel.',4,'#ff6fbd')])],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),shellFooter('playroom-contact')],{visualPreset:'playroom-v19-contact',pageRhythm:'calm'});
}

function legalPage():StorefrontPageDocument{
  const source=sourcePage('legal');
  return pageBase(source,[shellHeader('playroom-legal'),section('playroom-legal-intro',[eyebrow('playroom-legal-kicker','LEGAL / PRIVACY','#55e7ff'),heading('playroom-legal-title','Jogi információk',1,{fontSize:'clamp(2.2rem,4vw,3.8rem)'},'content.page.title'),text('playroom-legal-lead','A jogi oldalon a Playroom brand csak keretet ad; az olvashatóság és a kereskedő saját jogi tartalma az első.',{maxWidth:'72ch'},'content.page.summary')],{background:'linear-gradient(180deg,#041326,#020b17)'},'m'),section('playroom-legal-reading-preset',[stack('playroom-legal-reading',[heading('playroom-legal-reading-title','Tájékoztató',2),text('playroom-legal-reading-body','A kereskedő ÁSZF, adatkezelési, szállítási vagy egyéb jogi tartalma ezen a jól olvasható felületen jelenhet meg.',{fontSize:'1rem',maxWidth:'78ch',lineHeight:1.75},'content.page.body')],12,{background:'#f7fbff',color:'#0a2038',borderRadius:'.55rem',padding:'clamp(1.2rem,3vw,2.2rem)'})],PAGE_BG,'m'),shellFooter('playroom-legal')],{visualPreset:'playroom-v19-legal',pageRhythm:'reading'});
}

function notFoundPage():StorefrontPageDocument{
  const source=sourcePage('not-found');
  return pageBase(source,[shellHeader('playroom-not-found'),section('playroom-not-found-hero-preset',[grid('playroom-not-found-grid',[stack('playroom-not-found-copy',[eyebrow('playroom-not-found-kicker','404 / GAME OVER?','#ff6fbd'),heading('playroom-not-found-title','Ez a pálya nem létezik.',1,{fontSize:'clamp(3rem,7vw,6rem)',maxWidth:'10ch'}),text('playroom-not-found-copy-text','A keresett oldal nem található. Menj vissza a Playroom fő útvonalaira, és folytasd a játékot.'),button('playroom-not-found-home','Vissza a főoldalra','/'),button('playroom-not-found-shop','Játékok felfedezése','/webaruhaz','secondary')],5,{justifyContent:'center'}),image('playroom-not-found-image',PHOTO.gift,'Neon Playroom vizuál a 404 oldalhoz',7,'center 52%',{minHeight:'22rem',filter:'saturate(1.2) contrast(1.08) brightness(.78)'})])],PAGE_BG,'xl'),shellFooter('playroom-not-found')],{visualPreset:'playroom-v19-404'});
}

const upgradedPages:Record<StorefrontPageDocument['pageType'],()=>StorefrontPageDocument>={
  home:()=>pageBase(acceptedHome,clone(acceptedHome.sections),{homeAcceptedFromVersion:18,visualPreset:'accepted-playroom-v18-home'}),
  catalog:catalogPage,
  product:productPage,
  search:searchPage,
  cart:cartPage,
  checkout:checkoutPage,
  account:accountPage,
  content:contentPage,
  'blog-index':blogIndexPage,
  'blog-article':blogArticlePage,
  faq:faqPage,
  contact:contactPage,
  legal:legalPage,
  'not-found':notFoundPage,
};

export const PLAYROOM_V19_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_V18_TEMPLATE_PACKAGE,
  manifest:{...PLAYROOM_V18_TEMPLATE_PACKAGE.manifest,templateVersion:PLAYROOM_V19_TEMPLATE_VERSION},
  pages:PLAYROOM_V18_TEMPLATE_PACKAGE.manifest.pageTypes.map(pageType=>upgradedPages[pageType]()),
};
