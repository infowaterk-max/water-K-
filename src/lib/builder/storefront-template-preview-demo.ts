import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

import {ALPINE_LODGE_DESIGN_TOKENS} from '@/lib/builder/templates/alpine-lodge';
import {BEAUTY_LAB_DESIGN_TOKENS} from '@/lib/builder/templates/beauty-lab';
import {CREATOR_STATION_DESIGN_TOKENS} from '@/lib/builder/templates/creator-station';
import {DERMA_STUDIO_DESIGN_TOKENS} from '@/lib/builder/templates/derma-studio';
import {EDITORIAL_ATELIER_DESIGN_TOKENS} from '@/lib/builder/templates/editorial-atelier';
import {GALLERY_EDIT_DESIGN_TOKENS} from '@/lib/builder/templates/gallery-edit';
import {HERITAGE_ATELIER_DESIGN_TOKENS} from '@/lib/builder/templates/heritage-atelier';
import {LOOT_VAULT_DESIGN_TOKENS} from '@/lib/builder/templates/loot-vault';
import {MARKET_PANTRY_DESIGN_TOKENS} from '@/lib/builder/templates/market-pantry';
import {MODERN_LUXE_DESIGN_TOKENS} from '@/lib/builder/templates/modern-luxe';
import {MONARCHE_DESIGN_TOKENS} from '@/lib/builder/templates/monarche';
import {MY_PACK_DESIGN_TOKENS} from '@/lib/builder/templates/my-pack';
import {PERFORMANCE_LAB_DESIGN_TOKENS} from '@/lib/builder/templates/performance-lab';
import {PLAYROOM_DESIGN_TOKENS} from '@/lib/builder/templates/playroom';
import {RIG_FORGE_DESIGN_TOKENS} from '@/lib/builder/templates/rig-forge';
import {RITUAL_HOUSE_DESIGN_TOKENS} from '@/lib/builder/templates/ritual-house';
import {SPEC_LAB_DESIGN_TOKENS} from '@/lib/builder/templates/spec-lab';
import {SPORT_HUB_DESIGN_TOKENS} from '@/lib/builder/templates/sport-hub';
import {STATEMENT_LAB_DESIGN_TOKENS} from '@/lib/builder/templates/statement-lab';
import {STREET_DROP_DESIGN_TOKENS} from '@/lib/builder/templates/street-drop';
import {TABLE_GIFT_DESIGN_TOKENS} from '@/lib/builder/templates/table-gift';
import {TECH_DECK_DESIGN_TOKENS} from '@/lib/builder/templates/tech-deck';
import {TOOL_DEPOT_DESIGN_TOKENS} from '@/lib/builder/templates/tool-depot';
import {TRAIL_EXPEDITION_DESIGN_TOKENS} from '@/lib/builder/templates/trail-expedition';

export const STOREFRONT_TEMPLATE_PREVIEW_DEMO_VERSION='shoporation.storefront-template-preview-demo.v1' as const;

