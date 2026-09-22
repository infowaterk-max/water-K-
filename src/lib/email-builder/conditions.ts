import type { EmailConditionGroup, EmailConditionRule, EmailRenderContext } from './types';
import { getEmailBinding, isAllowedEmailBinding } from './bindings';

function compare(rule:EmailConditionRule,context:EmailRenderContext){
  if(!isAllowedEmailBinding(rule.field))return false;
  const actual=getEmailBinding(context,rule.field);
  switch(rule.operator){
    case 'exists': return actual!==null&&actual!==undefined&&actual!=='';
    case 'notExists': return actual===null||actual===undefined||actual==='';
    case 'equals': return actual===rule.value;
    case 'notEquals': return actual!==rule.value;
    case 'greaterThan': return typeof actual==='number'&&typeof rule.value==='number'&&actual>rule.value;
    case 'lessThan': return typeof actual==='number'&&typeof rule.value==='number'&&actual<rule.value;
    case 'contains': return typeof actual==='string'&&typeof rule.value==='string'&&actual.includes(rule.value);
    case 'in': return Array.isArray(rule.value)&&rule.value.includes(actual);
  }
}

export function evaluateEmailConditions(group:EmailConditionGroup|undefined,context:EmailRenderContext){
  if(!group)return true;
  const results=group.rules.map(rule=>compare(rule,context));
  return group.mode==='any'?results.some(Boolean):results.every(Boolean);
}
