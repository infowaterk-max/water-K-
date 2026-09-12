import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_CANARY_PACKAGE} from '@/lib/builder/templates/beauty-lab';

export const BEAUTY_LAB_REFERENCE_V2_VERSION='shoporation.beauty-lab-reference-v2.1' as const;

const HERO_IMAGE='https://images.pexels.com/photos/8990301/pexels-photo-8990301.jpeg?auto=compress&dpr=1&h=750&w=1260';
const SERUM_IMAGE='https://images.pexels.com/photos/14473397/pexels-photo-14473397.jpeg?auto=compress&dpr=1&h=750&w=1260';

const clone=<T>(value:T):T=>structuredClone(value);

function flatten(page:StorefrontPageDocument){
  const result:StorefrontComponentNode[]=[];
  const visit=(node:StorefrontComponentNode)=>{result.push(node);for(const child of node.children??[])visit(child);};
  for(const section of page.sections)visit(section);
  return result;
}

function required(page:StorefrontPageDocument,id:string){
  const found=flatten(page).find(node=>node.id===id);
  if(!found)throw new Error(`BEAUTY_LAB_REFERENCE_V2_NODE_MISSING:${id}`);
  return found;
}

function setFallback(node:StorefrontComponentNode,slot:string,path:string,fallback:unknown){
  node.bindings={...(node.bindings??{}),[slot]:{path,fallback}};
}