const PREVIEW_THEME_BY_TEMPLATE:Record<string,Readonly<Record<string,string>>>=Object.freeze({
  'outdoor.alpine-lodge':ALPINE_LODGE_DESIGN_TOKENS,
  'beauty.beauty-lab':BEAUTY_LAB_DESIGN_TOKENS,
  'tech.creator-station':CREATOR_STATION_DESIGN_TOKENS,
  'beauty.derma-studio':DERMA_STUDIO_DESIGN_TOKENS,
  'fashion.editorial-atelier':EDITORIAL_ATELIER_DESIGN_TOKENS,
  'home.gallery-edit':GALLERY_EDIT_DESIGN_TOKENS,
  'jewelry.heritage-atelier':HERITAGE_ATELIER_DESIGN_TOKENS,
  'gaming.loot-vault':LOOT_VAULT_DESIGN_TOKENS,
  'food.market-pantry':MARKET_PANTRY_DESIGN_TOKENS,
  'jewelry.modern-luxe':MODERN_LUXE_DESIGN_TOKENS,
  'fashion.monarche':MONARCHE_DESIGN_TOKENS,
  'pet.my-pack':MY_PACK_DESIGN_TOKENS,
  'sport.performance-lab':PERFORMANCE_LAB_DESIGN_TOKENS,
  'gaming.playroom':PLAYROOM_DESIGN_TOKENS,
  'gaming.rig-forge':RIG_FORGE_DESIGN_TOKENS,
  'beauty.ritual-house':RITUAL_HOUSE_DESIGN_TOKENS,
  'tech.spec-lab':SPEC_LAB_DESIGN_TOKENS,
  'sport.sport-hub':SPORT_HUB_DESIGN_TOKENS,
  'jewelry.statement-lab':STATEMENT_LAB_DESIGN_TOKENS,
  'fashion.street-drop':STREET_DROP_DESIGN_TOKENS,
  'food.table-gift':TABLE_GIFT_DESIGN_TOKENS,
  'tech.tech-deck':TECH_DECK_DESIGN_TOKENS,
  'industrial.tool-depot':TOOL_DEPOT_DESIGN_TOKENS,
  'sport.trail-expedition':TRAIL_EXPEDITION_DESIGN_TOKENS,
});

const CATEGORY_LABELS:Record<string,string>={
  beauty:'Beauty',fashion:'Fashion',food:'Market',gaming:'Gaming',home:'Home',industrial:'Pro',jewelry:'Luxe',outdoor:'Outdoor',pet:'Pet',sport:'Sport',tech:'Tech',
};

const CATEGORY_PRODUCTS:Record<string,readonly string[]>={
  beauty:['Cloud Serum','Silk Cream','Mineral Mist','Daily Balm'],
  fashion:['Studio Jacket','Signature Knit','Modern Trouser','Essential Tee'],
  food:['Curated Box','House Selection','Seasonal Set','Table Favourite'],
  gaming:['Core Edition','Pro Controller','Vault Headset','Desk Essential'],
  home:['Lounge Chair','Oak Table','Soft Lamp','Woven Textile'],
  industrial:['Pro Drill','Precision Set','Workshop Case','Safety Kit'],
  jewelry:['Signature Ring','Sculpted Cuff','Classic Watch','Fine Pendant'],
  outdoor:['Trail Shell','Camp Pack','Alpine Layer','Field Bottle'],
  pet:['Daily Bowl','Walk Set','Soft Bed','Care Kit'],
  sport:['Performance Shoe','Training Layer','Recovery Kit','Club Essential'],
  tech:['Studio One','Creator Pro','Core Device','Desk Dock'],
};

const CATEGORY_COLLECTIONS:Record<string,readonly string[]>={
  beauty:['Rutinok','Újdonságok','Összetevők','Best seller'],
  fashion:['New season','Essentials','Editorial edit','Accessories'],
  food:['Ajándék','Kamra','Szezonális','Válogatások'],
  gaming:['New releases','Setup','Accessories','Collector'],
  home:['Living','Dining','Lighting','Objects'],
  industrial:['Szerszámok','Mérés','Műhely','Védelem'],
  jewelry:['New Icons','Fine Edit','Timepieces','Gifts'],
  outdoor:['Trail','Camp','Layers','Travel'],
  pet:['Kutya','Macska','Etetés','Gondozás'],
  sport:['Running','Training','Outdoor','Team'],
  tech:['Creator','Mobile','Desk setup','Accessories'],
};

const clone=<T>(value:T):T=>structuredClone(value);
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function setPath(target:Record<string,unknown>,path:string,value:unknown){
  const parts=path.split('.');
  if(parts.length<2)return;
  let cursor=target;
  for(const part of parts.slice(0,-1)){
    const current=cursor[part];
    if(!isRecord(current))cursor[part]={};
    cursor=cursor[part] as Record<string,unknown>;
  }
  const final=parts.at(-1)!;
  if(cursor[final]===undefined)cursor[final]=clone(value);
}

