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
  ['BE READY','KÉSZÜLJ FEL'],
  ['ORDER HELP','RENDELÉSI SEGÍTSÉG'],
  ['PRODUCT HELP','TERMÉKTÁMOGATÁS'],
  ['GENERAL','ÁLTALÁNOS'],
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
function patchPlayroomSocialLinks(item:StorefrontComponentNode):StorefrontComponentNode{
  if(item.id==='playroom-footer-social'){
    return{
      id:item.id,
      componentKey:'system.social-links',
      componentVersion:1,
      config:{
        title:'Kövess minket',
        copy:'JÁTSSZ\nFEDEZD FEL\nOSZD MEG\nTARTOZZ KÖZÉNK',
        items:[],
        ariaLabel:'Közösségi média',
        presentation:'playroom-social',
        style:item.config.style??{borderLeft:'1px solid rgba(89,139,191,.25)',paddingLeft:'1.1rem'},
        titleStyle:{fontSize:'.8rem',fontWeight:850,color:'#fff7e8'},
        copyStyle:{fontSize:'.72rem',letterSpacing:'.23em',lineHeight:1.45,color:'#d36cff'},
        navigationStyle:{gap:'.55rem'},
        itemStyle:{color:'#ffffff',fontSize:'1rem',fontWeight:900,border:'1px solid rgba(120,218,255,.22)',background:'rgba(7,25,46,.72)'},
      },
      bindings:{items:{path:'brand.socialLinks',fallback:[]}},
      ...(item.responsive?{responsive:item.responsive}:{}),
    };
  }
  return{...clone(item),...(item.children?{children:item.children.map(patchPlayroomSocialLinks)}:{})};
}
const PLAYROOM_V20_CANONICAL_FOOTER=patchPlayroomSocialLinks(localizeNode(clone(canonicalShellSource.sections[canonicalShellSource.sections.length-1]!)));

function applyPlayroomCanonicalShell(sections:readonly StorefrontComponentNode[]):StorefrontComponentNode[]{
  if(sections.length<2)throw new Error('PLAYROOM_V20_PAGE_SHELL_INCOMPLETE');
  return[
    clone(PLAYROOM_V20_CANONICAL_HEADER),
    ...sections.slice(1,-1).map(clone),
    clone(PLAYROOM_V20_CANONICAL_FOOTER),
  ];
}

const playroomContentResponsive={desktop:{gridSpan:12 as const},tablet:{gridSpan:12 as const},mobile:{gridSpan:12 as const}};

