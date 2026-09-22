export const GUIDED_FINDER_ENGINE_VERSION='shoporation.guided-finder.v1' as const;

export type FinderValue=string|number|boolean|readonly string[];
export type FinderOperator='eq'|'includes'|'gte'|'lte'|'exists';
export type FinderRuleKind='required'|'preferred';
export type FinderPartialPolicy='zero'|'show-nearest';
export type FinderSafetyPolicy='standard'|'non-diagnostic';

export type FinderRule={
  id:string;
  attributeKey:string;
  operator:FinderOperator;
  value?:FinderValue;
  kind:FinderRuleKind;
  weight?:number;
  reason:string;
};
export type FinderOption={id:string;label:string;rules:readonly FinderRule[]};
export type FinderQuestion={id:string;label:string;mode:'single'|'multi';required?:boolean;options:readonly FinderOption[]};
export type FinderStep={id:string;title:string;copy?:string;questions:readonly FinderQuestion[]};
export type GuidedFinderConfig={
  version:1;
  tenantId:string;
  finderKey:string;
  label:string;
  safetyPolicy:FinderSafetyPolicy;
  partialPolicy:FinderPartialPolicy;
  maxResults:number;
  steps:readonly FinderStep[];
};
export type FinderSelections=Readonly<Record<string,readonly string[]|undefined>>;
export type FinderCandidate={
  id:string;
  label:string;
  href:string;
  eligible:boolean;
  attributes:Readonly<Record<string,FinderValue|undefined>>;
};
export type FinderCriterionEvidence={ruleId:string;kind:FinderRuleKind;matched:boolean;reason:string;attributeKey:string};
export type FinderRankedResult={
  id:string;
  label:string;
  href:string;
  score:number;
  requiredMatched:number;
  requiredMismatched:number;
  preferredMatched:number;
  evidence:FinderCriterionEvidence[];
};
export type FinderRunResult={
  status:'exact'|'partial'|'zero';
  selectedRuleCount:number;
  exactMatchCount:number;
  results:FinderRankedResult[];
  explanation:string;
};
export type FinderValidationViolation={code:string;path:string;message:string};

const KEY=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const FORBIDDEN_NON_DIAGNOSTIC=/\b(diagnos(?:e|is|tic)|cure|treat(?:ment)?|heal(?:ing)?|gyógyít(?:ás|ja|ó)?|diagnózis|kezel(?:és|i)?\s+(?:betegség|akné|ekcéma)|betegség)\b/i;
const clean=(value:string)=>value.trim();
const safeHref=(value:string)=>value.startsWith('/')||value.startsWith('#')||value.startsWith('https://');
const unique=<T>(values:readonly T[])=>[...new Set(values)];

function issue(out:FinderValidationViolation[],code:string,path:string,message:string){out.push({code,path,message});}
function validateLabel(value:string,path:string,policy:FinderSafetyPolicy,out:FinderValidationViolation[]){
  if(!clean(value))issue(out,'FINDER_TEXT_REQUIRED',path,'Finder text is required.');
  if(policy==='non-diagnostic'&&FORBIDDEN_NON_DIAGNOSTIC.test(value))issue(out,'FINDER_NON_DIAGNOSTIC_POLICY_VIOLATION',path,'Non-diagnostic finder copy must not make diagnosis/treatment claims.');
}

