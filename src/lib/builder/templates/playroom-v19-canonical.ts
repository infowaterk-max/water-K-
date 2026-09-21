import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {
  PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE as PLAYROOM_V19_REFERENCE_TEMPLATE_PACKAGE,
  PLAYROOM_V19_CANONICAL_TEMPLATE_VERSION,
} from '@/lib/builder/templates/playroom-v19-reference-archetypes';

export {PLAYROOM_V19_CANONICAL_TEMPLATE_VERSION};

type GridSpan=1|2|3|4|5|6|7|8|9|10|11|12;
type JsonRecord=Record<string,unknown>;
const clone=<T>(value:T):T=>structuredClone(value);
const node=(value:StorefrontComponentNode)=>value;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const responsive=(desktop:GridSpan,tablet:GridSpan=desktop,mobile:GridSpan=12):StorefrontComponentNode['responsive']=>({desktop:{gridSpan:desktop},tablet:{gridSpan:tablet},mobile:{gridSpan:mobile}});
const PAGE_BG={background:'radial-gradient(circle at 86% 8%,rgba(51,213,255,.08),transparent 23%),radial-gradient(circle at 12% 30%,rgba(255,75,190,.05),transparent 18%),#020b17'};
const PANEL={background:'linear-gradient(155deg,#0b2947,#06172b)',border:'1px solid rgba(78,216,255,.28)',borderRadius:'.72rem',boxShadow:'0 14px 34px rgba(0,0,0,.24)'};
const PANEL_ALT={background:'linear-gradient(145deg,rgba(26,20,66,.95),rgba(7,25,46,.98))',border:'1px solid rgba(255,93,190,.24)',borderRadius:'.72rem',boxShadow:'0 14px 34px rgba(0,0,0,.2)'};
const PHOTO={
  heroSetup:'https://images.pexels.com/photos/3945673/pexels-photo-3945673.jpeg?auto=compress&cs=tinysrgb&w=1800',
  setup:'https://images.pexels.com/photos/33888375/pexels-photo-33888375.jpeg?auto=compress&cs=tinysrgb&w=1400',
  controller:'https://images.pexels.com/photos/7987293/pexels-photo-7987293.jpeg?auto=compress&cs=tinysrgb&w=1200',
  editorial:'https://images.pexels.com/photos/9071471/pexels-photo-9071471.jpeg?auto=compress&cs=tinysrgb&w=1200',
  audio:'https://images.pexels.com/photos/7858756/pexels-photo-7858756.jpeg?auto=compress&cs=tinysrgb&w=1000',
} as const;

