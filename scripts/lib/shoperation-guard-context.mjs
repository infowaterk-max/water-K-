import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';

export const GUARD_CONTEXT_PATH='artifacts/shoperation-development-guard/guard-context.json';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const readJsonIfExists=file=>existsSync(file)?readJson(file):null;
const guardRegistry=()=>readJson('quality/knowledge/guard-registry.v1.json');

function parseTemplateFactoryAuthorities(){
  const source=readFileSync('src/lib/builder/template-factory/knowledge-registry.ts','utf8');
  return [...source.matchAll(/\{id:'(TF-AUTH-\d+)',subject:'([^']*)',owner:'([^']*)',delegates:\[([^\]]*)\],rule:'([^']*)'\}/g)]
    .map(match=>({
      id:match[1],
      subject:match[2],
      owner:match[3],
      delegates:[...match[4].matchAll(/'([^']+)'/g)].map(item=>item[1]),
      rule:match[5],
    }));
}

function exactEvidencePath(value){
  return typeof value==='string'&&!/[\*{[]/.test(value)?value:null;
}

function evidenceSnapshot(){
  const guards=guardRegistry().guards??[];
  return guards.map(guard=>{
    const file=exactEvidencePath(guard.evidence);
    const evidence=file?readJsonIfExists(file):null;
    return {
      id:guard.id,
      responsibilityKey:guard.responsibilityKey,
      authority:guard.authority,
      blocking:Boolean(guard.blocking),
      evidencePath:file,
      available:Boolean(evidence),
      decision:evidence?.decision??null,
      taskId:evidence?.taskId??null,
      head:evidence?.head??evidence?.sourceCommit??null,
    };
  });
}

export function buildGuardContext(){
  const registry=guardRegistry();
  const knowledge=readJson('quality/knowledge/shoperation-quality-knowledge.v1.json');
  const domains=readJson('quality/knowledge/domain-foundations.v1.json');
  const plan=readJson('quality/development/active-plan.json');
  const ledger=readJsonIfExists('quality/development/instruction-ledger.v1.json');
  return {
    contract:'shoporation.guard-context.v1',
    taskId:plan.taskId??null,
    guardRegistryContract:registry.contract,
    principles:registry.principles,
    authorities:{
      global:knowledge.authorityRules??[],
      templateFactory:parseTemplateFactoryAuthorities(),
      domains:(domains.domains??[]).map(item=>({
        id:item.id,
        owner:item.owner,
        canonicalPaths:item.canonicalPaths??[],
        boundaryRules:item.boundaryRules??[],
      })),
    },
    knowledge:{
      knownFailureIds:(knowledge.knownFailures??[]).map(item=>item.id),
      globalBaselineFailureIds:knowledge.globalBaselineFailureIds??[],
    },
    plan:{
      expectedDomains:plan.expectedDomains??[],
      expectedAuthorities:plan.expectedAuthorities??[],
      expectedSubsystems:plan.expectedSubsystems??[],
      expectedKnownFailureIds:plan.expectedKnownFailureIds??[],
    },
    instructions:(ledger?.instructions??[]).map(item=>({
      id:item.id,
      state:item.state,
      request:item.request,
      authorityRuleIds:item.authorityRuleIds??[],
    })),
    evidence:evidenceSnapshot(),
  };
}

export function predecessorIssues(guardId){
  const registry=guardRegistry();
  const guard=(registry.guards??[]).find(item=>item.id===guardId);
  if(!guard)return[{code:'GUARD_CONTEXT_GUARD_NOT_REGISTERED',guardId}];
  const issues=[];
  for(const dependencyId of guard.consumesEvidenceFrom??[]){
    const dependency=(registry.guards??[]).find(item=>item.id===dependencyId);
    if(!dependency){
      issues.push({code:'GUARD_CONTEXT_DEPENDENCY_NOT_REGISTERED',guardId,dependencyId});
      continue;
    }
    const evidencePath=exactEvidencePath(dependency.evidence);
    const evidence=evidencePath?readJsonIfExists(evidencePath):null;
    if(!evidence){
      issues.push({code:'GUARD_CONTEXT_DEPENDENCY_EVIDENCE_MISSING',guardId,dependencyId,evidencePath});
      continue;
    }
    if(evidence.decision!=='PASS'){
      issues.push({code:'GUARD_CONTEXT_DEPENDENCY_NOT_PASS',guardId,dependencyId,decision:evidence.decision??null});
    }
  }
  return issues;
}

export function authorityRule(ruleId){
  const context=buildGuardContext();
  return [...context.authorities.global,...context.authorities.templateFactory].find(item=>item.id===ruleId)??null;
}

export function publishGuardContext(guardId,report){
  mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
  const context=buildGuardContext();
  const guard=(guardRegistry().guards??[]).find(item=>item.id===guardId)??null;
  const payload={
    ...context,
    currentGuard:{
      id:guardId,
      responsibilityKey:guard?.responsibilityKey??null,
      decision:report?.decision??null,
      consumedEvidenceFrom:guard?.consumesEvidenceFrom??[],
      authoritySources:guard?.authoritySources??[],
    },
  };
  writeFileSync(GUARD_CONTEXT_PATH,JSON.stringify(payload,null,2)+'\n');
  return payload;
}
