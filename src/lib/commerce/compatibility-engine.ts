import {formatStructuredSpecValue,type StructuredSpecValue} from '@/lib/commerce/structured-product';

export const COMPATIBILITY_ENGINE_VERSION='shoporation.compatibility-engine.v1' as const;
export type CompatibilityStatus='compatible'|'incompatible'|'unknown';
export type CompatibilityRuleKind='required'|'advisory';
export type CompatibilityOperator='eq'|'neq'|'gte'|'lte'|'overlap'|'contains'|'exists';
export type CompatibilitySpecEvidence={specKey:string;value:StructuredSpecValue|null;source:'compare-spec-engine.v1'};
export type CompatibilityPart={slotId:string;productId:string;variantId:string;label:string;specs:Readonly<Record<string,CompatibilitySpecEvidence|undefined>>};
export type CompatibilityOperand={slotId:string;specKey:string};
export type CompatibilityRule={id:string;label:string;kind:CompatibilityRuleKind;operator:CompatibilityOperator;left:CompatibilityOperand;right?:CompatibilityOperand;literal?:StructuredSpecValue;compatibleReason:string;incompatibleReason:string;unknownReason:string};
export type CompatibilityRuleResult={ruleId:string;label:string;kind:CompatibilityRuleKind;status:CompatibilityStatus;leftDisplay:string;rightDisplay:string;explanation:string};
export type CompatibilityEvaluation={status:CompatibilityStatus;results:CompatibilityRuleResult[];required:{compatible:number;incompatible:number;unknown:number};advisory:{compatible:number;incompatible:number;unknown:number}};
export type CompatibilityViolation={code:string;path:string;message:string};

const KEY=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const safeText=(value:string)=>value.trim();
const issue=(out:CompatibilityViolation[],code:string,path:string,message:string)=>out.push({code,path,message});

export function validateCompatibilityRules(rules:readonly CompatibilityRule[]):CompatibilityViolation[]{
  const out:CompatibilityViolation[]=[];const seen=new Set<string>();
  rules.forEach((rule,index)=>{
    const path=`rules.${index}`;
    if(!KEY.test(rule.id)||seen.has(rule.id))issue(out,'COMPATIBILITY_RULE_ID_INVALID',`${path}.id`,'Rule id must be unique and lowercase key-safe.');seen.add(rule.id);
    if(!safeText(rule.label)||!safeText(rule.compatibleReason)||!safeText(rule.incompatibleReason)||!safeText(rule.unknownReason))issue(out,'COMPATIBILITY_RULE_TEXT_REQUIRED',path,'Rule labels and explanations are required.');
    if(!KEY.test(rule.left.slotId)||!KEY.test(rule.left.specKey))issue(out,'COMPATIBILITY_LEFT_OPERAND_INVALID',`${path}.left`,'Left operand must use stable slot/spec keys.');
    if(rule.operator==='exists'){
      if(rule.right||rule.literal!==undefined)issue(out,'COMPATIBILITY_EXISTS_OPERAND_INVALID',path,'Exists rules must not define a right operand or literal.');
    }else{
      const hasRight=rule.right!==undefined,hasLiteral=rule.literal!==undefined;
      if(hasRight===hasLiteral)issue(out,'COMPATIBILITY_RIGHT_OPERAND_INVALID',path,'Rules require exactly one right operand or literal.');
      if(rule.right&&(!KEY.test(rule.right.slotId)||!KEY.test(rule.right.specKey)))issue(out,'COMPATIBILITY_RIGHT_OPERAND_INVALID',`${path}.right`,'Right operand must use stable slot/spec keys.');
    }
  });
  return out;
}