const pageOf=(pageType:StorefrontPageDocument['pageType'])=>{
  const result=PLAYROOM_V19_REFERENCE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType===pageType);
  if(!result)throw new Error(`PLAYROOM_V19_COMPLETE_PAGE_MISSING:${pageType}`);
  return clone(result);
};
const find=(nodes:readonly StorefrontComponentNode[],id:string):StorefrontComponentNode|undefined=>{
  for(const item of nodes){
    if(item.id===id)return clone(item);
    const nested=find(item.children??[],id);
    if(nested)return nested;
  }
  return undefined;
};
const must=(source:StorefrontPageDocument,id:string)=>{
  const result=find(source.sections,id);
  if(!result)throw new Error(`PLAYROOM_V19_COMPLETE_NODE_MISSING:${id}`);
  return result;
};
const header=(source:StorefrontPageDocument)=>clone(source.sections[0]!);
const footer=(source:StorefrontPageDocument)=>clone(source.sections[source.sections.length-1]!);
const section=(id:string,children:StorefrontComponentNode[],spacing='m',style:JsonRecord=PAGE_BG)=>node({id,componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing,width:'full',style},children:[node({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'s'},children})]});
const grid=(id:string,children:StorefrontComponentNode[],gap='m')=>node({id,componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap,align:'stretch'},children});
const stack=(id:string,children:StorefrontComponentNode[],span:GridSpan=12,style:JsonRecord={})=>node({id,componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'s',align:'stretch',justify:'start',style},responsive:responsive(span,span===12?12:Math.min(12,span+1) as GridSpan,12),children});
const eyebrow=(id:string,text:string,color='#55e7ff')=>node({id,componentKey:'content.text',componentVersion:1,config:{text,as:'strong',align:'left',tone:'text',style:{fontSize:'.62rem',fontWeight:900,letterSpacing:'.15em',textTransform:'uppercase',color}}});
const heading=(id:string,text:string,level=2,binding?:string,style:JsonRecord={})=>node({id,componentKey:'content.heading',componentVersion:1,config:{text,level,align:'left',tone:'text',typography:{fontToken:'heading',fontWeight:900,lineHeight:level===1?.9:1.02,letterSpacingEm:level===1?-.045:-.025},style:{...(level===1?{fontSize:'clamp(2.25rem,4vw,3.9rem)'}:{}),...style}},...(binding?{bindings:{text:{path:binding,fallback:text}}}:{})});
const copy=(id:string,text:string,binding?:string,style:JsonRecord={})=>node({id,componentKey:'content.text',componentVersion:1,config:{text,as:'p',align:'left',tone:'text',typography:{fontToken:'body',lineHeight:1.55},style:{color:'#b9cadc',fontSize:'.92rem',...style}},...(binding?{bindings:{text:{path:binding,fallback:text}}}:{})});
const button=(id:string,label:string,href:string,variant:'primary'|'secondary'='primary')=>node({id,componentKey:'content.button',componentVersion:1,config:{label,href,variant,size:'m',ariaLabel:label,style:{borderRadius:'.42rem',fontWeight:900}}});
const compactImage=(id:string,src:string,alt:string,span:GridSpan,height:string,bindingSrc?:string,bindingAlt?:string)=>node({id,componentKey:'content.image',componentVersion:1,config:{src,alt,width:1200,height:720,fit:'cover',loading:'lazy',radius:'none',objectPosition:'center center',artDirection:{desktop:{src,objectFit:'cover',objectPosition:'center center'},tablet:{src,objectFit:'cover',objectPosition:'center center'},mobile:{src,objectFit:'cover',objectPosition:'center center'}},style:{height,minHeight:'0',maxHeight:height,borderRadius:'.68rem',filter:'saturate(1.12) contrast(1.06) brightness(.84)'}},responsive:responsive(span,span,12),...((bindingSrc||bindingAlt)?{bindings:{...(bindingSrc?{src:{path:bindingSrc,fallback:src}}:{}),...(bindingAlt?{alt:{path:bindingAlt,fallback:alt}}:{})}}:{})});
const micro=(id:string,kicker:string,title:string,text:string,span:GridSpan=4,accent='#55e7ff')=>stack(id,[eyebrow(`${id}-kicker`,kicker,accent),heading(`${id}-title`,title,3,undefined,{fontSize:'1rem'}),copy(`${id}-copy`,text,undefined,{fontSize:'.72rem'})],span,{...PANEL,padding:'.7rem',minHeight:'5.2rem'});
const complete=(source:StorefrontPageDocument,sections:StorefrontComponentNode[],metadata:JsonRecord={}):StorefrontPageDocument=>({...source,sections,metadata:{...(source.metadata??{}),subpageParityRelease:'playroom-v19-complete-family-v4',homeParityGrammar:true,compactMedia:true,...metadata}});

const CUSTOMER_COPY_REPLACEMENTS:Record<string,string>={
  'Az aktív provider opciói.':'A kiválasztott fizetési mód.',
  'Commerce authority.':'Mindig az aktuális ár.',
  'E13 checkout.':'Rendelés előtt újra ellenőrizve.',
  'A működő accordion a közös E13 checkout runtime feladata; a sablon a vizuális nyelvet adja.':'Lépésről lépésre haladsz a szállítástól a fizetésen át a végső ellenőrzésig.',
  'Provider-neutral':'Biztonságos',
  'Nincs template-local fizetési logika.':'A webshopban beállított fizetési módokkal.',
  'Desktop order summary.':'A rendelés összesítése végig kéznél marad.',
  'Aktív fizetési provider.':'Válaszd ki a fizetési módot.',
  'A Szállítás és Fizetés lépés a saját provider/add-on lehetőségeit ugyanebben a folyamban jeleníti meg.':'Egyszerre csak az aktuális lépést látod, a korábbiakat bármikor visszanyithatod.',
  'Semantic slot':'Elérhető lehetőségek',
  'checkout.shipping.methods':'Cím, futár vagy átvételi pont.',
  'checkout.payment.methods':'A webshopban elérhető fizetési módok.',
  'Commerce marad authority.':'Ár és készlet mindig aktuális.',
  'A strukturált compatibility authority dönt.':'A termékoldalon jelzett kompatibilitási adatok alapján ellenőrizheted.',
  'A közös E13 checkout végzi a végső validációt.':'A rendelés leadása előtt a rendszer újra ellenőrzi az árat és a készletet.',
  'Az ügyfélszolgálati oldal feladata a jó útvonal megmutatása, nem egy hatalmas lifestyle fotó.':'Rendeléssel, termékkel vagy kompatibilitással kapcsolatos kérdésed van? Innen gyorsan a megfelelő segítséghez jutsz.',
  'Commerce authorityból.':'Mindig az aktuális készletből.',
  'Szerveroldali validáció.':'Rendeléskor újra ellenőrizve.',
  'Strukturált bizonyíték.':'Ellenőrzött termékadatok.',
  'Bizonyíték-alapú.':'Ellenőrzött adatok alapján.',
  'A kosár nem talál ki készletet.':'Mindig a valós készletet látod.',
  'Az ár a commerce authorityból jön.':'Mindig az aktuális árat látod.',
  'A checkout végén szerveroldali validáció történik.':'A rendelés előtt az ár és a készlet újra ellenőrzésre kerül.',
  'Provider-neutral fizetés.':'Válaszd ki a fizetési módot.',
  'A végső validáció a közös checkout authority feladata.':'A rendelés leadása előtt az ár és a készlet újra ellenőrzésre kerül.',
};
const CUSTOMER_COPY_KEYS=['text','title','copy','description','subtitle','label'] as const;
function polishCustomerFacingCopy(item:StorefrontComponentNode):StorefrontComponentNode{
  const config:{[key:string]:unknown}={...item.config};
  for(const key of CUSTOMER_COPY_KEYS){
    const value=config[key];
    if(typeof value==='string'&&CUSTOMER_COPY_REPLACEMENTS[value])config[key]=CUSTOMER_COPY_REPLACEMENTS[value];
  }
  return{...clone(item),config,...(item.children?{children:item.children.map(polishCustomerFacingCopy)}:{})};
}

