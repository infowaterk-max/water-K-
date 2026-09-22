import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {
  PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE as PLAYROOM_V19_BASE_TEMPLATE_PACKAGE,
  PLAYROOM_V19_CANONICAL_TEMPLATE_VERSION,
} from '@/lib/builder/templates/playroom-v19-base';

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
  setup:'https://images.pexels.com/photos/33888375/pexels-photo-33888375.jpeg?auto=compress&cs=tinysrgb&w=1400',
  controller:'https://images.pexels.com/photos/7987293/pexels-photo-7987293.jpeg?auto=compress&cs=tinysrgb&w=1200',
  editorial:'https://images.pexels.com/photos/9071471/pexels-photo-9071471.jpeg?auto=compress&cs=tinysrgb&w=1400',
} as const;

const pageOf=(pageType:StorefrontPageDocument['pageType'])=>{
  const result=PLAYROOM_V19_BASE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType===pageType);
  if(!result)throw new Error(`PLAYROOM_V19_PARITY_PAGE_MISSING:${pageType}`);
  return result;
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
  if(!result)throw new Error(`PLAYROOM_V19_PARITY_NODE_MISSING:${id}`);
  return result;
};
const top=(source:StorefrontPageDocument,id:string)=>{
  const result=source.sections.find(item=>item.id===id);
  if(!result)throw new Error(`PLAYROOM_V19_PARITY_SECTION_MISSING:${id}`);
  return clone(result);
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
const micro=(id:string,kicker:string,title:string,text:string,span:GridSpan=4,accent='#55e7ff')=>stack(id,[eyebrow(`${id}-kicker`,kicker,accent),heading(`${id}-title`,title,3,undefined,{fontSize:'1rem'}),copy(`${id}-copy`,text,undefined,{fontSize:'.72rem'})],span,{...PANEL,padding:'.7rem',minHeight:'5.4rem'});
const withMetadata=(source:StorefrontPageDocument,sections:StorefrontComponentNode[],metadata:JsonRecord):StorefrontPageDocument=>({...source,sections,metadata:{...(source.metadata??{}),subpageParityRelease:'playroom-v19-reference-archetypes-v2',homeParityGrammar:true,compactMedia:true,...metadata}});

const PLATFORM_ITEMS=[
  {id:'pc',label:'PC',href:'/webaruhaz?platform=pc',image:'/playroom/platforms/pc.svg',imageAlt:'PC platform ikon'},
  {id:'playstation',label:'PlayStation',href:'/webaruhaz?platform=playstation',image:'/playroom/platforms/playstation.svg',imageAlt:'PlayStation platform ikon'},
  {id:'xbox',label:'Xbox',href:'/webaruhaz?platform=xbox',image:'/playroom/platforms/xbox.svg',imageAlt:'Xbox platform ikon'},
  {id:'nintendo',label:'Nintendo',href:'/webaruhaz?platform=nintendo',image:'/playroom/platforms/nintendo.svg',imageAlt:'Nintendo platform ikon'},
  {id:'handheld',label:'Kézikonzol',href:'/webaruhaz?platform=handheld',image:'/playroom/platforms/handheld.svg',imageAlt:'Kézikonzol platform ikon'},
  {id:'mobile',label:'Mobil',href:'/webaruhaz?platform=mobile',image:'/playroom/platforms/mobile.svg',imageAlt:'Mobil platform ikon'},
] as const;
const compactPlatformNav=()=>node({id:'playroom-catalog-platform-navigation',componentKey:'guided.attribute-navigation',componentVersion:1,config:{eyebrow:'PLATFORM',title:'Mivel játszol?',copy:'Egy kattintással szűkíts a saját platformodra.',columns:3,presentation:'media-navigation',items:PLATFORM_ITEMS,styleSlots:{root:{base:{background:'transparent'}},grid:{base:{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:'.42rem'}},card:{base:{position:'relative',minHeight:'4.35rem',background:'linear-gradient(180deg,#0b2b49,#07182c)',border:'1px solid rgba(82,219,255,.32)',borderRadius:'.58rem',overflow:'hidden'}},mediaImage:{base:{width:'68%',height:'68%',margin:'7% 16% 16%',objectFit:'contain'}},label:{base:{fontSize:'.5rem',fontWeight:900}}}}});

function buildCatalog(){
  const source=pageOf('catalog');
  const facets=must(source,'playroom-catalog-facets');
  facets.responsive=responsive(3,4,12);
  const products=must(source,'playroomCatalogGrid');
  products.responsive=responsive(9,8,12);
  products.config={...products.config,columns:4,styleSlots:{...rec(products.config.styleSlots),grid:{base:{gap:'.72rem'}},card:{base:{background:'linear-gradient(180deg,#111a3a,#0b132b)',border:'1px solid rgba(82,219,255,.23)',borderRadius:'.7rem',padding:'.55rem'}},media:{base:{borderRadius:'.56rem',background:'#0a1730'}},cta:{base:{borderRadius:'.45rem'}}}};
  return withMetadata(source,[
    header(source),
    section('playroom-catalog-hero',[grid('playroom-catalog-hero-grid',[
      stack('playroom-catalog-hero-copy',[eyebrow('playroom-catalog-kicker','FEDEZD FEL / JÁTSSZ / ÚJRA','#ff63bf'),heading('playroom-catalog-title','Találd meg a következő játékod.',1),copy('playroom-catalog-copy','A katalógus itt nem egy óriásplakát: gyorsan elvisz a platformhoz, játékstílushoz és a valódi kínálathoz.'),button('playroom-catalog-cta','Mutasd a kínálatot','#playroom-catalog-products')],5,{...PANEL_ALT,padding:'1rem 1.05rem',justifyContent:'center'}),
      stack('playroom-catalog-hero-media',[compactImage('playroom-catalog-hero-image',PHOTO.setup,'Kompakt RGB játékos felszerelés',12,'16.5rem'),grid('playroom-catalog-hero-signals',[micro('playroom-catalog-signal-new','ÚJ','Újdonságok','Friss belépési pont.',4,'#b8e34a'),micro('playroom-catalog-signal-coop','EGYÜTT','Kooperatív','Közös játékra.',4,'#ff63bf'),micro('playroom-catalog-signal-setup','FELSZERELÉS','Felszerelés','Kiegészítők gyorsan.',4)],'s')],7)
    ],'m')]),
    section('playroom-catalog-platform-presets',[compactPlatformNav()],'s'),
    section('playroom-catalog-products',[eyebrow('playroom-catalog-products-kicker','BÖNGÉSZÉS / SZŰRÉS','#b8e34a'),grid('playroom-catalog-products-layout',[stack('playroom-catalog-filters-shell',[facets],3,{...PANEL,padding:'.75rem',alignSelf:'start'}),stack('playroom-catalog-grid-shell',[products],9)],'m')],'m'),
    section('playroom-catalog-discovery-presets',[grid('playroom-catalog-discovery-grid',[micro('playroom-catalog-discovery-coop','JÁTSSZATOK EGYÜTT','Kooperatív és többjátékos','Közös játékhoz.',4,'#ff63bf'),micro('playroom-catalog-discovery-setup','FELSZERELÉS','Kiegészítők','Kontroller, audio, tér.',4),micro('playroom-catalog-discovery-gift','AJÁNDÉK MÓD','Ajándékötletek','Valódi termékadatokból.',4,'#b8e34a')],'m')],'s'),
    footer(source),
  ],{visualPreset:'playroom-v19-catalog-home-parity',archetype:'discovery'});
}

function buildProduct(){
  const source=pageOf('product');
  const gallery=must(source,'playroom-product-gallery');
  gallery.responsive=responsive(7,7,12);
  gallery.config={...gallery.config,aspectRatio:'16 / 10',styleSlots:{...rec(gallery.config.styleSlots),root:{base:{alignSelf:'start'}},main:{base:{aspectRatio:'16 / 10',maxHeight:'25rem',background:'linear-gradient(145deg,#15142c,#0a1730)',border:'1px solid rgba(82,219,255,.25)',borderRadius:'.72rem'}},mainImage:{base:{objectFit:'contain',padding:'.7rem'}},thumbnail:{base:{borderRadius:'.46rem',background:'#0a1730'}},thumbnailImage:{base:{objectFit:'cover'}}}};
  const info=must(source,'playroom-product-info');
  info.config={...info.config,styleSlots:{...rec(info.config.styleSlots),root:{base:{background:'linear-gradient(155deg,#141b3b,#08182e)',border:'1px solid rgba(82,219,255,.24)',borderRadius:'.72rem',padding:'1rem'}}}};
  const reviews=must(source,'playroom-product-reviews');
  const options=must(source,'playroom-product-options');
  const purchase=must(source,'playroom-product-purchase');
  const keySpecs=must(source,'playroom-product-key-specs');
  const compatibility=must(source,'playroom-product-compatibility');
  return withMetadata(source,[
    header(source),
    section('playroom-product-main',[grid('playroom-product-grid',[
      gallery,
      stack('playroom-product-buybox',[info,reviews,options,purchase,grid('playroom-product-buybox-signals',[micro('playroom-product-buybox-platform','PLATFORM','Ellenőrzött adat','Nem találunk ki kompatibilitást.',4),micro('playroom-product-buybox-stock','KÉSZLET','Valós készlet','Ellenőrzött kereskedelmi adatokból.',4,'#b8e34a'),micro('playroom-product-buybox-order','RENDELÉS','Biztonságos','Szerveroldali validáció.',4,'#ff63bf')],'s')],5,{...PANEL,padding:'.75rem'})
    ],'m')],'m'),
    section('playroom-product-confidence',[grid('playroom-product-confidence-grid',[micro('playroom-product-confidence-platform','PLATFORM','Kompatibilitás','Strukturált bizonyíték.',4),micro('playroom-product-confidence-stock','ELÉRHETŐSÉG','Elérhetőség','Valós készlet és ár.',4,'#b8e34a'),micro('playroom-product-confidence-checkout','PÉNZTÁR','Rendelés','Végső validáció.',4,'#ff63bf')],'m')],'s'),
    section('playroom-product-facts',[grid('playroom-product-facts-grid',[stack('playroom-product-facts-specs',[keySpecs],5,{...PANEL,padding:'.85rem'}),stack('playroom-product-facts-compatibility',[compatibility],7,{...PANEL_ALT,padding:'.85rem'})],'m')],'m'),
    section('playroom-product-story-preset',[grid('playroom-product-story-grid',[compactImage('playroom-product-story-image',PHOTO.controller,'Játékkontroller részlet',4,'16rem'),stack('playroom-product-story-copy',[eyebrow('playroom-product-story-kicker','JÁTÉKESTRE KÉSZ','#ff63bf'),heading('playroom-product-story-title','A termékoldalnak döntést kell segítenie.',2),copy('playroom-product-story-copy-text','A nagy, ismétlődő fotó helyett itt kompakt média, használható termékinformáció és világos következő lépés dolgozik együtt.'),grid('playroom-product-story-notes',[micro('playroom-product-story-note-data','ADATOK','Specifikáció','Átlátható adatok.',4),micro('playroom-product-story-note-match','EGYEZÉS','Platform','Bizonyíték-alapú.',4,'#b8e34a'),micro('playroom-product-story-note-next','KÖVETKEZŐ','Ajánlások','Valódi kínálatból.',4,'#ff63bf')],'s'),button('playroom-product-story-cta','Kapcsolódó ajánlatok','#playroom-product-recommendations','secondary')],8,{...PANEL,padding:'1rem'})],'m')],'m'),
    top(source,'playroom-product-recommendations'),
    footer(source),
  ],{visualPreset:'playroom-v19-pdp-home-parity',archetype:'commerce-decision',pdpGrid:'desktop-tablet-7-5-mobile-12-12'});
}

function buildBlogArticle(){
  const source=pageOf('blog-article');
  return withMetadata(source,[
    header(source),
    section('playroom-blog-article-hero',[grid('playroom-blog-article-hero-grid',[
      stack('playroom-blog-article-hero-copy',[eyebrow('playroom-blog-article-kicker','PLAYROOM MAGAZIN','#ff63bf'),heading('playroom-blog-article-title','Így építs jobb játékestét.',1,'content.article.title'),copy('playroom-blog-article-lead','Praktikus játékútmutató, röviden és használhatóan.','content.article.summary'),grid('playroom-blog-article-meta',[micro('playroom-blog-article-meta-type','ÚTMUTATÓ','Útmutató','Gyakorlati fókusz.',4),micro('playroom-blog-article-meta-read','OLVASÁSI IDŐ','5–8 perc','Kompakt olvasás.',4,'#b8e34a'),micro('playroom-blog-article-meta-next','KÖVETKEZŐ','Próbáld ki','Lépj tovább a kínálatra.',4,'#ff63bf')],'s')],7,{...PANEL_ALT,padding:'1rem'}),compactImage('playroom-blog-article-image',PHOTO.editorial,'Két játékos közös játékpillanatban',5,'19rem','content.article.image','content.article.imageAlt')],'m')],'m'),
    section('playroom-blog-article-body-preset',[grid('playroom-blog-article-body-grid',[
      stack('playroom-blog-article-body',[eyebrow('playroom-blog-article-body-kicker','A TÖRTÉNET','#55e7ff'),heading('playroom-blog-article-body-title','A történet',2),copy('playroom-blog-article-body-copy','A jó játékest nem attól működik, hogy mindenből a legnagyobbat választod. A platform, a játékstílus, a társaság és a felszerelés együtt adja az élményt — ebben segít eligazodni ez az útmutató.','content.article.body')],8,{...PANEL,padding:'1rem',minHeight:'13rem'}),
      stack('playroom-blog-article-aside',[eyebrow('playroom-blog-article-aside-kicker','KÖVETKEZŐ LÉPÉS','#b8e34a'),heading('playroom-blog-article-aside-title','Innen folytasd',3),copy('playroom-blog-article-aside-copy','A cikk után ne egy üres oldalon landolj: válassz következő irányt.'),button('playroom-blog-article-aside-shop','Játékok','/webaruhaz'),button('playroom-blog-article-aside-guides','További útmutatók','/blog','secondary')],4,{...PANEL_ALT,padding:'1rem'}),
      grid('playroom-blog-article-related',[micro('playroom-blog-article-related-platform','PLATFORM','Platformútmutató','Melyik rendszer illik hozzád?',4),micro('playroom-blog-article-related-coop','EGYÜTT','Közös játékesték','Játékok közös élményhez.',4,'#ff63bf'),micro('playroom-blog-article-related-setup','FELSZERELÉS','Felszerelési tippek','Kontroller, audio és tér.',4,'#b8e34a')],'m')
    ],'m')],'m'),
    footer(source),
  ],{visualPreset:'playroom-v19-editorial-home-parity',archetype:'editorial-reading'});
}

const parityPages:Partial<Record<StorefrontPageDocument['pageType'],StorefrontPageDocument>>={catalog:buildCatalog(),product:buildProduct(),'blog-article':buildBlogArticle()};

export const PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_V19_BASE_TEMPLATE_PACKAGE,
  pages:PLAYROOM_V19_BASE_TEMPLATE_PACKAGE.pages.map(source=>clone(parityPages[source.pageType]??source)),
};