function evidence(parts:readonly CompatibilityPart[],operand:CompatibilityOperand):CompatibilitySpecEvidence|null{
  const part=parts.find(candidate=>candidate.slotId===operand.slotId);if(!part)return null;
  const value=part.specs[operand.specKey];
  if(!value||value.source!=='compare-spec-engine.v1'||value.specKey!==operand.specKey||!value.value)return null;
  return value;
}
function semantic(value:StructuredSpecValue):string{
  if(value.type==='multi-value')return`multi:${[...value.value].sort().join('|')}`;
  if(value.type==='measurement')return`measurement:${value.value}:${value.unit}`;
  if(value.type==='range')return`range:${value.min??''}:${value.max??''}:${value.unit??''}`;
  return`${value.type}:${String(value.value)}`;
}
function numericPair(left:StructuredSpecValue,right:StructuredSpecValue):[number,number]|null{
  if(left.type==='number'&&right.type==='number')return[left.value,right.value];
  if(left.type==='measurement'&&right.type==='measurement'&&left.unit===right.unit)return[left.value,right.value];
  return null;
}
function compare(left:StructuredSpecValue,operator:CompatibilityOperator,right?:StructuredSpecValue):boolean|null{
  if(operator==='exists')return true;if(!right)return null;
  if(operator==='eq'||operator==='neq'){const equal=semantic(left)===semantic(right);return operator==='eq'?equal:!equal;}
  if(operator==='gte'||operator==='lte'){const pair=numericPair(left,right);return pair?operator==='gte'?pair[0]>=pair[1]:pair[0]<=pair[1]:null;}
  if(operator==='overlap'){
    if(left.type==='multi-value'&&right.type==='multi-value')return left.value.some(value=>right.value.includes(value));
    if(left.type==='range'&&right.type==='range'&&(left.unit??'')===(right.unit??'')){const lmin=left.min??Number.NEGATIVE_INFINITY,lmax=left.max??Number.POSITIVE_INFINITY,rmin=right.min??Number.NEGATIVE_INFINITY,rmax=right.max??Number.POSITIVE_INFINITY;return Math.max(lmin,rmin)<=Math.min(lmax,rmax);}
    return null;
  }
  if(operator==='contains'){
    if(left.type==='multi-value'){if(right.type==='text'||right.type==='enum')return left.value.includes(right.value);if(right.type==='multi-value')return right.value.every(value=>left.value.includes(value));}
    if(left.type==='text'&&(right.type==='text'||right.type==='enum'))return left.value.toLowerCase().includes(right.value.toLowerCase());
    return null;
  }
  return null;
}

export function evaluateCompatibility(input:{rules:readonly CompatibilityRule[];parts:readonly CompatibilityPart[]}):CompatibilityEvaluation|null{
  if(validateCompatibilityRules(input.rules).length)return null;
  const results=input.rules.map(rule=>{
    const left=evidence(input.parts,rule.left);const right=rule.right?evidence(input.parts,rule.right):null;const rightValue=rule.literal??right?.value??undefined;
    let status:CompatibilityStatus='unknown';
    if(left?.value){const outcome=compare(left.value,rule.operator,rightValue);status=outcome===null?'unknown':outcome?'compatible':'incompatible';}
    const explanation=status==='compatible'?rule.compatibleReason:status==='incompatible'?rule.incompatibleReason:rule.unknownReason;
    return{ruleId:rule.id,label:rule.label,kind:rule.kind,status,leftDisplay:left?.value?formatStructuredSpecValue(left.value):'—',rightDisplay:rightValue?formatStructuredSpecValue(rightValue):rule.operator==='exists'?'—':'—',explanation};
  });
  const counts=(kind:CompatibilityRuleKind)=>({compatible:results.filter(item=>item.kind===kind&&item.status==='compatible').length,incompatible:results.filter(item=>item.kind===kind&&item.status==='incompatible').length,unknown:results.filter(item=>item.kind===kind&&item.status==='unknown').length});
  const required=counts('required'),advisory=counts('advisory');
  const status:CompatibilityStatus=required.incompatible>0?'incompatible':required.unknown>0?'unknown':'compatible';
  return{status,results,required,advisory};
}

export const COMPATIBILITY_AUTHORITY_CONTRACT=Object.freeze({clientEvaluationAuthoritative:false,unknownCountsAsCompatible:false,finalValidation:'server-authoritative',structuredSpecAuthority:'shoporation.compare-spec-engine.v1'} as const);
