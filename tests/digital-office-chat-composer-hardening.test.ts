import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Digital Office Team Chat composer hardening',()=>{
  it('keeps plus, autosizing message input and send action in one cohesive composer surface',()=>{
    const composer=read('src/components/admin/office-private-message-form.tsx');
    expect(composer).toContain('teamChatComposerSurface');
    expect(composer).toContain('teamChatToolsButton');
    expect(composer).toContain('teamChatComposerInput');
    expect(composer).toContain('teamChatSendButton');
    expect(composer).toContain('onInput={autosize}');
    expect(composer).toContain("event.currentTarget.form?.requestSubmit()");
    expect(composer.indexOf('teamChatToolsButton')).toBeLessThan(composer.indexOf('teamChatComposerInput'));
    expect(composer.indexOf('teamChatComposerInput')).toBeLessThan(composer.indexOf('teamChatSendButton'));
  });

  it('keeps advanced message tools collapsed until the plus action is used',()=>{
    const composer=read('src/components/admin/office-private-message-form.tsx');
    expect(composer).toContain("data-open={toolsOpen?'true':'false'}");
    expect(composer).toContain('Hozzáadás az üzenethez');
    expect(composer).toContain('@ Említés');
    expect(composer).toContain('Kapcsolt üzleti objektum');
    expect(composer).toContain('📎 Csatolmány');
    expect(composer).toContain('objectOptions.length>0');
  });

  it('replaces the native file control with the Shoperation attachment picker without changing secure upload contracts',()=>{
    const composer=read('src/components/admin/office-private-message-form.tsx');
    const css=read('src/app/admin/kommunikacio/team-chat-composer-hardening.css');
    expect(composer).toContain('teamChatFileInput');
    expect(composer).toContain('teamChatFilePickerButton');
    expect(composer).toContain('teamChatSelectedFile');
    expect(composer).toContain('Fájl csatolása');
    expect(composer).toContain("name=\"attachment\" type=\"file\"");
    expect(composer).toContain("'/api/admin/office/attachments/prepare'");
    expect(composer).toContain("'/api/admin/office/attachments/scan'");
    expect(composer).toContain("'/api/admin/office/attachments/finalize'");
    expect(composer).toContain('Biztonsági és vírusellenőrzés…');
    expect(css).toContain('.teamChatFileInput');
    expect(css).toContain('clip:rect(0,0,0,0)!important');
  });

  it('uses the same compact composer inside the floating Digital Office chat dock',()=>{
    const dock=read('src/components/admin/digital-office-chat-dock.tsx');
    expect(dock).toContain('<OfficePrivateMessageForm compact threadId={activeThread.id}');
    expect(dock).not.toContain('<OfficePrivateMessageForm threadId={activeThread.id}');
  });

  it('keeps the floating dock compact and expands only when linked content exists',()=>{
    const dock=read('src/components/admin/digital-office-chat-dock.tsx');
    const css=read('src/app/admin/kommunikacio/team-chat-composer-hardening.css');
    expect(dock).toContain("const richContent=activeAttachments.length>0||activeLinks.length>0");
    expect(dock).toContain("digitalOfficeChatDockRich");
    expect(dock).toContain('digitalOfficeChatPreviewRail');
    expect(dock).toContain('Kapcsolt tartalom');
    expect(dock).toContain("hasCurrentPlanFeature('teamChatSecureAttachments')");
    expect(dock).toContain("hasStorePermission(instanceId,'support.manage')");
    expect(css).toContain('width:min(610px,calc(100vw - 44px))!important');
    expect(css).toContain('width:min(880px,calc(100vw - 44px))!important');
    expect(css).toContain('grid-template-columns:178px minmax(0,1fr) 238px!important');
    expect(css).toContain('height:min(390px,58vh)!important');
  });

  it('loads a final CSS layer that prevents split controls and permanent nested composer scrollbars',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    const css=read('src/app/admin/kommunikacio/team-chat-composer-hardening.css');
    expect(layout).toContain("import './team-chat-composer-hardening.css';");
    expect(layout.indexOf("import './digital-office-context-redesign.css';")).toBeLessThan(layout.indexOf("import './team-chat-composer-hardening.css';"));
    expect(css).toContain('grid-template-columns:38px minmax(0,1fr) auto');
    expect(css).toContain('width:100%!important');
    expect(css).toContain('overflow:visible!important');
    expect(css).toContain('max-height:none!important');
    expect(css).toContain('.digitalOfficeShell .digitalOfficeChatDock[open]');
  });
});
