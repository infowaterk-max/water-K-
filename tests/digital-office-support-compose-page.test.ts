import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(file:string)=>readFileSync(join(process.cwd(),file),'utf8');
const page=read('src/app/admin/kommunikacio/iroda/uj/page.tsx');
const layout=read('src/app/admin/kommunikacio/layout.tsx');
const actions=read('src/app/admin/kommunikacio/iroda/composer-actions.ts');
const composer=read('src/components/admin/office-new-email-composer.tsx');

describe('Support default email composer page reflects server rights',()=>{
  it('uses inherited role capability and explicit deny instead of requiring an extra opt-in',()=>{
    expect(page).toContain("const canCompose=isOwner||await hasStoreCapability(scope.instanceId,actor.id,'office.email.compose')");
    expect(page).not.toContain('hasComposeExtra');
    expect(page).not.toContain('extra jogosultság szükséges');
    expect(page).toContain('Az ügyfélszolgálati szerepkör alapértelmezetten jogosult e-mail írására.');
    expect(page).toContain('egyedi tiltást és az aktív szerepkört');
  });

  it('never renders a composer on denied or unavailable foundation, and keeps author private drafts',()=>{
    expect(page).toContain('{canCompose&&!foundationError&&<OfficeNewEmailComposer');
    expect(page).toContain('{!canCompose&&!foundationError&&<div className="adminAuditNotice">');
    expect(page).toContain(".eq('instance_id',scope.instanceId).eq('author_user_id',actor.id).eq('draft_type','new_email')");
    expect(page).toContain("const foundationError=Boolean(draftError||mailboxError||bindingError)");
  });

  it('preserves the Pro-only Office workspace and fail-closed sending with a mailbox',()=>{
    expect(layout).toContain("requirePlanFeature('officeCommunicationAdvanced')");
    expect(actions).toContain("requirePlanFeature('officeCommunicationAdvanced')");
    expect(actions).toContain("db.rpc('admin_mutate_office_draft_v3'");
    expect(actions).toContain("db.rpc('admin_queue_office_email_v6'");
    expect(composer).toContain('const sendReady=sendingConfigured');
    expect(composer).toContain('Piszkozat mentése');
    expect(page).toContain('Jelenlegi webshopos e-mail cím nem használható.');
  });
});
