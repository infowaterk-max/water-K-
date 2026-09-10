import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Digital Office workstation final UX',()=>{
  it('uses an application-style rail, thread list, active conversation and context pane',()=>{
    const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
    for(const contract of[
      'digitalOfficeLocalRail',
      'digitalOfficeThreadListPane',
      'digitalOfficeConversationPane',
      'digitalOfficeContextPane',
      'selectedThread',
      'selectedMessages',
      'requestedThreadId',
    ])expect(page).toContain(contract);
    expect(page).not.toContain('cards adminMetricCards');
    expect(page).not.toContain('<div className="sectionIntro"');
  });

  it('keeps real inbox workflows available inside the workstation instead of a visual mock',()=>{
    const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
    for(const integration of[
      'OfficeCustomerEmailForm',
      'markCustomerThreadReadAction',
      'updateThreadAction',
      'createTaskAction',
      'completeTaskAction',
      'office_message_attachments',
      'office_message_object_links',
      'communication_jobs',
      'Rendelés megnyitása',
    ])expect(page).toContain(integration);
    for(const filter of["'inbox'","'unread'","'mine'","'drafts'","'sent'","'urgent'","'closed'"])expect(page).toContain(filter);
  });

  it('embeds a real privacy-scoped internal chat dock using the existing Team Chat authority',()=>{
    const dock=read('src/components/admin/digital-office-chat-dock.tsx');
    const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
    expect(page).toContain('DigitalOfficeChatDock');
    expect(page).toContain("hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat'");
    expect(dock).toContain("db.rpc('office_accessible_thread_ids_v1'");
    expect(dock).toContain(".in('id',accessibleIds)");
    expect(dock).toContain('OfficePrivateMessageForm');
    expect(dock).toContain(".eq('kind','internal')");
    expect(dock).not.toContain("conversation_type:'customer'");
  });

  it('loads the workstation layer after the shared workspace design system and remains responsive',()=>{
    const layout=read('src/app/admin/layout.tsx');
    const css=read('src/app/admin/digital-office-workstation.css');
    expect(layout).toContain("import './workspace-design-system.css';");
    expect(layout).toContain("import './digital-office-workstation.css';");
    expect(layout.indexOf("import './workspace-design-system.css';")).toBeLessThan(layout.indexOf("import './digital-office-workstation.css';"));
    expect(css).toContain('grid-template-columns:176px minmax(270px,310px) minmax(430px,1fr) minmax(250px,292px)');
    expect(css).toContain('@media(max-width:1120px)');
    expect(css).toContain('@media(max-width:850px)');
    expect(css).toContain('@media(max-width:620px)');
    expect(css).toContain('var(--workspace-accent)');
    expect(css).toContain('var(--workspace-line)');
  });

  it('does not cross launch gates while finalizing the interface',()=>{
    const joined=[
      read('src/app/admin/kommunikacio/iroda/page.tsx'),
      read('src/components/admin/digital-office-chat-dock.tsx'),
      read('src/app/admin/digital-office-workstation.css'),
    ].join('\n').toLowerCase();
    for(const forbidden of[
      'resend receiving',
      'dns/mx',
      "team_chat_secure_attachments_released === 'true'",
      'openai',
    ])expect(joined).not.toContain(forbidden);
    expect(joined).toContain('a jelenlegi webshop e-mail címeit nem használjuk');
  });
});
