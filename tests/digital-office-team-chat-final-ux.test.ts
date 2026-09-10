import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Digital Office + Team Chat final UX',()=>{
  it('turns customer email into explicit list, conversation and context mobile states',()=>{
    const controller=read('src/components/admin/digital-office-mobile-controller.tsx');
    const css=read('src/app/admin/digital-office-mobile-final.css');
    const communicationLayout=read('src/app/admin/kommunikacio/layout.tsx');
    expect(communicationLayout).toContain('<DigitalOfficeMobileController/>');
    expect(controller).toContain("threadId?(contextOpen?'context':'conversation'):'list'");
    expect(controller).toContain('Ügyfél és ügy');
    for(const state of['list','conversation','context'])expect(css).toContain(`data-mobile-view=\"${state}\"`);
    expect(css).toContain('.digitalOfficeWorkstation[data-mobile-view="list"] .digitalOfficeConversationPane');
    expect(css).toContain('.digitalOfficeWorkstation[data-mobile-view="context"] .digitalOfficeContextPane');
  });

  it('keeps advanced customer-email controls compact on mobile without removing them from desktop',()=>{
    const form=read('src/components/admin/office-customer-email-form.tsx');
    const css=read('src/app/admin/digital-office-mobile-final.css');
    expect(form).toContain('officeComposerExtrasToggle');
    expect(form).toContain("+ További mezők");
    expect(form).toContain('officeComposerExtras');
    expect(form).toContain('Másolat (CC)');
    expect(form).toContain('Kapcsolt üzleti objektum');
    expect(css).toContain('.officeComposerExtras[data-open="false"]');
  });

  it('makes Team Chat conversation-first instead of an explanatory admin page',()=>{
    const page=read('src/app/admin/kommunikacio/chat/page.tsx');
    const css=read('src/app/admin/team-chat-workspace.css');
    for(const contract of['teamChatPeoplePane','teamChatConversationPane','teamChatInfoPane','teamChatPersonRow','teamChatMessages','teamChatComposer'])expect(page).toContain(contract);
    expect(page).toContain('Kattints és írj üzenetet');
    expect(page).toContain('sendDirectMessageAction');
    expect(page).toContain('new=group');
    expect(page).toContain('＋ Résztvevő hozzáadása');
    expect(page).toContain('Adatvédelem és megőrzés');
    expect(page).not.toContain('className="sectionIntro"');
    expect(page).not.toContain('className="cards adminMetricCards"');
    expect(css).toContain('.teamChatWorkspace[data-mobile-view="list"]');
    expect(css).toContain('.teamChatWorkspace[data-mobile-view="chat"]');
    expect(css).toContain('.teamChatWorkspace[data-mobile-view="info"]');
  });

  it('keeps real business-object linking in the compact message composer',()=>{
    const composer=read('src/components/admin/office-private-message-form.tsx');
    const route=read('src/app/api/admin/office/chat/message/route.ts');
    expect(composer).toContain('teamChatToolsButton');
    expect(composer).toContain('Kapcsolt üzleti objektum');
    expect(composer).toContain("['order','commercial_offer','return_case','support_ticket','task']");
    expect(route).toContain("z.enum(['order','commercial_offer','return_case','support_ticket','task'])");
    expect(route).toContain('objectType:parsed.data.objectType');
  });

  it('uses service-only heartbeat presence instead of decorative online dots',()=>{
    const migration=read('supabase/migrations/20260910113042_office_team_chat_presence_v1.sql');
    const route=read('src/app/api/admin/office/chat/presence/route.ts');
    const presence=read('src/components/admin/team-chat-presence.tsx');
    expect(migration).toContain('create table if not exists public.office_user_presence');
    expect(migration).toContain('alter table public.office_user_presence enable row level security');
    expect(migration).toContain('revoke all on table public.office_user_presence from public,anon,authenticated');
    expect(migration).toContain('grant select,insert,update,delete on table public.office_user_presence to service_role');
    expect(route).toContain("hasCurrentPlanFeature('teamChat')");
    expect(route).toContain("'office.internal_chat'");
    expect(route).toContain("from('office_user_presence')");
    expect(presence).toContain("status==='online'?'Online'");
    expect(presence).toContain("window.setInterval(()=>void sync(),45000)");
  });

  it('loads all final workspace CSS after the original workstation layer and preserves hard gates',()=>{
    const layout=read('src/app/admin/layout.tsx');
    const chat=read('src/app/admin/kommunikacio/chat/page.tsx').toLowerCase();
    const presence=read('src/app/api/admin/office/chat/presence/route.ts').toLowerCase();
    expect(layout.indexOf("import './digital-office-workstation.css';")).toBeLessThan(layout.indexOf("import './digital-office-mobile-final.css';"));
    expect(layout).toContain("import './team-chat-workspace.css';");
    for(const forbidden of['resend receiving','dns/mx','team_chat_secure_attachments_released','openai']){
      expect(chat).not.toContain(forbidden);
      expect(presence).not.toContain(forbidden);
    }
  });
});
