import type {StorefrontComponentNode,StorefrontPageDocument,StorefrontTemplatePackage} from '@/lib/builder/storefront-runtime';
import type {StorefrontDemoFixture,StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {STOREFRONT_PAGE_SCHEMA_VERSION,STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import {CANONICAL_ACCOUNT_CAPABILITIES} from '@/lib/account/account-capabilities';

export const STOREFRONT_ROUTE_INTEGRITY_VERSION='shoporation.storefront-route-integrity.v1' as const;
export const STOREFRONT_DEMO_CONTENT_NOTICE='Minta tartalom – ez az oldal előre generált szöveget tartalmaz, és nem tekinthető a webshop valós működésének vagy feltételeinek. Ellenőrizd és igazítsd a saját működésedhez publikálás előtt.' as const;

export type StorefrontTemplateLink={href:string;label:string;path:string};
export type StorefrontRouteIntegrityIssue={
  code:'DEMO_CONTENT_TARGET_MISSING'|'STORE_ROUTE_UNKNOWN'|'CATALOG_QUERY_UNSUPPORTED';
  href:string;
  label:string;
  path:string;
  severity:'error';
  message:string;
};

const PLATFORM_EXACT_ROUTES=new Set([
  '/','/webaruhaz','/kosar','/penztar','/fiokom','/gyik','/kapcsolat','/blog',
  '/szallitas-es-fizetes','/aszf','/adatvedelem','/impresszum','/digitalis-hozzaferes',
  '/rendeles-sikeres','/hamarosan','/kereses','/kedvencek',
]);
const PLATFORM_PREFIX_ROUTES=['/fiokom/','/termek/'] as const;
const CATALOG_QUERY_KEYS=new Set(['q','audience','stock','sort','sale','category','collection','filter','type','scene','flavor','pantry','ritual','play','genre','platform','c','concern','texture']);

const cleanLabel=(value:unknown,fallback:string)=>{
  const label=typeof value==='string'?value.trim():'';
  return label||fallback;
};
const humanize=(slug:string)=>slug.split('-').filter(Boolean).map(word=>word.charAt(0).toLocaleUpperCase('hu-HU')+word.slice(1)).join(' ');

function collectFromValue(value:unknown,path:string,labelHint:string,out:StorefrontTemplateLink[]):void{
  if(Array.isArray(value)){value.forEach((item,index)=>collectFromValue(item,`${path}[${index}]`,labelHint,out));return;}
  if(!value||typeof value!=='object')return;
  const record=value as Record<string,unknown>;
  const label=cleanLabel(record.label??record.title??record.text,labelHint);
  for(const[key,item]of Object.entries(record)){
    const nextPath=`${path}.${key}`;
    const navigableAction=typeof item==='string'&&key==='action'&&/^(?:\/|#|https?:\/\/|mailto:|tel:)/i.test(item.trim());
    if(typeof item==='string'&&(key==='href'||key.endsWith('Href')||navigableAction)){
      const href=item.trim();
      if(href)out.push({href,label:cleanLabel(record.label??record.title??record.text,humanize(href.split('?')[0]!.split('/').filter(Boolean).at(-1)??'Hivatkozás')),path:nextPath});
    }else collectFromValue(item,nextPath,label,out);
  }
}

export function listStorefrontTemplateLinks(template:StorefrontTemplatePackage):StorefrontTemplateLink[]{
  const out:StorefrontTemplateLink[]=[];
  const walk=(nodes:readonly StorefrontComponentNode[],base:string)=>{
    nodes.forEach((node,index)=>{
      collectFromValue(node.config,`${base}[${index}].config`,node.id,out);
      if(node.children?.length)walk(node.children,`${base}[${index}].children`);
    });
  };
  template.pages.forEach((page,index)=>walk(page.sections,`pages[${index}].sections`));
  const seen=new Set<string>();
  return out.filter(item=>{const key=`${item.path}|${item.href}`;if(seen.has(key))return false;seen.add(key);return true;});
}

type DemoContentPayload={
  kind:'page'|'landing'|'blog';
  slug:string;
  title:string;
  excerpt:string;
  body:string;
  status:'draft';
  demo:boolean;
  demoNotice:string;
  showroomReady?:boolean;
};

const standardPage=(slug:string,title:string,excerpt:string,body:string):DemoContentPayload=>({
  kind:'page',slug,title,excerpt,
  body,
  status:'draft',demo:true,demoNotice:STOREFRONT_DEMO_CONTENT_NOTICE,
});

const STANDARD_DEMO_PAGES:Readonly<Record<string,DemoContentPayload>>=Object.freeze({
  szallitas:standardPage('szallitas','Szállítás','Mintaoldal a webshop szállítási lehetőségeinek bemutatásához.','Szállítási lehetőségek\nItt sorold fel a ténylegesen elérhető futár-, csomagpont- és személyes átvételi módokat.\n\nDíjak és határidők\nA valós szállítási díjakat, ingyenes szállítási küszöböt és várható kézbesítési időt a saját szerződéseid alapján add meg.'),
  fizetes:standardPage('fizetes','Fizetés','Mintaoldal a webshop tényleges fizetési módjainak bemutatásához.','Fizetési módok\nCsak azokat a fizetési módokat hagyd az oldalon, amelyeket a webshopban valóban aktiváltál.\n\nBiztonság és visszatérítés\nÍrd le a fizetési szolgáltatóid, terhelési és visszatérítési folyamatod valós szabályait.'),
  visszakuldes:standardPage('visszakuldes','Visszaküldés','Mintaoldal a visszaküldési és elállási folyamat bemutatásához.','Visszaküldési folyamat\nMutasd be a tényleges ügyintézési lépéseket, elérhetőségeket és visszaküldési címet.\n\nHatáridők és feltételek\nA vállalkozásodra és termékeidre vonatkozó valós jogi feltételeket ellenőrzés után add meg.'),
  rolunk:standardPage('rolunk','Rólunk','Mintaoldal a vállalkozás, márka és webshop bemutatásához.','Kik vagyunk?\nMutasd be röviden a vállalkozást, a márka történetét és azt, milyen értéket adtok a vásárlóknak.\n\nMiért minket?\nIde kerülhetnek a valós szolgáltatási előnyök, szakmai tapasztalatok és ügyfélígéretek.'),
  fenntarthatosag:standardPage('fenntarthatosag','Fenntarthatóság','Mintaoldal a bizonyítható fenntarthatósági vállalások bemutatásához.','Amit ténylegesen teszünk\nCsak ellenőrizhető, dokumentálható környezeti vagy társadalmi vállalásokat tüntess fel.\n\nCsomagolás és működés\nÍrd le a valós csomagolási, szállítási vagy beszerzési gyakorlatot.'),
  karrier:standardPage('karrier','Karrier','Mintaoldal álláslehetőségek és jelentkezési információk számára.','Csatlakozz hozzánk\nMutasd be a vállalkozást mint munkahelyet és az aktuális lehetőségeket.\n\nJelentkezés\nAdd meg a valódi jelentkezési csatornát és az adatkezelési tájékoztatásra mutató hivatkozást.'),
});

function genericContent(slug:string,title:string,kind:'page'|'blog'):DemoContentPayload{
  const safeTitle=title&&title!==slug?title:humanize(slug);
  return{
    kind,slug,title:safeTitle,
    excerpt:`Minta tartalom a(z) „${safeTitle}” oldalhoz.`,
    body:`${safeTitle}\nEz a sablon által létrehozott mintaoldal. Cseréld le a szöveget a webshopod valódi, ellenőrzött tartalmára.\n\nSzerkesztési javaslat\nÍrd le itt az oldal céljához kapcsolódó legfontosabb információkat, majd ellenőrizd a hivatkozásokat és állításokat publikálás előtt.`,
    status:'draft',demo:true,demoNotice:STOREFRONT_DEMO_CONTENT_NOTICE,
  };
}

const fixtureSlug=(fixture:StorefrontDemoFixture)=>{
  if(fixture.entityType!=='content')return null;
  const slug=fixture.payload.slug;
  return typeof slug==='string'&&slug?slug:null;
};

export function augmentStorefrontTemplateDemoContent(template:StorefrontInstallableTemplatePackage):StorefrontInstallableTemplatePackage{
  const fixtures=[...(template.demoFixtures??[]).map(item=>structuredClone(item))];
  const existing=new Set(fixtures.map(fixtureSlug).filter((value):value is string=>Boolean(value)));
  const links=listStorefrontTemplateLinks(template);
  for(const link of links){
    let kind:'page'|'blog'|null=null,slug='';
    if(link.href.startsWith('/oldal/')){kind='page';slug=link.href.split(/[?#]/)[0]!.slice('/oldal/'.length);}
    else if(link.href.startsWith('/blog/')){kind='blog';slug=link.href.split(/[?#]/)[0]!.slice('/blog/'.length);}
    if(!kind||!slug||existing.has(slug))continue;
    const payload=kind==='page'?(STANDARD_DEMO_PAGES[slug]??genericContent(slug,link.label,'page')):genericContent(slug,link.label,'blog');
    fixtures.push({entityType:'content',entityKey:`${kind}-${slug}`,payload});
    existing.add(slug);
  }
  return{...template,demoFixtures:fixtures};
}

export function evaluateStorefrontTemplateRouteIntegrity(template:StorefrontInstallableTemplatePackage):StorefrontRouteIntegrityIssue[]{
  const normalized=augmentStorefrontTemplateDemoContent(template);
  const fixtureSlugs=new Set((normalized.demoFixtures??[]).map(fixtureSlug).filter((value):value is string=>Boolean(value)));
  const issues:StorefrontRouteIntegrityIssue[]=[];
  for(const link of listStorefrontTemplateLinks(normalized)){
    if(link.href.startsWith('#')||link.href.startsWith('mailto:')||link.href.startsWith('tel:')||/^https?:\/\//.test(link.href))continue;
    let url:URL;
    try{url=new URL(link.href,'https://shoporation.local');}catch{issues.push({code:'STORE_ROUTE_UNKNOWN',href:link.href,label:link.label,path:link.path,severity:'error',message:'A belső hivatkozás nem értelmezhető.'});continue;}
    const pathname=url.pathname;
    if(pathname.startsWith('/oldal/')||pathname.startsWith('/blog/')){
      const slug=pathname.split('/').filter(Boolean).at(-1)??'';
      if(!fixtureSlugs.has(slug))issues.push({code:'DEMO_CONTENT_TARGET_MISSING',href:link.href,label:link.label,path:link.path,severity:'error',message:'A dinamikus tartalmi célhoz nincs demo content fixture.'});
      continue;
    }
    if(pathname==='/webaruhaz'){
      for(const key of url.searchParams.keys())if(!CATALOG_QUERY_KEYS.has(key))issues.push({code:'CATALOG_QUERY_UNSUPPORTED',href:link.href,label:link.label,path:link.path,severity:'error',message:`A katalógus nem támogatja a(z) „${key}” query-paramétert.`});
      continue;
    }
    if(PLATFORM_EXACT_ROUTES.has(pathname)||PLATFORM_PREFIX_ROUTES.some(prefix=>pathname.startsWith(prefix)))continue;
    issues.push({code:'STORE_ROUTE_UNKNOWN',href:link.href,label:link.label,path:link.path,severity:'error',message:'A sablon belső linkje nem ismert storefront route-ra mutat.'});
  }
  return issues;
}


export function getStorefrontTemplateDemoContent(template:StorefrontInstallableTemplatePackage,slug:string){
  const normalized=augmentStorefrontTemplateDemoContent(template);
  return(normalized.demoFixtures??[]).find(fixture=>fixture.entityType==='content'&&fixture.payload.slug===slug)??null;
}

const previewPageForPath=(pathname:string):string|null=>{
  if(pathname==='/')return'home';
  if(pathname==='/webaruhaz')return'catalog';
  if(pathname.startsWith('/termek/'))return'product';
  if(pathname==='/kereses')return'search';
  if(pathname==='/kosar')return'cart';
  if(pathname==='/penztar')return'checkout';
  if(pathname==='/fiokom'||pathname.startsWith('/fiokom/')||pathname==='/kedvencek')return'account';
  if(pathname==='/blog')return'blog-index';
  if(pathname.startsWith('/blog/'))return'blog-article';
  if(pathname.startsWith('/oldal/'))return'content';
  if(pathname==='/gyik')return'faq';
  if(pathname==='/kapcsolat')return'contact';
  if(['/aszf','/adatvedelem','/impresszum','/szallitas-es-fizetes'].includes(pathname))return'legal';
  return null;
};

function rewritePreviewHref(href:string,input:{templateKey:string;templateVersion:number;viewport:'desktop'|'tablet'|'mobile';factoryCandidate?:boolean}){
  if(!href.startsWith('/')||href.startsWith('//'))return href;
  let url:URL;
  try{url=new URL(href,'https://shoporation.local');}catch{return href;}
  const page=previewPageForPath(url.pathname);
  if(!page)return href;
  const params=new URLSearchParams({
    template:input.templateKey,
    version:String(input.templateVersion),
    page,
    viewport:input.viewport,
  });
  if(input.factoryCandidate)params.set('factory','1');
  if(url.pathname.startsWith('/oldal/')||url.pathname.startsWith('/blog/')){
    const slug=url.pathname.split('/').filter(Boolean).at(-1);
    if(slug)params.set('demoContent',slug);
  }
  for(const[key,value]of url.searchParams)params.append(key,value);
  return`/storefront-template-preview?${params.toString()}`;
}

export function rewriteStorefrontTemplatePreviewLinks(
  page:StorefrontPageDocument,
  input:{templateKey:string;templateVersion:number;viewport:'desktop'|'tablet'|'mobile';factoryCandidate?:boolean},
):StorefrontPageDocument{
  const rewriteValue=(value:unknown):unknown=>{
    if(Array.isArray(value))return value.map(rewriteValue);
    if(!value||typeof value!=='object')return value;
    const record=value as Record<string,unknown>,next:Record<string,unknown>={};
    for(const[key,item]of Object.entries(record)){
      if(typeof item==='string'&&(key==='href'||key.endsWith('Href')||key==='action'))next[key]=rewritePreviewHref(item,input);
      else next[key]=rewriteValue(item);
    }
    return next;
  };
  const rewriteNode=(node:StorefrontComponentNode):StorefrontComponentNode=>({
    ...structuredClone(node),
    config:rewriteValue(node.config) as Record<string,unknown>,
    ...(node.children?{children:node.children.map(rewriteNode)}:{}),
  });
  return{...structuredClone(page),sections:page.sections.map(rewriteNode)};
}

export function applyStorefrontTemplateDemoNotice(page:StorefrontPageDocument,notice=STOREFRONT_DEMO_CONTENT_NOTICE):StorefrontPageDocument{
  const banner:StorefrontComponentNode={
    id:'template-demo-content-notice',
    componentKey:'layout.section',
    componentVersion:1,
    config:{tone:'surface',spacing:'s',width:'full',style:{padding:'1rem 1.1rem',background:'#ffd86b',border:'2px solid #6b4700',borderRadius:'.65rem',color:'#211600',boxShadow:'0 8px 24px rgba(0,0,0,.14)'}},
    responsive:{desktop:{gridSpan:12},tablet:{gridSpan:12},mobile:{gridSpan:12}},
    children:[{
      id:'template-demo-content-notice-text',
      componentKey:'content.text',
      componentVersion:1,
      config:{text:`⚠ MINTA TARTALOM\n${notice}`,as:'strong',align:'left',tone:'text',style:{color:'#211600',fontSize:'.9rem',lineHeight:1.5,fontWeight:850,whiteSpace:'pre-line'}},
    }],
  };
  const sections=[...page.sections.map(section=>structuredClone(section))];
  const headerIndex=sections.findIndex(section=>section.componentKey==='system.header'||section.componentKey==='system.commerce-header');
  sections.splice(headerIndex>=0?headerIndex+1:0,0,banner);
  return{...structuredClone(page),sections,metadata:{...(page.metadata??{}),demoContentPreview:true}};
}


export type StorefrontShowroomReachability='shell-navigation'|'shopper-journey'|'system-route';
export type StorefrontShowroomEngine='E1'|'E2'|'E7'|'E10'|'E13';
export type StorefrontShowroomSurface={
  id:string;
  label:string;
  route:string;
  pageType:StorefrontBuilderPageType;
  reachability:StorefrontShowroomReachability;
  navigationRequired:boolean;
  engines:readonly StorefrontShowroomEngine[];
};
export type StorefrontShowroomEvidenceRow={
  surfaceId:string;
  label:string;
  route:string;
  pageType:StorefrontBuilderPageType;
  pageKey:string|null;
  schemaVersion:number|null;
  presentationAuthority:string|null;
  engines:readonly StorefrontShowroomEngine[];
  reachability:StorefrontShowroomReachability;
  navigationPresent:boolean;
  entrypointPresent:boolean;
};
export type StorefrontShowroomContractIssue={
  code:
    |'SHOWROOM_PAGE_SCHEMA_MISSING'
    |'SHOWROOM_PAGE_SCHEMA_VERSION_MISMATCH'
    |'SHOWROOM_PAGE_EMPTY'
    |'SHOWROOM_NAVIGATION_INCOMPLETE'
    |'SHOWROOM_PRESENTATION_AUTHORITY_MISMATCH'
    |'SHOWROOM_ACCOUNT_NAVIGATION_EMPTY'
    |'SHOWROOM_ACCOUNT_SURFACE_MISSING'
    |'SHOWROOM_ENGINE_DEMO_MISSING'
    |'SHOWROOM_PLACEHOLDER_CONTENT'
    |'SHOWROOM_ROUTE_PRESENTATION_UNMAPPED';
  path:string;
  message:string;
  severity:'error';
};

export const STOREFRONT_TEMPLATE_SHOWROOM_SURFACES:readonly StorefrontShowroomSurface[]=Object.freeze([
  {id:'home',label:'Kezdőlap',route:'/',pageType:'home',reachability:'system-route',navigationRequired:false,engines:['E1']},
  {id:'catalog',label:'Webáruház',route:'/webaruhaz',pageType:'catalog',reachability:'shell-navigation',navigationRequired:true,engines:['E1','E2']},
  {id:'product',label:'Termékoldal',route:'/termek/:slug',pageType:'product',reachability:'shopper-journey',navigationRequired:false,engines:['E1','E2','E7','E10','E13']},
  {id:'search',label:'Keresés',route:'/kereses',pageType:'search',reachability:'shopper-journey',navigationRequired:false,engines:['E1','E2']},
  {id:'cart',label:'Kosár',route:'/kosar',pageType:'cart',reachability:'shell-navigation',navigationRequired:true,engines:['E1','E13']},
  {id:'checkout',label:'Pénztár',route:'/penztar',pageType:'checkout',reachability:'shell-navigation',navigationRequired:true,engines:['E1','E13']},
  {id:'account',label:'Fiókom',route:'/fiokom',pageType:'account',reachability:'shell-navigation',navigationRequired:true,engines:['E1']},
  {id:'wishlist',label:'Kedvencek',route:'/kedvencek',pageType:'account',reachability:'shell-navigation',navigationRequired:true,engines:['E1']},
  {id:'downloads',label:'Letöltéseim',route:'/fiokom/letoltesek',pageType:'account',reachability:'shopper-journey',navigationRequired:false,engines:['E1']},
  {id:'about',label:'Rólunk',route:'/oldal/rolunk',pageType:'content',reachability:'shell-navigation',navigationRequired:true,engines:['E1','E10']},
  {id:'shipping-payment',label:'Szállítás és fizetés',route:'/szallitas-es-fizetes',pageType:'legal',reachability:'shell-navigation',navigationRequired:true,engines:['E1','E13']},
  {id:'returns',label:'Visszaküldés',route:'/oldal/visszakuldes',pageType:'content',reachability:'shell-navigation',navigationRequired:true,engines:['E1']},
  {id:'faq',label:'GYIK',route:'/gyik',pageType:'faq',reachability:'shell-navigation',navigationRequired:true,engines:['E1']},
  {id:'contact',label:'Kapcsolat',route:'/kapcsolat',pageType:'contact',reachability:'shell-navigation',navigationRequired:true,engines:['E1']},
  {id:'blog',label:'Magazin',route:'/blog',pageType:'blog-index',reachability:'shell-navigation',navigationRequired:true,engines:['E1','E10']},
  {id:'blog-article',label:'Magazin cikk',route:'/blog/:slug',pageType:'blog-article',reachability:'shopper-journey',navigationRequired:false,engines:['E1','E10']},
  {id:'terms',label:'ÁSZF',route:'/aszf',pageType:'legal',reachability:'shell-navigation',navigationRequired:true,engines:['E1']},
  {id:'privacy',label:'Adatvédelem',route:'/adatvedelem',pageType:'legal',reachability:'shell-navigation',navigationRequired:true,engines:['E1']},
  {id:'imprint',label:'Impresszum',route:'/impresszum',pageType:'legal',reachability:'shell-navigation',navigationRequired:true,engines:['E1']},
  {id:'not-found',label:'404',route:'/__not-found__',pageType:'not-found',reachability:'system-route',navigationRequired:false,engines:['E1']},
]);

const showroomIssue=(code:StorefrontShowroomContractIssue['code'],path:string,message:string):StorefrontShowroomContractIssue=>({code,path,message,severity:'error'});
const pathnameFor=(href:string)=>{try{return new URL(href,'https://shoporation.local').pathname}catch{return href.split(/[?#]/)[0]??href}};
const routeMatches=(href:string,route:string)=>{
  const pathname=pathnameFor(href);
  if(route.includes('/:slug'))return pathname.startsWith(route.slice(0,route.indexOf(':slug')));
  return pathname===route;
};
function listStorefrontTemplateShellLinks(template:StorefrontTemplatePackage):StorefrontTemplateLink[]{
  const out:StorefrontTemplateLink[]=[];
  for(const[pageIndex,page]of template.pages.entries()){
    const shell=[page.sections[0],page.sections.at(-1)].filter((value):value is StorefrontComponentNode=>Boolean(value));
    shell.forEach((node,index)=>collectFromValue(node.config,`pages[${pageIndex}].shell[${index}].config`,node.id,out));
    const walk=(nodes:readonly StorefrontComponentNode[],base:string)=>{
      nodes.forEach((node,index)=>{
        collectFromValue(node.config,`${base}[${index}].config`,node.id,out);
        if(node.children?.length)walk(node.children,`${base}[${index}].children`);
      });
    };
    walk(shell,`pages[${pageIndex}].shell`);
  }
  const seen=new Set<string>();
  return out.filter(item=>{const key=`${item.href}|${item.label}`;if(seen.has(key))return false;seen.add(key);return true;});
}
const walkComponents=(nodes:readonly StorefrontComponentNode[],out:Set<string>)=>{for(const node of nodes){out.add(node.componentKey);if(node.children?.length)walkComponents(node.children,out)}};
const engineDemoStatus=(template:StorefrontInstallableTemplatePackage)=>{
  const components=new Set<string>();
  for(const page of template.pages)walkComponents(page.sections,components);
  return new Map<StorefrontShowroomEngine,boolean>([
    ['E1',STOREFRONT_PAGE_TYPES.every(pageType=>template.pages.some(page=>page.pageType===pageType&&page.schemaVersion===STOREFRONT_PAGE_SCHEMA_VERSION))],
    ['E2',components.has('commerce.product-grid')&&components.has('commerce.catalog-facets')&&components.has('system.search')],
    ['E7',components.has('commerce.key-specs')||components.has('commerce.specification-groups')],
    ['E10',components.has('story.index')&&(components.has('story.feature')||components.has('story.hero'))],
    ['E13',components.has('commerce.purchase-controls')&&components.has('commerce.cart-summary')&&components.has('commerce.checkout-summary')],
  ]);
};
const requiredAccountHrefs=CANONICAL_ACCOUNT_CAPABILITIES.filter(item=>!item.optional).map(item=>item.href);
function accountDemoNavigationHrefs(template:StorefrontInstallableTemplatePackage){
  const page=template.pages.find(item=>item.pageType==='account');
  if(!page)return[] as string[];
  // Keep extraction typed and deterministic without coupling the gate to renderer internals.
  const links:StorefrontTemplateLink[]=[];
  const visitLinks=(nodes:readonly StorefrontComponentNode[])=>{
    for(const node of nodes){
      if(node.componentKey==='system.navigation'&&(node.config as Record<string,unknown>).presentation==='account-capability-demo')collectFromValue(node.config,'account.demoNavigation',node.id,links);
      if(node.children?.length)visitLinks(node.children);
    }
  };
  visitLinks(page.sections);
  return links.map(item=>item.href);
}

export function createStorefrontTemplateShowroomEvidence(template:StorefrontInstallableTemplatePackage):readonly StorefrontShowroomEvidenceRow[]{
  const shellLinks=listStorefrontTemplateShellLinks(template);
  const allLinks=listStorefrontTemplateLinks(template);
  return STOREFRONT_TEMPLATE_SHOWROOM_SURFACES.map(surface=>{
    const page=template.pages.find(item=>item.pageType===surface.pageType)??null;
    const meta=page?.metadata?.templateFactory&&typeof page.metadata.templateFactory==='object'
      ?page.metadata.templateFactory as Record<string,unknown>
      :null;
    const targetKey=typeof meta?.targetTemplateKey==='string'?meta.targetTemplateKey:page?.templateKey??null;
    const targetVersion=typeof meta?.targetTemplateVersion==='number'?meta.targetTemplateVersion:page?.templateVersion??null;
    return{
      surfaceId:surface.id,
      label:surface.label,
      route:surface.route,
      pageType:surface.pageType,
      pageKey:page?.pageKey??null,
      schemaVersion:page?.schemaVersion??null,
      presentationAuthority:targetKey&&targetVersion?`${targetKey}@${targetVersion}`:null,
      engines:surface.engines,
      reachability:surface.reachability,
      navigationPresent:!surface.navigationRequired||shellLinks.some(link=>routeMatches(link.href,surface.route)),
      entrypointPresent:surface.reachability==='system-route'||(surface.reachability==='shell-navigation'
        ?shellLinks.some(link=>routeMatches(link.href,surface.route))
        :allLinks.some(link=>routeMatches(link.href,surface.route))),
    };
  });
}

export function evaluateStorefrontTemplateShowroomContract(template:StorefrontInstallableTemplatePackage):StorefrontShowroomContractIssue[]{
  const issues:StorefrontShowroomContractIssue[]=[];
  const pageByType=new Map(template.pages.map(page=>[page.pageType,page] as const));
  const evidence=createStorefrontTemplateShowroomEvidence(template);
  for(const row of evidence){
    const page=pageByType.get(row.pageType);
    if(!page){issues.push(showroomIssue('SHOWROOM_PAGE_SCHEMA_MISSING',`surfaces.${row.surfaceId}`,`A(z) ${row.label} felülethez nincs canonical Page Schema.`));continue}
    if(page.schemaVersion!==STOREFRONT_PAGE_SCHEMA_VERSION)issues.push(showroomIssue('SHOWROOM_PAGE_SCHEMA_VERSION_MISMATCH',`pages.${row.pageType}.schemaVersion`,'A showroom csak az aktuális canonical Page Schema authorityt használhatja.'));
    if(page.sections.length<3)issues.push(showroomIssue('SHOWROOM_PAGE_EMPTY',`pages.${row.pageType}.sections`,`A(z) ${row.label} Page Schema nem lehet üres shell vagy placeholder.`));
    if(page.templateKey!==template.manifest.templateKey||page.templateVersion!==template.manifest.templateVersion)issues.push(showroomIssue('SHOWROOM_PRESENTATION_AUTHORITY_MISMATCH',`pages.${row.pageType}`,'A shopper route Page Schema identityje eltér a kiválasztott template presentation authoritytől.'));
    if(row.navigationPresent===false)issues.push(showroomIssue('SHOWROOM_NAVIGATION_INCOMPLETE',`navigation.${row.surfaceId}`,`A kötelező „${row.label}” shopper surface nem érhető el a template shell navigációjából.`));
    if(row.entrypointPresent===false)issues.push(showroomIssue('SHOWROOM_ROUTE_PRESENTATION_UNMAPPED',`journeys.${row.surfaceId}`,`A(z) ${row.label} canonical shopper journeyhez nincs tényleges template entrypoint.`));
    if(previewPageForPath(pathnameFor(row.route).replace(':slug','demo'))!==row.pageType&&row.route!=='/__not-found__')issues.push(showroomIssue('SHOWROOM_ROUTE_PRESENTATION_UNMAPPED',`routes.${row.route}`,'A canonical route nincs ugyanahhoz a Page Schema/presentation authorityhez kötve a preview route registryben.'));
  }
  const accountHrefs=accountDemoNavigationHrefs(template);
  if(accountHrefs.length===0)issues.push(showroomIssue('SHOWROOM_ACCOUNT_NAVIGATION_EMPTY','pages.account','Az account demo nem tartalmaz canonical account capability navigációt.'));
  for(const href of requiredAccountHrefs)if(!accountHrefs.includes(href))issues.push(showroomIssue('SHOWROOM_ACCOUNT_SURFACE_MISSING',`pages.account.${href}`,'A kötelező account capability hiányzik a template demóból.'));
  const engines=engineDemoStatus(template);
  for(const engine of ['E1','E2','E7','E10','E13'] as const)if(engines.get(engine)!==true)issues.push(showroomIssue('SHOWROOM_ENGINE_DEMO_MISSING',`engines.${engine}`,`A(z) ${engine} shared engine nincs felismerhető, interaktív storefront-demóval reprezentálva.`));
  const serialized=JSON.stringify(template);
  for(const token of ['Minta tartalom','A kínálat feltöltés alatt áll','Ez a sablon által létrehozott mintaoldal'])if(serialized.includes(token))issues.push(showroomIssue('SHOWROOM_PLACEHOLDER_CONTENT','demoContent',`Product Owner-ready template nem tartalmazhat placeholder/fallback szöveget: ${token}`));
  return issues;
}

export function isStorefrontShowroomReadyDemoContent(fixture:StorefrontDemoFixture|null|undefined):boolean{
  return fixture?.payload?.showroomReady===true;
}