function polishMobileHeader(item:StorefrontComponentNode):StorefrontComponentNode{
  const children=item.children?.map(polishMobileHeader);
  if(item.componentKey!=='system.commerce-header')return{...clone(item),...(children?{children}:{})};

  const config=rec(item.config);
  const inner=rec(config.innerStyle);
  const brand=rec(config.brandStyle);
  const tagline=rec(config.taglineStyle);
  const logo=rec(config.logoStyle);
  const slots=rec(config.styleSlots);
  const navFrame=rec(slots.navigationFrame);

  return{
    ...clone(item),
    config:{
      ...config,
      innerStyle:{
        base:inner,
        mobile:{padding:'.5rem .8rem .42rem',gap:'.5rem'},
      },
      brandStyle:{
        base:brand,
        mobile:{fontSize:'.9rem'},
      },
      taglineStyle:{
        base:tagline,
        mobile:{fontSize:'.56rem',letterSpacing:'.16em'},
      },
      logoStyle:{
        base:logo,
        mobile:{width:'2.1rem',height:'2.1rem'},
      },
      styleSlots:{
        ...slots,
        navigationFrame:{
          ...navFrame,
          mobile:{...rec(navFrame.mobile),overflowX:'hidden'},
        },
      },
    },
    ...(children?{children}:{}),
  };
}

function patchHomeMedia(item:StorefrontComponentNode):StorefrontComponentNode{
  const children=item.children?.map(patchHomeMedia);
  if(item.id!=='playroom-hero-art')return{...clone(item),...(children?{children}:{})};
  const config=rec(item.config),artDirection=rec(config.artDirection),style=rec(config.style);
  return{
    ...clone(item),
    config:{
      ...config,
      src:PHOTO.heroSetup,
      alt:'Prémium RGB gaming setup monitorral, kontrollerekkel és perifériákkal',
      objectPosition:'center 50%',
      artDirection:{
        ...artDirection,
        desktop:{...rec(artDirection.desktop),src:PHOTO.heroSetup,objectFit:'cover',objectPosition:'center 50%'},
        tablet:{...rec(artDirection.tablet),src:PHOTO.heroSetup,objectFit:'cover',objectPosition:'center 50%'},
        mobile:{...rec(artDirection.mobile),src:PHOTO.heroSetup,objectFit:'cover',objectPosition:'center 50%'},
      },
      style:{...style,objectFit:'cover',objectPosition:'center 50%',filter:'saturate(1.24) contrast(1.1) brightness(.74)'},
    },
    ...(children?{children}:{}),
  };
}
function buildHome(){
  const source=pageOf('home');
  return complete(source,source.sections.map(patchHomeMedia),{visualPreset:'accepted-playroom-v18-home-v19-media-polish',heroVisual:'premium-gaming-setup-no-couch-lifestyle'});
}

