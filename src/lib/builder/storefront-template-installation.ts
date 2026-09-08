import {
  STOREFRONT_PAGE_SCHEMA_VERSION,
  type StorefrontBuilderPageType,
} from '@/lib/builder/storefront-foundation';
import type {FeatureCode,PlanCode} from '@/lib/plans/catalog';
import {
  StorefrontComponentRegistry,
  StorefrontTemplateRegistry,
  validateStorefrontPageDocument,
  type StorefrontPageDocument,
  type StorefrontRuntimeCapabilityContext,
  type StorefrontRuntimeViolation,
  type StorefrontTemplatePackage,
} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_TEMPLATE_INSTALLATION_VERSION='shoporation.storefront-template-installation.v1' as const;

const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const DEMO_NAMESPACE_PATTERN=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEMO_ENTITY_KEY_PATTERN=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const planRank:Record<PlanCode,number>={alap:0,pro:1};

export type StorefrontDemoEntityType='product'|'collection'|'content'|'media';
export type StorefrontDemoFixture={
  entityType:StorefrontDemoEntityType;
  entityKey:string;
  payload:Record<string,unknown>;
};

export type StorefrontInstallableTemplatePackage=StorefrontTemplatePackage&{
  demoFixtures?:readonly StorefrontDemoFixture[];
};

export type StorefrontTemplateGateViolation=StorefrontRuntimeViolation;
export type StorefrontTemplateCapabilityGateResult={
  ok:boolean;
  violations:StorefrontTemplateGateViolation[];
};

export type StorefrontExistingTemplatePage={
  pageKey:string;
  pageType:StorefrontBuilderPageType;
  draftRevision:number|null;
  draftTemplateKey?:string|null;
  draftTemplateVersion?:number|null;
  publishedTemplateKey?:string|null;
  publishedTemplateVersion?:number|null;
};

export type StorefrontDemoContentState='fixture'|'adopted'|'retired';
export type StorefrontDemoContentRecord={
  namespace:string;
  namespacedKey:string;
  entityType:StorefrontDemoEntityType;
  entityKey:string;
  state:StorefrontDemoContentState;
  payload:Record<string,unknown>;
};

export const STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY=Object.freeze({
  storefrontPageDrafts:true,
  products:false,
  variants:false,
  collections:false,
  customers:false,
  orders:false,
  content:false,
  b2b:false,
  seoBusinessData:false,
} as const);

export type StorefrontTemplateInstallationMode='install'|'switch'|'upgrade'|'refresh';
export type StorefrontTemplateMaterializedPage={
  sourcePageKey:string;
  pageKey:string;
  pageType:StorefrontBuilderPageType;
  expectedDraftRevision:number|null;
  document:StorefrontPageDocument;
};

export type StorefrontTemplateInstallationPlan={
  contractVersion:typeof STOREFRONT_TEMPLATE_INSTALLATION_VERSION;
  mode:StorefrontTemplateInstallationMode;
  templateKey:string;
  templateVersion:number;
  gate:StorefrontTemplateCapabilityGateResult;
  pages:readonly StorefrontTemplateMaterializedPage[];
  untouchedExistingPageKeys:readonly string[];
  demoLifecycle:{
    install:readonly StorefrontDemoContentRecord[];
    retire:readonly StorefrontDemoContentRecord[];
  };
  mutationBoundary:typeof STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY;
};

const violation=(code:string,path:string,message:string,metadata?:Record<string,unknown>):StorefrontTemplateGateViolation=>({
  code,path,message,severity:'error',metadata,
});

const featureSet=(context:StorefrontRuntimeCapabilityContext)=>context.features instanceof Set?context.features:new Set<FeatureCode>(context.features);

function validateDemoFixtures(template:StorefrontInstallableTemplatePackage):StorefrontTemplateGateViolation[]{
  const violations:StorefrontTemplateGateViolation[]=[];
  const namespace=template.manifest.demoContent.namespace;
  if(!DEMO_NAMESPACE_PATTERN.test(namespace)){
    violations.push(violation('TEMPLATE_DEMO_NAMESPACE_INVALID','manifest.demoContent.namespace','Demo content namespace is invalid.'));
  }
  const seen=new Set<string>();
  for(const[fixtureIndex,fixture]of(template.demoFixtures??[]).entries()){
    const path=`demoFixtures[${fixtureIndex}]`;
    if(!DEMO_ENTITY_KEY_PATTERN.test(fixture.entityKey))violations.push(violation('TEMPLATE_DEMO_ENTITY_KEY_INVALID',`${path}.entityKey`,'Demo entity key is invalid.'));
    const identity=`${fixture.entityType}:${fixture.entityKey}`;
    if(seen.has(identity))violations.push(violation('TEMPLATE_DEMO_ENTITY_DUPLICATE',path,'Demo entity identity must be unique inside one template package.'));
    seen.add(identity);
    if(!fixture.payload||typeof fixture.payload!=='object'||Array.isArray(fixture.payload)){
      violations.push(violation('TEMPLATE_DEMO_PAYLOAD_INVALID',`${path}.payload`,'Demo payload must be an object.'));
    }
  }
  return violations;
}

