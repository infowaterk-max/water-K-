import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Digital Office UI consistency hardening',()=>{
  it('loads the final consistency layer after previous Digital Office overrides',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    const performance="import './digital-office-performance-hardening.css';";
    const consistency="import './digital-office-ui-consistency.css';";
    expect(layout).toContain(performance);
    expect(layout).toContain(consistency);
    expect(layout.indexOf(performance)).toBeLessThan(layout.indexOf(consistency));
  });

  it('uses compact desktop actions while retaining mobile touch targets',()=>{
    const css=read('src/app/admin/kommunikacio/digital-office-ui-consistency.css');
    expect(css).toContain('.digitalOfficeThreadToolbar .btn.btnPrimary');
    expect(css).toContain('.digitalOfficeContextForm>.btn.btnPrimary');
    expect(css).toContain('.teamChatNewButton');
    expect(css).toContain('height:28px!important');
    expect(css).toContain('@media(max-width:850px)');
    expect(css).toContain('min-height:38px!important');
  });

  it('normalizes native email file inputs without changing upload behavior',()=>{
    const css=read('src/app/admin/kommunikacio/digital-office-ui-consistency.css');
    const reply=read('src/components/admin/office-customer-email-form.tsx');
    const compose=read('src/components/admin/office-new-email-composer.tsx');
    expect(css).toContain('input[type="file"]:not(.teamChatFileInput)::file-selector-button');
    expect(css).toContain('color:transparent!important');
    for(const source of[reply,compose]){
      expect(source).toContain('OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES');
      expect(source).toContain('uploadAndScanOfficeEmailAttachments');
      expect(source).toContain('type="file"');
    }
  });

  it('pins Messenger semantics to full-width message rows',()=>{
    const css=read('src/app/admin/kommunikacio/digital-office-ui-consistency.css');
    const chat=read('src/app/admin/kommunikacio/chat/page.tsx');
    expect(css).toContain('.teamChatMessage.isMine{justify-content:flex-end!important}');
    expect(css).toContain('.teamChatMessage:not(.isMine){justify-content:flex-start!important}');
    expect(css).toContain('.teamChatMessage.isMine .teamChatMessageAvatar{display:none!important}');
    expect(css).toContain('width:100%!important');
    expect(css).toContain('max-width:min(72%,680px)!important');
    expect(chat).toContain("const mine=message.author_id===actor.id");
  });

  it('carries queue and attention status across whole rows/cards',()=>{
    const css=read('src/app/admin/kommunikacio/digital-office-ui-consistency.css');
    for(const status of['pending','processing','sent','failed','blocked','cancelled'])expect(css).toContain(`data-status=\"${status}\"`);
    expect(css).toContain('.digitalOfficeFocusItem:has(em[data-tone="warn"])');
    expect(css).toContain('.digitalOfficeFocusItem:has(em[data-tone="danger"])');
    expect(css).toContain('.digitalOfficeThreadItem:has(i[data-priority="urgent"])');
  });

  it('does not weaken Team Chat or secure attachment authorization contracts',()=>{
    const chat=read('src/app/admin/kommunikacio/chat/page.tsx');
    const reply=read('src/components/admin/office-customer-email-form.tsx');
    expect(chat).toContain("hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat'");
    expect(chat).toContain("db.rpc('office_accessible_thread_ids_v1'");
    expect(chat).toContain(".eq('status','ready')");
    expect(reply).toContain('uploadAndScanOfficeEmailAttachments');
    expect(reply).toContain("if(!attachmentAvailability.enabled)throw new Error");
  });
});
