import 'server-only';
import {z} from 'zod';

const emailSchema=z.string().trim().email().max(320);
const uuidSchema=z.string().uuid();
const receivedEmailSchema=z.object({
  id:z.string().min(1),
  from:z.string().min(1),
  to:z.array(z.string()).default([]),
  subject:z.string().nullable().optional(),
  text:z.string().nullable().optional(),
  html:z.string().nullable().optional(),
  message_id:z.string().nullable().optional(),
  headers:z.record(z.string()).default({}),
  attachments:z.array(z.object({id:z.string(),filename:z.string().optional(),content_type:z.string().optional()})).default([]),
});

export type ResendReceivedEmail=z.infer<typeof receivedEmailSchema>;
export type ParsedInboundRecipient={address:string;baseAddress:string;replyToken:string|null};

export function normalizeEmailAddress(value:string){
  const raw=value.trim();
  const angle=raw.match(/<([^<>]+)>/);
  const candidate=(angle?.[1]??raw).trim().toLowerCase();
  const parsed=emailSchema.safeParse(candidate);
  return parsed.success?parsed.data:null;
}

export function parseInboundRecipient(value:string):ParsedInboundRecipient|null{
  const address=normalizeEmailAddress(value);
  if(!address)return null;
  const at=address.lastIndexOf('@');
  const local=address.slice(0,at),domain=address.slice(at+1);
  const plus=local.lastIndexOf('+');
  if(plus>0){
    const candidate=local.slice(plus+1);
    if(uuidSchema.safeParse(candidate).success){
      return{address,baseAddress:`${local.slice(0,plus)}@${domain}`,replyToken:candidate};
    }
  }
  return{address,baseAddress:address,replyToken:null};
}

function decodeEntities(value:string){
  const entities:Record<string,string>={'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"};
  return value.replace(/&(nbsp|amp|lt|gt|quot|#39);/gi,match=>entities[match.toLowerCase()]??' ');
}

function htmlToText(value:string){
  return decodeEntities(value)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi,' ')
    .replace(/<\s*br\s*\/?>/gi,'\n')
    .replace(/<\/(p|div|li|tr|h[1-6])\s*>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/[ \t]{2,}/g,' ')
    .trim();
}

export function receivedEmailBody(email:ResendReceivedEmail){
  const text=(email.text??'').trim();
  const body=text||htmlToText(email.html??'')||'(Az e-mail nem tartalmazott szöveges törzset.)';
  return body.slice(0,50000);
}

function messageIds(value:string|null|undefined){
  if(!value)return[];
  const matches=value.match(/<[^<>\r\n]{1,996}>/g)??[];
  return [...new Set(matches.map(item=>item.trim()))].slice(0,50);
}

export function receivedThreadingHeaders(email:ResendReceivedEmail){
  const headers=new Map(Object.entries(email.headers??{}).map(([key,value])=>[key.toLowerCase(),String(value)]));
  const inReplyToIds=messageIds(headers.get('in-reply-to'));
  const references=messageIds(headers.get('references'));
  return{
    inReplyTo:inReplyToIds[0]??null,
    references,
  };
}

export async function getResendReceivedEmail(id:string):Promise<ResendReceivedEmail>{
  const key=process.env.RESEND_API_KEY?.trim();
  if(!key)throw new Error('RESEND_NOT_CONFIGURED');
  const response=await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`,{
    method:'GET',headers:{authorization:`Bearer ${key}`,accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(10000),
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(`RESEND_RECEIVING_HTTP_${response.status}`);
  const parsed=receivedEmailSchema.safeParse(payload);
  if(!parsed.success)throw new Error('RESEND_RECEIVING_PAYLOAD_INVALID');
  return parsed.data;
}
