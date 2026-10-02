export type AtlasNode={
  path:string;
  domains:string[];
  authorities?:string[];
  imports?:string[];
  [key:string]:unknown;
};

export type SemanticNode={
  id:string;
  kind:string;
  file?:string|null;
  name?:string;
  [key:string]:unknown;
};

export type SemanticEdge={
  from:string;
  to:string;
  type:string;
  fromFile?:string|null;
  toFile?:string|null;
  label?:string;
  [key:string]:unknown;
};

export type CodebaseAtlas={
  contract:string;
  nodes:AtlasNode[];
  semanticGraph:{
    nodes:SemanticNode[];
    edges:SemanticEdge[];
    unknowns:unknown[];
    reverseFileEdges?:Record<string,string[]>;
    [key:string]:unknown;
  };
  summary:{
    typeCheckerAvailable:boolean;
    semanticNodes:number;
    indexedNodes:number;
    semanticEdges:number;
    importEdges:number;
    [key:string]:unknown;
  };
  reverseImports?:Record<string,string[]>;
  literalIndex?:Record<string,string[]>;
  exportIndex?:Record<string,string[]>;
  referenceIndex?:Record<string,string[]>;
  knownFailureIndex?:Record<string,unknown>;
  poInstructions?:Array<Record<string,unknown>>;
  unresolvedInternalImports?:Array<Record<string,unknown>>;
  [key:string]:unknown;
};

export function extractImports(file:string,source?:string):unknown;
export function domainDependencyClosure(domainIds:string[]):string[];
export function buildCodebaseAtlas():CodebaseAtlas;
export function classifyAtlasPath(file:string):{
  path:string;
  route:{path:string;kind:string}|null;
  subsystems:string[];
  surfaces:string[];
  domains:string[];
  authorities:string[];
  truthKeys:string[];
};
export function impactForAtlasPattern(atlas:CodebaseAtlas|Record<string,unknown>,pattern:string):{
  matchedFiles:string[];
  consumers:string[];
  tests:string[];
  authorities:string[];
  [key:string]:unknown;
};
export function releaseClosureForAtlasPatterns(atlas:CodebaseAtlas,patterns:string[]):Record<string,unknown>;
export function lookupAtlasTerm(atlas:CodebaseAtlas,term:string):unknown;
export function reconcileAuthorityDependencies(atlas:CodebaseAtlas|Record<string,unknown>):{
  contract:string;
  decision:'PASS'|'BLOCK';
  discrepancies:Array<Record<string,unknown>>;
  edges:Array<Record<string,unknown>>;
  learningCandidates:Array<Record<string,unknown>>;
  learningMode:string;
  [key:string]:unknown;
};
export function buildExecutionRoute(atlas:CodebaseAtlas,patterns:string[],options?:{tombstones?:string[];plannedDeletions?:string[];plannedAdditions?:string[]}):{
  MUST_EDIT:string[];
  TOMBSTONES:string[];
  PLANNED_DELETIONS:string[];
  PLANNED_ADDITIONS:string[];
  INSTRUCTION_REQUIRED:string[];
  INSTRUCTION_REQUIREMENTS:Array<Record<string,unknown>>;
  FORBIDDEN_ROUTE_TOMBSTONES:string[];
  PLANNED_FORBIDDEN_ROUTE_DELETIONS:string[];
  MAY_EDIT:string[];
  IMPACTED_READ_ONLY:string[];
  AUTHORITY:string[];
  OVERRIDE_LEGACY_ALTERNATE:string[];
  PROOF:string[];
  PO_INSTRUCTIONS:string[];
  UNKNOWN:unknown[];
  decision:'PASS'|'BLOCK';
  [key:string]:unknown;
};
export function resolveAtlasArchitectureForPath(atlas:CodebaseAtlas,file:string,options?:{tombstones?:string[];plannedDeletions?:string[];plannedAdditions?:string[];plannedOwnership?:Array<{path:string;domain:string;owner:string;registry:string}>;executionRoute?:Record<string,any>|null}):{
  path:string;
  pathDerived:{domains:string[];authorities:string[]};
  plannedArchitectureAuthority?:{domains:string[];authorities:string[];declarations:Array<{path:string;domain:string;owner:string;registry:string}>};
  routeAuthority:{path:string;kind:string;state:string}|null;
  poInstructionAuthority:{instructionIds:string[];governsDeletion:boolean;authorizesPlannedDeletion?:boolean};
  resolved:boolean;
};
export function applicablePoInstructions(atlas:CodebaseAtlas,files:string[]):Array<Record<string,unknown>>;
export function evaluatePoInstructionStates(atlas:CodebaseAtlas,files:string[]):Record<string,unknown>;
export function validateCodebaseAtlas(atlas:CodebaseAtlas):{issues:unknown[];[key:string]:unknown};
export function writeCodebaseAtlasArtifacts(atlas:CodebaseAtlas):void;
