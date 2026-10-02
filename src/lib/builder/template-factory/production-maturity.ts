import {
  SHARED_STOREFRONT_ENGINE_IDS,
  getStorefrontEngineBrabusRevalidation,
  getStorefrontEngineFunctionalProofDefinition,
} from '@/lib/builder/template-factory/engine-functional-proof-registry';

export const STOREFRONT_TEMPLATE_PRODUCTION_MATURITY_VERSION='shoporation.template-production-maturity.v1' as const;
export const REQUIRED_TEMPLATE_GENOME_DIMENSIONS=Object.freeze([
  'identity','color','typography','spacing','shape','motion','composition','image',
  'commerce','content','shell','responsive','component-grammar','exclusion',
] as const);

export type StorefrontTemplateProductionCapabilityState='PROVEN'|'EVOLVE'|'RETHINK'|'NOT_IMPLEMENTED';
export type StorefrontTemplateProductionCapabilityArea='engine'|'vx-builder'|'template-factory';
export type StorefrontTemplateProductionEvidenceKind='implementation'|'test'|'contract'|'documentation';
export type StorefrontTemplateProductionEvidence={
  kind:StorefrontTemplateProductionEvidenceKind;
  path:string;
  authority:string;
  canonical:boolean;
  executable:boolean;
};
export type StorefrontTemplateProductionCapability={
  id:string;
  area:StorefrontTemplateProductionCapabilityArea;
  label:string;
  state:StorefrontTemplateProductionCapabilityState;
  authority:string;
  requiredForTemplate3:boolean;
  reason:string;
  nextAction:string;
  evidence:readonly StorefrontTemplateProductionEvidence[];
};
export type StorefrontTemplateProductionMaturityIssue={code:string;path:string;message:string;severity:'error'};
export type StorefrontTemplateProductionMaturityResult={
  contract:typeof STOREFRONT_TEMPLATE_PRODUCTION_MATURITY_VERSION;
  valid:boolean;
  template3AuthoringReady:boolean;
  capabilities:readonly StorefrontTemplateProductionCapability[];
  blockingCapabilityIds:readonly string[];
  counts:Readonly<Record<StorefrontTemplateProductionCapabilityState,number>>;
  genomeDimensions:typeof REQUIRED_TEMPLATE_GENOME_DIMENSIONS;
  issues:readonly StorefrontTemplateProductionMaturityIssue[];
};

const ev=(kind:StorefrontTemplateProductionEvidenceKind,path:string,authority='builder-template-system',canonical=true,executable=kind!=='documentation'):StorefrontTemplateProductionEvidence=>Object.freeze({kind,path,authority,canonical,executable});
const cap=(value:StorefrontTemplateProductionCapability):StorefrontTemplateProductionCapability=>Object.freeze({...value,evidence:Object.freeze([...value.evidence])});
const fail=(code:string,path:string,message:string):StorefrontTemplateProductionMaturityIssue=>({code,path,message,severity:'error'});

function engineCapabilities():StorefrontTemplateProductionCapability[]{
  return SHARED_STOREFRONT_ENGINE_IDS.map(engineId=>{
    const definition=getStorefrontEngineFunctionalProofDefinition(engineId);
    const revalidation=getStorefrontEngineBrabusRevalidation(engineId);
    if(!definition||!revalidation)throw new Error(`TEMPLATE_PRODUCTION_ENGINE_REVALIDATION_MISSING:${engineId}`);
    return cap({
      id:`ENGINE-${engineId}-BRABUS-REVALIDATION`,
      area:'engine',
      label:`${engineId} · ${definition.label}`,
      state:revalidation.state,
      authority:definition.authority,
      requiredForTemplate3:true,
      reason:revalidation.state==='PROVEN'
        ?'Current-stack Maybach-Brabus revalidation proof exists in addition to retained engine proof.'
        :'Retained engine proof exists, but current-stack Maybach-Brabus adversarial revalidation is not complete.',
      nextAction:revalidation.state==='PROVEN'
        ?'Keep revalidation evidence current when engine authority changes.'
        :`Run current-stack adversarial revalidation for ${engineId} and promote only with dedicated proof.`,
      evidence:[
        ev('implementation',definition.sourceModule,definition.authority),
        ev('test',definition.proofProducer,definition.authority),
        ...(revalidation.proofProducer?[ev('test',revalidation.proofProducer,definition.authority)]:[]),
      ],
    });
  });
}

