import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Digital Office suppression feedback',()=>{
  test('suppressed To/CC/BCC recipient stays inline, preserves the draft and does not bypass mailbox/revision guards',()=>{
    const actions=read('src/app/admin/kommunikacio/iroda/composer-actions.ts');
    const form=read('src/components/admin/office-customer-email-form.tsx');
    const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
    const worker=read('src/lib/communication/worker.ts');
    expect(actions).toContain("reason.includes('recipient_suppressed')||reason.includes('secondary_recipient_suppressed')");
    expect(actions).toContain('A címzettek között kommunikációs tiltólistán szereplő e-mail-cím van, ezért az üzenet nem küldhető.');
    expect(worker).toContain('OFFICE_SECONDARY_RECIPIENT_SUPPRESSED_AT_SEND_TIME');
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
