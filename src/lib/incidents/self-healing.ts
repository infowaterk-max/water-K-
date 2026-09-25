export type SelfHealingMode='observe'|'propose'|'auto';
export type SelfHealingRisk='low'|'medium'|'high';
export type SelfHealingActorKind='platform'|'system'|'ai';
export type IncidentRunbook={
  key:string;
  label:string;
  risk:SelfHealingRisk;
  allowedModes:readonly SelfHealingMode[];
  autoAllowed:boolean;
  autoActorKinds?:readonly SelfHealingActorKind[];
  repairKind:'configuration'|'data'|'runbook'|'code_pr';
  targetAuthority:string;
  requiresRoutePath?:boolean;
};

export const INCIDENT_RUNBOOKS=Object.freeze({
  'observability.recheck':Object.freeze({key:'observability.recheck',label:'Observability jel újraellenőrzése',risk:'low',allowedModes:['observe','propose'],autoAllowed:false,repairKind:'runbook',targetAuthority:'observability'} satisfies IncidentRunbook),
  'storefront.cache.revalidate':Object.freeze({key:'storefront.cache.revalidate',label:'Storefront cache újraérvényesítése',risk:'low',allowedModes:['propose','auto'],autoAllowed:true,autoActorKinds:['system'],repairKind:'runbook',targetAuthority:'next.cache',requiresRoutePath:true} satisfies IncidentRunbook),
  'code.repair.pr':Object.freeze({key:'code.repair.pr',label:'Kódjavítás repair branch / PR útvonalon',risk:'high',allowedModes:['propose'],autoAllowed:false,repairKind:'code_pr',targetAuthority:'repository'} satisfies IncidentRunbook),
});

export type IncidentRunbookKey=keyof typeof INCIDENT_RUNBOOKS;

const SAFE_ROUTE_PATH=/^\/(?!\/)(?!.*\\)[^?#\u0000-\u001F\u007F]*$/;

export function resolveSelfHealingPolicy(input:{runbookKey:string;requestedMode:SelfHealingMode;actorKind:SelfHealingActorKind;routePath?:string|null}){
  const selected=INCIDENT_RUNBOOKS[input.runbookKey as IncidentRunbookKey];
  if(!selected)throw new Error('INCIDENT_RUNBOOK_UNKNOWN');
  const runbook:IncidentRunbook=selected;
  if(!runbook.allowedModes.includes(input.requestedMode))throw new Error('INCIDENT_RUNBOOK_MODE_FORBIDDEN');
  if(runbook.requiresRoutePath&&(!input.routePath||!SAFE_ROUTE_PATH.test(input.routePath)))throw new Error('INCIDENT_RUNBOOK_ROUTE_REQUIRED');

  const autoActorAllowed=Boolean(runbook.autoActorKinds?.includes(input.actorKind));
  if(input.requestedMode==='auto'){
    if(runbook.repairKind==='code_pr')throw new Error('INCIDENT_AUTO_HEAL_FORBIDDEN');
    if(!runbook.autoAllowed||runbook.risk!=='low'||runbook.repairKind!=='runbook')throw new Error('INCIDENT_AUTO_HEAL_FORBIDDEN');
    if(!autoActorAllowed)throw new Error('INCIDENT_AUTO_HEAL_ACTOR_FORBIDDEN');
  }

  const autoEligible=input.requestedMode==='auto'&&runbook.autoAllowed&&runbook.risk==='low'&&runbook.repairKind==='runbook'&&autoActorAllowed;
  return Object.freeze({
    ...runbook,
    actorKind:input.actorKind,
    mode:input.requestedMode,
    autoEligible,
    autoApply:autoEligible,
    executionDisposition:autoEligible?'auto-eligible':input.requestedMode==='propose'?'proposal-only':'observe-only',
    completionEvidenceRequired:true,
  });
}
