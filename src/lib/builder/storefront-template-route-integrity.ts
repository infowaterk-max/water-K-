import type {StorefrontComponentNode,StorefrontPageDocument,StorefrontTemplatePackage} from '@/lib/builder/storefront-runtime';
import type {StorefrontDemoFixture,StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

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

function rewritePreviewHref(href:string,input:{templateKey:string;templateVersion:number;viewport:'desktop'|'tablet'|'mobile'}){
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
  if(url.pathname.startsWith('/oldal/')||url.pathname.startsWith('/blog/')){
    const slug=url.pathname.split('/').filter(Boolean).at(-1);
    if(slug)params.set('demoContent',slug);
  }
  for(const[key,value]of url.searchParams)params.append(key,value);
  return`/storefront-template-preview?${params.toString()}`;
}

export function rewriteStorefrontTemplatePreviewLinks(
  page:StorefrontPageDocument,
  input:{templateKey:string;templateVersion:number;viewport:'desktop'|'tablet'|'mobile'},
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
