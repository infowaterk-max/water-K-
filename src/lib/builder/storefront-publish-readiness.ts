import {STOREFRONT_PAGE_TYPES,type StorefrontBuilderPageType,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {inspectStorefrontFidelityBuilder,STOREFRONT_FIDELITY_INSPECTOR_VERSION} from '@/lib/builder/storefront-fidelity-inspector';
import {
  inspectStorefrontResponsiveInheritance,
  STOREFRONT_RESPONSIVE_INHERITANCE_INTELLIGENCE_VERSION,
} from '@/lib/builder/storefront-responsive-layout-depth';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {
  StorefrontVisualDiffManifestCase,
  StorefrontVisualDiffManifestIssue,
  StorefrontVisualDiffManifestResult,
} from '@/lib/builder/storefront-visual-diff-intelligence';
import type {StorefrontRouteIntegrityIssue,StorefrontShowroomContractIssue} from '@/lib/builder/storefront-template-route-integrity';

export const STOREFRONT_PUBLISH_READINESS_VERSION='shoporation.storefront-publish-readiness.v1' as const;

export const STOREFRONT_PUBLISH_READINESS_CATEGORIES=[
  'document-state',
  'responsive-inheritance',
  'visual-drift',
  'accessibility',
  'media',
  'links',
  'commerce',
  'required-content',
  'performance',
  'page-route-completeness',
  'design-integrity',
] as const;

export type StorefrontPublishReadinessCategory=typeof STOREFRONT_PUBLISH_READINESS_CATEGORIES[number];
export type StorefrontPublishReadinessState='PASS'|'BLOCK'|'UNKNOWN';
export type StorefrontPublishReadinessSeverity='info'|'warning'|'error'|'unknown';
export type StorefrontPublishReadinessRepairability='structured-diagnostic'|'manual-review'|'none';

export type StorefrontPublishReadinessLocation={
  pageKey?:string;
  pageType?:string;
  viewport?:StorefrontViewport;
  nodeId?:string;
  componentKey?:string;
  path?:string;
  href?:string;
};

export type StorefrontPublishReadinessEvidence={
  authority:string;
  source:string;
  contract?:string;
  code?:string;
  provenance?:Readonly<Record<string,string|number|boolean|null>>;
};

export type StorefrontPublishReadinessFinding={
  id:string;
  category:StorefrontPublishReadinessCategory;
  state:StorefrontPublishReadinessState;
  severity:StorefrontPublishReadinessSeverity;
  reason:string;
  repairability:StorefrontPublishReadinessRepairability;
  location:Readonly<StorefrontPublishReadinessLocation>;
  evidence:Readonly<StorefrontPublishReadinessEvidence>;
};

export type StorefrontPublishReadinessPageInventoryRow={
  pageKey:string;
  pageType:string;
  draftRevision:number|null;
  draftTemplateKey:string|null;
  draftTemplateVersion:number|null;
};

type EvidenceTarget={templateKey:string;templateVersion:number};

export type StorefrontPublishReadinessVisualEvidence=Pick<
  StorefrontVisualDiffManifestResult,
  'contract'|'evidenceContract'|'target'|'valid'|'clean'|'issues'|'cases'
>;

export type StorefrontPublishReadinessRouteEvidence={
  contract:string;
  target:EvidenceTarget;
  issues:readonly StorefrontRouteIntegrityIssue[];
};

export type StorefrontPublishReadinessShowroomEvidence={
  contract:string;
  target:EvidenceTarget;
  issues:readonly StorefrontShowroomContractIssue[];
};

export type StorefrontPublishReadinessMediaEvidence={
  contract:string;
  target:EvidenceTarget;
  result:{
    valid:boolean;
    technicalFulfilled:boolean;
    readyFulfilled:boolean;
    issues:readonly {code:string;path:string;message:string;severity:'error'}[];
    repairs:readonly {assetKey:string;message:string}[];
  };
};

export type StorefrontPublishReadinessCommerceIssue={
  code:string;
  path:string;
  message:string;
  severity:'warning'|'error';
};

export type StorefrontPublishReadinessCommerceEvidence={
  contract:string;
  target:EvidenceTarget;
  complete:boolean;
  issues:readonly StorefrontPublishReadinessCommerceIssue[];
};

export type StorefrontPublishReadinessExternalEvidence={
  visualDiff?:StorefrontPublishReadinessVisualEvidence|null;
  routeIntegrity?:StorefrontPublishReadinessRouteEvidence|null;
  showroom?:StorefrontPublishReadinessShowroomEvidence|null;
  mediaPlanning?:StorefrontPublishReadinessMediaEvidence|null;
  commerce?:StorefrontPublishReadinessCommerceEvidence|null;
};

export type StorefrontPublishReadinessCategoryResult={
  category:StorefrontPublishReadinessCategory;
  label:string;
  state:StorefrontPublishReadinessState;
  evidence:readonly StorefrontPublishReadinessEvidence[];
  findings:readonly StorefrontPublishReadinessFinding[];
};

export type StorefrontPublishReadinessResult={
  contract:typeof STOREFRONT_PUBLISH_READINESS_VERSION;
  target:{pageKey:string;pageType:string;templateKey:string;templateVersion:number};
  decision:StorefrontPublishReadinessState;
  categories:readonly StorefrontPublishReadinessCategoryResult[];
  findings:readonly StorefrontPublishReadinessFinding[];
  summary:{
    blockers:number;
    unknowns:number;
    warnings:number;
    byState:Readonly<Record<StorefrontPublishReadinessState,number>>;
  };
};

const CATEGORY_LABELS:Readonly<Record<StorefrontPublishReadinessCategory,string>>=Object.freeze({
  'document-state':'Mentett piszkozat',
  'responsive-inheritance':'Reszponzív / öröklődés',
  'visual-drift':'Visual Diff',
  accessibility:'Akadálymentesség',
  media:'Média',
  links:'Linkek és útvonalak',
  commerce:'Kereskedelmi működés',
  'required-content':'Kötelező tartalmak',
  performance:'Teljesítmény',
  'page-route-completeness':'Oldal / route teljesség',
  'design-integrity':'Design Guard',
});

const REQUIRED_SOURCES:Readonly<Record<StorefrontPublishReadinessCategory,readonly string[]>>=Object.freeze({
  'document-state':['draft-state'],
  'responsive-inheritance':['fidelity-layout','responsive-inheritance'],
  'visual-drift':['visual-diff'],
  accessibility:['fidelity-accessibility'],
  media:['fidelity-accessibility','media-planning'],
  links:['fidelity-accessibility','route-integrity'],
  commerce:['commerce-readiness'],
  'required-content':['fidelity-accessibility','showroom'],
  performance:['performance'],
  'page-route-completeness':['page-inventory','route-integrity','showroom'],
  'design-integrity':['design-guard'],
});

const SOURCE_META:Readonly<Record<string,{authority:string;source:string;contract?:string}>>=Object.freeze({
  'draft-state':{authority:'builder-template-system',source:'builder-draft-state'},
  'fidelity-layout':{authority:'builder-template-system',source:'storefront-fidelity-layout',contract:STOREFRONT_FIDELITY_INSPECTOR_VERSION},
  'responsive-inheritance':{authority:'builder-template-system',source:'storefront-responsive-inheritance',contract:STOREFRONT_RESPONSIVE_INHERITANCE_INTELLIGENCE_VERSION},
  'visual-diff':{authority:'builder-template-system',source:'storefront-visual-diff-intelligence'},
  'fidelity-accessibility':{authority:'builder-template-system',source:'storefront-fidelity-accessibility',contract:STOREFRONT_FIDELITY_INSPECTOR_VERSION},
  'media-planning':{authority:'builder-template-system',source:'template-factory-media-planner'},
  'route-integrity':{authority:'builder-template-system',source:'storefront-route-integrity'},
  'commerce-readiness':{authority:'builder-template-system',source:'template-factory-commerce-readiness'},
  showroom:{authority:'builder-template-system',source:'storefront-showroom-contract'},
  performance:{authority:'builder-template-system',source:'storefront-performance-contract'},
  'page-inventory':{authority:'builder-template-system',source:'builder-page-inventory'},
  'design-guard':{authority:'builder-template-system',source:'storefront-fidelity-design-guard',contract:STOREFRONT_FIDELITY_INSPECTOR_VERSION},
});

function canonical(value:unknown):string{
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value as Record<string,unknown>).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  }
  return JSON.stringify(value)??'null';
}