function playroomV20AuthPublicSection():StorefrontComponentNode{
  return node({
    id:'playroom-account-auth-public',
    componentKey:'layout.section',
    componentVersion:1,
    config:{
      tone:'background',spacing:'l',width:'full',authPublic:true,
      style:{
        base:{background:'radial-gradient(circle at 12% 10%,rgba(54,225,255,.12),transparent 28%),radial-gradient(circle at 86% 20%,rgba(255,93,190,.10),transparent 24%),linear-gradient(180deg,#020b17 0%,#061326 54%,#020b17 100%)',padding:'2rem 1rem 1rem'},
        mobile:{padding:'.45rem .5rem .2rem'},
      },
    },
    responsive:playroomContentResponsive,
    children:[node({
      id:'playroom-account-auth-public-container',
      componentKey:'layout.container',
      componentVersion:1,
      config:{width:'content',spacing:'s',style:{base:{maxWidth:'72rem',margin:'0 auto'}}},
      responsive:playroomContentResponsive,
      children:[node({
        id:'playroom-account-auth-public-grid',
        componentKey:'layout.grid',
        componentVersion:1,
        config:{columns:12,gap:'m',align:'stretch'},
        responsive:playroomContentResponsive,
        children:[
          node({
            id:'playroom-account-auth-public-primary',
            componentKey:'layout.stack',
            componentVersion:1,
            config:{
              direction:'vertical',gap:'m',align:'stretch',justify:'center',
              style:{
                base:{padding:'clamp(1.4rem,4vw,3.25rem)',minHeight:'23rem',background:'linear-gradient(145deg,rgba(27,22,71,.97),rgba(6,26,48,.99))',border:'1px solid rgba(54,225,255,.30)',borderRadius:'.95rem',boxShadow:'0 24px 70px rgba(0,0,0,.32)'},
                mobile:{padding:'1rem',minHeight:'0'},
              },
            },
            responsive:{desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}},
            children:[
              node({id:'playroom-account-auth-kicker',componentKey:'content.text',componentVersion:1,config:{text:'JÁTÉKOS FIÓK',as:'strong',align:'left',tone:'text',style:{base:{color:'#55e7ff',fontSize:'.7rem',fontWeight:900,letterSpacing:'.18em'}}}}),
              node({id:'playroom-account-auth-title',componentKey:'content.heading',componentVersion:1,config:{text:'Lépj vissza a játékba.',level:1,align:'left',tone:'text',style:{base:{fontSize:'clamp(2.35rem,6vw,5.35rem)',lineHeight:.92,letterSpacing:'-.055em',maxWidth:'10ch'},mobile:{fontSize:'2.05rem',lineHeight:.98}}}}),
              node({id:'playroom-account-auth-copy',componentKey:'content.text',componentVersion:1,config:{text:'Belépés után eléred a rendeléseidet, digitális letöltéseidet, dokumentumaidat és mentett játékaidat.',as:'p',align:'left',tone:'text',style:{base:{color:'#b9cadc',fontSize:'1rem',lineHeight:1.6,maxWidth:'44rem'},mobile:{fontSize:'.9rem',lineHeight:1.45}}}}),
              node({id:'playroom-account-auth-signal',componentKey:'content.text',componentVersion:1,config:{text:'PLAY · DISCOVER · TOGETHER',as:'strong',align:'left',tone:'text',style:{base:{color:'#b8e34a',fontSize:'.68rem',fontWeight:900,letterSpacing:'.16em'}}}}),
            ],
          }),
          node({
            id:'playroom-account-auth-public-secondary',
            componentKey:'layout.stack',
            componentVersion:1,
            config:{
              direction:'vertical',gap:'m',align:'stretch',justify:'center',
              style:{
                base:{padding:'clamp(1.25rem,3vw,2.2rem)',background:'linear-gradient(160deg,#0b2947,#07172b)',border:'1px solid rgba(255,93,190,.28)',borderRadius:'.95rem',boxShadow:'0 22px 60px rgba(0,0,0,.28)'},
                mobile:{display:'none',padding:'0'},
              },
            },
            responsive:{desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}},
            children:[
              node({id:'playroom-account-auth-center-kicker',componentKey:'content.text',componentVersion:1,config:{text:'FIÓK KÖZPONT',as:'strong',align:'left',tone:'text',style:{base:{color:'#ff63bf',fontSize:'.68rem',fontWeight:900,letterSpacing:'.16em'}}}}),
              node({id:'playroom-account-auth-center-title',componentKey:'content.heading',componentVersion:1,config:{text:'Minden mentésed egy helyen',level:2,align:'left',tone:'text',style:{base:{fontSize:'1.65rem',lineHeight:1.05}}}}),
              node({id:'playroom-account-auth-center-copy',componentKey:'content.text',componentVersion:1,config:{text:'Rendelések · letöltések · dokumentumok · kívánságlista',as:'p',align:'left',tone:'text',style:{base:{color:'#d6e3ef',fontSize:'.95rem',lineHeight:1.65}}}}),
            ],
          }),
        ],
      })],
    })],
  });
}

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


