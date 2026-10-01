export type OperationalIssue={code:string;[key:string]:unknown};

export function validateOperationalIntelligence(input:{
  plan:any;
  policy:any;
  guardIds:string[];
}):{
  issues:OperationalIssue[];
  [key:string]:unknown;
};

export function evaluateCompletionTruth(input:{
  plan:any;
  evidence:any[];
  currentExactState:{head:string;branch:string;stateVersion:string};
}):{
  contract?:string;
  decision:'PASS'|'BLOCK';
  truthStatus:'VERIFIED'|'PARTIAL'|'MISSING'|'STALE'|'FAILED'|'OVERCLAIM'|'UNKNOWN'|string;
  internalState:string;
  poStatus:string;
  requirementResults:Array<any>;
  issues:Array<any>;
  [key:string]:unknown;
};

export function buildClosedDevelopmentPlan(input:{
  plan:any;
  truthReport:any;
  currentHead:string;
  closedAt?:string;
}):any;

export function evaluateClosedDevelopmentPlan(input:{
  plan:any;
  currentExactState:{head:string;branch:string;stateVersion:string};
  changedSinceVerified:string[];
  verifiedHeadIsAncestor:boolean;
  planIssues?:any[];
}):{
  decision:'PASS'|'BLOCK';
  truthStatus:string;
  issues:Array<any>;
  [key:string]:unknown;
};