function buildSearch(){
  const source=pageOf('search');
  const search=must(source,'playroom-search-primary');
  const facets=must(source,'playroom-search-facets');facets.responsive=responsive(3,4,12);
  const results=must(source,'playroomSearchResults');results.responsive=responsive(9,8,12);results.config={...results.config,columns:4,styleSlots:{...rec(results.config.styleSlots),grid:{base:{gap:'.72rem'}},card:{base:{background:'linear-gradient(180deg,#111a3a,#0b132b)',border:'1px solid rgba(82,219,255,.23)',borderRadius:'.7rem',padding:'.55rem'}},media:{base:{borderRadius:'.56rem',background:'#0a1730'}}}};
  return complete(source,[header(source),section('playroom-search-hero',[grid('playroom-search-hero-grid',[stack('playroom-search-hero-copy',[eyebrow('playroom-search-kicker','SEARCH THE PLAYROOM','#ff63bf'),heading('playroom-search-title','Mit keresel ma?',1),copy('playroom-search-copy','A keresés legyen gyors belépési pont, ne újabb óriási hero.'),search],8,{...PANEL_ALT,padding:'1rem'}),stack('playroom-search-hero-shortcuts',[micro('playroom-search-shortcut-games','GAMES','Játékok','Cím és platform szerint.',12),micro('playroom-search-shortcut-gear','GEAR','Kiegészítők','Kontroller, audio, setup.',12,'#b8e34a'),micro('playroom-search-shortcut-help','DISCOVER','Nem tudod még?','Indulj a katalógusból.',12,'#ff63bf')],4)],'m')]),section('playroom-search-body',[grid('playroom-search-layout',[stack('playroom-search-facets-shell',[facets],3,{...PANEL,padding:'.75rem'}),stack('playroom-search-results-shell',[results],9)],'m')]),section('playroom-search-shortcuts',[grid('playroom-search-shortcuts-grid',[micro('playroom-search-platform-pc','PLATFORM','PC','Gyors platformszűrés.',4),micro('playroom-search-platform-console','CONSOLE','Konzol','PlayStation, Xbox, Nintendo.',4,'#ff63bf'),micro('playroom-search-platform-handheld','MOBILE','Handheld','Kézikonzol és mobil.',4,'#b8e34a')])],'s'),footer(source)],{visualPreset:'playroom-v19-search-home-parity',archetype:'discovery-search'});
}

function buildCart(){
  const source=pageOf('cart');
  const cart=must(source,'playroom-cart-summary');
  const recommendations=must(source,'playroom-cart-recommendations');
  return complete(source,[header(source),section('playroom-cart-intro',[grid('playroom-cart-intro-grid',[stack('playroom-cart-intro-copy',[eyebrow('playroom-cart-kicker','READY PLAYER CHECKOUT','#b8e34a'),heading('playroom-cart-title','Kosár',1),copy('playroom-cart-copy','Ellenőrizd a termékeket és a mennyiséget, aztán lépj tovább a vezetett pénztárba.')],8,{...PANEL_ALT,padding:'1rem'}),stack('playroom-cart-intro-status',[micro('playroom-cart-status-price','PRICE','Valós ár','Újraellenőrizve.',12),micro('playroom-cart-status-stock','STOCK','Valós készlet','Rendeléskor is.',12,'#b8e34a')],4)],'m')]),section('playroom-cart-body',[grid('playroom-cart-body-grid',[stack('playroom-cart-summary-shell',[cart],8,{...PANEL,padding:'.85rem'}),stack('playroom-cart-next-shell',[eyebrow('playroom-cart-next-kicker','NEXT','#ff63bf'),heading('playroom-cart-next-title','Innen már vezetünk.',3),copy('playroom-cart-next-copy','Szállítás → Fizetés → Összesítés. Mindig csak az aktuális lépés lesz nyitva.'),micro('playroom-cart-next-shipping','02','Szállítás','Mód, cím, átvételi pont.',12),micro('playroom-cart-next-payment','03','Fizetés','Az aktív provider opciói.',12,'#ff63bf'),micro('playroom-cart-next-summary','04','Összesítés','Végső ellenőrzés.',12,'#b8e34a')],4,{...PANEL_ALT,padding:'.85rem'})],'m')]),section('playroom-cart-recommendation-preset',[recommendations]),section('playroom-cart-trust-preset',[grid('playroom-cart-trust-grid',[micro('playroom-cart-trust-stock','STOCK','Valós elérhetőség','Nincs kitalált készlet.',4,'#b8e34a'),micro('playroom-cart-trust-price','PRICE','Valós árak','Commerce authority.',4),micro('playroom-cart-trust-order','ORDER','Végső ellenőrzés','E13 checkout.',4,'#ff63bf')])],'s'),footer(source)],{visualPreset:'playroom-v19-cart-home-parity',archetype:'commerce-task',addonSemanticContexts:['cart.recommendations']});
}

