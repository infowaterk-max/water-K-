import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Digital Office unified workspace UI',()=>{
  it('loads the final workspace token layer after previous admin overrides and shares the Email Builder palette',()=>{
    const layout=read('src/app/admin/layout.tsx');
    const theme=read('src/app/admin/workspace-design-system.css');
    const emailBuilder=read('src/components/admin/email-builder-editor.module.css');
    expect(layout).toContain("import './workspace-design-system.css';");
    expect(layout.indexOf("import './deferred-ui-polish.css';")).toBeLessThan(layout.indexOf("import './workspace-design-system.css';"));
    for(const token of['#f4f6f5','#dce5e3','#132326','#0f987d','#159b7b']){
      expect(theme).toContain(token);
      expect(emailBuilder).toContain(token);
    }
    expect(theme).not.toContain('#e1aa21');
    expect(theme).not.toContain('#c6810c');
    expect(theme).toContain('linear-gradient(180deg,#172c29 0%,#11231f 100%)!important');
  });

  it('uses one Digital Office entry point and the approved internal workspace navigation',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    const navigation=read('src/components/navigation/digital-office-navigation.tsx');
    const adminNavigation=read('src/components/navigation/admin-navigation.tsx');
    expect(layout).toContain('digitalOfficeShell');
    expect(layout).toContain("hasCurrentPlanFeature('officeCommunicationAdvanced')");
    expect(layout).toContain('hasStoreCapability(instance.id,actor.id');
    expect(layout).toContain("import './digital-office-workspace-redesign.css';");
    for(const label of['Kezdőlap','E-mail','Team Chat','Feladatok','Jóváhagyások','Küldési központ','E-mail sablonok'])expect(navigation).toContain(label);
    expect(navigation).toContain("href:'/admin/kommunikacio'");
    expect(navigation).toContain('usePathname()');
    expect(adminNavigation).toContain("'digital-office':'/admin/kommunikacio'");
    expect(adminNavigation).toContain('adminNavSectionDirect');
  });

  it('renders the Digital Office home from real communication, task, chat and attachment sources',()=>{
    const page=read('src/app/admin/kommunikacio/page.tsx');
    for(const source of['office_threads','office_tasks','communication_jobs','office_accessible_thread_ids_v1','office_message_mentions','office_message_attachments'])expect(page).toContain(source);
    for(const label of['Mai fókusz','Feladataim','Mai határidők','Legutóbbi aktivitás','Jóváhagyások & problémák','Értesítések','Legutóbbi fájlok','Gyors műveletek'])expect(page).toContain(label);
    expect(page).not.toContain("redirect('/admin/kommunikacio/iroda')");
  });

  it('pins the approved dashboard and workstation proportions in the final redesign layer',()=>{
    const css=read('src/app/admin/kommunikacio/digital-office-workspace-redesign.css');
    expect(css).toContain('grid-template-columns:repeat(4,minmax(0,1fr))');
    expect(css).toContain('grid-template-columns:5fr 4fr 3fr');
    expect(css).toContain('grid-template-columns:300px minmax(470px,1fr) 285px!important');
    expect(css).toContain('grid-template-columns:290px minmax(460px,1fr) 280px!important');
    expect(css).toContain('.digitalOfficeDashboardMetric');
  });

  it('finishes the send center with searchable filters and inspectable job evidence',()=>{
    const page=read('src/app/admin/kommunikacio/felugyelet/page.tsx');
    expect(page).toContain('status?:string');
    expect(page).toContain('requestedStatus');
    expect(page).toContain('digitalOfficeFilterBar');
    expect(page).toContain('visibleJobs');
    for(const field of['attempts','last_error','provider_message_id'])expect(page).toContain(field);
    expect(page).toContain('communicationJobDetails');
    expect(page).toContain('relatedOrderId');
    expect(page).toContain('data-status={j.status}');
  });

  it('keeps Pro supervision gated and does not activate deferred external infrastructure',()=>{
    const gate=read('src/app/admin/kommunikacio/felugyelet/layout.tsx');
    const theme=read('src/app/admin/workspace-design-system.css').toLowerCase();
    const page=read('src/app/admin/kommunikacio/felugyelet/page.tsx').toLowerCase();
    expect(gate).toContain("requirePlanFeature('officeCommunicationAdvanced')");
    for(const forbidden of['resend receiving','dns/mx','team_chat_secure_attachments_released','openai']){
      expect(theme).not.toContain(forbidden);
      expect(page).not.toContain(forbidden);
    }
  });
});
