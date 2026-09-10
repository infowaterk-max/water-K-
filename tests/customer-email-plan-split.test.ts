import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {hasPlanFeature} from '../src/lib/plans/catalog';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const composerActions=read('src/app/admin/kommunikacio/iroda/composer-actions.ts');
const workspaceActions=read('src/app/admin/kommunikacio/iroda/actions.ts');
const workspace=read('src/app/admin/kommunikacio/iroda/page.tsx');
const newComposer=read('src/components/admin/office-new-email-composer.tsx');
const replyComposer=read('src/components/admin/office-customer-email-form.tsx');
const supervisionLayout=read('src/app/admin/kommunikacio/felugyelet/layout.tsx');
const manageApi=read('src/app/api/admin/communication/manage/route.ts');
const suppressionApi=read('src/app/api/admin/communication/suppression/route.ts');
const enqueueApi=read('src/app/api/admin/communication/enqueue/route.ts');

describe('Customer e-mail Alap / Pro plan split',()=>{
  it('keeps core customer email in both packages and advanced workflow Pro-only',()=>{
    expect(hasPlanFeature('alap','officeCommunication')).toBe(true);
    expect(hasPlanFeature('pro','officeCommunication')).toBe(true);
    expect(hasPlanFeature('alap','officeCommunicationAdvanced')).toBe(false);
    expect(hasPlanFeature('pro','officeCommunicationAdvanced')).toBe(true);
    expect(hasPlanFeature('pro','teamChatSecureAttachments')).toBe(false);
  });

  it('enforces CC/BCC and multi-mailbox behavior server-side, not only in the UI',()=>{
    expect(composerActions).toContain("hasCurrentPlanFeature('officeCommunicationAdvanced')");
    expect(composerActions).toContain("if(!advancedEmail&&(ccEmails.length>0||bccEmails.length>0))");
    expect(composerActions).toContain("throw new OfficeComposerError('OFFICE_EMAIL_ADVANCED_PLAN_REQUIRED')");
    expect(composerActions).toContain(".eq('instance_id',instanceId).eq('is_active',true).order('mailbox_key',{ascending:true}).limit(2)");
    expect(composerActions).toContain("if(active.length!==1)throw new OfficeComposerError('OFFICE_EMAIL_ADVANCED_PLAN_REQUIRED')");
  });

  it('keeps assignment, communication tasks and sending supervision Pro-only',()=>{
    expect(workspaceActions).toContain("supportAccess({advanced:true})");
    expect(workspaceActions).toContain("hasCurrentPlanFeature('officeCommunicationAdvanced')");
    expect(workspaceActions).toContain("select('assigned_to')");
    expect(workspace).toContain('advancedEmail&&<Link className="btn btnGhost" href="/admin/kommunikacio/felugyelet">');
    expect(workspace).toContain('{advancedEmail&&<select name="assigneeUserId"');
    expect(workspace).toContain('{advancedEmail&&!loadError&&<form action={createTaskAction}');
    expect(supervisionLayout).toContain("requirePlanFeature('officeCommunicationAdvanced')");
  });

  it('keeps advanced workflow APIs Pro-only but recipient suppression available as a core safety control',()=>{
    for(const route of[manageApi,enqueueApi]){
      expect(route).toContain("hasCurrentPlanFeature('officeCommunicationAdvanced')");
      expect(route).not.toContain("hasCurrentPlanFeature('officeCommunication')");
    }
    expect(suppressionApi).toContain("hasCurrentPlanFeature('officeCommunication')");
    expect(suppressionApi).not.toContain("hasCurrentPlanFeature('officeCommunicationAdvanced')");
  });

  it('hides advanced envelope and sender selection from Alap UI',()=>{
    expect(newComposer).toContain('advancedEmail?<><div className="splitFeature">');
    expect(newComposer).toContain('advancedEmail?mailboxes.length>0:mailboxes.length===1');
    expect(newComposer).toContain('advancedEmail?mailboxKey:undefined');
    expect(replyComposer).toContain('advancedEmail?<div className="splitFeature">');
    expect(replyComposer).toContain("ccEmails:advancedEmail?ccEmails:''");
  });

  it('does not weaken the mailbox hard gate or activate external infrastructure',()=>{
    expect(composerActions).toContain("if(active.length===0)return null");
    expect(newComposer).toContain('A működő webshop jelenlegi e-mail címeit a rendszer nem használja.');
    expect(composerActions.toLowerCase()).not.toContain('resend receiving');
    expect(composerActions.toLowerCase()).not.toContain('openai');
  });
});
