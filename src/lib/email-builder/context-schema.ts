import { z } from 'zod';

const nullableText=(max:number)=>z.string().max(max).nullable().optional();
const httpUrl=z.string().url().refine(value=>{const protocol=new URL(value).protocol;return protocol==='http:'||protocol==='https:';},'Only http/https URLs are allowed');
const nullableHttpUrl=httpUrl.nullable().optional();

export const emailRenderContextSchema=z.object({
  store:z.object({
    name:z.string().min(1).max(160),
    siteUrl:httpUrl,
    logoUrl:nullableHttpUrl,
    supportEmail:z.string().email().max(320).nullable().optional(),
  }).strict(),
  customer:z.object({
    firstName:z.string().min(1).max(120),
    lastName:nullableText(120),
    fullName:nullableText(240),
    email:z.string().email().max(320).nullable().optional(),
    type:nullableText(80),
  }).strict(),
  order:z.object({
    number:z.string().min(1).max(120),
    subtotal:z.number().finite().min(0).max(1_000_000_000),
    shipping:z.number().finite().min(0).max(1_000_000_000),
    discount:z.number().finite().min(0).max(1_000_000_000),
    tax:z.number().finite().min(0).max(1_000_000_000),
    total:z.number().finite().min(0).max(1_000_000_000),
    currency:z.string().regex(/^[A-Z]{3}$/).optional(),
    items:z.array(z.object({
      name:z.string().min(1).max(300),
      variant:nullableText(300),
      quantity:z.number().int().min(1).max(1_000_000),
      unitPrice:z.number().finite().min(0).max(1_000_000_000),
      lineTotal:z.number().finite().min(0).max(1_000_000_000),
    }).strict()).max(500),
    invoiceUrl:nullableHttpUrl,
  }).strict().optional(),
  payment:z.object({
    method:z.string().min(1).max(120),
    accountHolder:nullableText(240),
    bankName:nullableText(240),
    bankAccount:nullableText(160),
    note:nullableText(2000),
  }).strict().optional(),
  shipping:z.object({
    method:nullableText(120),
    carrier:nullableText(160),
    trackingNumber:nullableText(240),
    trackingUrl:nullableHttpUrl,
    address:nullableText(2000),
  }).strict().optional(),
  billing:z.object({address:nullableText(2000)}).strict().optional(),
  coupon:z.object({
    code:nullableText(160),
    discount:z.number().finite().min(0).max(1_000_000_000).nullable().optional(),
    expiry:nullableText(120),
  }).strict().optional(),
}).strict();

export type EmailPreviewContext=z.infer<typeof emailRenderContextSchema>;
