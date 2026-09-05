import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Digital Office suppression feedback',()=>{
  test('suppressed customer e-mail is rendered as an inline blocked state instead of the global error boundary',()=>{
    const actions=read('src/app/admin/kommunikacio/iroda/actions.ts');
    const form=read('src/components/admin/office-customer-email-form.tsx');
    const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
    expect(actions).toContain("error.reason.includes('recipient suppressed')");
    expect(actions).toContain('Ez az e-mail-cím kommunikációs tiltólistán van, ezért az üzenet nem küldhető.');
    expect(form).toContain('useActionState');
    expect(form).toContain('value={body}');
    expect(form).toContain('disabled={pending');
    expect(form).toContain('Küldés…');
    expect(form).toContain('animateTransform');
    expect(page).toContain('<OfficeCustomerEmailForm threadId={thread.id}/>');
    expect(page).not.toContain('action={sendCustomerEmailAction}');
  });
});
