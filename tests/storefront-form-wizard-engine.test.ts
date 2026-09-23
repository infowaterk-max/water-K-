import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('shared Storefront Form Wizard engine',()=>{
  it('owns multi-step validation, navigation, submission and confirmation',()=>{
    const wizard=readFileSync('src/components/forms/storefront-form-wizard.tsx','utf8');
    expect(wizard).toContain('data-storefront-form-wizard="shared-v1"');
    expect(wizard).toContain('validateFields(form,step.fields)');
    expect(wizard).toContain('setStepIndex(current=>Math.min');
    expect(wizard).toContain('setStepIndex(current=>Math.max');
    expect(wizard).toContain("fetch(endpoint");
    expect(wizard).toContain("feedback.kind==='error'?'alert':'status'");
    expect(wizard).toContain('aria-live="polite"');
  });

  it('does not show required-field errors before the customer interacts with the current step',()=>{
    const wizard=readFileSync('src/components/forms/storefront-form-wizard.tsx','utf8');
    expect(wizard).toContain('setReady(Object.keys(next).length===0)');
    expect(wizard).toContain('setErrors(current=>Object.fromEntries(Object.keys(current).flatMap');
    expect(wizard).not.toContain('const next=validateFields(form,step.fields);setErrors(next);setReady');
  });

  it('uses topic-first routing with desktop explanation and mobile accordion behavior',()=>{
    const wizard=readFileSync('src/components/forms/storefront-form-wizard.tsx','utf8');
    const client=readFileSync('src/components/builder/storefront-support-contact-form-client.tsx','utf8');
    expect(wizard).toContain('data-wizard-topic-layout="desktop"');
    expect(wizard).toContain('data-wizard-topic-layout="mobile"');
    expect(wizard).toContain('onMouseEnter={()=>setPreviewTopic');
    expect(wizard).toContain('onFocus={()=>setPreviewTopic');
    expect(wizard).toContain('<details');
    expect(wizard).toContain('Ezt választom');
    expect(wizard).toContain('setStepIndex(1)');
    expect(wizard).toContain('setSelectedValues({[field.name]:nextValue})');
    expect(client).toContain("kind:'topic'");
    expect(client).toContain("whenTopic:'general'");
    expect(client).toContain("whenTopic:'order'");
    expect(client).toContain("whenTopic:'product-issue'");
  });

  it('does not request a rendelési szám for general information, but does for order-specific branches',()=>{
    const client=readFileSync('src/components/builder/storefront-support-contact-form-client.tsx','utf8');
    const general=client.slice(client.indexOf("id:'general-detail'"),client.indexOf("id:'order-detail'"));
    const order=client.slice(client.indexOf("id:'order-detail'"),client.indexOf("id:'shipping-detail'"));
    expect(general).not.toContain("name:'orderNumber'");
    expect(order).toContain("name:'orderNumber'");
    expect(order).toContain('required:true');
  });

  it('keeps support authority canonical and template presentation-only',()=>{
    const client=readFileSync('src/components/builder/storefront-support-contact-form-client.tsx','utf8');
    const api=readFileSync('src/app/api/support/route.ts','utf8');
    const fallback=readFileSync('src/components/support/support-form.tsx','utf8');
    expect(client).toContain('data-form-engine="storefront-form-wizard-v1"');
    expect(client).toContain('endpoint="/api/support"');
    expect(client).not.toContain("fetch('/api/support'");
    expect(fallback).toContain('StorefrontSupportContactFormClient');
    expect(api).toContain("rpc('create_support_ticket_v2'");
    expect(api).toContain("result.duplicate===true");
    expect(api).toContain("{status:201}");
  });
});