function buildCheckout(){
  const source=pageOf('checkout');
  const summary=must(source,'playroom-checkout-summary');
  return complete(source,[header(source),section('playroom-checkout-intro',[grid('playroom-checkout-intro-grid',[stack('playroom-checkout-intro-copy',[eyebrow('playroom-checkout-kicker','SECURE CHECKOUT','#b8e34a'),heading('playroom-checkout-title','Már csak a rendelés van hátra.',1),copy('playroom-checkout-copy','A működő accordion a közös E13 checkout runtime feladata; a sablon a vizuális nyelvet adja.')],8,{...PANEL_ALT,padding:'1rem'}),stack('playroom-checkout-intro-note',[micro('playroom-checkout-intro-security','SECURE','Provider-neutral','Nincs template-local fizetési logika.',12),micro('playroom-checkout-intro-summary','SUMMARY','Mindig látható','Desktop order summary.',12,'#b8e34a')],4)],'m')]),section('playroom-checkout-progress-preset',[grid('playroom-checkout-progress-grid',[micro('playroom-checkout-step-cart','01','Kosár','Termékek és mennyiségek.',3),micro('playroom-checkout-step-shipping','02','Szállítás','Cím, mód, átvételi pont.',3),micro('playroom-checkout-step-payment','03','Fizetés','Aktív fizetési provider.',3,'#ff63bf'),micro('playroom-checkout-step-summary','04','Összesítés','Kupon, jogi elfogadás, végösszeg.',3,'#b8e34a')])],'s'),section('playroom-checkout-body',[grid('playroom-checkout-body-grid',[stack('playroom-checkout-runtime-contract',[eyebrow('playroom-checkout-runtime-kicker','GUIDED ACCORDION'),heading('playroom-checkout-runtime-title','Egy aktív lépés. Nulla zaj.',2),copy('playroom-checkout-runtime-copy','A Szállítás és Fizetés lépés a saját provider/add-on lehetőségeit ugyanebben a folyamban jeleníti meg.'),grid('playroom-checkout-runtime-points',[micro('playroom-checkout-runtime-shipping','SHIPPING','Semantic slot','checkout.shipping.methods',6),micro('playroom-checkout-runtime-payment','PAYMENT','Semantic slot','checkout.payment.methods',6,'#ff63bf')])],7,{...PANEL,padding:'1rem'}),stack('playroom-checkout-summary-shell',[summary],5,{...PANEL_ALT,padding:'.85rem'})],'m')]),footer(source)],{visualPreset:'playroom-v19-checkout-home-parity',engineBinding:'E13',checkoutPresentation:'accordion-dropdown',checkoutFlow:['cart','shipping','payment','summary'],checkoutUxContract:'guided-accordion-owned-by-shared-e13-checkout-runtime-not-template-local',pageRhythm:'restrained',addonSemanticContexts:['checkout.shipping.methods','checkout.payment.methods']});
}

function buildAccount(){
  const source=pageOf('account');
  return complete(source,[header(source),section('playroom-account-hero',[grid('playroom-account-hero-grid',[stack('playroom-account-copy',[eyebrow('playroom-account-kicker','PLAYER PROFILE','#55e7ff'),heading('playroom-account-title','A te Playroomod.',1),copy('playroom-account-copy-text','Rendelések, mentett elemek és fiókadatok egy sűrű, feladatorientált felületen.')],8,{...PANEL_ALT,padding:'1rem'}),stack('playroom-account-status',[eyebrow('playroom-account-status-kicker','QUICK ACCESS','#b8e34a'),heading('playroom-account-status-title','Minden egy helyen.',3,undefined,{fontSize:'1.15rem'}),copy('playroom-account-status-copy','Rendelések · Kedvencek · Fiókadatok',undefined,{fontSize:'.8rem'})],4,{...PANEL,padding:'.85rem',justifyContent:'center'})],'m')],'s'),section('playroom-account-navigation-presets',[grid('playroom-account-navigation-grid',[micro('playroom-account-orders','ORDERS','Rendeléseim','Korábbi és folyamatban lévő rendelések.',4),micro('playroom-account-favorites','SAVED','Kedvencek','Mentett játékok és kiegészítők.',4,'#ff63bf'),micro('playroom-account-profile','PROFILE','Fiókadatok','Személyes és kapcsolati adatok.',4,'#b8e34a')])],'s'),footer(source)],{visualPreset:'playroom-v19-account-home-parity',archetype:'account-task',pageRhythm:'compact-task',addonSemanticContexts:['account.order-details']});
}

