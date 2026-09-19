import type {FeatureCode} from '@/lib/plans/catalog';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {normalizeStorefrontTemplateRuntimeComposition} from '@/lib/builder/storefront-template-runtime-normalization';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {STOREFRONT_PAGE_SEMANTIC_CONTEXTS} from '@/lib/builder/storefront-template-capability-policy';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v19-canonical';

export const PLAYROOM_V20_TEMPLATE_VERSION=20 as const;
const clone=<T>(value:T):T=>structuredClone(value);
const rec=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const node=(value:StorefrontComponentNode)=>value;

const PLAYROOM_V20_HU_COPY=Object.freeze(new Map<string,string>([
  ['Prémium RGB gaming setup monitorral, kontrollerekkel és perifériákkal','Prémium RGB játékos felszerelés monitorral, kontrollerekkel és perifériákkal'],
  ['Solo','Egyedül'],
  ['Co-op','Kooperatív'],
  ['Party','Társasági'],
  ['Racing','Verseny'],
  ['Adventure','Kaland'],
  ['Family','Családi'],
  ['Handheld','Kézikonzol'],
  ['Mobile','Mobil'],
  ['MOBILE','MOBIL'],
  ['Gaming csomag konzollal, kontrollerekkel és headsettel','Játékos felszereléscsomag konzollal, kontrollerekkel és fejhallgatóval'],
  ['Gaming kontroller közeli képe','Játékkontroller közeli képe'],
  ['Gaming headset RGB megvilágításban','Játékos fejhallgató RGB megvilágításban'],
  ['Kanapés multiplayer gaming este','Kanapés többjátékos játékest'],
  ['Nézd meg a multiplayer ajánlatokat  →','Nézd meg a többjátékos ajánlatokat  →'],
  ['Neonfényes gaming monitor és asztali setup','Neonfényes játékmonitor és asztali felszerelés'],
  ['Gaming audio és headset részlet','Játékos hangtechnika és fejhallgató részlet'],
  ['RGB megvilágítású gaming asztal és perifériák','RGB megvilágítású játékasztal és perifériák'],
  ['Gaming szék és RGB setup','Játékszék és RGB felszerelés'],
  ['A legfrissebb megjelenések, amik lazán tartják a gaming világot.','A legfrissebb megjelenések, amelyek igazán frissen tartják a játékvilágot.'],
  ['Gaming kontroller kompatibilitási blokkhoz','Játékkontroller a kompatibilitási blokkhoz'],
  ['Gaming közösség együtt játszik','Játékos közösség együtt játszik'],
  ['Újdonságok, gaming tippek és válogatott ajánlatok — csak akkor, ha kéred.','Újdonságok, játéktippek és válogatott ajánlatok — csak akkor, ha kéred.'],
  ['Gaming világ','Játékvilág'],
  ['SEARCH THE PLAYROOM','KERESÉS A PLAYROOMBAN'],
  ['Kontroller, audio, setup.','Kontroller, hangtechnika, felszerelés.'],
  ['READY PLAYER CHECKOUT','IRÁNY A PÉNZTÁR'],
  ['PRICE','ÁR'],
  ['STOCK','KÉSZLET'],
  ['NEXT','KÖVETKEZŐ'],
  ['SECURE CHECKOUT','BIZTONSÁGOS PÉNZTÁR'],
  ['PLAYER PROFILE','JÁTÉKOS PROFIL'],
  ['ORDERS','RENDELÉSEK'],
  ['SAVED','MENTETT'],
  ['PROFILE','PROFIL'],
  ['Gaming útmutató setup részlet','Játékútmutató felszerelési részlet'],
  ['PLAYROOM GUIDE','PLAYROOM ÚTMUTATÓ'],
  ['Szerkeszthető gaming útmutató.','Szerkeszthető játékútmutató.'],
  ['GUIDE','ÚTMUTATÓ'],
  ['DATA','ADATOK'],
  ['Guide','Útmutató'],
  ['SETUP','FELSZERELÉS'],
  ['RGB gaming setup magazin feature','RGB játékos felszerelés magazin kiemelt kép'],
  ['Gaming kontroller közelről co-op útmutatóhoz','Játékkontroller közelről kooperatív útmutatóhoz'],
  ['PlaySphere-szerű   ✓   ✓\\nBox-szerű          ✓   ✓\\nNintari-szerű      ✓\\nPC                  ✓\\nMobile              ✓','PlaySphere-szerű   ✓   ✓\\nBox-szerű          ✓   ✓\\nNintari-szerű      ✓\\nPC                  ✓\\nMobil               ✓'],
  ['Platform guide','Platformútmutató'],
  ['Co-op esték','Közös játékesték'],
  ['Setup tippek','Felszerelési tippek'],
  ['Gaming kontroller és RGB setup részlet','Játékkontroller és RGB felszerelés részlet'],
  ['HELP CENTER','SEGÍTSÉGKÖZPONT'],
  ['STILL STUCK?','TOVÁBBRA IS KÉRDÉSED VAN?'],
  ['Gaming headset részlet','Játékos fejhallgató részlet'],
  ['PLAYER SUPPORT','ÜGYFÉLSZOLGÁLAT'],
  ['ORDER HELP','RENDELÉSI SEGÍTSÉG'],
  ['PRODUCT HELP','TERMÉKTÁMOGATÁS'],
  ['LEGAL / PRIVACY','JOGI / ADATVÉDELMI'],
  ['404 / GAME OVER?','404 / VÉGE A JÁTÉKNAK?'],
]));

