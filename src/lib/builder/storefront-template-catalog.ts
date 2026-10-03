import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {normalizeStorefrontTemplateRuntimeComposition,storefrontCartPresentationViolations} from '@/lib/builder/storefront-template-runtime-normalization';
import {augmentStorefrontTemplateDemoContent,evaluateStorefrontTemplateRouteIntegrity} from '@/lib/builder/storefront-template-route-integrity';
import {STOREFRONT_TEMPLATE_QUALITY_MANIFESTS,assertStorefrontTemplateQualityGate} from '@/lib/builder/storefront-template-quality-gate';
import {materializeStorefrontTemplateResponsiveStyles} from '@/lib/builder/storefront-responsive-isolation';
import {assertStorefrontCookieConsentPreset} from '@/lib/builder/storefront-cookie-consent-presets';
import {LOOT_VAULT_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/loot-vault/v2';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';

export const STOREFRONT_TEMPLATE_CATALOG_VERSION='shoporation.storefront-template-catalog.canonical-v3' as const;
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
  return augmentStorefrontTemplateDemoContent({
    ...template,
    pages:template.pages.map(normalizeLegacyTemplatePage),
  });
}

function normalizeImplementedTemplatePackage(template:StorefrontInstallableTemplatePackage):StorefrontInstallableTemplatePackage{
  const legacyNormalized=normalizeLegacyTemplatePackage(template);
  const runtimeNormalized=augmentStorefrontTemplateDemoContent({
    ...legacyNormalized,
    pages:legacyNormalized.pages.map(normalizeStorefrontTemplateRuntimeComposition),
  });
  // Current/future installable templates are persisted with explicit effective
  // styles for desktop/tablet/mobile. This preserves today's rendering while
  // making later per-viewport Builder edits genuinely isolated instead of
  // depending on implicit base -> desktop -> tablet -> mobile inheritance.
  return materializeStorefrontTemplateResponsiveStyles(runtimeNormalized);
}

/**
 * Active template authority.
 *
 * Only Product Owner accepted, current canonical packages may enter this catalog.
 * Historical/legacy template implementations are intentionally excluded from runtime,
 * preview, installation, AI selection and active portfolio semantics. Their presence
 * elsewhere in Git is source history only and must not make them resolvable.
 */
export const STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES:readonly StorefrontInstallableTemplatePackage[]=[
  PLAYROOM_V20_TEMPLATE_PACKAGE,
  LOOT_VAULT_V2_TEMPLATE_PACKAGE,
].map(normalizeImplementedTemplatePackage);

// Active resolution is deliberately identical to the canonical catalog. Legacy
// packages cannot be resolved by key/version and therefore cannot leak into
// storefront install, preview, Builder or AI-generation flows.
const STOREFRONT_RESOLVABLE_TEMPLATE_PACKAGES:readonly StorefrontInstallableTemplatePackage[]=[
  ...STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,
];

const identity=(template:StorefrontInstallableTemplatePackage)=>`${template.manifest.templateKey}@${template.manifest.templateVersion}`;

function validateConcreteCatalog(packages:readonly StorefrontInstallableTemplatePackage[],options:{enforceCurrentCartContract:boolean;enforceRouteIntegrity:boolean}){
  const identities=new Set<string>();
  for(const template of packages){
    if(options.enforceCurrentCartContract)assertStorefrontCookieConsentPreset(template.manifest.templateKey);
    const key=identity(template);
    if(identities.has(key))throw new Error('STOREFRONT_TEMPLATE_CATALOG_DUPLICATE');
    identities.add(key);
    if(template.pages.length!==template.manifest.pageTypes.length)throw new Error('STOREFRONT_TEMPLATE_CATALOG_PAGE_COVERAGE_MISMATCH');
    const pageTypes=new Set(template.pages.map(page=>page.pageType));
    for(const pageType of template.manifest.pageTypes){
      if(!pageTypes.has(pageType))throw new Error('STOREFRONT_TEMPLATE_CATALOG_PAGE_PRESET_MISSING');
    }
    if(options.enforceRouteIntegrity){
      const routeIssues=evaluateStorefrontTemplateRouteIntegrity(template);
      if(routeIssues.length){
        const first=routeIssues[0]!;
        throw new Error(`STOREFRONT_TEMPLATE_ROUTE_INTEGRITY:${template.manifest.templateKey}@${template.manifest.templateVersion}:${first.code}:${first.href}`);
      }
    }
    if(options.enforceCurrentCartContract){
      for(const page of template.pages){
        if(page.pageType!=='cart')continue;
        const violations=storefrontCartPresentationViolations(page);
        if(violations.length)throw new Error(`STOREFRONT_TEMPLATE_CART_PRESENTATION_CONTRACT:${template.manifest.templateKey}@${template.manifest.templateVersion}:${violations.join(',')}`);
      }
    }
  }
}

for(const quality of STOREFRONT_TEMPLATE_QUALITY_MANIFESTS){
  const template=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.find(item=>item.manifest.templateKey===quality.templateKey);
  if(!template)throw new Error(`STOREFRONT_TEMPLATE_QUALITY_PACKAGE_MISSING:${quality.templateKey}`);
  assertStorefrontTemplateQualityGate({template,manifest:quality});
}

validateConcreteCatalog(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,{enforceCurrentCartContract:true,enforceRouteIntegrity:true});
validateConcreteCatalog(STOREFRONT_RESOLVABLE_TEMPLATE_PACKAGES,{enforceCurrentCartContract:false,enforceRouteIntegrity:false});

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
  const candidates=STOREFRONT_RESOLVABLE_TEMPLATE_PACKAGES.filter(template=>template.manifest.templateKey===templateKey);
  if(!candidates.length)return undefined;
  if(templateVersion!==undefined)return candidates.find(template=>template.manifest.templateVersion===templateVersion);
  return candidates.reduce((latest,current)=>current.manifest.templateVersion>latest.manifest.templateVersion?current:latest);
}