const VIEWPORT_STYLE_KEYS=['base','desktop','tablet','mobile'] as const;
function mergeViewportStyle(value:unknown,overrides:Partial<Record<(typeof VIEWPORT_STYLE_KEYS)[number],Record<string,unknown>>>):Record<string,unknown>{
  const current=rec(value);
  const slotted=VIEWPORT_STYLE_KEYS.some(key=>Object.prototype.hasOwnProperty.call(current,key));
  const result:Record<string,unknown>=slotted?clone(current):{base:clone(current)};
  for(const key of VIEWPORT_STYLE_KEYS){
    const override=overrides[key];
    if(!override)continue;
    result[key]={...rec(result[key]),...override};
  }
  return result;
}
function patchStyleSlot(config:Record<string,unknown>,slotName:string,overrides:Partial<Record<(typeof VIEWPORT_STYLE_KEYS)[number],Record<string,unknown>>>){
  const slots=rec(config.styleSlots);
  return{...config,styleSlots:{...slots,[slotName]:mergeViewportStyle(slots[slotName],overrides)}};
}
const PLAYROOM_HOME_OPTION_ICONS:Readonly<Record<string,string>>=Object.freeze({
  solo:'/storefront/playroom/icons/play-style-solo.svg',
  coop:'/storefront/playroom/icons/play-style-coop.svg',
  party:'/storefront/playroom/icons/play-style-party.svg',
  racing:'/storefront/playroom/icons/play-style-racing.svg',
  adventure:'/storefront/playroom/icons/play-style-adventure.svg',
  family:'/storefront/playroom/icons/play-style-family.svg',
});
function patchPlayroomFinderOptions(value:unknown):unknown{
  if(!Array.isArray(value))return value;
  return value.map(item=>{
    const option=rec(item),id=typeof option.id==='string'?option.id:'',icon=PLAYROOM_HOME_OPTION_ICONS[id];
    return icon?{...option,image:icon,symbol:''}:option;
  });
}
function patchResponsiveSpan(nodeValue:StorefrontComponentNode,tablet:1|2|3|4|5|6|7|8|9|10|11|12,mobile:1|2|3|4|5|6|7|8|9|10|11|12=12):StorefrontComponentNode{
  return{
    ...nodeValue,
    responsive:{
      ...(nodeValue.responsive??{}),
      desktop:{...(nodeValue.responsive?.desktop??{}),gridSpan:nodeValue.responsive?.desktop?.gridSpan??12},
      tablet:{...(nodeValue.responsive?.tablet??{}),gridSpan:tablet},
      mobile:{...(nodeValue.responsive?.mobile??{}),gridSpan:mobile},
    },
  };
}
function findPlayroomNode(items:readonly StorefrontComponentNode[],id:string):StorefrontComponentNode|undefined{
  for(const item of items){
    if(item.id===id)return item;
    const nested=item.children?findPlayroomNode(item.children,id):undefined;
    if(nested)return nested;
  }
  return undefined;
}
function removePlayroomNode(item:StorefrontComponentNode,id:string):StorefrontComponentNode|null{
  if(item.id===id)return null;
  if(!item.children)return item;
  const children=item.children.map(child=>removePlayroomNode(child,id)).filter((child):child is StorefrontComponentNode=>Boolean(child));
  return{...item,children};
}
function mapPlayroomNode(item:StorefrontComponentNode,id:string,mapper:(nodeValue:StorefrontComponentNode)=>StorefrontComponentNode):StorefrontComponentNode{
  if(item.id===id)return mapper(item);
  if(!item.children)return item;
  return{...item,children:item.children.map(child=>mapPlayroomNode(child,id,mapper))};
}
function playroomHalfWidth(nodeValue:StorefrontComponentNode):StorefrontComponentNode{
  return{
    ...nodeValue,
    responsive:{
      ...(nodeValue.responsive??{}),
      desktop:{...(nodeValue.responsive?.desktop??{}),gridSpan:6},
      tablet:{...(nodeValue.responsive?.tablet??{}),gridSpan:6},
      mobile:{...(nodeValue.responsive?.mobile??{}),gridSpan:12},
    },
  };
}
function recomposePlayroomHomeBottom(sections:StorefrontComponentNode[]):StorefrontComponentNode[]{
  const compatibility=findPlayroomNode(sections,'playroom-compatibility-card');
  const community=findPlayroomNode(sections,'playroom-community-stage');
  if(!compatibility||!community)return sections;

  let next=sections
    .map(section=>removePlayroomNode(section,'playroom-compatibility-card'))
    .filter((section):section is StorefrontComponentNode=>Boolean(section));

  next=next.map(section=>mapPlayroomNode(section,'playroom-gift-card',gift=>({
    ...gift,
    responsive:{
      ...(gift.responsive??{}),
      desktop:{...(gift.responsive?.desktop??{}),gridSpan:12},
      tablet:{...(gift.responsive?.tablet??{}),gridSpan:12},
      mobile:{...(gift.responsive?.mobile??{}),gridSpan:12},
    },
  })));

  const pairedGrid=node({
    id:'playroom-confidence-community-grid',
    componentKey:'layout.grid',
    componentVersion:1,
    config:{columns:12,gap:'xs',align:'stretch'},
    children:[playroomHalfWidth(clone(compatibility)),playroomHalfWidth(clone(community))],
  });

  return next.map(section=>mapPlayroomNode(section,'playroom-play-together-container',container=>({
    ...container,
    children:[pairedGrid],
  })));
}