const localizeString=(value:string):string=>{
  const exact=PLAYROOM_V20_HU_COPY.get(value);
  if(exact)return exact;
  return value
    .replace(/\bMobile\b/g,'Mobil')
    .replace(/Gaming kontroller közelről co-op útmutatóhoz/g,'Játékkontroller közelről kooperatív útmutatóhoz');
};

const localizeValue=(value:unknown):unknown=>{
  if(typeof value==='string')return localizeString(value);
  if(Array.isArray(value))return value.map(localizeValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([key,item])=>[key,localizeValue(item)]));
  return value;
};

const localizeNode=(source:StorefrontComponentNode):StorefrontComponentNode=>({
  ...source,
  config:localizeValue(source.config) as StorefrontComponentNode['config'],
  ...(source.bindings?{bindings:localizeValue(source.bindings) as StorefrontComponentNode['bindings']}:{}),
  ...(source.children?{children:source.children.map(localizeNode)}:{}),
});

const newsletterSection=()=>node({
  id:'playroom-home-newsletter',componentKey:'layout.section',componentVersion:1,
  config:{tone:'background',spacing:'m',width:'full',style:{background:'var(--shoporation-color-background,#020b17)'}},
  children:[node({
    id:'playroom-home-newsletter-container',componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'s'},
    children:[node({
      id:'playroom-home-newsletter-signup',componentKey:'marketing.newsletter-signup',componentVersion:1,
      config:{eyebrow:'CSATLAKOZZ A PLAYROOMHOZ',title:'Ne maradj le a következő játékról.',copy:'Újdonságok, gaming tippek és válogatott ajánlatok — csak akkor, ha kéred.',inputLabel:'E-mail-cím',buttonLabel:'Feliratkozom',consentLabel:'Hozzájárulok, hogy e-mailben marketingüzeneteket kapjak. A hozzájárulás bármikor visszavonható.',tone:'surface'},
    })],
  })],
});

