import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_DEMO_CONTENT_POLICY,
  STOREFRONT_PAGE_SCHEMA_VERSION,
  STOREFRONT_PAGE_TYPES,
  STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  type StorefrontBuilderPageType,
} from '@/lib/builder/storefront-foundation';
import type {FeatureCode,PlanCode} from '@/lib/plans/catalog';
import type {
  StorefrontDemoFixture,
  StorefrontInstallableTemplatePackage,
} from '@/lib/builder/storefront-template-installation';
import type {
  StorefrontComponentNode,
  StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {
  setStorefrontGlobalStyleState,
  type StorefrontGlobalStyleState,
} from '@/lib/builder/storefront-global-styles';
import {
  createStorefrontTemplateShowroomEvidence,
  evaluateStorefrontTemplateShowroomContract,
  type StorefrontShowroomEvidenceRow,
} from '@/lib/builder/storefront-template-route-integrity';

export const STOREFRONT_TEMPLATE_FACTORY_VERSION='shoporation.template-factory-scaffold.v1' as const;

export type StorefrontTemplateFactoryMediaRole='hero'|'category'|'product'|'editorial'|'background'|'decorative';
export type StorefrontTemplateFactoryMediaAspectRatio='1:1'|'4:5'|'16:9'|'3:2'|'free';
export type StorefrontTemplateFactoryMediaAsset={
  key:string;
  state:'planned'|'internal-reference'|'ready';
  role:StorefrontTemplateFactoryMediaRole;
  src:string;
  referenceSrc?:string;
  alt:string;
  pageTypes:readonly StorefrontBuilderPageType[];
  representative:boolean;
  aspectRatio?:StorefrontTemplateFactoryMediaAspectRatio;
};
export type StorefrontTemplateFactoryMediaRequirement={
  role:StorefrontTemplateFactoryMediaRole;
  minCount:number;
  aspectRatio:StorefrontTemplateFactoryMediaAspectRatio;
};
export type StorefrontTemplateFactoryMediaManifest={
  assets:readonly StorefrontTemplateFactoryMediaAsset[];
  requiredRoles:readonly StorefrontTemplateFactoryMediaRole[];
  inheritedFallbackSrc?:string;
  requirements?:readonly StorefrontTemplateFactoryMediaRequirement[];
  minimumRepresentativeMedia:number;
  forbidPlaceholderSvg:boolean;
};

export type StorefrontTemplateFactoryNodePatch={
  pageTypes?:readonly StorefrontBuilderPageType[];
  match:{id?:string;componentKey?:string};
  config?:Readonly<Record<string,unknown>>;
  bindings?:Readonly<Record<string,{path:string;fallback?:unknown}>>;
};

export type StorefrontTemplateFactoryShellRecipe={
  header:Readonly<Record<string,unknown>>;
  headerNode?:StorefrontComponentNode;
  footerNode?:StorefrontComponentNode;
  patches?:readonly StorefrontTemplateFactoryNodePatch[];
};

export type StorefrontTemplateFactoryVisualReference={
  key:string;
  approved:true;
  requiredPageTypes:readonly StorefrontBuilderPageType[];
};

export type StorefrontTemplateFactoryCommerceReadiness={
  productCardPurchaseActions?:{
    pageTypes:readonly StorefrontBuilderPageType[];
  };
};

export type StorefrontTemplateFactoryRecipe={
  category:string;
  templateKey:string;
  displayName:string;
  templateVersion:number;
  minPlan:PlanCode;
  requiredFeatures:readonly FeatureCode[];
  demoNamespace:string;
  globalStyles:StorefrontGlobalStyleState;
  shell:StorefrontTemplateFactoryShellRecipe;
  pageOverrides?:Partial<Record<StorefrontBuilderPageType,StorefrontPageDocument>>;
  nodePatches?:readonly StorefrontTemplateFactoryNodePatch[];
  demoFixtures:readonly StorefrontDemoFixture[];
  media:StorefrontTemplateFactoryMediaManifest;
  reference:StorefrontTemplateFactoryVisualReference;
  commerceReadiness?:StorefrontTemplateFactoryCommerceReadiness;
  productOwnerReview:{internalVisualReviewPassed:boolean};
};

export type StorefrontTemplateFactoryCategoryFoundation={
  category:string;
  foundationTemplateKey:string;
  foundationTemplateVersion:number;
  package:StorefrontInstallableTemplatePackage;
  recommendedOwnedPages:readonly StorefrontBuilderPageType[];
  inheritedPages:readonly StorefrontBuilderPageType[];
  brandTokens?:readonly string[];
  mediaPrefixes?:readonly string[];
  forbiddenLeakTokens?:readonly string[];
};

export type StorefrontTemplateFactoryIssue={
  code:string;
  path:string;
  message:string;
  severity:'error'|'warning';
};

export type StorefrontTemplateFactoryBuild={
  package:StorefrontInstallableTemplatePackage;
  report:{
    factoryVersion:typeof STOREFRONT_TEMPLATE_FACTORY_VERSION;
    foundation:{templateKey:string;templateVersion:number;category:string};
    template:{templateKey:string;templateVersion:number;category:string};
    provenance:{
      compileSource:'template-factory';
      recipeIdentity:string;
      targetTemplateKey:string;
      targetTemplateVersion:number;
      foundationTemplateKey:string;
      foundationTemplateVersion:number;
      referenceKey:string;
    };
    inheritedPageTypes:readonly StorefrontBuilderPageType[];
    overriddenPageTypes:readonly StorefrontBuilderPageType[];
    representativeMediaCount:number;
    technicalRepresentativeMediaCount:number;
    internalReferenceMediaCount:number;
    plannedMediaCount:number;
    showroomEvidence:readonly StorefrontShowroomEvidenceRow[];
    issues:readonly StorefrontTemplateFactoryIssue[];
    technicalReady:boolean;
    productOwnerReady:boolean;
  };
};

const issue=(code:string,path:string,message:string,severity:'error'|'warning'='error'):StorefrontTemplateFactoryIssue=>({code,path,message,severity});
const slug=(value:string)=>value.split('.').at(-1)?.replace(/[^a-z0-9-]+/g,'-')||'template';
const clone=<T>(value:T):T=>structuredClone(value);

function rewriteFoundationBrandTokens<T>(value:T,tokens:readonly string[],displayName:string):T{
  if(!tokens.length)return value;
  let serialized=JSON.stringify(value);
  for(const token of tokens){
    if(token)serialized=serialized.split(token).join(displayName);
  }
  return JSON.parse(serialized) as T;
}

function rewriteFoundationMediaRefs<T>(value:T,prefixes:readonly string[],fallback:string|undefined):T{
  if(!prefixes.length||!fallback)return value;
  const visit=(input:unknown):unknown=>{
    if(typeof input==='string'&&prefixes.some(prefix=>input.startsWith(prefix)))return fallback;
    if(Array.isArray(input))return input.map(visit);
    if(input&&typeof input==='object')return Object.fromEntries(Object.entries(input as Record<string,unknown>).map(([key,item])=>[key,visit(item)]));
    return input;
  };
  return visit(value) as T;
}

function rewriteInternalReferenceMediaRefs<T>(value:T,assets:readonly StorefrontTemplateFactoryMediaAsset[]):T{
  const refs=new Map(assets.filter(asset=>asset.state==='internal-reference'&&asset.referenceSrc).map(asset=>[asset.src,asset.referenceSrc!]));
  if(!refs.size)return value;
  const visit=(input:unknown):unknown=>{
    if(typeof input==='string'&&refs.has(input))return refs.get(input)!;
    if(Array.isArray(input))return input.map(visit);
    if(input&&typeof input==='object')return Object.fromEntries(Object.entries(input as Record<string,unknown>).map(([key,item])=>[key,visit(item)]));
    return input;
  };
  return visit(value) as T;
}

function walk(nodes:readonly StorefrontComponentNode[],visitor:(node:StorefrontComponentNode)=>void):void{
  for(const node of nodes){
    visitor(node);
    if(node.children?.length)walk(node.children,visitor);
  }
}

function rewriteIds(page:StorefrontPageDocument,foundationKey:string,targetKey:string):StorefrontPageDocument{
  const source=slug(foundationKey),target=slug(targetKey);
  const next=clone(page);
  walk(next.sections,node=>{
    if(node.id.startsWith(`${target}-`))return;
    const stripped=node.id.startsWith(`${source}-`)?node.id.slice(source.length+1):node.id;
    const candidate=`${target}-${stripped}`;
    node.id=candidate.length<=128?candidate:`${target}-${stripped.slice(Math.max(0,stripped.length-(127-target.length)))}`;
  });
  return next;
}

function applyPatch(page:StorefrontPageDocument,patch:StorefrontTemplateFactoryNodePatch):number{
  if(patch.pageTypes&&!patch.pageTypes.includes(page.pageType))return 0;
  let count=0;
  walk(page.sections,node=>{
    if(patch.match.id&&node.id!==patch.match.id)return;
    if(patch.match.componentKey&&node.componentKey!==patch.match.componentKey)return;
    if(!patch.match.id&&!patch.match.componentKey)return;
    if(patch.config)node.config={...node.config,...clone(patch.config)};
    if(patch.bindings)node.bindings={...(node.bindings??{}),...clone(patch.bindings)};
    count+=1;
  });
  return count;
}

function pageContains(page:StorefrontPageDocument,value:string):boolean{
  return JSON.stringify(page).includes(value);
}

function evaluateBuild(input:{
  foundation:StorefrontTemplateFactoryCategoryFoundation;
  recipe:StorefrontTemplateFactoryRecipe;
  pkg:StorefrontInstallableTemplatePackage;
  patchMisses:readonly string[];
  overridden:readonly StorefrontBuilderPageType[];
}):StorefrontTemplateFactoryIssue[]{
  const{foundation,recipe,pkg}=input;
  const issues:StorefrontTemplateFactoryIssue[]=[];
  const pageByType=new Map(pkg.pages.map(page=>[page.pageType,page] as const));

  if(recipe.category!==foundation.category)issues.push(issue('FACTORY_CATEGORY_MISMATCH','recipe.category','Template recipe category does not match the selected category foundation.'));
  if(!recipe.templateKey.startsWith(`${recipe.category}.`))issues.push(issue('FACTORY_TEMPLATE_KEY_CATEGORY_MISMATCH','recipe.templateKey','Template key must be namespaced by its category.'));

  for(const pageType of STOREFRONT_PAGE_TYPES){
    const page=pageByType.get(pageType);
    if(!page)issues.push(issue('FACTORY_PAGE_MISSING',`pages.${pageType}`,'Factory output must contain all 14 canonical page types.'));
    else if(page.templateKey!==recipe.templateKey||page.templateVersion!==recipe.templateVersion)issues.push(issue('FACTORY_PAGE_IDENTITY_MISMATCH',`pages.${pageType}`,'Compiled page identity does not match the target template.'));
  }
  if(pkg.pages.length!==STOREFRONT_PAGE_TYPES.length)issues.push(issue('FACTORY_PAGE_CARDINALITY','pages','Factory output must contain exactly 14 canonical pages.'));

  for(const showroom of evaluateStorefrontTemplateShowroomContract(pkg)){
    issues.push(issue(showroom.code,showroom.path,showroom.message,showroom.severity));
  }

  for(const miss of input.patchMisses)issues.push(issue('FACTORY_PATCH_TARGET_MISSING',miss,'A declared factory patch did not match any node.'));

  if(recipe.shell.headerNode&&recipe.shell.footerNode&&pkg.pages.length){
    const headerSignature=JSON.stringify(pkg.pages[0]?.sections[0]??null);
    const footerSignature=JSON.stringify(pkg.pages[0]?.sections.at(-1)??null);
    for(const page of pkg.pages){
      if(JSON.stringify(page.sections[0]??null)!==headerSignature)issues.push(issue('FACTORY_CANONICAL_HEADER_DRIFT',`pages.${page.pageType}.sections[0]`,'Factory output must use one template-owned canonical header across every page.'));
      if(JSON.stringify(page.sections.at(-1)??null)!==footerSignature)issues.push(issue('FACTORY_CANONICAL_FOOTER_DRIFT',`pages.${page.pageType}.sections[-1]`,'Factory output must use one template-owned canonical footer across every page.'));
    }
  }

  const representative=recipe.media.assets.filter(asset=>asset.representative&&asset.state==='ready');
  const technicalRepresentative=recipe.media.assets.filter(asset=>asset.representative&&asset.state!=='planned');
  if(technicalRepresentative.length<recipe.media.minimumRepresentativeMedia){
    issues.push(issue('FACTORY_MEDIA_COVERAGE','media.assets',`Technical representative media count ${technicalRepresentative.length} is below required minimum ${recipe.media.minimumRepresentativeMedia}.`));
  }
  for(const role of recipe.media.requiredRoles){
    if(!technicalRepresentative.some(asset=>asset.role===role))issues.push(issue('FACTORY_MEDIA_ROLE_MISSING',`media.${role}`,'Required representative media role is missing.'));
  }
  for(const requirement of recipe.media.requirements??[]){
    const matching=technicalRepresentative.filter(asset=>asset.role===requirement.role&&(requirement.aspectRatio==='free'||asset.aspectRatio===requirement.aspectRatio));
    if(matching.length<requirement.minCount){
      issues.push(issue(
        'FACTORY_MEDIA_REQUIREMENT_MISSING',
        `media.requirements.${requirement.role}`,
        `Representative media role ${requirement.role} needs at least ${requirement.minCount} asset(s) with ${requirement.aspectRatio} aspect ratio; found ${matching.length}.`,
      ));
    }
  }
  const mediaKeys=new Set<string>();
  for(const[index,asset]of recipe.media.assets.entries()){
    if(asset.state==='ready'&&!asset.src.startsWith('/'))issues.push(issue('FACTORY_READY_MEDIA_NOT_PACKAGE_OWNED',`media.assets[${index}].src`,'Ready template media must be a package-owned local asset so CI can prove the physical file.'));
    if(asset.state==='internal-reference'){
      if(!asset.referenceSrc?.startsWith('https://'))issues.push(issue('FACTORY_INTERNAL_REFERENCE_SOURCE_REQUIRED',`media.assets[${index}].referenceSrc`,'Internal reference media requires an explicit HTTPS reference source for browser QA.'));
      issues.push(issue('FACTORY_MEDIA_FINALIZATION_REQUIRED',`media.assets[${index}]`,'Internal reference media may enter internal browser QA but must be replaced by package-owned ready media before Product Owner preview.'));
    }
    if(mediaKeys.has(asset.key))issues.push(issue('FACTORY_MEDIA_KEY_DUPLICATE',`media.assets[${index}].key`,'Media keys must be unique.'));
    mediaKeys.add(asset.key);
    if(!asset.alt.trim())issues.push(issue('FACTORY_MEDIA_ALT_REQUIRED',`media.assets[${index}].alt`,'Representative media requires meaningful alt text.'));
    if(recipe.media.forbidPlaceholderSvg&&/\.svg(?:\?|$)/i.test(asset.src))issues.push(issue('FACTORY_PLACEHOLDER_SVG_FORBIDDEN',`media.assets[${index}].src`,'Product Owner-ready media manifest may not use SVG placeholders.'));
    for(const pageType of asset.pageTypes){
      const page=pageByType.get(pageType);
      const effectiveSrc=asset.state==='internal-reference'&&asset.referenceSrc?asset.referenceSrc:asset.src;
      if(!page||!pageContains(page,effectiveSrc))issues.push(issue('FACTORY_MEDIA_NOT_WIRED',`media.assets[${index}].pageTypes.${pageType}`,'Declared media asset is not referenced by the compiled target page.'));
    }
  }

  for(const pageType of recipe.reference.requiredPageTypes){
    if(!input.overridden.includes(pageType))issues.push(issue('FACTORY_REFERENCE_PAGE_NOT_OWNED',`reference.requiredPageTypes.${pageType}`,'Reference-critical page must be explicitly owned by the template recipe, not inherited unchanged from the category foundation.'));
  }

  for(const pageType of recipe.commerceReadiness?.productCardPurchaseActions?.pageTypes??[]){
    const page=pageByType.get(pageType);
    if(!page)continue;
    const grids:StorefrontComponentNode[]=[];
    walk(page.sections,node=>{if(node.componentKey==='commerce.product-grid')grids.push(node);});
    if(!grids.length){
      issues.push(issue(
        'FACTORY_PRODUCT_CARD_GRID_REQUIRED',
        `commerceReadiness.productCardPurchaseActions.${pageType}`,
        'This reference requires purchasable product cards, but the compiled page has no commerce.product-grid surface.',
      ));
      continue;
    }
    for(const grid of grids){
      if(grid.config.showPurchaseActions!==true){
        issues.push(issue(
          'FACTORY_PRODUCT_CARD_PURCHASE_ACTION_REQUIRED',
          `pages.${pageType}.${grid.id}`,
          'This Factory recipe requires product cards to expose the shared cart and wishlist purchase surface instead of a details-only card.',
        ));
      }
    }
  }

  const accountPage=pageByType.get('account');
  if(!recipe.pageOverrides?.account){
    issues.push(issue('FACTORY_ACCOUNT_AUTH_TEMPLATE_OWNERSHIP_REQUIRED','pageOverrides.account','Factory templates must own the account page so signed-out auth presentation cannot leak from the category foundation.'));
  }else if(accountPage&&!accountPage.sections.some(section=>(section.config as Record<string,unknown>).authPublic===true)){
    issues.push(issue('FACTORY_ACCOUNT_AUTH_PUBLIC_COMPOSITION_REQUIRED','pageOverrides.account','Template-owned account page must contain an explicit authPublic composition for signed-out authentication.'));
  }

  for(const page of pkg.pages){
    const meta=page.metadata?.templateFactory;
    const record=meta&&typeof meta==='object'?meta as Record<string,unknown>:null;
    if(!record
      ||record.compileSource!=='template-factory'
      ||record.recipeIdentity!==`${recipe.templateKey}@${recipe.templateVersion}`
      ||record.targetTemplateKey!==recipe.templateKey
      ||record.targetTemplateVersion!==recipe.templateVersion
    ){
      issues.push(issue('FACTORY_PROVENANCE_MISMATCH',`pages.${page.pageType}.metadata.templateFactory`,'Every compiled page must carry the exact Factory recipe identity and target template provenance.'));
    }
  }

  const serialized=JSON.stringify(pkg);
  const foundationSlug=slug(foundation.foundationTemplateKey);
  const targetSlug=slug(recipe.templateKey);
  if(foundationSlug!==targetSlug){
    const leakedMedia=`/storefront/${foundationSlug}/`;
    if(serialized.includes(leakedMedia))issues.push(issue('FACTORY_FOUNDATION_MEDIA_LEAK','package','Compiled template still references foundation-specific media.'));
    for(const token of foundation.forbiddenLeakTokens??[]){
      if(token&&serialized.includes(token))issues.push(issue('FACTORY_FOUNDATION_BRAND_LEAK','package',`Compiled template still contains foundation-specific token: ${token}`));
    }
  }

  if(!recipe.productOwnerReview.internalVisualReviewPassed)issues.push(issue('FACTORY_INTERNAL_VISUAL_REVIEW_REQUIRED','productOwnerReview.internalVisualReviewPassed','Internal reference screenshot review must pass before Product Owner preview.'));

  return issues;
}

export function compileStorefrontTemplateFactoryPackage(input:{
  foundation:StorefrontTemplateFactoryCategoryFoundation;
  recipe:StorefrontTemplateFactoryRecipe;
}):StorefrontTemplateFactoryBuild{
  const{foundation,recipe}=input;
  if(foundation.package.manifest.templateKey!==foundation.foundationTemplateKey||foundation.package.manifest.templateVersion!==foundation.foundationTemplateVersion){
    throw new Error('TEMPLATE_FACTORY_FOUNDATION_IDENTITY_INVALID');
  }
  if(foundation.package.pages.length!==STOREFRONT_PAGE_TYPES.length)throw new Error('TEMPLATE_FACTORY_FOUNDATION_PAGE_COVERAGE_INVALID');
  const ownedSet=new Set(foundation.recommendedOwnedPages),inheritedSet=new Set(foundation.inheritedPages);
  if(foundation.recommendedOwnedPages.some(page=>inheritedSet.has(page)))throw new Error('TEMPLATE_FACTORY_FOUNDATION_PAGE_PARTITION_OVERLAP');
  if(STOREFRONT_PAGE_TYPES.some(page=>!ownedSet.has(page)&&!inheritedSet.has(page)))throw new Error('TEMPLATE_FACTORY_FOUNDATION_PAGE_PARTITION_INCOMPLETE');

  const overridden:StorefrontBuilderPageType[]=[];
  const inherited:StorefrontBuilderPageType[]=[];
  const patchMisses:string[]=[];
  const pages=STOREFRONT_PAGE_TYPES.map(pageType=>{
    const source=recipe.pageOverrides?.[pageType]??foundation.package.pages.find(page=>page.pageType===pageType);
    if(!source)throw new Error(`TEMPLATE_FACTORY_FOUNDATION_PAGE_MISSING:${pageType}`);
    if(recipe.pageOverrides?.[pageType])overridden.push(pageType);else inherited.push(pageType);

    let page=rewriteIds(source,foundation.foundationTemplateKey,recipe.templateKey);
    page=rewriteFoundationBrandTokens(page,foundation.brandTokens??[],recipe.displayName);
    page=rewriteFoundationMediaRefs(page,foundation.mediaPrefixes??[],recipe.media.inheritedFallbackSrc);
    page=rewriteInternalReferenceMediaRefs(page,recipe.media.assets);
    if(recipe.shell.headerNode)page.sections[0]=clone(recipe.shell.headerNode);
    if(recipe.shell.footerNode&&page.sections.length)page.sections[page.sections.length-1]=clone(recipe.shell.footerNode);
    page.pageKey=`${slug(recipe.templateKey)}-${pageType}`;
    page.templateKey=recipe.templateKey;
    page.templateVersion=recipe.templateVersion;
    page.schemaVersion=STOREFRONT_PAGE_SCHEMA_VERSION;
    page=setStorefrontGlobalStyleState(page,recipe.globalStyles);
    page.metadata={
      ...(page.metadata??{}),
      templateFactory:{
        version:STOREFRONT_TEMPLATE_FACTORY_VERSION,
        category:recipe.category,
        foundationTemplateKey:foundation.foundationTemplateKey,
        foundationTemplateVersion:foundation.foundationTemplateVersion,
        referenceKey:recipe.reference.key,
        compileSource:'template-factory',
        recipeIdentity:`${recipe.templateKey}@${recipe.templateVersion}`,
        targetTemplateKey:recipe.templateKey,
        targetTemplateVersion:recipe.templateVersion,
        ownership:recipe.pageOverrides?.[pageType]?'template':'category-foundation',
      },
    };

    const headerCount=applyPatch(page,{match:{componentKey:'system.commerce-header'},config:recipe.shell.header});
    if(headerCount!==1)patchMisses.push(`pages.${pageType}.shell.header`);
    for(const[index,patch]of[...(recipe.shell.patches??[]),...(recipe.nodePatches??[])].entries()){
      if(patch.pageTypes&&!patch.pageTypes.includes(pageType))continue;
      const count=applyPatch(page,patch);
      if(count===0)patchMisses.push(`pages.${pageType}.patch[${index}]`);
    }
    return page;
  });

  const pkg:StorefrontInstallableTemplatePackage={
    manifest:{
      foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
      manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,
      templateKey:recipe.templateKey,
      templateVersion:recipe.templateVersion,
      pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
      minPlan:recipe.minPlan,
      requiredFeatures:[...recipe.requiredFeatures],
      pageTypes:[...STOREFRONT_PAGE_TYPES],
      responsive:{desktop:true,tablet:true,mobile:true},
      migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,
      demoContent:{namespace:recipe.demoNamespace,policy:STOREFRONT_DEMO_CONTENT_POLICY},
    },
    pages,
    demoFixtures:rewriteInternalReferenceMediaRefs(clone(recipe.demoFixtures),recipe.media.assets),
  };

  const issues=evaluateBuild({foundation,recipe,pkg,patchMisses,overridden});
  return{
    package:pkg,
    report:{
      factoryVersion:STOREFRONT_TEMPLATE_FACTORY_VERSION,
      foundation:{templateKey:foundation.foundationTemplateKey,templateVersion:foundation.foundationTemplateVersion,category:foundation.category},
      template:{templateKey:recipe.templateKey,templateVersion:recipe.templateVersion,category:recipe.category},
      provenance:{
        compileSource:'template-factory',
        recipeIdentity:`${recipe.templateKey}@${recipe.templateVersion}`,
        targetTemplateKey:recipe.templateKey,
        targetTemplateVersion:recipe.templateVersion,
        foundationTemplateKey:foundation.foundationTemplateKey,
        foundationTemplateVersion:foundation.foundationTemplateVersion,
        referenceKey:recipe.reference.key,
      },
      inheritedPageTypes:Object.freeze([...inherited]),
      overriddenPageTypes:Object.freeze([...overridden]),
      representativeMediaCount:recipe.media.assets.filter(asset=>asset.representative&&asset.state==='ready').length,
      technicalRepresentativeMediaCount:recipe.media.assets.filter(asset=>asset.representative&&asset.state!=='planned').length,
      internalReferenceMediaCount:recipe.media.assets.filter(asset=>asset.state==='internal-reference').length,
      plannedMediaCount:recipe.media.assets.filter(asset=>asset.state==='planned').length,
      showroomEvidence:createStorefrontTemplateShowroomEvidence(pkg),
      issues:Object.freeze(issues),
      technicalReady:issues.every(item=>item.severity!=='error'||item.code==='FACTORY_INTERNAL_VISUAL_REVIEW_REQUIRED'||item.code==='FACTORY_MEDIA_FINALIZATION_REQUIRED'),
      productOwnerReady:issues.every(item=>item.severity!=='error'),
    },
  };
}

export function assertStorefrontTemplateFactoryProductOwnerReady(build:StorefrontTemplateFactoryBuild):void{
  const blocker=build.report.issues.find(item=>item.severity==='error');
  if(blocker)throw new Error(`TEMPLATE_FACTORY_PRODUCT_OWNER_NOT_READY:${blocker.code}:${blocker.path}`);
}