export function validateGuidedFinderConfig(config:GuidedFinderConfig):FinderValidationViolation[]{
  const out:FinderValidationViolation[]=[];
  if(config.version!==1)issue(out,'FINDER_VERSION_UNSUPPORTED','version','Only Guided Finder config v1 is supported.');
  if(!KEY.test(config.tenantId)||!KEY.test(config.finderKey))issue(out,'FINDER_IDENTITY_INVALID','identity','Tenant and finder keys must be stable and key-safe.');
  validateLabel(config.label,'label',config.safetyPolicy,out);
  if(!Number.isInteger(config.maxResults)||config.maxResults<1||config.maxResults>24)issue(out,'FINDER_MAX_RESULTS_INVALID','maxResults','maxResults must be an integer between 1 and 24.');
  const stepIds=new Set<string>();const questionIds=new Set<string>();const ruleIds=new Set<string>();
  config.steps.forEach((step,si)=>{
    const sp=`steps.${si}`;
    if(!KEY.test(step.id)||stepIds.has(step.id))issue(out,'FINDER_STEP_ID_INVALID',`${sp}.id`,'Step id must be unique and key-safe.');stepIds.add(step.id);validateLabel(step.title,`${sp}.title`,config.safetyPolicy,out);if(step.copy)validateLabel(step.copy,`${sp}.copy`,config.safetyPolicy,out);
    step.questions.forEach((question,qi)=>{
      const qp=`${sp}.questions.${qi}`;
      if(!KEY.test(question.id)||questionIds.has(question.id))issue(out,'FINDER_QUESTION_ID_INVALID',`${qp}.id`,'Question id must be globally unique and key-safe.');questionIds.add(question.id);validateLabel(question.label,`${qp}.label`,config.safetyPolicy,out);
      if(!question.options.length)issue(out,'FINDER_OPTIONS_REQUIRED',`${qp}.options`,'Questions need at least one option.');
      const optionIds=new Set<string>();question.options.forEach((option,oi)=>{
        const op=`${qp}.options.${oi}`;if(!KEY.test(option.id)||optionIds.has(option.id))issue(out,'FINDER_OPTION_ID_INVALID',`${op}.id`,'Option id must be unique within its question.');optionIds.add(option.id);validateLabel(option.label,`${op}.label`,config.safetyPolicy,out);
        if(!option.rules.length)issue(out,'FINDER_RULES_REQUIRED',`${op}.rules`,'Options need at least one mapping rule.');
        option.rules.forEach((rule,ri)=>{
          const rp=`${op}.rules.${ri}`;if(!KEY.test(rule.id)||ruleIds.has(rule.id))issue(out,'FINDER_RULE_ID_INVALID',`${rp}.id`,'Rule id must be globally unique and key-safe.');ruleIds.add(rule.id);
          if(!KEY.test(rule.attributeKey))issue(out,'FINDER_ATTRIBUTE_KEY_INVALID',`${rp}.attributeKey`,'Attribute key must be key-safe.');
          if(rule.operator!=='exists'&&rule.value===undefined)issue(out,'FINDER_RULE_VALUE_REQUIRED',`${rp}.value`,'Non-exists operators require a value.');
          if(rule.kind==='preferred'&&(rule.weight!==undefined)&&(!Number.isInteger(rule.weight)||rule.weight<1||rule.weight>100))issue(out,'FINDER_RULE_WEIGHT_INVALID',`${rp}.weight`,'Preferred weight must be an integer between 1 and 100.');
          validateLabel(rule.reason,`${rp}.reason`,config.safetyPolicy,out);
        });
      });
    });
  });
  return out;
}

function compare(actual:FinderValue|undefined,operator:FinderOperator,expected?:FinderValue):boolean{
  if(operator==='exists')return actual!==undefined&&actual!==null&&(typeof actual!=='string'||actual.trim().length>0)&&(!Array.isArray(actual)||actual.length>0);
  if(actual===undefined||expected===undefined)return false;
  if(operator==='eq'){
    if(Array.isArray(actual))return actual.includes(String(expected));
    if(Array.isArray(expected))return expected.includes(String(actual));
    return actual===expected;
  }
  if(operator==='includes'){
    if(Array.isArray(actual))return Array.isArray(expected)?expected.every(item=>actual.includes(String(item))):actual.includes(String(expected));
    if(typeof actual==='string')return actual.toLowerCase().includes(String(expected).toLowerCase());
    return false;
  }
  if(typeof actual!=='number'||typeof expected!=='number')return false;
  return operator==='gte'?actual>=expected:operator==='lte'?actual<=expected:false;
}

