export type ReferenceCandidate={
  kind:string;
  value:string;
  severity:'block'|'review'|string;
  originFile:string;
  [key:string]:unknown;
};
export type ReferenceConsumer={
  file:string;
  line?:number;
  text?:string;
  source?:string;
  [key:string]:unknown;
};
export function exportsRemovedAcrossPathChange(beforeSource:string,afterSource:string):string[];
export function extractReferenceCandidatesFromLine(line:string,file:string):ReferenceCandidate[];
export function reconcileReferenceRelocations(
  candidates:ReferenceCandidate[],
  addedCandidates:ReferenceCandidate[]
):{
  remaining:ReferenceCandidate[];
  relocations:Array<{kind:string;value:string;fromFile:string;toFiles:string[]}>;
};
export function evaluateCandidateConsumers(
  candidates:ReferenceCandidate[],
  beforeConsumers:ReferenceConsumer[],
  afterConsumers:ReferenceConsumer[]
):Array<{
  reference:ReferenceCandidate;
  staleConsumers:ReferenceConsumer[];
  reviewConsumers?:ReferenceConsumer[];
  [key:string]:unknown;
}>;
export function evaluateReferenceSynchronization(input:{base:string;head:string}):{
  staleConsumers:ReferenceConsumer[];
  reviewConsumers:ReferenceConsumer[];
  relocatedReferences?:Array<{kind:string;value:string;fromFile:string;toFiles:string[]}>;
  [key:string]:unknown;
};