const supportForm=()=>node({
  id:'playroom-contact-form',componentKey:'support.contact-form',componentVersion:1,
  config:{eyebrow:'ÜGYFÉLSZOLGÁLAT',title:'Írj nekünk közvetlenül.',copy:'A megkeresésed követhető ügyfélszolgálati azonosítót kap. Ha rendelésről írsz, add meg a rendelési számodat is.',nameLabel:'Név',emailLabel:'E-mail',orderNumberLabel:'Rendelésszám',categoryLabel:'Téma',subjectLabel:'Tárgy',messageLabel:'Üzenet',buttonLabel:'Üzenet elküldése',successLead:'Köszönjük! Az ügy száma:',tone:'surface'},
});

const productDownloadsTile=()=>node({id:'playroom-product-downloads',componentKey:'commerce.downloads-tile',componentVersion:1,config:{eyebrow:'LETÖLTÉSEK',title:'Letöltések',documentsLabel:'Dokumentumok',digitalLabel:'Digitális termék',digitalAccountCopy:'Vásárlás után a letöltés a Fiókom → Letöltéseim menüpontban érhető el.',openLabel:'Megnyitás',presentation:'playroom-facts-tile'},responsive:{desktop:{gridSpan:4},tablet:{gridSpan:4},mobile:{gridSpan:12}}});

