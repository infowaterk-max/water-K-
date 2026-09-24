import {z} from 'zod';

export const INCIDENT_CATEGORIES=['ui','content','catalog','commerce','payment','shipping','account','integration','performance','security','data','other'] as const;
export type IncidentCategory=typeof INCIDENT_CATEGORIES[number];
export const incidentCategorySchema=z.enum(INCIDENT_CATEGORIES);
export const INCIDENT_IMPACTS=['single','multiple','all','checkout_blocked','security'] as const;
export type IncidentImpact=typeof INCIDENT_IMPACTS[number];

const routePath=z.string().trim().max(500).regex(/^\/[^?#]*$/,'Az útvonal csak query és hash nélküli relatív útvonal lehet.');
const shortKey=z.string().trim().max(200);
export const incidentContextSchema=z.object({
  routePath:routePath.optional(),
  surfaceKey:shortKey.optional(),
  componentKey:shortKey.optional(),
  pageKey:shortKey.optional(),
  templateKey:shortKey.optional(),
  templateVersion:z.number().int().positive().max(9999).optional(),
  actionKey:shortKey.optional(),
  errorCode:z.string().trim().max(160).optional(),
  requestId:z.string().trim().max(160).optional(),
  viewport:z.object({width:z.number().int().min(240).max(10000),height:z.number().int().min(240).max(10000)}).strict().optional(),
}).strict();

export const customerIncidentInputSchema=z.object({
  name:z.string().trim().max(120).optional().default(''),
  email:z.string().trim().email().max(200),
  orderNumber:z.string().trim().max(80).optional().default(''),
  title:z.string().trim().min(3).max(180),
  description:z.string().trim().min(10).max(8000),
  category:incidentCategorySchema,
  context:incidentContextSchema.optional().default({}),
  website:z.string().max(200).optional().default(''),
}).strict();

export const merchantIncidentInputSchema=z.object({
  title:z.string().trim().min(3).max(180),
  description:z.string().trim().min(10).max(8000),
  category:incidentCategorySchema,
  impact:z.enum(INCIDENT_IMPACTS).optional().default('single'),
  context:incidentContextSchema.optional().default({}),
}).strict();

export const manualIncidentTriageSchema=z.object({
  ownership:z.enum(['merchant','platform','shared','undetermined']),
  reasonCode:z.string().trim().min(3).max(120),
  status:z.enum(['triaged','merchant_action','platform_investigation','auto_healing','repair_proposed','resolved','rejected']),
  severity:z.enum(['low','normal','high','critical']),
  knownFailureId:z.string().trim().max(80).nullable().optional(),
  confidence:z.enum(['low','medium','high','deterministic']),
}).strict();

export function isSameOrigin(request:Request){
  const origin=request.headers.get('origin');
  if(!origin)return true;
  try{return new URL(origin).origin===new URL(request.url).origin}catch{return false}
}

export type CustomerIncidentInput=z.infer<typeof customerIncidentInputSchema>;
export type MerchantIncidentInput=z.infer<typeof merchantIncidentInputSchema>;
export type ManualIncidentTriageInput=z.infer<typeof manualIncidentTriageSchema>;
