import {STOREFRONT_TEMPLATE_CATALOG,getStorefrontTemplatePackage,type StorefrontTemplateCatalogEntry} from '@/lib/builder/storefront-template-catalog';

export type StorefrontTemplateProComparison={
  status:'planned'|'available';
  summary:string;
  highlights:readonly string[];
  optionalAddOns:readonly string[];
};

export type StorefrontTemplateLibraryEntry=StorefrontTemplateCatalogEntry&{
  displayName:string;
  categoryLabel:string;
  description:string;
  audience:string;
  highlights:readonly string[];
  previewPageKey:string|null;
  proComparison:StorefrontTemplateProComparison;
};

type MerchandisingProfile={description:string;audience:string};
type ProProfile={summary:string;highlights:readonly string[];optionalAddOns?:readonly string[]};

const CATEGORY_LABELS:Record<string,string>={
  beauty:'Szépség & Wellness',fashion:'Divat',food:'Élelmiszer & Gasztro',gaming:'Gaming',home:'Lakberendezés',industrial:'Ipari & B2B',jewelry:'Órák & Ékszerek',outdoor:'Outdoor & Utazás',pet:'Kisállat',sport:'Sport',tech:'Technológia',
};

const CATEGORY_PROFILES:Record<string,MerchandisingProfile>={
  beauty:{description:'Tartalomvezérelt szépség- és wellness webshop, vizuális rutinokkal és erős termékfelfedezéssel.',audience:'kozmetikai, skincare, beauty és wellness márkáknak'},
  fashion:{description:'Editorial és kollekció-központú divatwebshop, erős kampány- és lookbook hangsúllyal.',audience:'divat-, streetwear-, cipő- és lifestyle márkáknak'},
  food:{description:'Termék- és történetközpontú gasztro webshop, ajándékozási és inspirációs tartalmakhoz is.',audience:'delikát, specialty food, italmentes gasztro és ajándék márkáknak'},
  gaming:{description:'Karakteres gaming storefront, kiemelt megjelenésekkel, kompatibilitási és termékfelfedezési blokkokkal.',audience:'gaming, periféria, merch és digitális kultúra webshopoknak'},
  home:{description:'Tágas, vizuális enteriőr- és lakberendezési webshop, nagy képekre és kollekciókra optimalizálva.',audience:'bútor-, dekor-, lakberendezési és design márkáknak'},
  industrial:{description:'Specifikáció- és döntéstámogatás-központú kereskedelmi felület professzionális termékekhez.',audience:'szerszám-, műszaki-, ipari és B2B kereskedőknek'},
  jewelry:{description:'Prémium, részletgazdag termékbemutatás ékszerhez, órához és magasabb értékű kiegészítőkhöz.',audience:'ékszer-, óra-, prémium kiegészítő és luxury márkáknak'},
  outdoor:{description:'Élmény- és felhasználási helyzet-központú outdoor storefront felszerelések és kalandok bemutatására.',audience:'outdoor, túra, utazás, kemping és aktív lifestyle márkáknak'},
  pet:{description:'Barátságos, profil- és igényközpontú kisállat webshop termékajánláshoz és edukációhoz.',audience:'kisállat-eledel, felszerelés és pet-care webshopoknak'},
  sport:{description:'Teljesítmény- és felhasználásközpontú sport storefront termékválasztáshoz és kollekciókhoz.',audience:'sport-, fitness-, csapat- és teljesítményorientált márkáknak'},
  tech:{description:'Specifikáció- és összehasonlításbarát technológiai storefront összetettebb termékkínálathoz.',audience:'elektronikai, creator, mobil-, PC- és technológiai webshopoknak'},
};