function buildContent(){
  const source=pageOf('content');
  return complete(source,[header(source),section('playroom-content-feature-preset',[grid('playroom-content-feature-grid',[compactImage('playroom-content-feature-image',PHOTO.setup,'Gaming útmutató setup részlet',4,'15rem','content.page.image','content.page.imageAlt'),stack('playroom-content-feature-copy',[eyebrow('playroom-content-kicker','PLAYROOM GUIDE','#b8e34a'),heading('playroom-content-title','Játssz jobban, válassz könnyebben.',1,'content.page.title'),copy('playroom-content-lead','Szerkeszthető gaming útmutató.','content.page.summary'),grid('playroom-content-feature-notes',[micro('playroom-content-note-guide','GUIDE','Használható','Nem csak dekoráció.',4),micro('playroom-content-note-data','DATA','Valós adatok','Commerce marad authority.',4,'#b8e34a'),micro('playroom-content-note-next','NEXT','Tovább','Kapcsolódó kínálat.',4,'#ff63bf')])],8,{...PANEL_ALT,padding:'1rem'})],'m')]),section('playroom-content-body-preset',[grid('playroom-content-body-grid',[stack('playroom-content-body',[heading('playroom-content-body-title','Útmutató',2),copy('playroom-content-body-copy','A kereskedő saját szerkesztőségi tartalma.','content.page.body')],8,{...PANEL,padding:'1rem',minHeight:'12rem'}),stack('playroom-content-related',[eyebrow('playroom-content-related-kicker','DISCOVER','#ff63bf'),heading('playroom-content-related-title','Kapcsolódó irányok',3),button('playroom-content-related-shop','Játékok felfedezése','/webaruhaz'),button('playroom-content-related-guides','További útmutatók','/blog','secondary')],4,{...PANEL_ALT,padding:'1rem'})],'m')]),footer(source)],{visualPreset:'playroom-v19-content-home-parity',engineBinding:'E10',archetype:'editorial-content',addonSemanticContexts:['content.commerce']});
}

function buildBlogIndex(){
  const source=pageOf('blog-index');
  const preview=must(source,'playroom-blog-index-preview');
  const previewItems=Array.isArray(preview.config.items)?preview.config.items.map(value=>{
    const item=rec(value);
    return item.id==='coop-night'?{...item,image:PHOTO.controller,imageAlt:'Gaming kontroller közelről co-op útmutatóhoz'}:item;
  }):[];
  preview.config={...preview.config,items:previewItems};
  preview.bindings={...(preview.bindings??{}),items:{path:'content.guides.items',fallback:previewItems}};
  return complete(source,[header(source),section('playroom-blog-index-feature-preset',[grid('playroom-blog-index-feature-grid',[stack('playroom-blog-index-feature-copy',[eyebrow('playroom-blog-index-kicker','PLAYROOM MAGAZIN','#ff63bf'),heading('playroom-blog-index-title','Tippek. Útmutatók. Játékesték.',1),copy('playroom-blog-index-copy','Editorial ritmus, de a Home-hoz illő sűrűséggel.'),grid('playroom-blog-index-feature-signals',[micro('playroom-blog-index-signal-platform','PLATFORM','Guide','Választási segítség.',4),micro('playroom-blog-index-signal-coop','TOGETHER','Co-op','Közös esték.',4,'#ff63bf'),micro('playroom-blog-index-signal-setup','SETUP','Tips','Audio és kontroll.',4,'#b8e34a')])],8,{...PANEL_ALT,padding:'1rem'}),compactImage('playroom-blog-index-feature-image',PHOTO.setup,'RGB gaming setup magazin feature',4,'14rem')],'m')]),section('playroom-blog-index-body',[preview]),section('playroom-blog-index-topic-presets',[grid('playroom-blog-index-topics',[micro('playroom-blog-topic-platform','PLATFORM','Platform guide','Segítség a választáshoz.',4),micro('playroom-blog-topic-together','TOGETHER','Co-op esték','Ötletek közös játékhoz.',4,'#ff63bf'),micro('playroom-blog-topic-setup','SETUP','Setup tippek','Kontroller, audio és tér.',4,'#b8e34a')])],'s'),footer(source)],{visualPreset:'playroom-v19-editorial-index-home-parity',engineBinding:'E10',archetype:'editorial-index'});
}

function patchBlogArticleMedia(item:StorefrontComponentNode):StorefrontComponentNode{
  const children=item.children?.map(patchBlogArticleMedia);
  if(item.id!=='playroom-blog-article-image')return{...clone(item),...(children?{children}:{})};
  const config=rec(item.config),artDirection=rec(config.artDirection),style=rec(config.style),bindings=rec(item.bindings);
  return{
    ...clone(item),
    config:{
      ...config,
      src:PHOTO.controller,
      alt:'Gaming kontroller és RGB setup részlet',
      objectPosition:'center center',
      artDirection:{
        ...artDirection,
        desktop:{...rec(artDirection.desktop),src:PHOTO.controller,objectFit:'cover',objectPosition:'center center'},
        tablet:{...rec(artDirection.tablet),src:PHOTO.controller,objectFit:'cover',objectPosition:'center center'},
        mobile:{...rec(artDirection.mobile),src:PHOTO.controller,objectFit:'cover',objectPosition:'center center'},
      },
      style:{...style,height:'19rem',maxHeight:'19rem',minHeight:'0'},
    },
    bindings:{
      ...bindings,
      src:{path:'content.article.image',fallback:PHOTO.controller},
      alt:{path:'content.article.imageAlt',fallback:'Gaming kontroller és RGB setup részlet'},
    },
    ...(children?{children}:{}),
  };
}
function buildBlogArticle(){
  const source=pageOf('blog-article');
  return complete(source,source.sections.map(patchBlogArticleMedia),{subpageParityRelease:'playroom-v19-reference-archetypes-v2',visualPreset:'playroom-v19-editorial-home-parity-media-polish',archetype:'editorial-reading',editorialFallbackMedia:'controller-setup-no-couch-lifestyle'});
}