function digest(value:unknown){
  let hash=2166136261;
  const serialized=canonical(value);
  for(let index=0;index<serialized.length;index+=1){hash^=serialized.charCodeAt(index);hash=Math.imul(hash,16777619);}
  return(hash>>>0).toString(16).padStart(8,'0');
}

function deepFreeze<T>(value:T):T{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  return value;
}

const stateRank:Readonly<Record<StorefrontPublishReadinessState,number>>=Object.freeze({PASS:0,UNKNOWN:1,BLOCK:2});
const stateFromSeverity=(severity:'warning'|'error'):StorefrontPublishReadinessState=>severity==='error'?'BLOCK':'PASS';

function walkNodes(document:StorefrontPageDocument){
  const nodes:StorefrontComponentNode[]=[];
  const walk=(node:StorefrontComponentNode)=>{nodes.push(node);for(const child of node.children??[])walk(child);};
  for(const section of document.sections)walk(section);
  return nodes;
}

function targetMatches(target:EvidenceTarget,document:StorefrontPageDocument){
  return target.templateKey===document.templateKey&&target.templateVersion===document.templateVersion;
}

function pageTypeFromPath(path:string):StorefrontBuilderPageType|undefined{
  for(const pageType of STOREFRONT_PAGE_TYPES){
    if(path.includes(`pages.${pageType}`)||path.includes(`surfaces.${pageType}`))return pageType;
  }
  return undefined;
}