function patchPlayroomHomeResponsive(item:StorefrontComponentNode):StorefrontComponentNode{
  const children=item.children?.map(patchPlayroomHomeResponsive);
  let next:StorefrontComponentNode={...clone(item),...(children?{children}:{})};
  let config=rec(next.config);

  switch(next.id){
    case 'playroom-hero':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        desktop:{minHeight:'22rem'},
        tablet:{minHeight:'13.75rem'},
        mobile:{minHeight:'13.75rem'},
      })}};
      break;
    case 'playroom-selectors':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        desktop:{minHeight:'22rem'},
        tablet:{minHeight:'auto'},
        mobile:{minHeight:'auto'},
      })}};
      break;
    case 'playroom-style-card':
    case 'playroom-platform-card':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        desktop:{flex:'1 1 0',minHeight:'0',padding:'.78rem .72rem',justifyContent:'space-between'},
        tablet:{flex:'0 1 auto',minHeight:'auto',padding:'.62rem .68rem',justifyContent:'flex-start'},
        mobile:{flex:'0 1 auto',minHeight:'auto',padding:'.62rem .68rem',justifyContent:'flex-start'},
      })}};
      break;
    case 'playroom-hero-copy':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        tablet:{width:'100%',minHeight:'13rem',padding:'1rem 1.1rem'},
        mobile:{width:'100%',minHeight:'0',padding:'1rem .9rem .8rem',background:'linear-gradient(180deg,rgba(2,10,24,.94),rgba(2,10,24,.78) 72%,rgba(2,10,24,.62))'},
      })}};
      break;
    case 'playroom-hero-title':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        tablet:{fontSize:'clamp(2.8rem,7vw,4.25rem)',maxWidth:'9ch'},
        mobile:{fontSize:'clamp(2.45rem,14vw,3.5rem)',maxWidth:'9ch',lineHeight:.9},
      })}};
      break;
    case 'playroom-hero-support':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{mobile:{fontSize:'.84rem',lineHeight:1.4,maxWidth:'30ch'}})}};
      break;
    case 'playroom-hero-primary':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{mobile:{width:'fit-content',maxWidth:'100%',whiteSpace:'normal',fontSize:'.78rem',padding:'.62rem .78rem'}})}};
      break;
    case 'playroom-hero-art':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        tablet:{objectPosition:'64% center'},
        mobile:{objectPosition:'68% center',filter:'brightness(.82) saturate(1.06)'},
      })}};
      break;
    case 'playroom-trust-grid':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        tablet:{position:'static',left:'auto',right:'auto',bottom:'auto',margin:'.25rem .7rem .7rem'},
        mobile:{position:'static',left:'auto',right:'auto',bottom:'auto',margin:'0 .7rem .7rem'},
      })}};
      break;
    case 'playroom-trust-shipping':
    case 'playroom-trust-warranty':
    case 'playroom-trust-return':
    case 'playroom-trust-community':
      next={
        ...next,
        responsive:{
          ...(next.responsive??{}),
          desktop:{...(next.responsive?.desktop??{}),gridSpan:3},
          tablet:{...(next.responsive?.tablet??{}),gridSpan:3},
          mobile:{...(next.responsive?.mobile??{}),gridSpan:6},
        },
      };
      break;
    case 'playroom-game-finder':{
      config={...config,options:patchPlayroomFinderOptions(config.options)};
      config=patchStyleSlot(config,'options',{
        desktop:{gridTemplateColumns:'repeat(6,minmax(0,1fr))'},
        tablet:{gridTemplateColumns:'repeat(3,minmax(0,1fr))'},
        mobile:{gridTemplateColumns:'repeat(2,minmax(0,1fr))'},
      });
      config=patchStyleSlot(config,'option',{
        desktop:{minHeight:'4rem',padding:'.4rem .12rem'},
        tablet:{minHeight:'3.58rem',padding:'.28rem .12rem'},
        mobile:{minHeight:'3.58rem',padding:'.28rem .12rem'},
      });
      config=patchStyleSlot(config,'optionMedia',{
        base:{width:'2.2rem',height:'2.2rem',objectFit:'contain'},
        tablet:{width:'2.15rem',height:'2.15rem'},
        mobile:{width:'2rem',height:'2rem'},
      });
      const optionsBinding=next.bindings?.options;
      next={
        ...next,
        config,
        ...(optionsBinding?{bindings:{...next.bindings,options:{...optionsBinding,fallback:patchPlayroomFinderOptions(optionsBinding.fallback)}}}:{}),
      };
      break;
    }
    case 'playroom-platform-navigation':
      config=patchStyleSlot(config,'grid',{
        desktop:{gridTemplateColumns:'repeat(6,minmax(0,1fr))'},
        tablet:{gridTemplateColumns:'repeat(3,minmax(0,1fr))'},
        mobile:{gridTemplateColumns:'repeat(2,minmax(0,1fr))'},
      });
      config=patchStyleSlot(config,'card',{
        desktop:{minHeight:'5.45rem'},
        tablet:{minHeight:'5.2rem'},
        mobile:{minHeight:'4.8rem',padding:'.5rem .28rem',fontSize:'.68rem'},
      });
      next={...next,config};
      break;
    case 'playroom-setup':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        desktop:{minHeight:'12.8rem'},
        tablet:{minHeight:'10.2rem'},
        mobile:{minHeight:'10.2rem'},
      })}};
      break;
    case 'playroom-player-two':
    case 'playroom-upgrade':
      next=patchResponsiveSpan(next,6,12);
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        desktop:{minHeight:'12.8rem'},
        tablet:{minHeight:'0'},
        mobile:{minHeight:'0'},
      })}};
      break;
    case 'playroom-upgrade-grid':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        desktop:{paddingTop:'.4rem'},
        tablet:{paddingTop:'0'},
        mobile:{paddingTop:'0'},
      })}};
      break;
    case 'playroom-player-controller':
    case 'playroom-player-headset':
    case 'playroom-player-family':
    case 'playroom-player-couch':
    case 'playroom-upgrade-monitor':
    case 'playroom-upgrade-audio':
    case 'playroom-upgrade-light':
    case 'playroom-upgrade-chair':
      next=patchResponsiveSpan(next,6,12);
      break;
    case 'playroom-player-two-cta':
    case 'playroom-upgrade-cta':
      next={...next,config:{...config,label:'Tovább →',ariaLabel:next.id==='playroom-player-two-cta'?'Többjátékos ajánlatok':'Játékest ötletek',style:mergeViewportStyle(config.style,{
        base:{position:'static',right:'auto',top:'auto',width:'fit-content',height:'auto',marginTop:'.28rem',alignSelf:'flex-start',display:'inline-flex',placeItems:'unset',alignItems:'center',justifyContent:'center',padding:'.42rem .62rem',fontSize:'.52rem',fontWeight:850,background:'rgba(5,23,44,.92)',color:'#f5fbff',border:'1px solid rgba(64,220,255,.38)',borderRadius:'.3rem',boxShadow:'0 7px 20px rgba(0,0,0,.18)'},
        desktop:{marginTop:'auto',alignSelf:'flex-start'},
        tablet:{position:'static',right:'auto',top:'auto',width:'fit-content',height:'auto',marginTop:'.25rem',alignSelf:'flex-start'},
        mobile:{position:'static',right:'auto',top:'auto',width:'fit-content',height:'auto',marginTop:'.25rem',alignSelf:'flex-start',fontSize:'.74rem',padding:'.5rem .7rem'},
      })}};
      break;
    case 'playroom-featured-games':
      next={
        ...next,
        responsive:{
          ...(next.responsive??{}),
          desktop:{...(next.responsive?.desktop??{}),gridSpan:6},
        },
        config:{...config,style:mergeViewportStyle(config.style,{
          desktop:{minHeight:'12.2rem'},
          tablet:{minHeight:'10.65rem'},
          mobile:{minHeight:'10.65rem'},
        })},
      };
      break;
    case 'playroom-platform-match':
      next={
        ...next,
        responsive:{
          ...(next.responsive??{}),
          desktop:{...(next.responsive?.desktop??{}),gridSpan:6},
        },
      };
      break;
    case 'playroom-gift-card':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        desktop:{minHeight:'19.25rem'},
        tablet:{minHeight:'11.3rem'},
        mobile:{minHeight:'11.3rem'},
      })}};
      break;
    case 'playroomFeaturedGames':
      next={...next,config:{...config,presentation:'carousel',columns:4}};
      break;
    case 'playroom-featured-all':
      next={...next,config:{...config,label:'Összes újdonság →',ariaLabel:'Összes újdonság megtekintése',style:mergeViewportStyle(config.style,{
        tablet:{position:'static',right:'auto',top:'auto',width:'fit-content',marginTop:'.2rem',alignSelf:'flex-start'},
        mobile:{position:'static',right:'auto',top:'auto',width:'fit-content',marginTop:'.2rem',alignSelf:'flex-start',fontSize:'.72rem',padding:'.48rem .65rem'},
      })}};
      break;
    case 'playroom-platform-match-status':
      next={...next,config:{...config,hideWhenUnknown:true}};
      break;
    case 'playroom-compatibility-card':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        base:{height:'100%',minHeight:'100%',alignContent:'stretch'},
        desktop:{height:'auto',minHeight:'15.5rem',alignContent:'start'},
        tablet:{height:'auto',minHeight:'11.3rem',alignContent:'start'},
        mobile:{height:'auto',minHeight:'0',alignContent:'start'},
      })}};
      break;
    case 'playroom-compatibility-layout':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        base:{height:'100%',alignItems:'stretch'},
        desktop:{height:'auto',minHeight:'0',alignItems:'start'},
        mobile:{height:'auto'},
      })}};
      break;
    case 'playroom-compatibility-art':
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        base:{height:'7.2rem',objectFit:'cover',objectPosition:'center'},
        desktop:{height:'9rem'},
        tablet:{height:'7rem'},
        mobile:{height:'6.4rem'},
      })}};
      break;
    case 'playroom-compatibility-platform-list':
      next={...next,config:{...config,text:'PC · PlayStation · Xbox · Nintendo · Kézikonzol · Mobil',style:mergeViewportStyle(config.style,{
        base:{whiteSpace:'normal',lineHeight:1.45,color:'#c7d8e8'},
        mobile:{fontSize:'.68rem'},
      })}};
      break;
    case 'playroom-compatibility-check':
      next={...next,config:{...config,label:'Kompatibilitás ellenőrzése →',ariaLabel:'Kompatibilitás ellenőrzése'}};
      break;
    case 'playroom-compatibility-status-wrap':{
      const currentChildren=next.children??[];
      const introExists=currentChildren.some(child=>child.id==='playroom-compatibility-intro');
      const guideExists=currentChildren.some(child=>child.id==='playroom-compatibility-guide');
      const intro=node({
        id:'playroom-compatibility-intro',
        componentKey:'content.text',
        componentVersion:1,
        config:{
          text:'Ellenőrizd, hogy a választott játék vagy kiegészítő illik-e a platformodhoz. Konkrét állapotot csak valódi termékadat alapján mutatunk.',
          as:'p',align:'left',tone:'text',
          style:{margin:'0',fontSize:'.63rem',lineHeight:1.5,color:'#d8e7f4'},
        },
      });
      const guide=node({
        id:'playroom-compatibility-guide',
        componentKey:'layout.stack',
        componentVersion:1,
        config:{direction:'vertical',gap:'xs',align:'stretch',justify:'start',style:{padding:'.52rem .6rem',background:'rgba(3,17,35,.42)',border:'1px solid rgba(92,124,250,.22)',borderRadius:'.34rem'}},
        children:[
          node({id:'playroom-compatibility-guide-title',componentKey:'content.text',componentVersion:1,config:{text:'HOGYAN ELLENŐRIZD?',as:'strong',align:'left',tone:'text',style:{fontSize:'.53rem',letterSpacing:'.12em',color:'#78e7ff',fontWeight:900}}}),
          node({id:'playroom-compatibility-guide-copy',componentKey:'content.text',componentVersion:1,config:{text:'1. Válaszd ki a platformod · 2. Nyisd meg a terméket · 3. Nézd meg a kompatibilitási jelzést',as:'p',align:'left',tone:'text',style:{margin:'0',fontSize:'.56rem',lineHeight:1.45,color:'#c7d8e8'}}}),
        ],
      });
      let children=currentChildren;
      if(!introExists)children=[intro,...children];
      if(!guideExists)children=[...children,guide];
      next={...next,config:{...config,style:mergeViewportStyle(config.style,{
        base:{height:'100%',justifyContent:'space-between',gap:'.45rem'},
        desktop:{height:'auto',justifyContent:'flex-start',gap:'.52rem'},
        mobile:{height:'auto',justifyContent:'start',gap:'.5rem'},
      })},children};
      break;
    }
    case 'playroom-community-copy-text':
      next={...next,config:{...config,text:'Játékesték, tippek és friss közösségi tartalmak egy helyen.',style:mergeViewportStyle(config.style,{
        base:{fontSize:'.68rem',lineHeight:1.5,maxWidth:'32rem'},
        mobile:{fontSize:'.78rem'},
      })}};
      break;
    case 'playroom-community-benefit-text':
      next={...next,config:{...config,text:'Játékajánlók · események · közösségi tippek',style:mergeViewportStyle(config.style,{
        base:{whiteSpace:'normal',lineHeight:1.4,fontSize:'.6rem'},
        tablet:{whiteSpace:'normal',lineHeight:1.4},
        mobile:{whiteSpace:'normal',lineHeight:1.45,fontSize:'.68rem'},
      })}};
      break;
    case 'playroom-community-button':
      next={...next,config:{...config,label:'Csatlakozz a közösséghez →',ariaLabel:'Csatlakozz a Playroom közösséghez',style:mergeViewportStyle(config.style,{
        base:{width:'fit-content',maxWidth:'100%',padding:'.62rem .85rem'},
        mobile:{width:'100%',justifyContent:'center'},
      })}};
      break;
    case 'playroom-community-stage':{
      const title=findPlayroomNode([next],'playroom-community-title');
      const copyNode=findPlayroomNode([next],'playroom-community-copy-text');
      const benefit=findPlayroomNode([next],'playroom-community-benefit-text');
      const buttonNode=findPlayroomNode([next],'playroom-community-button');
      const art=findPlayroomNode([next],'playroom-community-art');
      if(title&&copyNode&&benefit&&buttonNode&&art){
        const content=node({
          id:'playroom-community-content',
          componentKey:'layout.stack',
          componentVersion:1,
          config:{direction:'vertical',gap:'s',align:'stretch',justify:'center',style:{base:{padding:'.85rem',minHeight:'12rem'},desktop:{minHeight:'14.8rem'},tablet:{minHeight:'11.3rem'},mobile:{minHeight:'11.3rem'}}},
          responsive:{desktop:{gridSpan:6},tablet:{gridSpan:6},mobile:{gridSpan:12}},
          children:[clone(title),clone(copyNode),clone(benefit),clone(buttonNode)],
        });
        const media:StorefrontComponentNode={
          ...clone(art),
          config:{...rec(art.config),style:mergeViewportStyle(rec(art.config).style,{
            base:{position:'static',inset:'auto',width:'100%',height:'100%',minHeight:'12rem',objectFit:'cover',objectPosition:'center',opacity:1,borderRadius:'.38rem'},
            desktop:{height:'14.8rem',minHeight:'14.8rem',maxHeight:'14.8rem'},
            tablet:{height:'11.3rem',minHeight:'11.3rem',maxHeight:'11.3rem'},
            mobile:{height:'11.3rem',minHeight:'9rem',maxHeight:'11.3rem'},
          })},
          responsive:{desktop:{gridSpan:6},tablet:{gridSpan:6},mobile:{gridSpan:12}},
        };
        next={
          ...next,
          config:{...config,style:mergeViewportStyle(config.style,{
            base:{position:'relative',minHeight:'0',overflow:'hidden',padding:'.35rem',background:'linear-gradient(135deg,#171047,#071b31)'},
            mobile:{padding:'.3rem'},
          })},
          children:[node({
            id:'playroom-community-layout',
            componentKey:'layout.grid',
            componentVersion:1,
            config:{columns:12,gap:'xs',align:'stretch'},
            children:[content,media],
          })],
        };
      }
      break;
    }
  }
  return next;
}