function buildHome(base:StorefrontPageDocument){
  const page=clone(base);
  const hero=required(page,'beauty-formula-hero');
  hero.config={...hero.config,style:{base:{minHeight:'clamp(30rem,39vw,36rem)',height:'clamp(30rem,39vw,36rem)',background:'#F8F4F5',borderRadius:0,overflow:'hidden'},tablet:{minHeight:'34rem',height:'34rem'},mobile:{minHeight:'31.5rem',height:'31.5rem'}}};

  const photo=required(page,'beauty-hero-photo');
  photo.config={...photo.config,src:HERO_IMAGE,alt:'Beauty Lab skincare model applying a targeted face treatment',objectPosition:'64% 43%',style:{base:{width:'100%',height:'100%',minHeight:'100%',objectFit:'cover',objectPosition:'64% 43%',borderRadius:0},tablet:{objectPosition:'62% 44%'},mobile:{objectPosition:'61% center'}}};
  setFallback(photo,'src','content.formulaHero.image',HERO_IMAGE);
  setFallback(photo,'alt','content.formulaHero.imageAlt','Beauty Lab skincare model applying a targeted face treatment');

  const productImage=required(page,'beauty-hero-product-image');
  productImage.config={...productImage.config,src:SERUM_IMAGE,alt:'Beauty Lab targeted serum',style:{base:{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',borderRadius:0}}};
  setFallback(productImage,'src','content.formulaHero.productImage',SERUM_IMAGE);
  setFallback(productImage,'alt','content.formulaHero.productImageAlt','Beauty Lab targeted serum');

  const title=required(page,'beauty-hero-title');
  title.config={...title.config,style:{base:{fontFamily:'var(--shoporation-display-font, "Arial Narrow", Impact, sans-serif)',fontSize:'clamp(4rem,6.7vw,6.8rem)',fontWeight:900,fontStretch:'condensed',lineHeight:.82,letterSpacing:'-.052em',textTransform:'uppercase',maxWidth:'7.4ch',color:'#111111',whiteSpace:'pre-line'},tablet:{fontSize:'clamp(3.8rem,8vw,5.6rem)'},mobile:{fontSize:'clamp(2.85rem,13vw,4rem)',lineHeight:.82,maxWidth:'7ch',color:'#111111'}},accentStyle:{base:{color:'#B58AD3'},mobile:{color:'#B58AD3'}}};

  const copy=required(page,'beauty-hero-copy');
  copy.config={...copy.config,text:'Hatékony összetevők.\nLátható eredmények.\nNeked.',tone:'text',style:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.86rem',fontWeight:520,lineHeight:1.5,maxWidth:'24ch',whiteSpace:'pre-line',color:'#222222'},mobile:{display:'block',fontSize:'.76rem',lineHeight:1.42,maxWidth:'21ch',color:'#222222'}}};
  setFallback(copy,'text','content.formulaHero.copy','Hatékony összetevők.\nLátható eredmények.\nNeked.');

  const cta=required(page,'beauty-hero-cta');
  cta.config={...cta.config,label:'Találd meg a formulád  →',ariaLabel:'Találd meg a formulád',style:{base:{background:'#111111',color:'#FFFFFF',border:'1px solid #111111',borderRadius:'2px',padding:'.82rem 1.2rem',fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.68rem',fontWeight:750,letterSpacing:'.045em'},mobile:{padding:'.76rem 1rem',fontSize:'.62rem'}}};
  setFallback(cta,'label','content.formulaHero.primaryLabel','Találd meg a formulád  →');

  const titleLayer=required(page,'beauty-hero-title-layer');
  titleLayer.config={...titleLayer.config,style:{base:{top:'13%',left:'4.5%',right:'auto',bottom:'auto',width:'43%',maxWidth:'36rem',height:'auto',padding:0,transform:'none'},tablet:{top:'16%',left:'3.5%',width:'49%'},mobile:{top:'12%',left:'1rem',right:'1rem',width:'auto',maxWidth:'none'}}};
  const copyLayer=required(page,'beauty-hero-copy-layer');
  copyLayer.config={...copyLayer.config,style:{base:{top:'auto',left:'4.5%',bottom:'19%',right:'auto',width:'25rem',maxWidth:'34%',height:'auto',padding:0,transform:'none'},tablet:{left:'3.5%',bottom:'18%',maxWidth:'40%'},mobile:{display:'block',left:'1rem',bottom:'5rem',width:'auto',maxWidth:'53%'}}};
  const ctaLayer=required(page,'beauty-hero-primary-cta-layer');
  ctaLayer.config={...ctaLayer.config,style:{base:{top:'auto',left:'4.5%',bottom:'7.5%',right:'auto',width:'auto',height:'auto',padding:0,transform:'none'},tablet:{left:'3.5%',bottom:'7%'},mobile:{left:'1rem',bottom:'1rem'}}};
  const productLayer=required(page,'beauty-hero-decoration-layer');
  productLayer.config={...productLayer.config,style:{base:{top:'9%',right:'7%',bottom:'auto',left:'auto',width:'18%',height:'76%',maxWidth:'14rem',padding:0,transform:'none',background:'transparent',boxShadow:'0 18px 45px rgba(40,26,31,.08)'},tablet:{right:'4%',width:'21%'},mobile:{display:'none'}}};
  const badgeLayer=required(page,'beauty-hero-badge-layer');
  badgeLayer.config={...badgeLayer.config,style:{base:{top:'13%',right:'1.4rem',bottom:'auto',left:'auto',width:'5.4rem',height:'5.4rem',maxWidth:'none',padding:'.65rem',transform:'none',background:'#E7CFE3',borderRadius:'999px',display:'flex',alignItems:'center',justifyContent:'center'},tablet:{width:'4.7rem',height:'4.7rem',right:'.8rem'},mobile:{display:'none'}}};
  const badge=required(page,'beauty-hero-badge');
  badge.config={...badge.config,text:'ÚJ\nÖSSZETEVŐ',style:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.48rem',fontWeight:800,lineHeight:1.3,letterSpacing:'.08em',textTransform:'uppercase',textAlign:'center',color:'#FFFFFF'}}};
  setFallback(badge,'text','content.formulaHero.badge','ÚJ\nÖSSZETEVŐ');

  const overlay=required(page,'beauty-hero-overlay-layer');
  overlay.config={...overlay.config,style:{base:{inset:0,width:'100%',height:'100%',maxWidth:'none',padding:0,background:'linear-gradient(90deg,rgba(250,247,248,.98) 0%,rgba(250,247,248,.92) 25%,rgba(250,247,248,.34) 42%,rgba(250,247,248,0) 60%)'},mobile:{background:'linear-gradient(90deg,rgba(250,247,248,.96) 0%,rgba(250,247,248,.82) 42%,rgba(250,247,248,.08) 76%)'}}};

  const finder=required(page,'formula-finder');
  finder.config={...finder.config,eyebrow:'FORMULA FINDER',title:'Mi az, amin javítani szeretnél?',copy:'Válassz célt, majd finomíts textúra és preferencia szerint.',actionLabel:'Tovább  →',asideTitle:'SZEMÉLYRE SZABOTT AJÁNLÁSOK',asideCopy:'3 egyszerű kérdés, valódi eredmények.'};
  const ingredient=required(page,'beauty-ingredient-index-block');
  ingredient.config={...ingredient.config,eyebrow:'INGREDIENT INDEX',title:'Ismerd meg az összetevőket',copy:'Tudatos választás. Valódi hatás.'};
  const texture=required(page,'beauty-texture-navigation');
  texture.config={...texture.config,eyebrow:'TEXTURE LAB',title:'Találd meg a hozzád illő textúrát',copy:'Érezd a különbséget.'};
  const featured=required(page,'newFormulas-grid');
  featured.config={...featured.config,title:'Népszerű formulák'};

  page.metadata={...page.metadata,referencePass:'beauty-lab-reference-v2',heroAsset:'pexels-8990301',productAsset:'pexels-14473397'};
  return page;
}

function buildProduct(base:StorefrontPageDocument){
  const page=clone(base);
  const gallery=required(page,'beauty-product-gallery');
  const galleryImages=Array.isArray(gallery.config.images)?clone(gallery.config.images) as Record<string,unknown>[]:[];
  const referenceGallery=[
    {src:SERUM_IMAGE,alt:'Niacinamide 10% Serum'},
    ...galleryImages.slice(1,4),
  ];
  gallery.config={...gallery.config,images:referenceGallery,aspectRatio:'4 / 5'};
  setFallback(gallery,'images','product.gallery',referenceGallery);
  gallery.responsive={desktop:{gridSpan:6},tablet:{gridSpan:6},mobile:{gridSpan:12}};

  const buybox=required(page,'beauty-product-buybox');
  buybox.responsive={desktop:{gridSpan:6},tablet:{gridSpan:6},mobile:{gridSpan:12}};
  buybox.config={...buybox.config,style:{base:{maxWidth:'28rem',padding:'.35rem 0 1.25rem 0',gap:'.68rem'},tablet:{maxWidth:'25rem'},mobile:{maxWidth:'none',padding:'0 0 1rem 0',gap:'.62rem'}}};

  const info=required(page,'beauty-product-info');
  info.config={...info.config,eyebrow:'',title:'Niacinamide 10% Serum',price:8990,compareAtPrice:null,description:'Könnyű textúrájú szérum, amely segít szabályozni a faggyútermelést, csökkenteni a pórusok láthatóságát és egységesebb bőrképet eredményez.',stockLabel:'',badges:['Bestseller'],currency:'HUF'};
  setFallback(info,'title','product.name','Niacinamide 10% Serum');
  setFallback(info,'price','pricing.displayPrice','8 990 Ft');
  setFallback(info,'compareAtPrice','pricing.compareAtPrice','');
  setFallback(info,'description','product.description','Könnyű textúrájú szérum, amely segít szabályozni a faggyútermelést, csökkenteni a pórusok láthatóságát és egységesebb bőrképet eredményez.');
  setFallback(info,'stockLabel','inventory.stockLabel','');
  setFallback(info,'badges','product.badges',['Bestseller']);

  const rating=required(page,'beauty-product-rating');
  rating.config={...rating.config,rating:4.8,count:214,label:'214 vélemény'};
  setFallback(rating,'rating','reviews.summary.rating',4.8);
  setFallback(rating,'count','reviews.summary.count',214);

  const variants=required(page,'beauty-product-variants');
  const skinTypes=[
    {id:'normal',label:'Normál',value:'normal',available:true,selected:true,href:'#normal'},
    {id:'kombinalt',label:'Kombinált',value:'kombinalt',available:true,selected:false,href:'#kombinalt'},
    {id:'zsíros',label:'Zsíros',value:'zsiros',available:true,selected:false,href:'#zsiros'},
  ];
  variants.config={...variants.config,label:'Bőrtípus:',options:skinTypes,presentation:'chips'};
  setFallback(variants,'options','variant.options',skinTypes);

  const effects=required(page,'beauty-product-key-specs');
  const effectItems=[
    {specKey:'pores',label:'Pórusok',displayValue:'Célzott',missing:false},
    {specKey:'sebum',label:'Faggyú',displayValue:'Kontroll',missing:false},
    {specKey:'texture',label:'Textúra',displayValue:'Simább',missing:false},
  ];
  effects.config={...effects.config,title:'Célzott hatások:',items:effectItems,columns:3,missingLabel:'—'};
  setFallback(effects,'items','product.keySpecs',effectItems);

  const purchase=required(page,'beauty-product-purchase');
  purchase.config={...purchase.config,label:'Kosárba',ariaLabel:'Kosárba',style:{base:{width:'100%',background:'#111111',color:'#FFFFFF',border:'1px solid #111111',borderRadius:'2px',padding:'.9rem 1rem',fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.72rem',fontWeight:750,letterSpacing:'.04em',textTransform:'none'}}};
  setFallback(purchase,'label','commerce.purchaseLabel','Kosárba');

  const trust=required(page,'beauty-product-trust');
  trust.config={...trust.config,text:'Raktáron     ·     Ingyenes szállítás 20 000 Ft felett     ·     30 napos visszaküldés',style:{base:{fontSize:'.62rem',letterSpacing:'.02em',borderTop:'1px solid #E6E6E6',paddingTop:'.8rem',color:'#52645D'}}};

  const main=required(page,'beauty-product-main');
  main.config={...main.config,style:{base:{paddingBlock:'.8rem 1.8rem',background:'#FFFFFF'}}};
  const layout=required(page,'beauty-product-layout');
  layout.config={...layout.config,style:{base:{gap:'clamp(1.2rem,3vw,3rem)',alignItems:'start'},mobile:{gap:'1rem'}}};

  const spec=required(page,'beauty-product-spec-groups');
  const ingredientGroups=[{groupKey:'ingredients',title:'MI VAN BENNE?',rows:[
    {specKey:'niacinamide',label:'10% Niacinamide',displayValue:'Segít szabályozni a faggyútermelést és csökkenteni a pórusok láthatóságát.',missing:false},
    {specKey:'zinc',label:'1% Zinc PCA',displayValue:'Kiegészítő mattító hatás.',missing:false},
    {specKey:'panthenol',label:'Panthenol',displayValue:'Támogatja a bőr védőrétegét.',missing:false},
  ]}];
  spec.config={...spec.config,title:'MI VAN BENNE?',groups:ingredientGroups,missingLabel:'—'};
  setFallback(spec,'groups','product.specGroups',ingredientGroups);

  const tabs=required(page,'beauty-product-content-tabs');
  const tabItems=[
    {id:'description',label:'Termékleírás',title:'Niacinamide 10% Serum',copy:'Könnyű célzott formula a pórusok, a faggyú és a textúra támogatására.'},
    {id:'ingredients',label:'Összetevők',title:'Kulcsösszetevők',copy:'10% Niacinamide · 1% Zinc PCA · Panthenol.'},
    {id:'usage',label:'Használat',title:'Használat',copy:'Néhány cseppet vigyél fel tiszta bőrre, majd folytasd hidratálóval és nappal fényvédelemmel.'},
    {id:'reviews',label:'Vélemények',title:'Vásárlói visszajelzések',copy:'4,8 / 5 · 214 vélemény.'},
  ];
  tabs.config={...tabs.config,tabs:tabItems};
  setFallback(tabs,'tabs','product.contentTabs',tabItems);

  const explain=required(page,'beauty-product-explain');
  explain.config={...explain.config,title:'Látható eredmények',matchedTitle:'A formula célja',mismatchedTitle:'',evidence:[{ruleId:'pores',matched:true,reason:'A Niacinamide és Zinc PCA kombinációja a pórusok, faggyú és bőrtextúra megjelenését célozza.'}]};
  setFallback(explain,'evidence','finder.productEvidence',[{ruleId:'pores',matched:true,reason:'A Niacinamide és Zinc PCA kombinációja a pórusok, faggyú és bőrtextúra megjelenését célozza.'}]);

  const related=required(page,'beauty-product-recommendations');
  related.config={...related.config,title:'Jól kombinálható',columns:3,ctaLabel:'Kosárba'};

  page.metadata={...page.metadata,referencePass:'beauty-lab-reference-v2',pdpAsset:'pexels-14473397'};
  return page;
}

const source=BEAUTY_LAB_CANARY_PACKAGE;
const sourceHome=source.pages.find(page=>page.pageType==='home');
const sourceProduct=source.pages.find(page=>page.pageType==='product');
if(!sourceHome||!sourceProduct)throw new Error('BEAUTY_LAB_REFERENCE_V2_SOURCE_PAGES_MISSING');

export const BEAUTY_LAB_REFERENCE_V2_HOME_PAGE=buildHome(sourceHome);
export const BEAUTY_LAB_REFERENCE_V2_PRODUCT_PAGE=buildProduct(sourceProduct);

export const BEAUTY_LAB_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...source,
  pages:source.pages.map(page=>page.pageType==='home'?BEAUTY_LAB_REFERENCE_V2_HOME_PAGE:page.pageType==='product'?BEAUTY_LAB_REFERENCE_V2_PRODUCT_PAGE:page),
};
