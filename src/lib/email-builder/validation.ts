import { emailDocumentSchema, type EmailDocument } from './types';
import { extractEmailBindings, isAllowedEmailBinding } from './bindings';
import { validateEmailBlockContent } from './registry';

export type EmailValidationResult={ok:boolean;errors:string[];warnings:string[];document?:EmailDocument};

function collectStrings(value:unknown,out:string[]){
  if(typeof value==='string'){out.push(value);return;}
  if(Array.isArray(value)){for(const item of value)collectStrings(item,out);return;}
  if(value&&typeof value==='object')for(const item of Object.values(value as Record<string,unknown>))collectStrings(item,out);
}

export function validateEmailDocument(input:unknown):EmailValidationResult{
  const parsed=emailDocumentSchema.safeParse(input);
  if(!parsed.success)return{ok:false,errors:parsed.error.issues.map(issue=>`${issue.path.join('.')||'document'}: ${issue.message}`),warnings:[]};
  const document=parsed.data,errors:string[]=[],warnings:string[]=[];
  const ids=new Set<string>();
  for(const block of document.blocks){
    if(ids.has(block.id))errors.push(`Duplicate block id: ${block.id}`);else ids.add(block.id);
    const content=validateEmailBlockContent(block);
    if(!content.success)errors.push(`Invalid ${block.type} block ${block.id}: ${content.error.issues.map(issue=>issue.message).join(', ')}`);
    if(block.conditions)for(const rule of block.conditions.rules)if(!isAllowedEmailBinding(rule.field))errors.push(`Unknown condition binding: ${rule.field}`);
  }
  const strings=[document.subject,document.preheader];
  collectStrings(document.blocks,strings);
  for(const value of strings)for(const key of extractEmailBindings(value))if(!isAllowedEmailBinding(key))errors.push(`Unknown binding: ${key}`);
  if(!document.preheader.trim())warnings.push('Missing preheader');
  if(document.subject.length>90)warnings.push('Subject is longer than 90 characters');
  if(document.purpose==='marketing'&&!document.blocks.some(block=>block.type==='footer'))warnings.push('Marketing email should include a footer with unsubscribe handling in the delivery layer');
  return{ok:errors.length===0,errors:[...new Set(errors)],warnings:[...new Set(warnings)],document};
}

export function validateEmailDocumentForActivation(input:unknown):EmailValidationResult{
  const base=validateEmailDocument(input);if(!base.document)return base;
  const errors=[...base.errors],warnings=[...base.warnings];
  if(base.document.purpose==='marketing'&&!base.document.blocks.some(block=>block.type==='footer'))errors.push('Marketing email requires a footer before activation');
  return{...base,ok:errors.length===0,errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
