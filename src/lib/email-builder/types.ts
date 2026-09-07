import { z } from 'zod';

export const EMAIL_SCHEMA_VERSION=1 as const;
export const emailTemplateFamilies=['essential','commerce','campaign','editorial','minimal'] as const;
export const emailPurposes=['transactional','marketing'] as const;
export const emailBlockTypes=['header','heading','text','button','divider','spacer','order-items','order-summary','payment-info','address','footer'] as const;

export type EmailTemplateFamily=(typeof emailTemplateFamilies)[number];
export type EmailPurpose=(typeof emailPurposes)[number];
export type EmailBlockType=(typeof emailBlockTypes)[number];

const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
const font=z.enum(['Arial, Helvetica, sans-serif','Georgia, Times, serif','Verdana, Geneva, sans-serif','Trebuchet MS, Arial, sans-serif']);
export const emailDesignOverrideSchema=z.object({
  colors:z.object({background:color.optional(),surface:color.optional(),primary:color.optional(),secondary:color.optional(),text:color.optional(),muted:color.optional(),border:color.optional()}).strict().optional(),
  typography:z.object({fontFamily:font.optional(),headingFontFamily:font.optional(),bodySize:z.number().int().min(12).max(22).optional(),smallSize:z.number().int().min(10).max(18).optional(),lineHeight:z.number().min(1).max(2).optional()}).strict().optional(),
  spacing:z.object({xs:z.number().int().min(0).max(64).optional(),s:z.number().int().min(0).max(64).optional(),m:z.number().int().min(0).max(64).optional(),l:z.number().int().min(0).max(64).optional(),xl:z.number().int().min(0).max(96).optional(),xxl:z.number().int().min(0).max(128).optional()}).strict().optional(),
  radius:z.object({button:z.number().int().min(0).max(32).optional(),card:z.number().int().min(0).max(32).optional()}).strict().optional(),
  container:z.object({maxWidth:z.number().int().min(480).max(760).optional()}).strict().optional(),
}).strict().default({});

export const emailConditionRuleSchema=z.object({
  field:z.string().min(1).max(120),
  operator:z.enum(['equals','notEquals','exists','notExists','greaterThan','lessThan','contains','in']),
  value:z.unknown().optional(),
}).strict();

export const emailConditionGroupSchema=z.object({
  mode:z.enum(['all','any']).default('all'),
  rules:z.array(emailConditionRuleSchema).min(1).max(20),
}).strict();

export const emailBlockSchema=z.object({
  id:z.string().min(1).max(120),
  type:z.enum(emailBlockTypes),
  version:z.literal(1),
  content:z.record(z.unknown()).default({}),
  style:z.record(z.unknown()).default({}),
  responsive:z.object({
    hideOnDesktop:z.boolean().optional(),
    hideOnMobile:z.boolean().optional(),
    stackOnMobile:z.boolean().optional(),
  }).strict().default({}),
  conditions:emailConditionGroupSchema.optional(),
  presetId:z.string().min(1).max(120).nullable().optional(),
}).strict();

export const emailDocumentSchema=z.object({
  schemaVersion:z.literal(EMAIL_SCHEMA_VERSION),
  templateKey:z.string().min(1).max(160),
  family:z.enum(emailTemplateFamilies),
  purpose:z.enum(emailPurposes),
  language:z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  subject:z.string().min(1).max(240),
  preheader:z.string().max(300).default(''),
  blocks:z.array(emailBlockSchema).min(1).max(100),
  design:emailDesignOverrideSchema,
  metadata:z.record(z.unknown()).default({}),
}).strict();

export type EmailConditionRule=z.infer<typeof emailConditionRuleSchema>;
export type EmailConditionGroup=z.infer<typeof emailConditionGroupSchema>;
export type EmailBlock=z.infer<typeof emailBlockSchema>;
export type EmailDocument=z.infer<typeof emailDocumentSchema>;

export type EmailOrderItem={name:string;variant?:string|null;quantity:number;unitPrice:number;lineTotal:number};
export type EmailRenderContext={
  store:{name:string;siteUrl:string;logoUrl?:string|null;supportEmail?:string|null};
  customer:{firstName:string;lastName?:string|null;fullName?:string|null;email?:string|null;type?:'b2c'|'b2b'|string|null};
  order?:{number:string;subtotal:number;shipping:number;discount:number;tax:number;total:number;currency?:string;items:EmailOrderItem[];invoiceUrl?:string|null};
  payment?:{method:string;accountHolder?:string|null;bankName?:string|null;bankAccount?:string|null;note?:string|null};
  shipping?:{method?:string|null;carrier?:string|null;trackingNumber?:string|null;trackingUrl?:string|null;address?:string|null};
  billing?:{address?:string|null};
  coupon?:{code?:string|null;discount?:number|null;expiry?:string|null};
};

export type RenderedEmail={subject:string;preheader:string;html:string;text:string;warnings:string[]};
