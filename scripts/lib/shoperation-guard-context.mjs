import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';

export const GUARD_CONTEXT_PATH='artifacts/shoperation-development-guard/guard-context.json';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const readJsonIfExists=file=>existsSync(file)?readJson(file):null;
const guardRegistry=()=>readJson('quality/knowledge/guard-registry.v1.json');
const authorityConflictPolicy=()=>readJson('quality/knowledge/authority-conflict-policy.v1.json');

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

const allNodes=(nodes,out=[])=>{for(const node of nodes??[]){out.push(node);allNodes(node.children??[],out)}return out;};
const instructionText=instruction=>[instruction?.request,...(instruction?.checks??[]).flatMap(check=>[check?.pageType,check?.file,check?.nodeId,check?.path])].filter(Boolean).join(' ').toLocaleLowerCase('hu-HU');

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
    authorityConflictPolicies:authorityConflictPolicy().policies??[],
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

export function evaluateAuthorityConflicts(instruction){
  const context=buildGuardContext();
  const sourceText=instructionText(instruction);
  const checks=instruction?.checks??[];
  const issues=[];
  const matches=[];
  const authorities=[...context.authorities.global,...context.authorities.templateFactory];
  for(const policy of context.authorityConflictPolicies??[]){
    const authority=authorities.find(item=>item.id===policy.authorityRuleId)??null;
    for(const subject of policy.subjects??[]){
      let detector=null;
      try{detector=new RegExp(subject.detectPattern,'i')}catch{
        issues.push({code:'AUTHORITY_CONFLICT_POLICY_PATTERN_INVALID',policyId:policy.id,authorityRuleIds:[policy.authorityRuleId],subject:subject.subject});
        continue;
      }
      if(!detector.test(sourceText))continue;
      matches.push({policyId:policy.id,authorityRuleId:policy.authorityRuleId,subject:subject.subject,owner:policy.owner,delegatedOwner:policy.delegatedOwner});
      if(!authority){
        issues.push({code:'AUTHORITY_CONFLICT_RULE_MISSING',policyId:policy.id,subject:subject.subject,authorityRuleIds:[policy.authorityRuleId]});
        continue;
      }
      if(!(instruction?.authorityRuleIds??[]).includes(policy.authorityRuleId))issues.push({
        code:'AUTHORITY_CONFLICT_ACK_REQUIRED',policyId:policy.id,subject:subject.subject,authorityRuleIds:[policy.authorityRuleId],message:'Instruction touches protected '+subject.subject+' behavior without acknowledging canonical authority '+policy.authorityRuleId+'.'
      });
      if(subject.forbiddenTemplateCheckPattern){
        const pattern=new RegExp(subject.forbiddenTemplateCheckPattern,'i');
        const behaviorChecks=checks.filter(check=>['template-node-present','template-node-value'].includes(String(check?.kind??''))&&pattern.test(String(check?.nodeId??'')));
        if(behaviorChecks.length)issues.push({
          code:'AUTHORITY_CONFLICT_TEMPLATE_BEHAVIOR_EVIDENCE',policyId:policy.id,subject:subject.subject,authorityRuleIds:[policy.authorityRuleId],nodeIds:behaviorChecks.map(check=>check.nodeId),message:'Template-local node evidence is attempting to prove platform-owned '+subject.subject+' behavior.'
        });
      }
      for(const required of subject.canonicalEvidence??[]){
        const present=checks.some(check=>check.kind==='authority-source-contains'&&check.authorityRuleId===policy.authorityRuleId&&check.file===required.file&&check.value===required.value);
        if(!present)issues.push({
          code:'AUTHORITY_CONFLICT_CONTINUITY_EVIDENCE_REQUIRED',policyId:policy.id,subject:subject.subject,authorityRuleIds:[policy.authorityRuleId],required,message:'Protected '+subject.subject+' behavior requires canonical shared-authority continuity evidence.'
        });
      }
      if(subject.pageType&&subject.forbiddenTemplateNodePattern){
        const nodePattern=new RegExp(subject.forbiddenTemplateNodePattern,'i');
        const componentPattern=subject.forbiddenTemplateComponentPattern?new RegExp(subject.forbiddenTemplateComponentPattern,'i'):null;
        const files=[...new Set(checks.filter(check=>check.pageType===subject.pageType&&typeof check.file==='string'&&check.file.endsWith('.json')).map(check=>check.file))];
        for(const file of files){
          if(!existsSync(file))continue;
          try{
            const pkg=readJson(file);
            const page=(pkg.pages??[]).find(item=>item.pageType===subject.pageType);
            const suspicious=page?allNodes(page.sections??[]).filter(node=>nodePattern.test(String(node.id??''))&&(!componentPattern||componentPattern.test(String(node.componentKey??'')))):[];
            if(suspicious.length)issues.push({
              code:'AUTHORITY_CONFLICT_TEMPLATE_BEHAVIOR_DUPLICATE',policyId:policy.id,subject:subject.subject,authorityRuleIds:[policy.authorityRuleId],file,nodes:suspicious.map(node=>({id:node.id,componentKey:node.componentKey})),message:'Template contains behavior-shaped nodes that duplicate platform-owned '+subject.subject+' authority.'
            });
          }catch(error){issues.push({code:'AUTHORITY_CONFLICT_TEMPLATE_INSPECTION_FAILED',policyId:policy.id,subject:subject.subject,authorityRuleIds:[policy.authorityRuleId],file,message:error instanceof Error?error.message:String(error)});}
        }
      }
    }
  }
  return {matches,issues};
}

export function predecessorIssues(guardId){
  const registry=guardRegistry();
  const activeIds=new Set((process.env.SHOPERATION_CONTROL_PLANE_ACTIVE_GUARDS??'').split(',').map(value=>value.trim()).filter(Boolean));
  const scoped=activeIds.size>0;
  const guard=(registry.guards??[]).find(item=>item.id===guardId);
  if(!guard)return[{code:'GUARD_CONTEXT_GUARD_NOT_REGISTERED',guardId}];
  const issues=[];
  for(const dependencyId of guard.consumesEvidenceFrom??[]){
    if(scoped&&!activeIds.has(dependencyId))continue;
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
