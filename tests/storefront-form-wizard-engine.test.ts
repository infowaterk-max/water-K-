import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('shared Storefront Form Wizard engine',()=>{
  it('owns multi-step validation, navigation, submission and confirmation',()=>{
    const wizard=readFileSync('src/components/forms/storefront-form-wizard.tsx','utf8');
    expect(wizard).toContain("data-storefront-form-wizard="shared-v1"");
    expect(wizard).toContain('validateFields(form,step.fields)');
    expect(wizard).toContain('setStepIndex(current=>Math.min');
    expect(wizard).toContain('setStepIndex(current=>Math.max');
    expect(wizard).toContain("fetch(endpoint");
    expect(wizard).toContain("feedback.kind==='error'?'alert':'status'");
    expect(wizard).toContain('aria-live="polite"');
  });

  it('keeps support authority canonical and template presentation-only',()=>{
    const client=readFileSync('src/components/builder/storefront-support-contact-form-client.tsx','utf8');
    const api=readFileSync('src/app/api/support/route.ts','utf8');
    expect(client).toContain('data-form-engine="storefront-form-wizard-v1"');
    expect(client).toContain('endpoint="/api/support"');
    expect(client).not.toContain("fetch('/api/support'");
    expect(api).toContain("rpc('create_support_ticket_v2'");
    expect(api).toContain("result.duplicate===true");
    expect(api).toContain("{status:201}");
  });
});