function buildFaq(){
  const source=pageOf('faq');
  const faq=(id:string,q:string,a:string)=>stack(id,[heading(`${id}-question`,q,3,undefined,{fontSize:'1.05rem'}),copy(`${id}-answer`,a,undefined,{fontSize:'.8rem'})],12,{...PANEL,padding:'.85rem'});
  return complete(source,[header(source),section('playroom-faq-hero',[grid('playroom-faq-hero-grid',[stack('playroom-faq-hero-copy',[eyebrow('playroom-faq-kicker','HELP CENTER'),heading('playroom-faq-title','Gyors válaszok, játékos zaj nélkül.',1),copy('playroom-faq-copy','Olvasható, sűrű segítség — nem marketing hero.')],8,{...PANEL_ALT,padding:'1rem'}),stack('playroom-faq-topics',[eyebrow('playroom-faq-topics-kicker','FAST PATH','#b8e34a'),heading('playroom-faq-topics-title','Miben segíthetünk?',3,undefined,{fontSize:'1.15rem'}),copy('playroom-faq-topics-copy','Rendelés · Kompatibilitás · Fizetés',undefined,{fontSize:'.8rem'})],4,{...PANEL,padding:'.85rem',justifyContent:'center'})],'m')],'s'),section('playroom-faq-questions-preset',[grid('playroom-faq-list',[stack('playroom-faq-column-a',[faq('playroom-faq-platform','Honnan tudom, hogy kompatibilis-e?','A strukturált compatibility authority dönt.'),faq('playroom-faq-stock','A sablon mutat készletet és árat?','Igen, kizárólag valós commerce adatokból.')],6),stack('playroom-faq-column-b',[faq('playroom-faq-order','Mi történik a pénztárnál?','A közös E13 checkout végzi a végső validációt.'),faq('playroom-faq-payment','Hol jelennek meg a fizetési módok?','A Fizetés accordion lépésben, a jelenlegi design rendszerhez igazodva.')],6)],'m')],'s'),section('playroom-faq-help-cta-preset',[grid('playroom-faq-help-grid',[stack('playroom-faq-help-copy',[eyebrow('playroom-faq-help-kicker','STILL STUCK?','#ff63bf'),heading('playroom-faq-help-title','Segítünk tovább.',2),copy('playroom-faq-help-body','Ha a gyors válasz nem elég, innen természetesen jutsz az ügyfélszolgálathoz.'),button('playroom-faq-help-cta','Kapcsolat','/kapcsolat','secondary')],8,{...PANEL_ALT,padding:'1rem'}),compactImage('playroom-faq-help-image',PHOTO.audio,'Gaming headset részlet',4,'11rem')],'m')],'s'),footer(source)],{visualPreset:'playroom-v19-faq-home-parity',pageRhythm:'compact-help'});
}

function buildContact(){
  const source=pageOf('contact');
  return complete(source,[header(source),section('playroom-contact-hero',[grid('playroom-contact-hero-grid',[stack('playroom-contact-copy',[eyebrow('playroom-contact-kicker','PLAYER SUPPORT','#55e7ff'),heading('playroom-contact-title','Beszéljünk.',1),copy('playroom-contact-copy-text','Az ügyfélszolgálati oldal feladata a jó útvonal megmutatása, nem egy hatalmas lifestyle fotó.')],8,{...PANEL_ALT,padding:'1rem'}),stack('playroom-contact-expectations',[eyebrow('playroom-contact-expect-kicker','BE READY','#b8e34a'),heading('playroom-contact-expect-title','Gyorsabb segítség.',3,undefined,{fontSize:'1.15rem'}),copy('playroom-contact-expect-copy','Rendelési azonosító · Platform · Rövid hibaleírás',undefined,{fontSize:'.8rem'})],4,{...PANEL,padding:'.85rem',justifyContent:'center'})],'m')],'s'),section('playroom-contact-options-preset',[grid('playroom-contact-options-grid',[micro('playroom-contact-orders','ORDER HELP','Rendeléssel kapcsolatban','Rendelési kérdések és állapot.',4,'#b8e34a'),micro('playroom-contact-product','PRODUCT HELP','Termék és kompatibilitás','Termékinformációs segítség.',4),micro('playroom-contact-general','GENERAL','Általános kérdés','Egyéb ügyfélszolgálati kapcsolat.',4,'#ff63bf')])],'s'),footer(source)],{visualPreset:'playroom-v19-contact-home-parity',pageRhythm:'compact-support'});
}

