import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder Foundation C delivery bridge',()=>{
  it('keeps the integration worker on the existing transactional email API',()=>{
    const processor=read('src/lib/integrations/processor.ts');
    expect(processor).toContain("import { sendTransactionalEmail,type EmailTemplate } from '@/lib/integrations/email'");
    expect(processor).toContain('sendTransactionalEmail({to:order.customer_email');
    expect(processor).not.toContain("@/lib/email-builder/active-template");
  });

  it('tries Builder only for order confirmation and preserves an explicit legacy fallback',()=>{
    const email=read('src/lib/integrations/email.ts');
    expect(email).toContain("if(input.template!=='order_confirmation')return null");
    expect(email).toContain("resolveActiveEmailTemplate(input.identity.instanceId,'essential.order_confirmation')");
    expect(email).toContain('if(!active)return null');
    expect(email).toContain("renderer:'email_builder'");
    expect(email).toContain("renderer:'legacy'");
    expect(email).toContain('const builder=await tryBuilderOrderConfirmation(input)');
    expect(email).toContain('if(builder)return builder');
  });

  it('resolves only tenant-scoped active immutable versions and fails closed on broken active state',()=>{
    const resolver=read('src/lib/email-builder/active-template.ts');
    expect(resolver).toContain(".eq('instance_id',instanceId).eq('template_key',templateKey).maybeSingle()");
    expect(resolver).toContain("if(!template||template.status!=='active')return null");
    expect(resolver).toContain("throw new Error('EMAIL_ACTIVE_VERSION_REQUIRED')");
    expect(resolver).toContain(".eq('instance_id',instanceId).eq('template_id',template.id).eq('id',template.active_version_id).maybeSingle()");
    expect(resolver).toContain("throw new Error('EMAIL_ACTIVE_DOCUMENT_INVALID')");
    expect(resolver).toContain("throw new Error('EMAIL_ACTIVE_DOCUMENT_IDENTITY_MISMATCH')");
  });

  it('loads order snapshots tenant-bound and blocks incomplete transactional context',()=>{
    const context=read('src/lib/email-builder/order-context.ts');
    expect((context.match(/\.eq\('instance_id',input\.instanceId\)/g)??[]).length).toBeGreaterThanOrEqual(2);
    expect(context).toContain("throw new Error('EMAIL_ORDER_CONTEXT_NOT_FOUND')");
    expect(context).toContain("throw new Error('EMAIL_ORDER_ITEMS_CONTEXT_EMPTY')");
    expect(context).toContain("order.payment_method==='bank_transfer'&&!input.bankTransfer");
    expect(context).toContain("throw new Error('EMAIL_BANK_TRANSFER_DETAILS_REQUIRED')");
    expect(context).toContain('return emailRenderContextSchema.parse(context)');
  });

  it('sends Builder output with both HTML and plain-text while legacy remains available',()=>{
    const email=read('src/lib/integrations/email.ts');
    expect(email).toContain('subject:rendered.subject,html:rendered.html,text:rendered.text');
    expect(email).toContain("text:input.text||undefined");
    expect(email).toContain('bankTransferBlock(input)');
  });
});
