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
  ['SECURE','BIZTONSÁG'],
  ['SUMMARY','ÖSSZESÍTÉS'],
  ['GUIDED ACCORDION','VEZETETT PÉNZTÁR'],
  ['SHIPPING','SZÁLLÍTÁS'],
  ['PAYMENT','FIZETÉS'],
  ['Provider-neutral','Szolgáltatófüggetlen'],
  ['Nincs template-local fizetési logika.','Nincs sablonba épített fizetési logika.'],
  ['Desktop order summary.','Asztali rendelési összesítő.'],
  ['Aktív fizetési provider.','Aktív fizetési szolgáltató.'],
  ['Semantic slot','Integrációs pont'],
  ['checkout.shipping.methods','A választható szállítási módok helye.'],
  ['checkout.payment.methods','A választható fizetési módok helye.'],
  ['A működő accordion a közös E13 checkout runtime feladata; a sablon a vizuális nyelvet adja.','A működő, lépésenkénti pénztár a közös rendszer része; a sablon a vizuális megjelenést adja.'],
  ['A Szállítás és Fizetés lépés a saját provider/add-on lehetőségeit ugyanebben a folyamban jeleníti meg.','A Szállítás és Fizetés lépés a saját szolgáltatói és kiegészítő lehetőségeit ugyanebben a folyamatban jeleníti meg.'],
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

const canonicalShellSource=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account');
if(!canonicalShellSource)throw new Error('PLAYROOM_V20_CANONICAL_SHELL_SOURCE_MISSING');
const PLAYROOM_V20_CANONICAL_HEADER=localizeNode(clone(canonicalShellSource.sections[0]!));
const PLAYROOM_V20_CANONICAL_FOOTER=localizeNode(clone(canonicalShellSource.sections[canonicalShellSource.sections.length-1]!));

function applyPlayroomCanonicalShell(sections:readonly StorefrontComponentNode[]):StorefrontComponentNode[]{
  if(sections.length<2)throw new Error('PLAYROOM_V20_PAGE_SHELL_INCOMPLETE');
  return[
    clone(PLAYROOM_V20_CANONICAL_HEADER),
    ...sections.slice(1,-1).map(clone),
    clone(PLAYROOM_V20_CANONICAL_FOOTER),
  ];
}

const playroomContentResponsive={desktop:{gridSpan:12 as const},tablet:{gridSpan:12 as const},mobile:{gridSpan:12 as const}};