function collectImageFallbacks(page:StorefrontPageDocument):string[]{
  const images:string[]=[];
  const visit=(node:StorefrontComponentNode)=>{
    for(const key of ['src','image','backgroundImage']){
      const value=node.config[key];
      if(typeof value==='string'&&value.startsWith('/')&&!images.includes(value))images.push(value);
    }
    for(const child of node.children??[])visit(child);
  };
  for(const section of page.sections)visit(section);
  return images;
}

function fixtureNames(template:StorefrontInstallableTemplatePackage,type:'product'|'collection'){
  return(template.demoFixtures??[])
    .filter(item=>item.entityType===type)
    .map(item=>{
      const name=item.payload.name??item.payload.title??item.payload.label;
      return typeof name==='string'&&name.trim()?name.trim():item.entityKey.split(/[._-]/).map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');
    });
}

function demoProducts(template:StorefrontInstallableTemplatePackage,page:StorefrontPageDocument){
  const category=template.manifest.templateKey.split('.')[0]??'tech';
  const fixture=fixtureNames(template,'product');
  const fallback=CATEGORY_PRODUCTS[category]??CATEGORY_PRODUCTS.tech;
  const names=[...fixture,...fallback].slice(0,4);
  const images=collectImageFallbacks(page);
  return names.map((name,index)=>({
    id:`preview-product-${index+1}`,
    name,
    href:'#preview-demo',
    image:images[index%Math.max(1,images.length)]??null,
    imageAlt:`${name} bemutató termékkép`,
    price:12990+index*7000,
    compareAtPrice:index===1?24990:null,
    badge:index===0?'Kiemelt':index===2?'Új': '',
    stockLabel:index===3?'Limitált készlet':'Raktáron',
  }));
}

function demoCollections(template:StorefrontInstallableTemplatePackage,page:StorefrontPageDocument){
  const category=template.manifest.templateKey.split('.')[0]??'tech';
  const fixture=fixtureNames(template,'collection');
  const fallback=CATEGORY_COLLECTIONS[category]??CATEGORY_COLLECTIONS.tech;
  const labels=[...fixture,...fallback].slice(0,4);
  const images=collectImageFallbacks(page);
  return labels.map((label,index)=>({
    id:`preview-collection-${index+1}`,
    label,
    title:label,
    href:'#preview-demo',
    image:images[index%Math.max(1,images.length)]??null,
    imageAlt:`${label} bemutató kollekció`,
    copy:'Szerkeszthető bemutató tartalom a sablon vizuális karakterének megmutatásához.',
  }));
}

const demoReviews=()=>[
  {id:'review-1',name:'Anna',author:'Anna',rating:5,title:'Nagyon átlátható',copy:'A bemutató nézet azt mutatja meg, hogyan működik a sablon feltöltött tartalommal.'},
  {id:'review-2',name:'Márk',author:'Márk',rating:5,title:'Prémium megjelenés',copy:'A saját webshopban ezek helyére a valódi vásárlói adatok kerülnek.'},
  {id:'review-3',name:'Dóra',author:'Dóra',rating:4.8,title:'Jól böngészhető',copy:'Reszponzív elrendezés és szerkeszthető blokkok ugyanazon storefront motoron.'},
];

function genericItems(template:StorefrontInstallableTemplatePackage,page:StorefrontPageDocument){
  const collections=demoCollections(template,page);
  return collections.map((item,index)=>({
    ...item,
    value:item.label.toLowerCase().replace(/\s+/g,'-'),
    eyebrow:index%2?'Felfedezés':'Kiemelt',
    description:item.copy,
    badge:index===0?'Ajánlott':'',
    available:true,
    selected:index===0,
  }));
}

