import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Digital Office suppression feedback',()=>{
  test('suppressed customer e-mail stays inline, preserves the draft and does not bypass mailbox/revision guards',()=>{
    const actions=read('src/app/admin/kommunikacio/iroda/composer-actions.ts');
    const form=read('src/components/admin/office-customer-email-form.tsx');
    const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
    expect(actions).toContain("reason.includes('recipient suppressed')");
    expect(actions).toContain('Ez az e-mail-cím kommunikációs tiltólistán van, ezért az üzenet nem küldhető.');
    expect(form).toContain('useState<OfficeComposerActionState>');
    expect(form).toContain('value={body}');
    expect(form).toContain('disabled={actionPending}');
    expect(form).toContain('Feldolgozás…');
    expect(form).toContain('animateTransform');
    expect(form).toContain("operationState.status==='blocked'||operationState.status==='error'||operationState.status==='conflict'");
    expect(form).toContain('useOfficeDraftAutosave');
    expect(form).toContain("draft.status==='conflict'");
    expect(form).toContain('!sendingConfigured');
    expect(page).toContain('<OfficeCustomerEmailForm');
    expect(page).toContain('sendingConfigured={sendingConfigured}');
    expect(page).toContain('initialDraft={replyDraft?');
    expect(page).not.toContain('action={sendCustomerEmailAction}');
  });
});