export function evaluateStorefrontTemplateCapabilityGate(input:{
  template:StorefrontInstallableTemplatePackage;
  componentRegistry:StorefrontComponentRegistry;
  capability:StorefrontRuntimeCapabilityContext;
}):StorefrontTemplateCapabilityGateResult{
  const violations:StorefrontTemplateGateViolation[]=[];
  const{template,componentRegistry,capability}=input;

  try{
    new StorefrontTemplateRegistry().register(template);
  }catch(error){
    violations.push(violation(
      error instanceof Error?error.message:'TEMPLATE_PACKAGE_INVALID',
      'template',
      'Template package registry validation failed.',
    ));
  }

  if(template.manifest.pageSchemaVersion!==STOREFRONT_PAGE_SCHEMA_VERSION){
    violations.push(violation('TEMPLATE_PAGE_SCHEMA_VERSION_UNSUPPORTED','manifest.pageSchemaVersion','Template page schema version is not supported.'));
  }

  if(planRank[capability.plan]<planRank[template.manifest.minPlan]){
    violations.push(violation('TEMPLATE_PLAN_REQUIRED','manifest.minPlan','Current store plan does not satisfy the template minimum plan.',{requiredPlan:template.manifest.minPlan,currentPlan:capability.plan}));
  }

  const enabledFeatures=featureSet(capability);
  for(const feature of template.manifest.requiredFeatures){
    if(!enabledFeatures.has(feature))violations.push(violation('TEMPLATE_FEATURE_REQUIRED','manifest.requiredFeatures','Required template feature is not enabled.',{feature}));
  }

  const packagePageTypes=new Set(template.pages.map(page=>page.pageType));
  for(const pageType of template.manifest.pageTypes){
    if(!packagePageTypes.has(pageType))violations.push(violation('TEMPLATE_PAGE_PRESET_MISSING','pages','Template package is missing a declared page preset.',{pageType}));
  }

  for(const[pageIndex,page]of template.pages.entries()){
    const result=validateStorefrontPageDocument(page,componentRegistry,capability);
    for(const item of result.violations){
      violations.push({...item,path:`pages[${pageIndex}].${item.path}`});
    }
  }

  violations.push(...validateDemoFixtures(template));
  return{ok:!violations.some(item=>item.severity==='error'),violations};
}

export function materializeStorefrontDemoContent(template:StorefrontInstallableTemplatePackage):StorefrontDemoContentRecord[]{
  const namespace=template.manifest.demoContent.namespace;
  if(!DEMO_NAMESPACE_PATTERN.test(namespace))throw new Error('TEMPLATE_DEMO_NAMESPACE_INVALID');
  const gateViolations=validateDemoFixtures(template);
  if(gateViolations.length)throw new Error(gateViolations[0]?.code??'TEMPLATE_DEMO_INVALID');
  return(template.demoFixtures??[]).map(fixture=>({
    namespace,
    namespacedKey:`${namespace}:${fixture.entityType}:${fixture.entityKey}`,
    entityType:fixture.entityType,
    entityKey:fixture.entityKey,
    state:'fixture' as const,
    payload:structuredClone(fixture.payload),
  }));
}

export function adoptStorefrontDemoContent(records:readonly StorefrontDemoContentRecord[],namespacedKeys:readonly string[]):StorefrontDemoContentRecord[]{
  const selected=new Set(namespacedKeys);
  if(!selected.size)throw new Error('TEMPLATE_DEMO_ADOPTION_SELECTION_REQUIRED');
  const known=new Set(records.map(record=>record.namespacedKey));
  for(const key of selected)if(!known.has(key))throw new Error('TEMPLATE_DEMO_ADOPTION_ENTITY_NOT_FOUND');
  return records.map(record=>({
    ...record,
    state:selected.has(record.namespacedKey)?'adopted':record.state,
    payload:structuredClone(record.payload),
  }));
}

export function retireStorefrontDemoContent(records:readonly StorefrontDemoContentRecord[],namespace:string):StorefrontDemoContentRecord[]{
  return records.map(record=>({
    ...record,
    state:record.namespace===namespace&&record.state==='fixture'?'retired':record.state,
    payload:structuredClone(record.payload),
  }));
}