const PRO_PROFILES:Record<string,ProProfile>={
  beauty:{summary:'A Pro irány több személyre szabást és automatizált merchandisingot ad, nem „szebb skint”.',highlights:['személyre szabott termék- és rutinajánlás','fejlettebb kampány- és upsell blokkok','CRM/automatizálás alapú utánkövetés']},
  fashion:{summary:'A Pro változat a look-alapú értékesítést és fejlettebb merchandisingot erősíti.',highlights:['Shop the Look / Complete the Look','személyre szabott ajánlók és cross-sell','fejlettebb promóciós és kollekciós merchandising']},
  food:{summary:'A Pro változat inspirációból közvetlenebb vásárlási útvonalat és automatizálást ad.',highlights:['receptből kosárba jellegű vásárlási flow','összeállítások, bundle és cross-sell','fejlettebb kampány- és automatizálási lehetőségek']},
  gaming:{summary:'A Pro változat összetettebb termékválasztást és konverziós segédleteket ad.',highlights:['összehasonlítás és kompatibilitási segédletek','sticky cart, upsell és bundle blokkok','személyre szabott ajánlók']},
  home:{summary:'A Pro változat a teljes enteriőr és összeállítás megvásárlását támogatja.',highlights:['Shop the Room / komplett összeállítás','anyag- és színvariánsok erősebb bemutatása','set shopping és fejlettebb ajánlások'],optionalAddOns:['AR / térbe helyezés külön prémium add-onként']},
  industrial:{summary:'A Pro irány B2B és döntéstámogató kereskedelmi folyamatokkal bővíthető.',highlights:['B2B ügyfél- és CRM folyamatok','beszerzéshez és nagyobb rendelésekhez kapcsolódó workflow-k','haladó integráció és API-kapcsolatok']},
  jewelry:{summary:'A Pro változat a részletgazdag termékbemutatást és magas értékű döntéstámogatást erősíti.',highlights:['360° termékforgatás / több nézet','nagyítás és részletfókusz','összehasonlítás és prémium merchandising'],optionalAddOns:['haladó 3D, hotspotok, robbantott nézet vagy AR külön add-onként']},
  outdoor:{summary:'A Pro változat útvonal- és felhasználási helyzet alapján segíti a felszerelésválasztást.',highlights:['kaland/útvonal alapú termékfelfedezés','felszerelés-csomagok és cross-sell','személyre szabott ajánlók és kampányblokkok']},
  pet:{summary:'A Pro változat több profilalapú személyre szabást és utánkövetést ad.',highlights:['profilalapú személyre szabott ajánlás','újravásárlási és automatizált utánkövetési flow','fejlettebb cross-sell és csomagajánlatok']},
  sport:{summary:'A Pro változat erősebb választási támogatást és teljesítményorientált merchandisingot ad.',highlights:['termék-összehasonlítás és választási segédlet','bundle / teljes felszerelés ajánlás','személyre szabott és kampányalapú ajánlók']},
  tech:{summary:'A Pro változat összetettebb specifikációs döntést és prémium termékbemutatást támogat.',highlights:['összehasonlítás és kompatibilitási segédlet','360°/többnézetes termékbemutatás ahol releváns','személyre szabott ajánlók, upsell és sticky cart'],optionalAddOns:['haladó 3D / robbantott nézet / AR külön add-onként']},
};

