import { z } from 'zod';
import type { EmailBlock, EmailBlockType } from './types';
import { emailRichTextSchema } from './rich-text';

export type EmailBlockDefinition={
  type:EmailBlockType;
  category:'content'|'transactional'|'system';
  requiredContext?:'order'|'payment'|'shipping'|'billing';
  contentSchema:z.ZodTypeAny;
};

const optionalText=z.string().max(4000).optional();
export const emailBlockRegistry:Record<EmailBlockType,EmailBlockDefinition>={
  header:{type:'header',category:'system',contentSchema:z.object({showLogo:z.boolean().default(true),brandText:optionalText}).strict()},
  heading:{type:'heading',category:'content',contentSchema:z.object({text:z.string().min(1).max(500),level:z.enum(['h1','h2','h3']).default('h2'),align:z.enum(['left','center','right']).default('left'),richText:emailRichTextSchema.optional()}).strict()},
  text:{type:'text',category:'content',contentSchema:z.object({text:z.string().max(8000),align:z.enum(['left','center','right']).default('left'),richText:emailRichTextSchema.optional()}).strict()},
  button:{type:'button',category:'content',contentSchema:z.object({label:z.string().min(1).max(200),href:z.string().min(1).max(2000),align:z.enum(['left','center','right']).default('left'),richText:emailRichTextSchema.optional()}).strict()},
  divider:{type:'divider',category:'content',contentSchema:z.object({}).strict()},
  spacer:{type:'spacer',category:'content',contentSchema:z.object({size:z.enum(['s','m','l','xl']).default('m')}).strict()},
  'order-items':{type:'order-items',category:'transactional',requiredContext:'order',contentSchema:z.object({title:optionalText}).strict()},
  'order-summary':{type:'order-summary',category:'transactional',requiredContext:'order',contentSchema:z.object({title:optionalText}).strict()},
  'payment-info':{type:'payment-info',category:'transactional',requiredContext:'payment',contentSchema:z.object({title:optionalText}).strict()},
  address:{type:'address',category:'transactional',contentSchema:z.object({kind:z.enum(['shipping','billing']),title:z.string().max(200).optional()}).strict()},
  footer:{type:'footer',category:'system',contentSchema:z.object({text:optionalText}).strict()},
};

export function validateEmailBlockContent(block:EmailBlock){
  const definition=emailBlockRegistry[block.type];
  return definition.contentSchema.safeParse(block.content);
}