function playroomV20InformationContentSections():StorefrontComponentNode[]{
  return[
    node({
      id:'playroom-content-information-intro',
      componentKey:'layout.section',
      componentVersion:1,
      config:{
        tone:'background',spacing:'m',width:'full',
        style:{
          base:{background:'radial-gradient(circle at 88% 8%,rgba(51,213,255,.08),transparent 25%),#020b17',padding:'1.5rem 1rem 1rem'},
          mobile:{padding:'1rem .85rem .65rem'},
        },
      },
      responsive:playroomContentResponsive,
      children:[node({
        id:'playroom-content-information-intro-container',
        componentKey:'layout.container',
        componentVersion:1,
        config:{width:'content',spacing:'s',style:{base:{maxWidth:'64rem',margin:'0 auto'}}},
        responsive:playroomContentResponsive,
        children:[node({
          id:'playroom-content-information-intro-card',
          componentKey:'layout.stack',
          componentVersion:1,
          config:{
            direction:'vertical',gap:'s',align:'stretch',justify:'start',
            style:{
              base:{padding:'1.35rem 1.4rem',background:'linear-gradient(145deg,rgba(26,20,66,.96),rgba(7,25,46,.99))',border:'1px solid rgba(255,93,190,.24)',borderRadius:'.8rem',boxShadow:'0 14px 34px rgba(0,0,0,.22)'},
              mobile:{padding:'1rem'},
            },
          },
          responsive:playroomContentResponsive,
          children:[
            node({
              id:'playroom-content-information-eyebrow',
              componentKey:'content.text',
              componentVersion:1,
              config:{text:'INFORMÁCIÓ',as:'strong',align:'left',tone:'text',style:{base:{fontSize:'.68rem',fontWeight:900,letterSpacing:'.16em',color:'#55e7ff'},mobile:{fontSize:'.64rem'}}},
              responsive:playroomContentResponsive,
            }),
            node({
              id:'playroom-content-information-title',
              componentKey:'content.heading',
              componentVersion:1,
              config:{text:'Tájékoztató',level:1,align:'left',tone:'text',style:{base:{fontSize:'clamp(2rem,4vw,3.7rem)',lineHeight:.98},mobile:{fontSize:'2rem',lineHeight:1.02}}},
              bindings:{text:{path:'content.page.title',fallback:'Tájékoztató'}},
              responsive:playroomContentResponsive,
            }),
            node({
              id:'playroom-content-information-summary',
              componentKey:'content.text',
              componentVersion:1,
              config:{text:'A webshop tájékoztató oldala.',as:'p',align:'left',tone:'text',style:{base:{fontSize:'1rem',lineHeight:1.6,color:'#b9cadc',maxWidth:'52rem'},mobile:{fontSize:'.94rem',lineHeight:1.55}}},
              bindings:{text:{path:'content.page.summary',fallback:'A webshop tájékoztató oldala.'}},
              responsive:playroomContentResponsive,
            }),
          ],
        })],
      })],
    }),
    node({
      id:'playroom-content-information-body-section',
      componentKey:'layout.section',
      componentVersion:1,
      config:{
        tone:'background',spacing:'m',width:'full',
        style:{base:{background:'#020b17',padding:'1rem 1rem 2rem'},mobile:{padding:'.65rem .85rem 1.35rem'}},
      },
      responsive:playroomContentResponsive,
      children:[node({
        id:'playroom-content-information-body-container',
        componentKey:'layout.container',
        componentVersion:1,
        config:{width:'content',spacing:'s',style:{base:{maxWidth:'64rem',margin:'0 auto'}}},
        responsive:playroomContentResponsive,
        children:[node({
          id:'playroom-content-information-reading-card',
          componentKey:'layout.stack',
          componentVersion:1,
          config:{
            direction:'vertical',gap:'s',align:'stretch',justify:'start',
            style:{
              base:{padding:'1.5rem 1.6rem',background:'linear-gradient(155deg,#0b2947,#06172b)',border:'1px solid rgba(78,216,255,.28)',borderRadius:'.8rem',boxShadow:'0 14px 34px rgba(0,0,0,.22)',minHeight:'12rem'},
              mobile:{padding:'1rem',minHeight:'0'},
            },
          },
          responsive:playroomContentResponsive,
          children:[
            node({
              id:'playroom-content-information-body-title',
              componentKey:'content.heading',
              componentVersion:1,
              config:{text:'Részletek',level:2,align:'left',tone:'text',style:{base:{fontSize:'1.45rem',lineHeight:1.15},mobile:{fontSize:'1.25rem'}}},
              responsive:playroomContentResponsive,
            }),
            node({
              id:'playroom-content-information-body',
              componentKey:'content.text',
              componentVersion:1,
              config:{text:'Itt jelenik meg az oldal tartalma.',as:'p',align:'left',tone:'text',style:{base:{fontSize:'1rem',lineHeight:1.75,color:'#d4e1ee',whiteSpace:'pre-line',overflowWrap:'anywhere'},mobile:{fontSize:'.95rem',lineHeight:1.65}}},
              bindings:{text:{path:'content.page.body',fallback:'Itt jelenik meg az oldal tartalma.'}},
              responsive:playroomContentResponsive,
            }),
          ],
        })],
      })],
    }),
  ];
}

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
  if(source.pageType==='content'){
    sections=[clone(source.sections[0]!),...playroomV20InformationContentSections(),clone(source.sections[source.sections.length-1]!)];
  }
  if(source.pageType==='home'&&!sections.some(item=>item.id==='playroom-home-newsletter'))sections=insertBeforeFooter(sections,newsletterSection());
  if(source.pageType==='contact'&&!sections.some(item=>item.id==='playroom-contact-form'))sections=insertBeforeFooter(sections,supportForm());
  if(source.pageType==='product')sections=appendChildToNode(sections,'playroom-product-facts-grid',productDownloadsTile());
  if(source.pageType==='checkout'&&!sections.some(item=>item.id==='playroom-checkout-digital-commerce'))sections=insertBeforeFooter(sections,digitalCommerceSection(source.pageType));
  const previousAddon=rec(source.metadata?.addonIntegration);
  const previousContexts=Array.isArray(previousAddon.semanticContexts)?previousAddon.semanticContexts.filter((value):value is string=>typeof value==='string'):[];
  const semanticContexts=[...new Set([...STOREFRONT_PAGE_SEMANTIC_CONTEXTS[source.pageType],...previousContexts])];
  sections=applyPlayroomCanonicalShell(sections.map(localizeNode));
  return normalizeStorefrontTemplateRuntimeComposition({
    ...clone(source),templateVersion:PLAYROOM_V20_TEMPLATE_VERSION,sections,
    metadata:{
      ...(source.metadata??{}),
      canonicalUpgradeFromTemplateVersion:19,
      launchCapabilityConsolidation:'playroom-v20',
      adaptivePlanModel:'same-template-alap-pro-entitlement-aware',
      templateVersionPolicy:'bump-only-for-factory-composition-or-schema-change',
      digitalCommerceFactoryAcceptance:['downloadable-game','physical-gaming-product','mixed-basket'],
      ...(source.pageType==='checkout'?{checkoutTheme:{
        background:'#020b17',
        surface:'#0b2947',
        surfaceMuted:'#071a30',
        text:'#f7fbff',
        mutedText:'#b9cadc',
        headingText:'#f7fbff',
        fieldLabel:'#dce9f5',
        inputText:'#f7fbff',
        placeholder:'#9bb1c6',
        helperText:'#b9cadc',
        border:'rgba(78,216,255,.28)',
        primary:'#5c7cfa',
        primaryContrast:'#ffffff',
        accent:'#ff63bf',
        radiusS:'.42rem',
        radiusM:'.72rem',
        radiusL:'.9rem',
      }}:{}),
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