function currentTemplateIdentity(existingPages:readonly StorefrontExistingTemplatePage[]){
  for(const page of existingPages){
    const key=page.draftTemplateKey??page.publishedTemplateKey;
    const version=page.draftTemplateVersion??page.publishedTemplateVersion;
    if(key&&version)return{key,version};
  }
  return null;
}

function installationMode(template:StorefrontInstallableTemplatePackage,existingPages:readonly StorefrontExistingTemplatePage[]):StorefrontTemplateInstallationMode{
  const current=currentTemplateIdentity(existingPages);
  if(!current)return'install';
  if(current.key!==template.manifest.templateKey)return'switch';
  if(current.version!==template.manifest.templateVersion)return'upgrade';
  return'refresh';
}

export function planStorefrontTemplateInstallation(input:{
  template:StorefrontInstallableTemplatePackage;
  componentRegistry:StorefrontComponentRegistry;
  capability:StorefrontRuntimeCapabilityContext;
  existingPages?:readonly StorefrontExistingTemplatePage[];
  pageKeyOverrides?:Partial<Record<StorefrontBuilderPageType,string>>;
  currentDemoContent?:readonly StorefrontDemoContentRecord[];
}):StorefrontTemplateInstallationPlan{
  const existingPages=input.existingPages??[];
  const gate=evaluateStorefrontTemplateCapabilityGate({template:input.template,componentRegistry:input.componentRegistry,capability:input.capability});
  if(!gate.ok)throw new Error(`STOREFRONT_TEMPLATE_CAPABILITY_GATE_FAILED:${gate.violations[0]?.code??'UNKNOWN'}`);

  const existingByType=new Map<StorefrontBuilderPageType,StorefrontExistingTemplatePage>();
  for(const page of existingPages){
    if(existingByType.has(page.pageType))throw new Error('STOREFRONT_EXISTING_PAGE_TYPE_DUPLICATE');
    if(!PAGE_KEY_PATTERN.test(page.pageKey))throw new Error('STOREFRONT_EXISTING_PAGE_KEY_INVALID');
    existingByType.set(page.pageType,page);
  }

  const materializedPageKeys=new Set<string>();
  const pages=input.template.pages.map(source=>{
    const existing=existingByType.get(source.pageType);
    const pageKey=input.pageKeyOverrides?.[source.pageType]??existing?.pageKey??source.pageType;
    if(!PAGE_KEY_PATTERN.test(pageKey))throw new Error('STOREFRONT_MATERIALIZED_PAGE_KEY_INVALID');
    if(materializedPageKeys.has(pageKey))throw new Error('STOREFRONT_MATERIALIZED_PAGE_KEY_DUPLICATE');
    materializedPageKeys.add(pageKey);

    const document:StorefrontPageDocument=structuredClone(source);
    document.pageKey=pageKey;
    document.templateKey=input.template.manifest.templateKey;
    document.templateVersion=input.template.manifest.templateVersion;
    document.metadata={
      ...(document.metadata??{}),
      templatePresetPageKey:source.pageKey,
      templateInstallContract:STOREFRONT_TEMPLATE_INSTALLATION_VERSION,
      demoNamespace:input.template.manifest.demoContent.namespace,
    };

    const validation=validateStorefrontPageDocument(document,input.componentRegistry,input.capability);
    if(!validation.ok)throw new Error(`STOREFRONT_MATERIALIZED_PAGE_INVALID:${validation.violations[0]?.code??'UNKNOWN'}`);

    return{
      sourcePageKey:source.pageKey,
      pageKey,
      pageType:source.pageType,
      expectedDraftRevision:existing?.draftRevision??null,
      document,
    } satisfies StorefrontTemplateMaterializedPage;
  });

  const untouchedExistingPageKeys=existingPages.filter(page=>!materializedPageKeys.has(page.pageKey)).map(page=>page.pageKey);
  const currentDemo=input.currentDemoContent??[];
  const targetNamespace=input.template.manifest.demoContent.namespace;
  const retire=currentDemo.filter(record=>record.namespace!==targetNamespace&&record.state==='fixture').map(record=>({...record,payload:structuredClone(record.payload)}));

  return{
    contractVersion:STOREFRONT_TEMPLATE_INSTALLATION_VERSION,
    mode:installationMode(input.template,existingPages),
    templateKey:input.template.manifest.templateKey,
    templateVersion:input.template.manifest.templateVersion,
    gate,
    pages,
    untouchedExistingPageKeys,
    demoLifecycle:{install:materializeStorefrontDemoContent(input.template),retire},
    mutationBoundary:STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY,
  };
}