type FindingDraft=Omit<StorefrontPublishReadinessFinding,'id'>;

export function inspectStorefrontPublishReadiness(input:{
  document:StorefrontPageDocument;
  pages?:readonly StorefrontPublishReadinessPageInventoryRow[]|null;
  draft?:{dirty:boolean;draftRevision:number|null}|null;
  exactSourceCommit?:string|null;
  external?:StorefrontPublishReadinessExternalEvidence|null;
}):StorefrontPublishReadinessResult{
  const{document}=input;
  const target={pageKey:document.pageKey,pageType:document.pageType,templateKey:document.templateKey,templateVersion:document.templateVersion};
  const findings:StorefrontPublishReadinessFinding[]=[];
  const evidenceByCategory=new Map<StorefrontPublishReadinessCategory,Map<string,StorefrontPublishReadinessEvidence>>();
  const observedSources=new Map<StorefrontPublishReadinessCategory,Set<string>>();

  const mark=(category:StorefrontPublishReadinessCategory,sourceId:string,evidence:StorefrontPublishReadinessEvidence)=>{
    if(!evidenceByCategory.has(category))evidenceByCategory.set(category,new Map());
    evidenceByCategory.get(category)!.set(sourceId,deepFreeze({...evidence}));
    if(!observedSources.has(category))observedSources.set(category,new Set());
    observedSources.get(category)!.add(sourceId);
  };
  const add=(draft:FindingDraft)=>{
    const normalized=deepFreeze({
      ...draft,
      location:{...draft.location},
      evidence:{...draft.evidence,provenance:draft.evidence.provenance?{...draft.evidence.provenance}:undefined},
    });
    findings.push(deepFreeze({id:`readiness:${digest(normalized)}`,...normalized}));
  };
  const markFromSource=(category:StorefrontPublishReadinessCategory,sourceId:string,override:Partial<StorefrontPublishReadinessEvidence>={})=>{
    const source=SOURCE_META[sourceId]??{authority:'builder-template-system',source:sourceId};
    mark(category,sourceId,{...source,...override});
  };
  const identityBlock=(category:StorefrontPublishReadinessCategory,sourceId:string,targetValue:EvidenceTarget,contract?:string)=>{
    add({
      category,state:'BLOCK',severity:'error',repairability:'none',
      reason:`A bizonyíték template identityje (${targetValue.templateKey}@${targetValue.templateVersion}) eltér az aktív dokumentumtól (${document.templateKey}@${document.templateVersion}).`,
      location:{pageKey:document.pageKey,pageType:document.pageType},
      evidence:{...(SOURCE_META[sourceId]??{authority:'builder-template-system',source:sourceId}),contract,code:'PUBLISH_READINESS_EVIDENCE_IDENTITY_DRIFT'},
    });
  };

  const fidelity=inspectStorefrontFidelityBuilder(document);
  markFromSource('responsive-inheritance','fidelity-layout');
  markFromSource('accessibility','fidelity-accessibility');
  markFromSource('media','fidelity-accessibility');
  markFromSource('links','fidelity-accessibility');
  markFromSource('required-content','fidelity-accessibility');
  markFromSource('performance','performance');
  markFromSource('design-integrity','design-guard');

  for(const issue of fidelity.layout.issues){
    add({
      category:'responsive-inheritance',state:stateFromSeverity(issue.severity),severity:issue.severity,
      reason:issue.message,repairability:'structured-diagnostic',
      location:{pageKey:document.pageKey,pageType:document.pageType,viewport:issue.viewport,nodeId:issue.nodeId,componentKey:issue.componentKey},
      evidence:{authority:'builder-template-system',source:'storefront-fidelity-layout',contract:fidelity.inspectorVersion,code:issue.code},
    });
  }

  for(const node of walkNodes(document)){
    try{
      const inheritance=inspectStorefrontResponsiveInheritance(document,node.id);
      markFromSource('responsive-inheritance','responsive-inheritance',{contract:inheritance.version});
      for(const issue of inheritance.diagnostics){
        add({
          category:'responsive-inheritance',state:'PASS',severity:'warning',reason:issue.message,
          repairability:issue.safeReset?'structured-diagnostic':'manual-review',
          location:{pageKey:document.pageKey,pageType:document.pageType,viewport:issue.viewport,nodeId:issue.nodeId,path:`responsive.${issue.dimension}`},
          evidence:{authority:'builder-template-system',source:'storefront-responsive-inheritance',contract:inheritance.version,code:issue.code},
        });
      }
    }catch(reason){
      markFromSource('responsive-inheritance','responsive-inheritance');
      add({
        category:'responsive-inheritance',state:'BLOCK',severity:'error',repairability:'none',
        reason:reason instanceof Error?reason.message:'A reszponzív öröklődés vizsgálata sikertelen.',
        location:{pageKey:document.pageKey,pageType:document.pageType,nodeId:node.id},
        evidence:{authority:'builder-template-system',source:'storefront-responsive-inheritance',contract:STOREFRONT_RESPONSIVE_INHERITANCE_INTELLIGENCE_VERSION,code:'PUBLISH_READINESS_INHERITANCE_INSPECTION_FAILED'},
      });
    }
  }

  for(const issue of fidelity.accessibility.issues){
    const base:FindingDraft={
      category:'accessibility',state:stateFromSeverity(issue.severity),severity:issue.severity,
      reason:issue.message,repairability:'structured-diagnostic',
      location:{pageKey:document.pageKey,pageType:document.pageType,nodeId:issue.nodeId,componentKey:issue.componentKey},
      evidence:{authority:'builder-template-system',source:'storefront-fidelity-accessibility',contract:fidelity.inspectorVersion,code:issue.code},
    };
    add(base);
    if(issue.code.startsWith('ACCESSIBILITY_IMAGE_'))add({...base,category:'media'});
    if(issue.code.includes('HREF')||issue.code.includes('CONTROL_LABEL'))add({...base,category:'links'});
    if(issue.code.includes('HEADING'))add({...base,category:'required-content'});
  }

  for(const issue of fidelity.performance.issues){
    add({
      category:'performance',state:stateFromSeverity(issue.severity),severity:issue.severity,
      reason:`${issue.metric}: ${issue.actual} (keret: ${issue.limit}).`,repairability:'structured-diagnostic',
      location:{pageKey:document.pageKey,pageType:document.pageType,path:`performance.${issue.metric}`},
      evidence:{authority:'builder-template-system',source:'storefront-performance-contract',code:issue.code},
    });
  }

  if(fidelity.designGuard.mode==='off'){
    add({
      category:'design-integrity',state:'PASS',severity:'warning',repairability:'structured-diagnostic',
      reason:'A Design Guard ki van kapcsolva; a readiness ezt figyelmeztetésként őrzi meg, nem hamis blokkolóként.',
      location:{pageKey:document.pageKey,pageType:document.pageType,path:'metadata.fidelity.designGuard'},
      evidence:{authority:'builder-template-system',source:'storefront-fidelity-design-guard',contract:fidelity.inspectorVersion,code:'PUBLISH_READINESS_DESIGN_GUARD_OFF'},
    });
  }

  if(input.draft){
    markFromSource('document-state','draft-state');
    if(input.draft.dirty||!input.draft.draftRevision){
      add({
        category:'document-state',state:'BLOCK',severity:'error',repairability:'structured-diagnostic',
        reason:input.draft.dirty?'A módosításokat menteni kell a közzétételi döntés előtt.':'Nincs mentett piszkozat.',
        location:{pageKey:document.pageKey,pageType:document.pageType},
        evidence:{authority:'builder-template-system',source:'builder-draft-state',code:input.draft.dirty?'PUBLISH_READINESS_DRAFT_DIRTY':'PUBLISH_READINESS_DRAFT_MISSING'},
      });
    }
  }

  if(input.pages){
    markFromSource('page-route-completeness','page-inventory',{provenance:{templateKey:document.templateKey,templateVersion:document.templateVersion}});
    const canonicalTypes=new Set<string>(STOREFRONT_PAGE_TYPES);
    for(const row of input.pages){
      if(row.draftTemplateKey===document.templateKey&&row.draftTemplateVersion===document.templateVersion&&!canonicalTypes.has(row.pageType)){
        add({
          category:'page-route-completeness',state:'BLOCK',severity:'error',repairability:'structured-diagnostic',
          reason:`Ismeretlen page type található az aktív template inventoryban: ${row.pageType}.`,
          location:{pageKey:row.pageKey,pageType:row.pageType,path:`pages.${row.pageKey}`},
          evidence:{authority:'builder-template-system',source:'builder-page-inventory',code:'PUBLISH_READINESS_PAGE_TYPE_UNKNOWN'},
        });
      }
    }
    for(const pageType of STOREFRONT_PAGE_TYPES){
      const candidates=input.pages.filter(row=>row.pageType===pageType);
      const current=candidates.filter(row=>row.draftRevision!==null&&row.draftTemplateKey===document.templateKey&&row.draftTemplateVersion===document.templateVersion);
      if(current.length===0){
        add({
          category:'page-route-completeness',state:'BLOCK',severity:'error',repairability:'structured-diagnostic',
          reason:candidates.length
            ?`A(z) ${pageType} oldal létezik, de nincs az aktív ${document.templateKey}@${document.templateVersion} identityhez tartozó mentett piszkozata.`
            :`Hiányzik a canonical ${pageType} oldal.`,
          location:{pageType,path:`pages.${pageType}`},
          evidence:{authority:'builder-template-system',source:'builder-page-inventory',code:candidates.length?'PUBLISH_READINESS_PAGE_IDENTITY_MISMATCH':'PUBLISH_READINESS_PAGE_MISSING'},
        });
      }else if(current.length>1){
        add({
          category:'page-route-completeness',state:'BLOCK',severity:'error',repairability:'structured-diagnostic',
          reason:`A(z) ${pageType} canonical page type többször szerepel az aktív template inventoryban.`,
          location:{pageType,path:`pages.${pageType}`},
          evidence:{authority:'builder-template-system',source:'builder-page-inventory',code:'PUBLISH_READINESS_PAGE_DUPLICATE'},
        });
      }
    }
  }

  const external=input.external??{};

  if(external.visualDiff){
    const visual=external.visualDiff;
    markFromSource('visual-drift','visual-diff',{contract:visual.contract,provenance:{sourceCommit:visual.target.sourceCommit,templateKey:visual.target.templateKey,templateVersion:visual.target.templateVersion}});
    if(!targetMatches(visual.target,document))identityBlock('visual-drift','visual-diff',visual.target,visual.contract);
    if(!input.exactSourceCommit){
      add({
        category:'visual-drift',state:'UNKNOWN',severity:'unknown',repairability:'none',
        reason:'A Visual Diff evidence jelenlegi exact-head azonossága nincs megadva; frissesség nélkül nem lehet PASS.',
        location:{pageKey:document.pageKey,pageType:document.pageType},
        evidence:{authority:'builder-template-system',source:'storefront-visual-diff-intelligence',contract:visual.contract,code:'PUBLISH_READINESS_VISUAL_EXACT_HEAD_UNKNOWN',provenance:{sourceCommit:visual.target.sourceCommit}},
      });
    }else if(visual.target.sourceCommit!==input.exactSourceCommit){
      add({
        category:'visual-drift',state:'BLOCK',severity:'error',repairability:'none',
        reason:'A Visual Diff evidence source commitje nem egyezik az elvárt exact-head identityvel.',
        location:{pageKey:document.pageKey,pageType:document.pageType},
        evidence:{authority:'builder-template-system',source:'storefront-visual-diff-intelligence',contract:visual.contract,code:'PUBLISH_READINESS_VISUAL_SOURCE_STALE',provenance:{sourceCommit:visual.target.sourceCommit,expectedSourceCommit:input.exactSourceCommit}},
      });
    }
    for(const issue of visual.issues as readonly StorefrontVisualDiffManifestIssue[]){
      add({
        category:'visual-drift',state:'BLOCK',severity:'error',repairability:'none',reason:issue.message,
        location:{pageKey:document.pageKey,pageType:document.pageType,path:issue.path},
        evidence:{authority:'builder-template-system',source:'storefront-visual-diff-intelligence',contract:visual.contract,code:issue.code,provenance:{sourceCommit:visual.target.sourceCommit}},
      });
    }
    for(const item of visual.cases as readonly StorefrontVisualDiffManifestCase[]){
      for(const diagnostic of item.diagnostics){
        const warningState:StorefrontPublishReadinessState=
          diagnostic.evidenceClass==='evidence-integrity'||diagnostic.evidenceClass==='unclassified'?'UNKNOWN':'PASS';
        const state=diagnostic.severity==='error'?'BLOCK':warningState;
        const finding:FindingDraft={
          category:'visual-drift',state,severity:diagnostic.severity,reason:diagnostic.raw,
          repairability:diagnostic.repairability,
          location:{pageType:item.pageType,viewport:item.viewport},
          evidence:{
            authority:'builder-template-system',source:'storefront-visual-diff-intelligence',contract:visual.contract,code:diagnostic.code,
            provenance:{
              sourceCommit:item.provenance.sourceCommit,
              originSourceCommit:item.provenance.originSourceCommit,
              evidenceExecution:item.provenance.evidenceExecution,
              fingerprintEquivalent:item.provenance.fingerprintEquivalent,
              structuredCause:diagnostic.structuredCause,
            },
          },
        };
        add(finding);
        if(diagnostic.category==='media-broken')add({...finding,category:'media'});
        if(diagnostic.category==='layout-overflow'||diagnostic.category==='layout-protrusion')add({...finding,category:'responsive-inheritance'});
      }
    }
    if(!visual.valid){
      add({
        category:'visual-drift',state:'BLOCK',severity:'error',repairability:'none',
        reason:'A Visual Diff evidence manifest érvénytelen; részleges vagy sérült evidence nem lehet readiness PASS.',
        location:{pageKey:document.pageKey,pageType:document.pageType},
        evidence:{authority:'builder-template-system',source:'storefront-visual-diff-intelligence',contract:visual.contract,code:'PUBLISH_READINESS_VISUAL_EVIDENCE_INVALID',provenance:{sourceCommit:visual.target.sourceCommit}},
      });
    }else if(!visual.clean&&!visual.issues.length&&!visual.cases.some(item=>item.diagnostics.length)){
      add({
        category:'visual-drift',state:'UNKNOWN',severity:'unknown',repairability:'manual-review',
        reason:'A Visual Diff manifest nem clean, de nem adott lokalizált diagnosztikát; kézi review szükséges.',
        location:{pageKey:document.pageKey,pageType:document.pageType},
        evidence:{authority:'builder-template-system',source:'storefront-visual-diff-intelligence',contract:visual.contract,code:'PUBLISH_READINESS_VISUAL_UNEXPLAINED_NONCLEAN',provenance:{sourceCommit:visual.target.sourceCommit}},
      });
    }
  }

  if(external.routeIntegrity){
    const route=external.routeIntegrity;
    markFromSource('links','route-integrity',{contract:route.contract,provenance:{templateKey:route.target.templateKey,templateVersion:route.target.templateVersion}});
    markFromSource('page-route-completeness','route-integrity',{contract:route.contract,provenance:{templateKey:route.target.templateKey,templateVersion:route.target.templateVersion}});
    if(!targetMatches(route.target,document)){
      identityBlock('links','route-integrity',route.target,route.contract);
      identityBlock('page-route-completeness','route-integrity',route.target,route.contract);
    }
    for(const issue of route.issues){
      const draft:FindingDraft={
        category:'links',state:'BLOCK',severity:'error',repairability:'structured-diagnostic',reason:issue.message,
        location:{pageType:pageTypeFromPath(issue.path),path:issue.path,href:issue.href},
        evidence:{authority:'builder-template-system',source:'storefront-route-integrity',contract:route.contract,code:issue.code},
      };
      add(draft);
      add({...draft,category:'page-route-completeness'});
    }
  }

  if(external.showroom){
    const showroom=external.showroom;
    markFromSource('required-content','showroom',{contract:showroom.contract,provenance:{templateKey:showroom.target.templateKey,templateVersion:showroom.target.templateVersion}});
    markFromSource('page-route-completeness','showroom',{contract:showroom.contract,provenance:{templateKey:showroom.target.templateKey,templateVersion:showroom.target.templateVersion}});
    if(!targetMatches(showroom.target,document)){
      identityBlock('required-content','showroom',showroom.target,showroom.contract);
      identityBlock('page-route-completeness','showroom',showroom.target,showroom.contract);
    }
    for(const issue of showroom.issues){
      let category:StorefrontPublishReadinessCategory='page-route-completeness';
      if(issue.code==='SHOWROOM_PLACEHOLDER_CONTENT'||issue.code==='SHOWROOM_PAGE_EMPTY')category='required-content';
      else if(issue.code==='SHOWROOM_ENGINE_DEMO_MISSING')category='commerce';
      add({
        category,state:'BLOCK',severity:'error',repairability:'structured-diagnostic',reason:issue.message,
        location:{pageType:pageTypeFromPath(issue.path),path:issue.path},
        evidence:{authority:'builder-template-system',source:'storefront-showroom-contract',contract:showroom.contract,code:issue.code},
      });
    }
  }

  if(external.mediaPlanning){
    const media=external.mediaPlanning;
    markFromSource('media','media-planning',{contract:media.contract,provenance:{templateKey:media.target.templateKey,templateVersion:media.target.templateVersion}});
    if(!targetMatches(media.target,document))identityBlock('media','media-planning',media.target,media.contract);
    for(const issue of media.result.issues){
      add({
        category:'media',state:'BLOCK',severity:'error',repairability:'structured-diagnostic',reason:issue.message,
        location:{path:issue.path},
        evidence:{authority:'builder-template-system',source:'template-factory-media-planner',contract:media.contract,code:issue.code},
      });
    }
    if(!media.result.valid||!media.result.readyFulfilled){
      const repair=media.result.repairs[0];
      add({
        category:'media',state:'BLOCK',severity:'error',
        repairability:repair?'structured-diagnostic':'manual-review',
        reason:repair?.message??(!media.result.valid?'A Media Planner evidence érvénytelen.':'A kötelező médiaelemek nem érték el a ready állapotot.'),
        location:{path:repair?.assetKey?`media.assets.${repair.assetKey}`:'media'},
        evidence:{authority:'builder-template-system',source:'template-factory-media-planner',contract:media.contract,code:!media.result.valid?'PUBLISH_READINESS_MEDIA_PLAN_INVALID':'PUBLISH_READINESS_MEDIA_NOT_READY'},
      });
    }
  }

  if(external.commerce){
    const commerce=external.commerce;
    markFromSource('commerce','commerce-readiness',{contract:commerce.contract,provenance:{templateKey:commerce.target.templateKey,templateVersion:commerce.target.templateVersion}});
    if(!targetMatches(commerce.target,document))identityBlock('commerce','commerce-readiness',commerce.target,commerce.contract);
    if(!commerce.complete){
      add({
        category:'commerce',state:'UNKNOWN',severity:'unknown',repairability:'none',
        reason:'A commerce readiness evidence részleges; hiányos evidence nem lehet PASS.',
        location:{pageKey:document.pageKey,pageType:document.pageType},
        evidence:{authority:'builder-template-system',source:'template-factory-commerce-readiness',contract:commerce.contract,code:'PUBLISH_READINESS_COMMERCE_EVIDENCE_INCOMPLETE'},
      });
    }
    for(const issue of commerce.issues){
      add({
        category:'commerce',state:stateFromSeverity(issue.severity),severity:issue.severity,repairability:'structured-diagnostic',
        reason:issue.message,location:{pageType:pageTypeFromPath(issue.path),path:issue.path},
        evidence:{authority:'builder-template-system',source:'template-factory-commerce-readiness',contract:commerce.contract,code:issue.code},
      });
    }
  }

  for(const category of STOREFRONT_PUBLISH_READINESS_CATEGORIES){
    const observed=observedSources.get(category)??new Set<string>();
    for(const sourceId of REQUIRED_SOURCES[category]){
      if(observed.has(sourceId))continue;
      const meta=SOURCE_META[sourceId]??{authority:'builder-template-system',source:sourceId};
      add({
        category,state:'UNKNOWN',severity:'unknown',repairability:'none',
        reason:`Hiányzik a kötelező evidence: ${meta.source}. UNKNOWN nem számíthat PASS-nak.`,
        location:{pageKey:document.pageKey,pageType:document.pageType},
        evidence:{...meta,code:'PUBLISH_READINESS_REQUIRED_EVIDENCE_MISSING'},
      });
    }
  }

  const orderedFindings=[...new Map(findings.map(item=>[item.id,item] as const)).values()].sort((left,right)=>
    left.category.localeCompare(right.category)||stateRank[right.state]-stateRank[left.state]||left.id.localeCompare(right.id)
  );

  const categories=STOREFRONT_PUBLISH_READINESS_CATEGORIES.map(category=>{
    const categoryFindings=orderedFindings.filter(item=>item.category===category);
    const categoryEvidence=[...(evidenceByCategory.get(category)?.values()??[])].sort((a,b)=>a.source.localeCompare(b.source));
    const state:StorefrontPublishReadinessState=categoryFindings.some(item=>item.state==='BLOCK')
      ?'BLOCK'
      :categoryFindings.some(item=>item.state==='UNKNOWN')
        ?'UNKNOWN'
        :'PASS';
    return deepFreeze({
      category,label:CATEGORY_LABELS[category],state,
      evidence:Object.freeze(categoryEvidence),
      findings:Object.freeze(categoryFindings),
    });
  });
  const decision:StorefrontPublishReadinessState=categories.some(item=>item.state==='BLOCK')
    ?'BLOCK'
    :categories.some(item=>item.state==='UNKNOWN')
      ?'UNKNOWN'
      :'PASS';
  const byState:Record<StorefrontPublishReadinessState,number>={PASS:0,BLOCK:0,UNKNOWN:0};
  for(const category of categories)byState[category.state]+=1;

  return deepFreeze({
    contract:STOREFRONT_PUBLISH_READINESS_VERSION,
    target,
    decision,
    categories:Object.freeze(categories),
    findings:Object.freeze(orderedFindings),
    summary:{
      blockers:orderedFindings.filter(item=>item.state==='BLOCK').length,
      unknowns:orderedFindings.filter(item=>item.state==='UNKNOWN').length,
      warnings:orderedFindings.filter(item=>item.severity==='warning').length,
      byState:Object.freeze(byState),
    },
  });
}