function selectedRules(config:GuidedFinderConfig,selections:FinderSelections):FinderRule[]{
  const rules:FinderRule[]=[];
  for(const step of config.steps)for(const question of step.questions){
    const selected=unique(selections[question.id]??[]);
    if(question.required&&!selected.length)continue;
    for(const optionId of selected){const option=question.options.find(item=>item.id===optionId);if(option)rules.push(...option.rules);}
  }
  return unique(rules.map(rule=>rule.id)).map(id=>rules.find(rule=>rule.id===id)!);
}

export function validateFinderSelections(config:GuidedFinderConfig,selections:FinderSelections):FinderValidationViolation[]{
  const out:FinderValidationViolation[]=[];
  for(const step of config.steps)for(const question of step.questions){
    const selected=unique(selections[question.id]??[]);
    if(question.required&&!selected.length)issue(out,'FINDER_REQUIRED_ANSWER_MISSING',question.id,'Required finder question has no answer.');
    if(question.mode==='single'&&selected.length>1)issue(out,'FINDER_SINGLE_ANSWER_MULTIPLE',question.id,'Single-choice finder question accepts one answer.');
    const allowed=new Set(question.options.map(option=>option.id));if(selected.some(id=>!allowed.has(id)))issue(out,'FINDER_OPTION_UNKNOWN',question.id,'Selection contains an unknown option.');
  }
  return out;
}

export function runGuidedFinder(input:{config:GuidedFinderConfig;selections:FinderSelections;candidates:readonly FinderCandidate[]}):FinderRunResult|null{
  if(validateGuidedFinderConfig(input.config).length||validateFinderSelections(input.config,input.selections).length)return null;
  const rules=selectedRules(input.config,input.selections);
  const ranked=input.candidates.filter(candidate=>candidate.eligible&&safeHref(candidate.href)).map(candidate=>{
    const evidence=rules.map(rule=>({ruleId:rule.id,kind:rule.kind,matched:compare(candidate.attributes[rule.attributeKey],rule.operator,rule.value),reason:rule.reason,attributeKey:rule.attributeKey}));
    const required=evidence.filter(item=>item.kind==='required');const preferred=evidence.filter(item=>item.kind==='preferred');
    const score=preferred.reduce((sum,item)=>sum+(item.matched?(rules.find(rule=>rule.id===item.ruleId)?.weight??1):0),0);
    return{id:candidate.id,label:candidate.label,href:candidate.href,score,requiredMatched:required.filter(item=>item.matched).length,requiredMismatched:required.filter(item=>!item.matched).length,preferredMatched:preferred.filter(item=>item.matched).length,evidence};
  }).sort((a,b)=>a.requiredMismatched-b.requiredMismatched||b.score-a.score||b.preferredMatched-a.preferredMatched||a.label.localeCompare(b.label,'hu')||a.id.localeCompare(b.id));
  const exact=ranked.filter(item=>item.requiredMismatched===0);
  if(exact.length)return{status:'exact',selectedRuleCount:rules.length,exactMatchCount:exact.length,results:exact.slice(0,input.config.maxResults),explanation:`${exact.length} pontos találat a megadott szempontok alapján.`};
  if(input.config.partialPolicy==='show-nearest'&&ranked.length){const bestMismatch=ranked[0].requiredMismatched;const nearest=ranked.filter(item=>item.requiredMismatched===bestMismatch).slice(0,input.config.maxResults);return{status:'partial',selectedRuleCount:rules.length,exactMatchCount:0,results:nearest,explanation:'Nincs minden kötelező feltételnek megfelelő termék; a legközelebbi találatok jelennek meg, eltérésekkel együtt.'};}
  return{status:'zero',selectedRuleCount:rules.length,exactMatchCount:0,results:[],explanation:'Nincs a kiválasztott kötelező feltételeknek megfelelő termék.'};
}

export const GUIDED_FINDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY=Object.freeze({storefrontPageDrafts:true,finderConfiguration:false,products:false,variants:false,pricing:false,inventory:false,customers:false,orders:false} as const);