const BUILDER:readonly StorefrontTemplateProductionCapability[]=Object.freeze([
  cap({id:'VX-GUARDED-FREEDOM',area:'vx-builder',label:'Guarded Freedom workspace',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Canonical production Builder exposes bounded Page Schema editing instead of arbitrary source-code authoring.',nextAction:'Preserve bounded authoring while adding higher-level intelligence.',evidence:[ev('implementation','src/components/admin/storefront-visual-builder-production.tsx'),ev('test','tests/visual-builder-workspace-ui.test.ts')]}),
  cap({id:'VX-EDIT-MODES',area:'vx-builder',label:'Normal / Advanced / Expert',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Three edit depths operate over one canonical document model.',nextAction:'Keep progressive disclosure without separate Builder authorities.',evidence:[ev('implementation','src/components/admin/storefront-fidelity-settings.tsx'),ev('test','tests/storefront-responsive-layout-depth.test.ts')]}),
  cap({id:'VX-HIERARCHY-LAYERS',area:'vx-builder',label:'Hierarchy and Layers',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Production workspace exposes section/container/component hierarchy and Layers.',nextAction:'Build intent-level manipulation on the same hierarchy.',evidence:[ev('implementation','src/components/admin/storefront-visual-builder-production.tsx'),ev('test','tests/visual-builder-workspace-ui.test.ts')]}),
  cap({id:'VX-RESPONSIVE-INHERITANCE',area:'vx-builder',label:'Responsive inheritance and reset',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Desktop/Tablet/Mobile overrides and reset are canonical schema operations.',nextAction:'Add explainable inheritance intelligence without duplicated breakpoint pages.',evidence:[ev('implementation','src/lib/builder/storefront-responsive-layout-depth.ts'),ev('test','tests/storefront-responsive-layout-depth.test.ts')]}),
  cap({id:'VX-PRESETS-BLOCKS-GLOBALS',area:'vx-builder',label:'Presets, Saved Blocks, Global Elements and Global Styles',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Reusable composition and global style primitives have executable contracts.',nextAction:'Make Genome and Smart Intent consume these canonical primitives.',evidence:[ev('implementation','src/lib/builder/storefront-preset-application.ts'),ev('implementation','src/lib/builder/storefront-saved-blocks.ts'),ev('implementation','src/lib/builder/storefront-linked-symbols.ts'),ev('implementation','src/lib/builder/storefront-global-styles.ts'),ev('test','tests/storefront-preset-library.test.ts'),ev('test','tests/storefront-saved-blocks.test.ts'),ev('test','tests/storefront-reusable-symbols.test.ts'),ev('test','tests/storefront-global-styles.test.ts')]}),
  cap({id:'VX-DESIGN-GUARD',area:'vx-builder',label:'Design Guard',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Shared Fidelity metadata and drift diagnostics protect template character.',nextAction:'Connect future Genome constraints to existing diagnostics.',evidence:[ev('implementation','src/lib/builder/storefront-fidelity-engine.ts'),ev('test','tests/storefront-visual-builder-fidelity-engine.test.ts')]}),
  cap({id:'VX-STATES-INTERACTIONS',area:'vx-builder',label:'Component states and bounded interactions',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Supported interaction states use shared bounded contracts.',nextAction:'Keep new interactions schema-bound and regression-proven.',evidence:[ev('implementation','src/lib/builder/storefront-fidelity-interaction-state.ts'),ev('test','tests/storefront-fidelity-interaction-states.test.tsx')]}),
  cap({id:'VX-UNDO-REDO',area:'vx-builder',label:'Undo / redo',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Builder mutations have canonical history semantics.',nextAction:'Smart operations must remain ordinary atomic history entries.',evidence:[ev('implementation','src/lib/builder/storefront-visual-builder.ts'),ev('test','tests/roadmap-block22-visual-builder.test.ts')]}),
  cap({id:'VX-PUBLISH-READINESS',area:'vx-builder',label:'Publish Readiness',state:'EVOLVE',authority:'builder-template-system',requiredForTemplate3:true,reason:'Readiness UI exists, but Brabus requires broader evidence-backed coverage than presentation grouping alone.',nextAction:'Revalidate responsive, accessibility, media, links, commerce, required content and performance coverage.',evidence:[ev('implementation','src/components/admin/storefront-visual-builder-production.tsx'),ev('test','tests/visual-builder-workspace-ui.test.ts')]}),
  cap({id:'VX-INHERITANCE-INTELLIGENCE',area:'vx-builder',label:'Inheritance intelligence',state:'EVOLVE',authority:'builder-template-system',requiredForTemplate3:true,reason:'Inheritance/reset mechanics exist, but safe propagation and drift reasoning are not yet intent-level capabilities.',nextAction:'Add explainable inheritance diagnostics and bounded propagation.',evidence:[ev('implementation','src/lib/builder/storefront-responsive-layout-depth.ts'),ev('test','tests/storefront-responsive-layout-depth.test.ts')]}),
  cap({id:'VX-VISUAL-DIFF-INTELLIGENCE',area:'vx-builder',label:'Visual diff intelligence',state:'EVOLVE',authority:'builder-template-system',requiredForTemplate3:true,reason:'Exact-head visual proof exists, but it is not yet reusable Builder authoring intelligence.',nextAction:'Expose evidence-backed visual drift reasoning without making screenshots runtime truth.',evidence:[ev('implementation','scripts/capture-visual-fidelity.mjs'),ev('test','tests/storefront-template-quality-gate-v2.test.ts')]}),
  cap({id:'VX-SMART-INTENT',area:'vx-builder',label:'Smart Intent',state:'NOT_IMPLEMENTED',authority:'builder-template-system',requiredForTemplate3:true,reason:'No canonical executable intent compiler maps merchant intent to bounded Builder operations.',nextAction:'Implement intent-to-operation planning for layout, typography, tokens and responsive edits.',evidence:[]}),
  cap({id:'VX-SMART-AUTOFIX',area:'vx-builder',label:'Smart Auto-Fix',state:'NOT_IMPLEMENTED',authority:'builder-template-system',requiredForTemplate3:true,reason:'No canonical Auto-Fix converts diagnostics into safe ordinary schema operations.',nextAction:'Implement deterministic safe fixes with explanation, preview and undo/redo.',evidence:[]}),
]);

const FACTORY:readonly StorefrontTemplateProductionCapability[]=Object.freeze([
  cap({id:'FACTORY-14-PAGE-COMPILER',area:'template-factory',label:'Deterministic 14-page materialization',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Factory compiles the canonical 14-page matrix with deterministic target identity.',nextAction:'Preserve deterministic materialization while improving production planning.',evidence:[ev('implementation','src/lib/builder/template-factory/scaffold.ts'),ev('test','tests/template-factory-scaffold-v1.test.ts')]}),
  cap({id:'FACTORY-PRODUCTION-CONTRACTS',area:'template-factory',label:'Visual authority and file ownership',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Factory candidates carry explicit visual authority and narrow template-owned roots.',nextAction:'Keep shared-authority changes canonical and reviewed.',evidence:[ev('implementation','src/lib/builder/template-factory/production-contracts.ts'),ev('test','tests/template-factory-production-contracts.test.ts')]}),
  cap({id:'FACTORY-BROWSER-PROOF',area:'template-factory',label:'14×3 exact-head browser proof',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Existing Template Factory gate validates page/viewport browser evidence on exact source identity.',nextAction:'Carry Brabus maturity through this same gate rather than adding another gate.',evidence:[ev('implementation','scripts/template-factory-quality-gate.mjs'),ev('test','tests/storefront-template-quality-gate-v2.test.ts')]}),
  cap({id:'FACTORY-TEMPLATE-GENOME',area:'template-factory',label:'Immutable Template Genome / DNA',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Canonical versioned Template Genome now binds identity, visual grammar, responsive behavior, exclusions and lineage to a deterministic immutable hash and Generator Readiness fail-closed validation.',nextAction:'Consume the proven Genome authority from Template Type System, Constraint Planner, Media Planner, distinctness and dynamic compiler waves without creating a parallel identity model.',evidence:[ev('implementation','src/lib/builder/template-factory/template-genome.ts'),ev('test','tests/template-factory-template-genome.test.ts'),ev('test','tests/template-factory-generator-readiness.test.ts')]}),
  cap({id:'FACTORY-MEDIA-PLANNER-COMPILER',area:'template-factory',label:'Media Planner / Compiler',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Canonical Media Planner now compiles Constraint Plan semantic media roles through explicit Factory manifest bindings into immutable Asset Briefs, validates concrete fulfillment, separates technical from ready media state, emits bounded repair actions and enforces atomic promotion lineage.',nextAction:'Consume the proven Media Plan from deterministic lineage, distinctness and dynamic compiler waves without moving concrete media ownership out of the Factory manifest.',evidence:[ev('implementation','src/lib/builder/template-factory/media-planner.ts'),ev('implementation','src/lib/builder/template-factory/scaffold.ts'),ev('test','tests/template-factory-media-planner.test.ts'),ev('test','tests/template-factory-generator-readiness.test.ts')]}),
  cap({id:'FACTORY-DISTINCTNESS-ANTI-CLONE',area:'template-factory',label:'Cross-template distinctness / anti-clone',state:'EVOLVE',authority:'builder-template-system',requiredForTemplate3:true,reason:'Visual-DNA/exclusion conventions exist, but no executable similarity budget protects new production automatically.',nextAction:'Add multi-axis distinctness proof for structure, typography, spacing, shape, media language and composition.',evidence:[ev('documentation','docs/storefront-special-commerce-wave7-template-quality-review.md','builder-template-system',true,false)]}),
  cap({id:'FACTORY-DETERMINISTIC-LINEAGE',area:'template-factory',label:'Deterministic production lineage',state:'EVOLVE',authority:'builder-template-system',requiredForTemplate3:true,reason:'Recipe/foundation provenance exists, but Genome, media and intent compilation are not one end-to-end lineage chain.',nextAction:'Record immutable Genome, recipe, media-plan and compiler lineage for every package.',evidence:[ev('implementation','src/lib/builder/template-factory/scaffold.ts'),ev('test','tests/template-factory-scaffold-v1.test.ts')]}),
  cap({id:'FACTORY-TEMPLATE-TYPE-SYSTEM',area:'template-factory',label:'Template Type System',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Canonical versioned type definitions now map supported template categories to executable layout, density, navigation, interaction, content, commerce, media, component and engine semantics with fail-closed Generator Readiness compatibility.',nextAction:'Consume the proven type semantics from Constraint Planner without duplicating category logic or template identity.',evidence:[ev('implementation','src/lib/builder/template-factory/template-type-system.ts'),ev('test','tests/template-factory-template-type-system.test.ts'),ev('test','tests/template-factory-generator-readiness.test.ts')]}),
  cap({id:'FACTORY-CONSTRAINT-PLANNER',area:'template-factory',label:'Constraint Planner',state:'PROVEN',authority:'builder-template-system',requiredForTemplate3:true,reason:'Canonical deterministic Constraint Planner now composes accepted Visual Authority, Template Genome, Template Type semantics and bounded Product Owner production intent into immutable explainable constraints with fail-closed Generator Readiness integration.',nextAction:'Consume the proven constraint plan from Media Planner and Dynamic Compiler without duplicating planner semantics or bypassing Page Schema/Builder authorities.',evidence:[ev('implementation','src/lib/builder/template-factory/constraint-planner.ts'),ev('test','tests/template-factory-constraint-planner.test.ts'),ev('test','tests/template-factory-generator-readiness.test.ts')]}),
  cap({id:'FACTORY-DYNAMIC-PRODUCTION-COMPILER',area:'template-factory',label:'Dynamic production compiler',state:'EVOLVE',authority:'builder-template-system',requiredForTemplate3:true,reason:'Deterministic scaffold compilation exists while higher-level template compiler implementation remains deferred.',nextAction:'Evolve to Genome/constraint/media-driven production compilation without bypassing Page Schema.',evidence:[ev('implementation','src/lib/builder/template-factory/scaffold.ts'),ev('test','tests/template-factory-generator-readiness.test.ts')]}),
]);

export function storefrontTemplateProductionCapabilityCatalog():readonly StorefrontTemplateProductionCapability[]{
  return Object.freeze([...engineCapabilities(),...BUILDER,...FACTORY]);
}

export function evaluateStorefrontTemplateProductionMaturity(
  capabilities:readonly StorefrontTemplateProductionCapability[]=storefrontTemplateProductionCapabilityCatalog(),
):StorefrontTemplateProductionMaturityResult{
  const issues:StorefrontTemplateProductionMaturityIssue[]=[];
  const ids=new Set<string>();
  for(const item of capabilities){
    if(ids.has(item.id))issues.push(fail('TEMPLATE_PRODUCTION_CAPABILITY_DUPLICATE',item.id,'Production capability ids must be unique.'));
    ids.add(item.id);
    if(!item.label.trim()||!item.authority.trim()||!item.reason.trim()||!item.nextAction.trim())issues.push(fail('TEMPLATE_PRODUCTION_CAPABILITY_REQUIRED_FIELD',item.id,'Production capability metadata must be explicit.'));
    if(item.state==='PROVEN'){
      const executable=item.evidence.filter(row=>row.canonical&&row.executable&&row.kind!=='documentation');
      if(!executable.some(row=>row.kind==='implementation'||row.kind==='contract'))issues.push(fail('TEMPLATE_PRODUCTION_PROVEN_WITHOUT_IMPLEMENTATION',item.id,'PROVEN requires canonical executable implementation or contract evidence.'));
      if(!executable.some(row=>row.kind==='test'))issues.push(fail('TEMPLATE_PRODUCTION_PROVEN_WITHOUT_TEST',item.id,'PROVEN requires canonical executable test evidence.'));
    }
  }
  const blocking=capabilities.filter(item=>item.requiredForTemplate3&&item.state!=='PROVEN').map(item=>item.id);
  const counts:Record<StorefrontTemplateProductionCapabilityState,number>={PROVEN:0,EVOLVE:0,RETHINK:0,NOT_IMPLEMENTED:0};
  for(const item of capabilities)counts[item.state]+=1;
  return Object.freeze({
    contract:STOREFRONT_TEMPLATE_PRODUCTION_MATURITY_VERSION,
    valid:issues.length===0,
    template3AuthoringReady:issues.length===0&&blocking.length===0,
    capabilities:Object.freeze([...capabilities]),
    blockingCapabilityIds:Object.freeze(blocking),
    counts:Object.freeze(counts),
    genomeDimensions:REQUIRED_TEMPLATE_GENOME_DIMENSIONS,
    issues:Object.freeze(issues),
  });
}
