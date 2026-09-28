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
  return typeof value==='string'&&!value.includes('*')&&!value.includes('{')&&!value.includes('[')?value:null;
}

const specialistEvidencePath=guardId=>'artifacts/shoperation-control-plane/specialist-'+String(guardId).toLowerCase()+'.json';

function evidenceForGuard(guard){
  if(guard?.execution?.mode==='external-specialist'){
    const file=specialistEvidencePath(guard.id);
    return {file,evidence:readJsonIfExists(file)};
  }
  const file=exactEvidencePath(guard?.evidence);
  return {file,evidence:file?readJsonIfExists(file):null};
}

function evidenceSnapshot(){
  const guards=guardRegistry().guards??[];
  return guards.map(guard=>{
    const {file,evidence}=evidenceForGuard(guard);
    return {
      id:guard.id,
      responsibilityKey:guard.responsibilityKey,
      authority:guard.authority,
      blocking:Boolean(guard.blocking),
      evidencePath:file,
      available:Boolean(evidence),
      decision:evidence?.decision??null,
      taskId:evidence?.taskId??null,
      head:evidence?.head??evidence?.sourceHead??evidence?.sourceCommit??null,
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
    contract:'shoporation.guard-context.v2',
    controlPlane:{profile:process.env.SHOPERATION_CONTROL_PLANE_PROFILE??null,runId:process.env.SHOPERATION_CONTROL_PLANE_RUN_ID??null,activeGuards:(process.env.SHOPERATION_CONTROL_PLANE_ACTIVE_GUARDS??'').split(',').filter(Boolean)},
    taskId:plan.taskId??null,
    guardRegistryContract:registry.contract,
    principles:registry.principles,
    intelligencePolicy:registry.intelligencePolicy??null,
    authorityConflictContracts:registry.authorityConflictContracts??[],
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
  const activeIds=new Set((process.env.SHOPERATION_CONTROL_PLANE_ACTIVE_GUARDS??'').split(',').map(value=>value.trim()).filter(Boolean));
  const scoped=activeIds.size>0;
  const guard=(registry.guards??[]).find(item=>item.id===guardId);
  if(!guard)return[{code:'GUARD_CONTEXT_GUARD_NOT_REGISTERED',guardId}];
  const issues=[];
  for(const dependencyId of guard.consumesEvidenceFrom??[]){
    const dependency=(registry.guards??[]).find(item=>item.id===dependencyId);
    if(scoped&&dependency?.execution?.mode==='control-plane-managed'&&!activeIds.has(dependencyId))continue;
    if(!dependency){
      issues.push({code:'GUARD_CONTEXT_DEPENDENCY_NOT_REGISTERED',guardId,dependencyId});
      continue;
    }
    const {file:evidencePath,evidence}=evidenceForGuard(dependency);
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

const flattenNodes=(nodes,out=[])=>{for(const node of nodes??[]){out.push(node);flattenNodes(node.children??[],out)}return out;};
const instructionText=item=>[
  item?.request,
  ...(item?.acceptanceCriteria??[]),
  ...(item?.checks??[]).flatMap(check=>[check?.pageType,check?.file,check?.nodeId,check?.path,check?.value]),
].filter(Boolean).join(' ').toLocaleLowerCase('hu-HU');

function checkedTemplateNode(check){
  if(!check?.file||!check?.pageType||!check?.nodeId||!String(check.file).endsWith('.json')||!existsSync(check.file))return null;
  try{
    const pkg=readJson(check.file);
    const page=(pkg.pages??[]).find(item=>item.pageType===check.pageType);
    return page?flattenNodes(page.sections??[]).find(node=>node.id===check.nodeId)??null:null;
  }catch{return null}
}

export function authorityConflictIssues(instruction){
  const context=buildGuardContext();
  const issues=[];
  const matchedContracts=[];
  const sourceText=instructionText(instruction);
  const rules=[...context.authorities.global,...context.authorities.templateFactory];
  for(const contract of context.authorityConflictContracts??[]){
    let matcher=null;
    try{matcher=new RegExp(contract.instructionPattern,'i')}catch{
      issues.push({code:'CONTROL_PLANE_AUTHORITY_CONTRACT_PATTERN_INVALID',contractId:contract.id});
      continue;
    }
    if(!matcher.test(sourceText))continue;
    matchedContracts.push(contract.id);
    const rule=rules.find(item=>item.id===contract.authorityRuleId)??null;
    if(!rule){
      issues.push({code:'CONTROL_PLANE_AUTHORITY_RULE_MISSING',contractId:contract.id,authorityRuleIds:[contract.authorityRuleId]});
      continue;
    }
    if(!(instruction.authorityRuleIds??[]).includes(contract.authorityRuleId)){
      issues.push({
        code:'CONTROL_PLANE_AUTHORITY_ACK_REQUIRED',
        contractId:contract.id,
        instructionId:instruction.id??null,
        authorityRuleIds:[contract.authorityRuleId],
        message:'Instruction touches '+rule.subject+' but does not acknowledge canonical authority '+contract.authorityRuleId+'.',
      });
    }

    const forbidden=contract.forbiddenTemplateEvidence;
    if(forbidden){
      const nodeMatcher=new RegExp(forbidden.nodePattern,'i');
      const componentMatcher=new RegExp(forbidden.componentKeyPattern,'i');
      const conflicts=[];
      for(const check of instruction.checks??[]){
        if(!['template-node-present','template-node-value'].includes(String(check.kind??'')))continue;
        if(forbidden.pageType&&check.pageType!==forbidden.pageType)continue;
        const node=checkedTemplateNode(check);
        if(node&&nodeMatcher.test(String(node.id??''))&&componentMatcher.test(String(node.componentKey??''))){
          conflicts.push({file:check.file,pageType:check.pageType,nodeId:node.id,componentKey:node.componentKey});
        }
      }
      const files=[...new Set((instruction.checks??[]).filter(check=>
        typeof check.file==='string'&&check.file.endsWith('.json')&&(!forbidden.pageType||check.pageType===forbidden.pageType)
      ).map(check=>check.file))];
      for(const file of files){
        if(!existsSync(file))continue;
        try{
          const pkg=readJson(file);
          for(const page of pkg.pages??[]){
            if(forbidden.pageType&&page.pageType!==forbidden.pageType)continue;
            for(const node of flattenNodes(page.sections??[])){
              if(nodeMatcher.test(String(node.id??''))&&componentMatcher.test(String(node.componentKey??''))){
                conflicts.push({file,pageType:page.pageType,nodeId:node.id,componentKey:node.componentKey});
              }
            }
          }
        }catch{}
      }
      if(conflicts.length){
        const unique=[...new Map(conflicts.map(item=>[[item.file,item.pageType,item.nodeId].join('|'),item])).values()];
        issues.push({
          code:'CONTROL_PLANE_AUTHORITY_CONFLICT',
          contractId:contract.id,
          instructionId:instruction.id??null,
          authorityRuleIds:[contract.authorityRuleId],
          conflicts:unique,
          file:unique[0]?.file??null,
          message:'Template-local evidence attempts to own behavior reserved for '+rule.owner+' authority.',
        });
      }
    }

    for(const required of contract.requiredAuthorityEvidence??[]){
      const found=(instruction.checks??[]).some(check=>
        check.kind===required.kind
        &&check.file===required.file
        &&check.value===required.value
        &&check.authorityRuleId===contract.authorityRuleId
      );
      if(!found){
        issues.push({
          code:'CONTROL_PLANE_AUTHORITY_CONTINUITY_EVIDENCE_REQUIRED',
          contractId:contract.id,
          instructionId:instruction.id??null,
          authorityRuleIds:[contract.authorityRuleId],
          required,
          message:'Shared behavior authority continuity evidence is missing for '+rule.subject+'.',
        });
      }
    }
  }
  return {matchedContracts,issues};
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
