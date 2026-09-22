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

  it('uses one Digital Office entry point and keeps authorization request-scoped and fail-closed',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    const access=read('src/lib/digital-office/access.ts');
    const navigation=read('src/components/navigation/digital-office-navigation.tsx');
    const adminNavigation=read('src/components/navigation/admin-navigation.tsx');
    expect(layout).toContain('digitalOfficeShell');
    expect(layout).toContain('getDigitalOfficeAccess');
    expect(layout).toContain('<Suspense');
    expect(layout).toContain("import './digital-office-performance-hardening.css';");
    for(const contract of['getAdminRequestUser','getCurrentWebshopInstance','getActiveStoreRoles','roleHasPermission','getFeatureEntitlementDecisions','isCapabilityReleased','hasStoreCapability','cache(async()=>'])expect(access).toContain(contract);
    expect(access).toContain("roleHasPermission(role,'support.manage')");
    expect(access).toContain("roleHasPermission(role,'marketing.manage')");
    expect(access).toContain("'office.internal_chat'");
    expect(access).toContain('featureDecisions.get(code)?.enabled===true');
    for(const label of['Kezdőlap','E-mail','Team Chat','Feladatok','Jóváhagyások','Küldési központ','E-mail sablonok'])expect(navigation).toContain(label);
    expect(navigation).toContain("href:'/admin/kommunikacio'");
    expect(navigation).toContain('usePathname()');
    expect(adminNavigation).toContain("'digital-office':'/admin/kommunikacio'");
    expect(adminNavigation).toContain('adminNavSectionDirect');
  });

  it('renders the Digital Office home from real sources without repeating the layout authorization waterfall',()=>{
    const page=read('src/app/admin/kommunikacio/page.tsx');
    for(const source of['office_threads','office_tasks','communication_jobs','office_accessible_thread_ids_v1','office_message_mentions','office_message_attachments'])expect(page).toContain(source);
    for(const label of['Mai fókusz','Feladataim','Mai határidők','Legutóbbi aktivitás','Jóváhagyások & problémák','Értesítések','Legutóbbi fájlok','Gyors műveletek'])expect(page).toContain(label);
    expect(page).toContain('getDigitalOfficeAccess');
    for(const duplicate of['getAdminRequestUser','requireCurrentStoreContext','hasCurrentPlanFeature','hasStorePermission','hasStoreCapability'])expect(page).not.toContain(duplicate);
    expect(page).not.toContain("redirect('/admin/kommunikacio/iroda')");
    expect(page).toContain('profileResult,threadResult,taskResult,jobResult,accessibleResult');
    expect(page).toContain('messageResult,chatThreadResult,chatMessageResult,participantResult,mentionResult');
    expect(page).toContain('authorResult,attachmentResult');
  });

  it('provides instant loading feedback and colocates compute with the Frankfurt production database',()=>{
    const loading=read('src/app/admin/kommunikacio/loading.tsx');
    const css=read('src/app/admin/kommunikacio/digital-office-performance-hardening.css');
    const vercel=JSON.parse(read('vercel.json')) as {regions?:string[]};
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('digitalOfficeSkeleton');
    expect(css).toContain('@keyframes digitalOfficeSkeletonPulse');
    expect(vercel.regions).toEqual(['fra1']);
  });

  it('pins the approved dashboard and workstation proportions in the final redesign layer',()=>{
    const css=read('src/app/admin/kommunikacio/digital-office-workspace-redesign.css');
    expect(css).toContain('grid-template-columns:repeat(4,minmax(0,1fr))');
    expect(css).toContain('grid-template-columns:5fr 4fr 3fr');
    expect(css).toContain('grid-template-columns:300px minmax(470px,1fr) 285px!important');
    expect(css).toContain('grid-template-columns:290px minmax(460px,1fr) 280px!important');
    expect(css).toContain('.digitalOfficeDashboardMetric');
  });

  it('uses full-row attention states and compact composer utility controls',()=>{
    const page=read('src/app/admin/kommunikacio/page.tsx');
    const css=read('src/app/admin/kommunikacio/digital-office-performance-hardening.css');
    expect(page).toContain('Date.parse(task.due_at)<now.getTime()');
    expect(css).toContain('.digitalOfficeApproval:has(em[data-tone="warn"])');
    expect(css).toContain('.digitalOfficeApproval:has(em[data-tone="danger"])');
    expect(css).toContain('.digitalOfficeTaskRow:has(>em[data-hot="true"])');
    expect(css).toContain('.teamChatComposerTools>header>button');
    expect(css).toContain('width:22px!important');
    expect(css).toContain('.teamChatFilePickerButton');
    expect(css).toContain('height:26px!important');
  });

  it('surfaces the approved real-data context summaries in e-mail and Team Chat',()=>{
    const email=read('src/app/admin/kommunikacio/iroda/page.tsx');
    const chat=read('src/app/admin/kommunikacio/chat/page.tsx');
    const css=read('src/app/admin/kommunikacio/digital-office-context-redesign.css');
    for(const field of['customer_user_id','customer_ref','sales_owner_user_id','responsible_user_id','total_gross_huf','shipping_method','payment_method'])expect(email).toContain(field);
    for(const label of['Aktuális rendelés','Felelősség','Mailbox felelős','Sales owner','CRM ref','Nyitott teendők','Kapcsolt elemek'])expect(email).toContain(label);
    for(const label of['Kapcsolt üzleti elemek','Olvasottság','Megosztott fájlok','Adatvédelem és megőrzés','Secure Attachments'])expect(chat).toContain(label);
    expect(chat).toContain("linkedCount('commercial_offer')");
    expect(chat).toContain('readTimeLabel(participant.last_read_at)');
    expect(css).toContain('.digitalOfficeContextStats');
    expect(css).toContain('.teamChatContextStats');
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