function valueForBinding(input:{template:StorefrontInstallableTemplatePackage;page:StorefrontPageDocument;node:StorefrontComponentNode;slot:string;fallback:unknown}){
  const{template,page,node,slot,fallback}=input;
  const products=demoProducts(template,page);
  const collections=demoCollections(template,page);
  const items=genericItems(template,page);
  const key=node.componentKey;

  if(slot==='products'||key==='commerce.product-grid'||key==='commerce.recommendation-row')return products;
  if(slot==='items'){
    if(key==='commerce.collection-navigation')return collections;
    if(key.includes('review'))return demoReviews();
    return items;
  }
  if(slot==='reviews')return demoReviews();
  if(slot==='options')return items.map((item,index)=>({id:item.id,label:item.label,value:item.value,href:'#preview-demo',available:true,selected:index===0,swatch:index===0?'#1f1f1f':index===1?'#d9c1aa':'#8ea69b'}));
  if(slot==='images')return collectImageFallbacks(page).slice(0,4).map((src,index)=>({src,alt:`Bemutató kép ${index+1}`}));
  if(slot==='rating')return 4.9;
  if(slot==='count')return 128;
  if(slot==='stockLabel')return'Raktáron';
  if(slot==='price')return 29990;
  if(slot==='compareAtPrice')return 34990;
  if(slot==='badges')return['Kiemelt','Bemutató'];
  if(slot==='columns'&&Array.isArray(fallback))return collections;
  if(Array.isArray(fallback)&&fallback.length===0)return items;
  return fallback;
}

function enrichNodeBindings(input:{template:StorefrontInstallableTemplatePackage;page:StorefrontPageDocument;node:StorefrontComponentNode;context:Record<string,unknown>}){
  const{template,page,node,context}=input;
  for(const[slot,binding]of Object.entries(node.bindings??{})){
    const fallback=Object.prototype.hasOwnProperty.call(binding,'fallback')?binding.fallback:node.config[slot];
    const value=valueForBinding({template,page,node,slot,fallback});
    if(value!==undefined)setPath(context,binding.path,value);
  }
  for(const child of node.children??[])enrichNodeBindings({template,page,node:child,context});
}

export function getStorefrontTemplatePreviewTheme(templateKey:string):Readonly<Record<string,string>>{
  return PREVIEW_THEME_BY_TEMPLATE[templateKey]??Object.freeze({
    '--shoporation-color-background':'#ffffff',
    '--shoporation-color-surface':'#f6f6f2',
    '--shoporation-color-surface-muted':'#ecece6',
    '--shoporation-color-text':'#171717',
    '--shoporation-color-muted-text':'#626262',
    '--shoporation-color-border':'#d9d9d2',
    '--shoporation-color-primary':'#171717',
    '--shoporation-color-primary-contrast':'#ffffff',
    '--shoporation-color-accent':'#2f7f6f',
    '--shoporation-heading-font':'Georgia, serif',
    '--shoporation-body-font':'Arial, sans-serif',
  });
}

export function createStorefrontTemplatePreviewBindingContext(input:{template:StorefrontInstallableTemplatePackage;page:StorefrontPageDocument}):Record<string,unknown>{
  const{template,page}=input;
  const category=template.manifest.templateKey.split('.')[0]??'shop';
  const label=CATEGORY_LABELS[category]??'Shop';
  const context:Record<string,unknown>={
    brand:{name:`${label} Demo`,tagline:'Shoperation sablonbemutató',homeHref:'/',copyright:`© ${label} Demo`},
    navigation:{
      primary:[{label:'Újdonságok',href:'#preview-demo'},{label:'Kollekciók',href:'#preview-demo'},{label:'Rólunk',href:'#preview-demo'},{label:'Kapcsolat',href:'#preview-demo'}],
      footer:[{id:'shop',title:'Vásárlás',items:[{label:'Újdonságok',href:'#preview-demo'},{label:'Kategóriák',href:'#preview-demo'}]},{id:'help',title:'Segítség',items:[{label:'GYIK',href:'#preview-demo'},{label:'Kapcsolat',href:'#preview-demo'}]}],
    },
    catalog:{featured:demoProducts(template,page),newProducts:demoProducts(template,page),collections:demoCollections(template,page)},
    recommendations:{featured:demoProducts(template,page)},
    reviews:{summary:{rating:4.9,count:128},items:demoReviews()},
    inventory:{stockLabel:'Raktáron'},
  };
  for(const node of page.sections)enrichNodeBindings({template,page,node,context});
  return context;
}