const digitalCommerceSection=(pageType:StorefrontPageDocument['pageType'])=>{
  const children:StorefrontComponentNode[]=[];
  if(pageType==='checkout')children.push(
    node({id:'playroom-checkout-fulfillment',componentKey:'commerce.fulfillment-summary',componentVersion:1,config:{title:'Kézbesítés',documentCenterLabel:'Fiókom → Letöltéseim',presentation:'playroom-native'}}),
    node({id:'playroom-checkout-post-purchase',componentKey:'commerce.post-purchase-guidance',componentVersion:1,config:{eyebrow:'VÁSÁRLÁS UTÁN',title:'Hozzáférés és dokumentumok',pendingLabel:'Fizetés után elérhető',documentCenterLabel:'Fiókom → Letöltéseim',presentation:'playroom-native'}}),
  );
  if(pageType==='account')children.push(node({id:'playroom-account-documents',componentKey:'commerce.documents-center',componentVersion:1,config:{eyebrow:'SAJÁT TÁR',title:'Letöltéseim',copy:'A megvásárolt digitális tartalmak innen tölthetők le. A rendelési iratok és a megvásárolt termékhez kapcsolódó fiókos dokumentumok ugyanitt, külön jogosultsági szabályokkal érhetők el.',digitalTitle:'Digitális vásárlások',orderTitle:'Rendelési dokumentumok',productTitle:'Termékdokumentumok',emptyLabel:'Még nincs megjeleníthető dokumentum vagy letölthető tartalom.',loginLabel:'Belépés a fiókba',presentation:'playroom-native'}}));
  if(!children.length)return null;
  return node({
    id:`playroom-${pageType}-digital-commerce`,componentKey:'layout.section',componentVersion:1,
    config:{tone:'background',spacing:'s',width:'full',style:{background:'var(--shoporation-color-background,#020b17)'}},
    children:[node({id:`playroom-${pageType}-digital-commerce-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'s'},children})],
  });
};

function appendChildToNode(nodes:readonly StorefrontComponentNode[],targetId:string,child:StorefrontComponentNode):StorefrontComponentNode[]{
  return nodes.map(item=>{
    const next=clone(item);
    if(next.id===targetId){
      const children=[...(next.children??[])].map(entry=>targetId==='playroom-product-facts-grid'
        ?{...entry,responsive:{...(entry.responsive??{}),desktop:{...(entry.responsive?.desktop??{}),gridSpan:4 as const},tablet:{...(entry.responsive?.tablet??{}),gridSpan:4 as const},mobile:{...(entry.responsive?.mobile??{}),gridSpan:12 as const}}}
        :entry);
      if(!children.some(entry=>entry.id===child.id))children.push(clone(child));
      return{...next,children};
    }
    if(next.children?.length)return{...next,children:appendChildToNode(next.children,targetId,child)};
    return next;
  });
}

function insertBeforeFooter(sections:readonly StorefrontComponentNode[],...extras:Array<StorefrontComponentNode|null>){
  const result=sections.map(clone);
  const footerIndex=Math.max(0,result.length-1);
  result.splice(footerIndex,0,...extras.filter((item):item is StorefrontComponentNode=>Boolean(item)));
  return result;
}

function insertAfterSection(sections:readonly StorefrontComponentNode[],sectionId:string,...extras:Array<StorefrontComponentNode|null>){
  const result=sections.map(clone);
  const anchor=result.findIndex(item=>item.id===sectionId);
  const insertIndex=anchor>=0?anchor+1:Math.min(1,result.length);
  result.splice(insertIndex,0,...extras.filter((item):item is StorefrontComponentNode=>Boolean(item)));
  return result;
}

function upgradePage(source:StorefrontPageDocument):StorefrontPageDocument{
  let sections=source.sections.map(clone);
  if(source.pageType==='home'&&!sections.some(item=>item.id==='playroom-home-newsletter'))sections=insertBeforeFooter(sections,newsletterSection());
  if(source.pageType==='contact'&&!sections.some(item=>item.id==='playroom-contact-form'))sections=insertBeforeFooter(sections,supportForm());
  if(source.pageType==='product')sections=appendChildToNode(sections,'playroom-product-facts-grid',productDownloadsTile());
  if(['checkout','account'].includes(source.pageType)&&!sections.some(item=>item.id===`playroom-${source.pageType}-digital-commerce`))sections=insertBeforeFooter(sections,digitalCommerceSection(source.pageType));
  const previousAddon=rec(source.metadata?.addonIntegration);
  const previousContexts=Array.isArray(previousAddon.semanticContexts)?previousAddon.semanticContexts.filter((value):value is string=>typeof value==='string'):[];
  const semanticContexts=[...new Set([...STOREFRONT_PAGE_SEMANTIC_CONTEXTS[source.pageType],...previousContexts])];
  sections=sections.map(localizeNode);
  return normalizeStorefrontTemplateRuntimeComposition({
    ...clone(source),templateVersion:PLAYROOM_V20_TEMPLATE_VERSION,sections,
    metadata:{
      ...(source.metadata??{}),
      canonicalUpgradeFromTemplateVersion:19,
      launchCapabilityConsolidation:'playroom-v20',
      adaptivePlanModel:'same-template-alap-pro-entitlement-aware',
      templateVersionPolicy:'bump-only-for-factory-composition-or-schema-change',
      digitalCommerceFactoryAcceptance:['downloadable-game','physical-gaming-product','mixed-basket'],
      addonIntegration:{
        ...previousAddon,
        styleAuthority:'current-storefront-design-system',
        factoryPreset:'playroom-v20',
        discoverability:'contextual-plus-central',
        semanticContexts,
        localOverridePolicy:'explicit-only-reset-to-inherited',
      },
    },
  });
}

const requiredFeatures:readonly FeatureCode[]=Object.freeze([...new Set<FeatureCode>([...PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.manifest.requiredFeatures,'marketingBasics','support'])]);
const digitalCommerceFixtures=Object.freeze([
  {entityType:'product' as const,entityKey:'a3-downloadable-game',payload:{name:'Orbit Breakers Digital',sku:'PLAY-A3-DIGITAL',fulfillment_type:'digital',fixturePurpose:'downloadable-game'}},
  {entityType:'product' as const,entityKey:'a3-physical-controller',payload:{name:'Neon Pro Controller',sku:'PLAY-A3-PHYSICAL',fulfillment_type:'physical',fixturePurpose:'physical-gaming-product'}},
]);
export const PLAYROOM_V20_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,
  manifest:{...PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.manifest,templateVersion:PLAYROOM_V20_TEMPLATE_VERSION,requiredFeatures},
  pages:PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.map(upgradePage),
  demoFixtures:[...(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.demoFixtures??[]),...digitalCommerceFixtures],
};