const TEMPLATE_DESCRIPTIONS:Record<string,string>={
  'beauty.beauty-lab':'Laborhangulatú, edukációs beauty storefront összetevő-, rutin- és termékfelfedezési blokkokkal.',
  'beauty.derma-studio':'Letisztult dermakozmetikai irány, concern → routine → active → product gondolkodással, diagnosztikai állítások nélkül.',
  'beauty.ritual-house':'Hangulat- és rituáléalapú wellness storefront illat-, format- és termékfelfedezéshez, egészségügyi állítások nélkül.',
  'fashion.editorial-atelier':'Magazinjellegű, elegáns editorial divatélmény kollekciókhoz, történetmeséléshez és kampányokhoz.',
  'fashion.monarche':'Prémium, kifinomult fashion storefront erős hero-, kollekció- és editorial történetvezetéssel.',
  'fashion.street-drop':'Streetwear és sneaker fókuszú, energikus drop-központú storefront új megjelenésekhez és limitált kollekciókhoz.',
  'food.market-pantry':'Piac- és kamrahangulatú gasztro storefront specialty termékek, történetek és válogatások bemutatására.',
  'food.table-gift':'Ajándékozás- és asztalközpontú gasztro storefront csomagokhoz, alkalmakhoz és céges ajándékozáshoz.',
  'gaming.loot-vault':'Drop-, preorder- és gyűjtői hangulatú gaming storefront erős kiemelésekkel és termékfelfedezéssel.',
  'gaming.playroom':'Játékosabb, könnyebben böngészhető gaming storefront platform-, kompatibilitási és kollekciós tartalmakkal.',
  'gaming.rig-forge':'PC- és setup-orientált gaming storefront technikai választáshoz, komponensekhez és konfigurációs tartalmakhoz.',
  'home.gallery-edit':'Galériaszerű, editorial lakberendezési storefront nagy képekkel, kollekciókkal és tér-inspirációval.',
  'industrial.tool-depot':'Professzionális, specifikációközpontú műszaki storefront cikkszám-, készlet- és döntéstámogató információkhoz.',
  'jewelry.heritage-atelier':'Örökség- és kézműves karakterű prémium ékszer storefront történetmeséléssel és részletfókusszal.',
  'jewelry.modern-luxe':'Modern luxury storefront rétegzett hero-val, elegáns kollekcióvezetéssel és prémium termékprezentációval.',
  'jewelry.statement-lab':'Merészebb, statement darabokra épülő ékszer storefront vizuális fókuszú kollekciókhoz.',
  'outdoor.alpine-lodge':'Meleg, természetes lodge-hangulatú prémium outdoor storefront anyag-, környezet- és felszerelésfókusszal.',
  'pet.my-pack':'Profil- és élethelyzetközpontú kisállat storefront személyesebb termékfelfedezéshez és gondozási tartalmakhoz.',
  'sport.performance-lab':'Mérhető teljesítmény és technikai termékválasztás köré épülő sport storefront.',
  'sport.sport-hub':'Általánosabb sport marketplace irány kategória-, kollekció- és aktivitásközpontú böngészéshez.',
  'sport.trail-expedition':'Trail és expedition fókuszú, útvonal- és felszerelésközpontú outdoor-sport storefront.',
  'tech.creator-station':'Creator és workstation fókuszú tech storefront setupokhoz, eszközcsomagokhoz és szakmai termékválasztáshoz.',
  'tech.spec-lab':'Specifikáció- és kompatibilitásközpontú tech storefront részletes összevetéshez és tudatos választáshoz.',
  'tech.tech-deck':'Modern, általános technológiai storefront erős termék-, kategória- és specifikációs prezentációval.',
};

const humanize=(value:string)=>value.split('.').at(-1)?.split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ')??value;
const strings=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&item.trim().length>0):[];

export function listStorefrontTemplateLibraryEntries():readonly StorefrontTemplateLibraryEntry[]{
  return STOREFRONT_TEMPLATE_CATALOG.map(entry=>{
    const template=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
    const home=template?.pages.find(page=>page.pageType==='home')??template?.pages[0];
    const category=entry.category.toLowerCase();
    const categoryProfile=CATEGORY_PROFILES[category]??{description:'Szerkeszthető, reszponzív Shoperation storefront sablon.',audience:'általános webshopoknak'};
    const pro=PRO_PROFILES[category]??{summary:'A Pro változat funkcionalitásban bővebb, nem vizuális minőségben.',highlights:['fejlettebb merchandising','személyre szabás és automatizálás','Pro csomaghoz kötött üzleti képességek']};
    const metadataHighlights=strings(home?.metadata?.sectionOrder).slice(0,4);
    const fallbackHighlights=(home?.sections??[]).slice(0,4).map(section=>humanize(section.componentKey));
    return Object.freeze({
      ...entry,
      displayName:humanize(entry.templateKey),
      categoryLabel:CATEGORY_LABELS[category]??humanize(category),
      description:TEMPLATE_DESCRIPTIONS[entry.templateKey]??categoryProfile.description,
      audience:categoryProfile.audience,
      highlights:Object.freeze(metadataHighlights.length?metadataHighlights:fallbackHighlights),
      previewPageKey:home?.pageKey??null,
      proComparison:Object.freeze({
        status:entry.minPlan==='pro'?'available' as const:'planned' as const,
        summary:pro.summary,
        highlights:Object.freeze([...pro.highlights]),
        optionalAddOns:Object.freeze([...(pro.optionalAddOns??[])]),
      }),
    });
  });
}
