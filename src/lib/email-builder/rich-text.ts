import { z } from 'zod';
import { isAllowedEmailBinding } from './bindings';

export type EmailRichTextMarks={bold?:true;italic?:true;href?:string};
export type EmailRichTextNode=
  |{type:'text';text:string;marks?:EmailRichTextMarks}
  |{type:'binding';key:string;marks?:EmailRichTextMarks};

const marksSchema=z.object({
  bold:z.literal(true).optional(),
  italic:z.literal(true).optional(),
  href:z.string().min(1).max(2048).optional(),
}).strict().optional();

const textNodeSchema=z.object({type:z.literal('text'),text:z.string().max(12000),marks:marksSchema}).strict();
const bindingNodeSchema=z.object({type:z.literal('binding'),key:z.string().min(1).max(120).refine(isAllowedEmailBinding,'Unknown email binding'),marks:marksSchema}).strict();
export const emailRichTextSchema=z.array(z.discriminatedUnion('type',[textNodeSchema,bindingNodeSchema])).max(800);

function sameMarks(a?:EmailRichTextMarks,b?:EmailRichTextMarks){return Boolean(a?.bold)===Boolean(b?.bold)&&Boolean(a?.italic)===Boolean(b?.italic)&&(a?.href??'')===(b?.href??'');}
function cleanMarks(marks?:EmailRichTextMarks):EmailRichTextMarks|undefined{
  const next:EmailRichTextMarks={};
  if(marks?.bold)next.bold=true;
  if(marks?.italic)next.italic=true;
  if(marks?.href)next.href=marks.href;
  return Object.keys(next).length?next:undefined;
}

export function normalizeEmailRichText(nodes:EmailRichTextNode[]):EmailRichTextNode[]{
  const result:EmailRichTextNode[]=[];
  for(const node of nodes){
    if(node.type==='binding'){
      if(!isAllowedEmailBinding(node.key))continue;
      result.push({type:'binding',key:node.key,...(cleanMarks(node.marks)?{marks:cleanMarks(node.marks)}:{})});
      continue;
    }
    if(!node.text)continue;
    const marks=cleanMarks(node.marks),last=result.at(-1);
    if(last?.type==='text'&&sameMarks(last.marks,marks)){last.text+=node.text;continue;}
    result.push({type:'text',text:node.text,...(marks?{marks}:{})});
  }
  return result;
}

export function parseEmailRichText(value:unknown):EmailRichTextNode[]|null{
  const parsed=emailRichTextSchema.safeParse(value);
  if(!parsed.success)return null;
  return normalizeEmailRichText(parsed.data as EmailRichTextNode[]);
}

export function sourceToEmailRichText(source:string):EmailRichTextNode[]{
  const result:EmailRichTextNode[]=[];
  const pattern=/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;let cursor=0,match:RegExpExecArray|null;
  while((match=pattern.exec(source))){
    if(match.index>cursor)result.push({type:'text',text:source.slice(cursor,match.index)});
    if(isAllowedEmailBinding(match[1]))result.push({type:'binding',key:match[1]});
    else result.push({type:'text',text:match[0]});
    cursor=match.index+match[0].length;
  }
  if(cursor<source.length)result.push({type:'text',text:source.slice(cursor)});
  return normalizeEmailRichText(result);
}

export function emailRichTextSource(nodes:EmailRichTextNode[]){return nodes.map(node=>node.type==='binding'?`{{${node.key}}}`:node.text).join('');}
