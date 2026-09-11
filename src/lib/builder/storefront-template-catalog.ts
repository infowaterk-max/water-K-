import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {ALPINE_LODGE_TEMPLATE_PACKAGE} from '@/lib/builder/templates/alpine-lodge';
import {BEAUTY_LAB_TEMPLATE_PACKAGE} from '@/lib/builder/templates/beauty-lab';
import {CREATOR_STATION_TEMPLATE_PACKAGE} from '@/lib/builder/templates/creator-station';
import {DERMA_STUDIO_TEMPLATE_PACKAGE} from '@/lib/builder/templates/derma-studio';
import {EDITORIAL_ATELIER_TEMPLATE_PACKAGE} from '@/lib/builder/templates/editorial-atelier';
import {GALLERY_EDIT_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gallery-edit';
import {HERITAGE_ATELIER_TEMPLATE_PACKAGE} from '@/lib/builder/templates/heritage-atelier';
import {LOOT_VAULT_TEMPLATE_PACKAGE} from '@/lib/builder/templates/loot-vault';
import {MARKET_PANTRY_TEMPLATE_PACKAGE} from '@/lib/builder/templates/market-pantry';
import {MODERN_LUXE_TEMPLATE_PACKAGE} from '@/lib/builder/templates/modern-luxe';
import {MONARCHE_TEMPLATE_PACKAGE} from '@/lib/builder/templates/monarche';
import {MY_PACK_TEMPLATE_PACKAGE} from '@/lib/builder/templates/my-pack';
import {PERFORMANCE_LAB_TEMPLATE_PACKAGE} from '@/lib/builder/templates/performance-lab';
import {PLAYROOM_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom';
import {RIG_FORGE_TEMPLATE_PACKAGE} from '@/lib/builder/templates/rig-forge';
import {RITUAL_HOUSE_TEMPLATE_PACKAGE} from '@/lib/builder/templates/ritual-house';
import {SPEC_LAB_TEMPLATE_PACKAGE} from '@/lib/builder/templates/spec-lab';
import {SPORT_HUB_TEMPLATE_PACKAGE} from '@/lib/builder/templates/sport-hub';
import {STATEMENT_LAB_TEMPLATE_PACKAGE} from '@/lib/builder/templates/statement-lab';
import {STREET_DROP_TEMPLATE_PACKAGE} from '@/lib/builder/templates/street-drop';
import {TABLE_GIFT_TEMPLATE_PACKAGE} from '@/lib/builder/templates/table-gift';
import {TECH_DECK_TEMPLATE_PACKAGE} from '@/lib/builder/templates/tech-deck';
import {TOOL_DEPOT_TEMPLATE_PACKAGE} from '@/lib/builder/templates/tool-depot';
import {TRAIL_EXPEDITION_TEMPLATE_PACKAGE} from '@/lib/builder/templates/trail-expedition';
import {WARM_MINIMAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/warm-minimal';

export const STOREFRONT_TEMPLATE_CATALOG_VERSION='shoporation.storefront-template-catalog.block21.v1' as const;
export const STOREFRONT_TEMPLATE_LAUNCH_TARGET=42 as const;

function normalizeLegacyTemplatePage(page:StorefrontPageDocument):StorefrontPageDocument{
  const ids=new Set<string>();
  const normalizeNode=(node:StorefrontComponentNode):StorefrontComponentNode=>{
    let id=node.id;
    let suffix=2;
    while(ids.has(id))id=`${node.id}--${suffix++}`;
    ids.add(id);

    const config:{[key:string]:unknown}={...node.config};
    const bindings=node.bindings?Object.fromEntries(Object.entries(node.bindings).map(([slot,binding])=>[
      slot,
      binding.path==='wishlist.items'?{...binding,path:'context.favorites'}:binding,
    ])):undefined;

    let normalizedBindings=bindings;
    if(node.componentKey==='commerce.review-summary'){
      const legacyLabel=typeof config.label==='string'?config.label:typeof config.title==='string'?config.title:'Vásárlói értékelések';
      config.label=legacyLabel;
      delete config.title;
      delete config.summary;
      delete config.href;
      normalizedBindings={
        ...(bindings??{}),
        label:bindings?.label??{path:'reviews.label',fallback:legacyLabel},
      };
      delete normalizedBindings.summary;
      delete normalizedBindings.href;
    }

    return{
      ...node,
      id,
      config,
      ...(normalizedBindings?{bindings:normalizedBindings}:{}),
      ...(node.children?{children:node.children.map(normalizeNode)}:{}),
    };
  };
  return{...page,sections:page.sections.map(normalizeNode)};
}

function normalizeLegacyTemplatePackage(template:StorefrontInstallableTemplatePackage):StorefrontInstallableTemplatePackage{
  return{
    ...template,
    pages:template.pages.map(normalizeLegacyTemplatePage),
  };
}

/**
 * Only concrete source-controlled packages may enter this catalog. The accepted
 * 42-template launch target is tracked separately so missing packages can never
 * be silently fabricated to satisfy cardinality.
 *
 * Legacy source packages are normalized at this single catalog boundary before
 * preview or installation. The runtime validator remains fail-closed; this
 * compatibility bridge only repairs known historical contract drift (duplicate
 * node ids and legacy binding shapes) without creating a second schema authority.
 */
export const STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES:readonly StorefrontInstallableTemplatePackage[]=[
  ALPINE_LODGE_TEMPLATE_PACKAGE,
  BEAUTY_LAB_TEMPLATE_PACKAGE,
  CREATOR_STATION_TEMPLATE_PACKAGE,
  DERMA_STUDIO_TEMPLATE_PACKAGE,
  EDITORIAL_ATELIER_TEMPLATE_PACKAGE,
  GALLERY_EDIT_TEMPLATE_PACKAGE,
  HERITAGE_ATELIER_TEMPLATE_PACKAGE,
  LOOT_VAULT_TEMPLATE_PACKAGE,
  MARKET_PANTRY_TEMPLATE_PACKAGE,
  MODERN_LUXE_TEMPLATE_PACKAGE,
  MONARCHE_TEMPLATE_PACKAGE,
  MY_PACK_TEMPLATE_PACKAGE,
  PERFORMANCE_LAB_TEMPLATE_PACKAGE,
  PLAYROOM_TEMPLATE_PACKAGE,
  RIG_FORGE_TEMPLATE_PACKAGE,
  RITUAL_HOUSE_TEMPLATE_PACKAGE,
  SPEC_LAB_TEMPLATE_PACKAGE,
  SPORT_HUB_TEMPLATE_PACKAGE,
  STATEMENT_LAB_TEMPLATE_PACKAGE,
  STREET_DROP_TEMPLATE_PACKAGE,
  TABLE_GIFT_TEMPLATE_PACKAGE,
  TECH_DECK_TEMPLATE_PACKAGE,
  TOOL_DEPOT_TEMPLATE_PACKAGE,
  TRAIL_EXPEDITION_TEMPLATE_PACKAGE,
  WARM_MINIMAL_TEMPLATE_PACKAGE,
].map(normalizeLegacyTemplatePackage);

const identity=(template:StorefrontInstallableTemplatePackage)=>`${template.manifest.templateKey}@${template.manifest.templateVersion}`;

function validateConcreteCatalog(packages:readonly StorefrontInstallableTemplatePackage[]){
  const identities=new Set<string>();
  for(const template of packages){
    const key=identity(template);
    if(identities.has(key))throw new Error('STOREFRONT_TEMPLATE_CATALOG_DUPLICATE');
    identities.add(key);
    if(template.pages.length!==template.manifest.pageTypes.length)throw new Error('STOREFRONT_TEMPLATE_CATALOG_PAGE_COVERAGE_MISMATCH');
    const pageTypes=new Set(template.pages.map(page=>page.pageType));
    for(const pageType of template.manifest.pageTypes){
      if(!pageTypes.has(pageType))throw new Error('STOREFRONT_TEMPLATE_CATALOG_PAGE_PRESET_MISSING');
    }
  }
}

validateConcreteCatalog(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES);

export type StorefrontTemplateCatalogEntry={
  templateKey:string;
  templateVersion:number;
  category:string;
  minPlan:StorefrontInstallableTemplatePackage['manifest']['minPlan'];
  requiredFeatures:readonly string[];
  pageTypes:StorefrontInstallableTemplatePackage['manifest']['pageTypes'];
  pagePresetCount:number;
  responsive:{desktop:true;tablet:true;mobile:true};
  demoNamespace:string;
};

export const STOREFRONT_TEMPLATE_CATALOG:readonly StorefrontTemplateCatalogEntry[]=Object.freeze(
  STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES
    .map(template=>Object.freeze({
      templateKey:template.manifest.templateKey,
      templateVersion:template.manifest.templateVersion,
      category:template.manifest.templateKey.split('.')[0]??'unknown',
      minPlan:template.manifest.minPlan,
      requiredFeatures:[...template.manifest.requiredFeatures],
      pageTypes:template.manifest.pageTypes,
      pagePresetCount:template.pages.length,
      responsive:template.manifest.responsive,
      demoNamespace:template.manifest.demoContent.namespace,
    }))
    .sort((a,b)=>a.templateKey.localeCompare(b.templateKey)||a.templateVersion-b.templateVersion),
);

export const STOREFRONT_TEMPLATE_PORTFOLIO_STATUS=Object.freeze({
  launchTarget:STOREFRONT_TEMPLATE_LAUNCH_TARGET,
  implemented:STOREFRONT_TEMPLATE_CATALOG.length,
  remaining:Math.max(0,STOREFRONT_TEMPLATE_LAUNCH_TARGET-STOREFRONT_TEMPLATE_CATALOG.length),
  fabricatedEntriesAllowed:false,
});

export function getStorefrontTemplatePackage(templateKey:string,templateVersion?:number):StorefrontInstallableTemplatePackage|undefined{
  const candidates=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.filter(template=>template.manifest.templateKey===templateKey);
  if(!candidates.length)return undefined;
  if(templateVersion!==undefined)return candidates.find(template=>template.manifest.templateVersion===templateVersion);
  return candidates.reduce((latest,current)=>current.manifest.templateVersion>latest.manifest.templateVersion?current:latest);
}