function buildLegal(){
  const source=pageOf('legal');
  return complete(source,[header(source),section('playroom-legal-intro',[grid('playroom-legal-intro-grid',[stack('playroom-legal-intro-copy',[eyebrow('playroom-legal-kicker','LEGAL / PRIVACY'),heading('playroom-legal-title','Jogi információk',1,'content.page.title'),copy('playroom-legal-lead','A Playroom keret megmarad, de itt az olvashatóság az első.','content.page.summary')],9,{...PANEL_ALT,padding:'1rem'}),micro('playroom-legal-reading-note','READING','Nyugodt felület','Kevesebb glow, több olvashatóság.',3,'#b8e34a')],'m')]),section('playroom-legal-reading-preset',[stack('playroom-legal-reading',[heading('playroom-legal-reading-title','Tájékoztató',2),copy('playroom-legal-reading-body','A kereskedő saját jogi tartalma.','content.page.body',{fontSize:'.9rem',lineHeight:1.75})],12,{...PANEL,padding:'1.4rem',maxWidth:'62rem',minHeight:'10rem',margin:'0 auto'})]),footer(source)],{visualPreset:'playroom-v19-legal-home-parity',pageRhythm:'reading'});
}

function buildNotFound(){
  const source=pageOf('not-found');
  return complete(source,[header(source),section('playroom-not-found-hero-preset',[grid('playroom-not-found-grid',[stack('playroom-not-found-copy',[eyebrow('playroom-not-found-kicker','404 / GAME OVER?','#ff63bf'),heading('playroom-not-found-title','Ez a pálya nem létezik.',1),copy('playroom-not-found-copy-text','Ne állj meg egy üres hibaképernyőn: menj vissza egy ismert Playroom útvonalra.'),button('playroom-not-found-home','Vissza a főoldalra','/'),button('playroom-not-found-shop','Játékok felfedezése','/webaruhaz','secondary')],8,{...PANEL_ALT,padding:'1rem'}),stack('playroom-not-found-routes',[micro('playroom-not-found-route-home','HOME','Főoldal','Vissza a kezdéshez.',12),micro('playroom-not-found-route-shop','SHOP','Katalógus','Folytasd a böngészést.',12,'#b8e34a'),micro('playroom-not-found-route-help','HELP','Segítség','Keress gyors választ.',12,'#ff63bf')],4)],'m')]),footer(source)],{visualPreset:'playroom-v19-404-home-parity',pageRhythm:'compact'});
}

const overrides:Partial<Record<StorefrontPageDocument['pageType'],StorefrontPageDocument>>={
  home:buildHome(),search:buildSearch(),cart:buildCart(),checkout:buildCheckout(),account:buildAccount(),content:buildContent(),'blog-index':buildBlogIndex(),'blog-article':buildBlogArticle(),faq:buildFaq(),contact:buildContact(),legal:buildLegal(),'not-found':buildNotFound(),
};
const ADDON_CONTEXTS:Partial<Record<StorefrontPageDocument['pageType'],readonly string[]>>={
  catalog:['catalog.discovery'],product:['product.media.after','product.buybox.after','product.compatibility','product.related'],cart:['cart.recommendations'],checkout:['checkout.shipping.methods','checkout.payment.methods'],account:['account.order-details'],content:['content.commerce'],
};
const finalize=(source:StorefrontPageDocument):StorefrontPageDocument=>{
  const page=clone(overrides[source.pageType]??source),contexts=ADDON_CONTEXTS[page.pageType]??[];
  return{...page,sections:page.sections.map(polishCustomerFacingCopy).map(polishMobileHeader),metadata:{...(page.metadata??{}),addonIntegration:{styleAuthority:'current-storefront-design-system',factoryPreset:'playroom-v19',discoverability:'contextual-plus-central',semanticContexts:[...contexts],localOverridePolicy:'explicit-only-reset-to-inherited'}}};
};

export const PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_V19_REFERENCE_TEMPLATE_PACKAGE,
  pages:PLAYROOM_V19_REFERENCE_TEMPLATE_PACKAGE.pages.map(finalize),
};