function patchPlayroomContactResponsive(item:StorefrontComponentNode):StorefrontComponentNode{
  const children=item.children?.map(patchPlayroomContactResponsive);
  const next:StorefrontComponentNode={...clone(item),...(children?{children}:{})};
  const contactSpans:Record<string,{desktop:4|8;tablet:4|8;mobile:12}>={
    'playroom-contact-copy':{desktop:8,tablet:8,mobile:12},
    'playroom-contact-expectations':{desktop:4,tablet:4,mobile:12},
    'playroom-contact-orders':{desktop:4,tablet:4,mobile:12},
    'playroom-contact-product':{desktop:4,tablet:4,mobile:12},
    'playroom-contact-general':{desktop:4,tablet:4,mobile:12},
  };
  const span=contactSpans[next.id];
  if(span)next.responsive={
    ...(next.responsive??{}),
    desktop:{...(next.responsive?.desktop??{}),gridSpan:span.desktop},
    tablet:{...(next.responsive?.tablet??{}),gridSpan:span.tablet},
    mobile:{...(next.responsive?.mobile??{}),gridSpan:span.mobile},
  };
  return next;
}

function upgradePage(source:StorefrontPageDocument):StorefrontPageDocument{
  let sections=source.sections.map(clone);
  if(source.pageType==='home'){
    sections=sections.map(patchPlayroomHomeResponsive);
    sections=recomposePlayroomHomeBottom(sections);
  }
  if(source.pageType==='contact')sections=sections.map(patchPlayroomContactResponsive);
  if(source.pageType==='content'){
    sections=[clone(source.sections[0]!),...playroomV20InformationContentSections(),clone(source.sections[source.sections.length-1]!)];
  }
  if(source.pageType==='account'&&!sections.some(item=>item.id==='playroom-account-auth-public'))sections=insertAfterSection(sections,sections[0]?.id??'',playroomV20AuthPublicSection());
  if(source.pageType==='home'&&!sections.some(item=>item.id==='playroom-home-newsletter'))sections=insertBeforeFooter(sections,newsletterSection());
  if(source.pageType==='contact'&&!sections.some(item=>item.id==='playroom-contact-form'))sections=insertBeforeFooter(sections,supportForm());
  if(source.pageType==='product')sections=appendChildToNode(sections,'playroom-product-facts-grid',productDownloadsTile());
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
      ...(source.pageType==='account'?{authComposition:'template-owned-v1',authPreset:'playroom-v20-command-center'}:{}),
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
const playroomGameFixtures=Object.freeze([
  {entityType:'product' as const,entityKey:'game-orbit-breakers',payload:{name:'Orbit Breakers',slug:'orbit-breakers',kind:'game',demoCategory:'akcio',demo:true,installAsDemoProduct:true,grossPriceHuf:22990,stockQuantity:12,image:'/storefront/playroom/game-orbit.svg',featured:true,shortDescription:'Tempós sci-fi akciójáték kooperatív estékre.'}},
  {entityType:'product' as const,entityKey:'game-neon-rally',payload:{name:'Neon Rally',slug:'neon-rally',kind:'game',demoCategory:'verseny',demo:true,installAsDemoProduct:true,grossPriceHuf:19990,stockQuantity:12,image:'/storefront/playroom/game-rally.svg',shortDescription:'Neonfényes arcade versenyjáték gyors futamokkal.'}},
  {entityType:'product' as const,entityKey:'game-midnight-quest',payload:{name:'Midnight Quest',slug:'midnight-quest',kind:'game',demoCategory:'kaland',demo:true,installAsDemoProduct:true,grossPriceHuf:26990,stockQuantity:12,image:'/storefront/playroom/game-quest.svg',shortDescription:'Felfedezésre és történetre épülő kalandjáték.'}},
  {entityType:'product' as const,entityKey:'game-cyber-arena',payload:{name:'Cyber Arena',slug:'cyber-arena',kind:'game',demoCategory:'arena',demo:true,installAsDemoProduct:true,grossPriceHuf:23990,stockQuantity:12,image:'/storefront/playroom/game-arena.svg',shortDescription:'Gyors arénacsaták futurisztikus környezetben.'}},
  {entityType:'product' as const,entityKey:'game-party-rift',payload:{name:'Party Rift',slug:'party-rift',kind:'game',demoCategory:'kooperativ',demo:true,installAsDemoProduct:true,grossPriceHuf:14990,stockQuantity:12,image:'/storefront/playroom/game-party.svg',shortDescription:'Közös játékra tervezett könnyed party-cím.'}},
  {entityType:'product' as const,entityKey:'game-starforge',payload:{name:'Starforge',slug:'starforge',kind:'game',demoCategory:'sci-fi',demo:true,installAsDemoProduct:true,grossPriceHuf:29990,stockQuantity:12,image:'/storefront/playroom/game-starforge.svg',shortDescription:'Űrbéli felfedezés és építkezés egy játékban.'}},
  {entityType:'product' as const,entityKey:'game-turbo-circuit',payload:{name:'Turbo Circuit',slug:'turbo-circuit',kind:'game',demoCategory:'verseny',demo:true,installAsDemoProduct:true,grossPriceHuf:18990,stockQuantity:12,image:'/storefront/playroom/game-turbo-circuit.svg',shortDescription:'Arcade pályaverseny rövid, intenzív menetekhez.'}},
  {entityType:'product' as const,entityKey:'game-couch-crew',payload:{name:'Couch Crew',slug:'couch-crew',kind:'game',demoCategory:'tarsasagi',demo:true,installAsDemoProduct:true,grossPriceHuf:12990,stockQuantity:12,image:'/storefront/playroom/game-couch-crew.svg',shortDescription:'Kanapés többjátékos cím baráti estékhez.'}},
  {entityType:'product' as const,entityKey:'game-mech-tactics',payload:{name:'Mech Tactics',slug:'mech-tactics',kind:'game',demoCategory:'strategia',demo:true,installAsDemoProduct:true,grossPriceHuf:24990,stockQuantity:12,image:'/storefront/playroom/game-mech-tactics.svg',shortDescription:'Körökre osztott taktika gépesített egységekkel.'}},
  {entityType:'product' as const,entityKey:'game-pixel-picnic',payload:{name:'Pixel Picnic',slug:'pixel-picnic',kind:'game',demoCategory:'csaladi',demo:true,installAsDemoProduct:true,grossPriceHuf:11990,stockQuantity:12,image:'/storefront/playroom/game-pixel-picnic.svg',shortDescription:'Színes, családbarát játék közös kikapcsolódáshoz.'}},
  {entityType:'product' as const,entityKey:'game-void-runners',payload:{name:'Void Runners',slug:'void-runners',kind:'game',demoCategory:'akcio',demo:true,installAsDemoProduct:true,grossPriceHuf:27990,stockQuantity:12,image:'/storefront/playroom/game-void-runners.svg',shortDescription:'Pörgős sci-fi akció gyors küldetésekkel.'}},
  {entityType:'product' as const,entityKey:'game-kingdom-grid',payload:{name:'Kingdom Grid',slug:'kingdom-grid',kind:'game',demoCategory:'strategia',demo:true,installAsDemoProduct:true,grossPriceHuf:21990,stockQuantity:12,image:'/storefront/playroom/game-kingdom-grid.svg',shortDescription:'Rácsalapú stratégia építéssel és tervezéssel.'}},
])

const PLAYROOM_V20_PAGES=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.map(upgradePage);
function assertPlayroomV20CanonicalShell(pages:readonly StorefrontPageDocument[]):void{
  const account=pages.find(page=>page.pageType==='account');
  if(!account)throw new Error('PLAYROOM_V20_CANONICAL_ACCOUNT_PAGE_MISSING');
  const headerSignature=JSON.stringify(account.sections[0]);
  const footerSignature=JSON.stringify(account.sections[account.sections.length-1]);
  if(account.sections[0]?.componentKey!=='system.commerce-header')throw new Error('PLAYROOM_V20_CANONICAL_HEADER_INVALID');
  for(const page of pages){
    if(JSON.stringify(page.sections[0])!==headerSignature)throw new Error(`PLAYROOM_V20_CANONICAL_HEADER_DRIFT:${page.pageType}`);
    if(JSON.stringify(page.sections[page.sections.length-1])!==footerSignature)throw new Error(`PLAYROOM_V20_CANONICAL_FOOTER_DRIFT:${page.pageType}`);
  }
}
assertPlayroomV20CanonicalShell(PLAYROOM_V20_PAGES);

export const PLAYROOM_V20_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,
  manifest:{...PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.manifest,templateVersion:PLAYROOM_V20_TEMPLATE_VERSION,requiredFeatures},
  pages:PLAYROOM_V20_PAGES,
  demoFixtures:[...(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.demoFixtures??[]),...digitalCommerceFixtures,...playroomGameFixtures],
};
