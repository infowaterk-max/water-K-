import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('final communication application shell',()=>{
  it('loads the shared app shell before the dedicated desktop-site compatibility owner',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    expect(layout).toContain("import './communication-app-final.css';");
    expect(layout).toContain("import './mobile-desktop-compat.css';");
    expect(layout.indexOf("import './communication-app-final.css';")).toBeLessThan(layout.indexOf("import './mobile-desktop-compat.css';"));
  });

  it('uses three useful desktop panes without the duplicate local rail column',()=>{
    const css=read('src/app/admin/kommunikacio/communication-app-final.css');
    expect(css).toContain('grid-template-columns:minmax(280px,320px) minmax(460px,1fr) minmax(260px,300px)!important');
    expect(css).toContain('.digitalOfficeLocalRail{');
    expect(css).toContain('grid-column:1/-1!important');
    expect(css).toContain('.digitalOfficeThreadListPane{');
    expect(css).toContain('.digitalOfficeConversationPane{');
    expect(css).toContain('.digitalOfficeContextPane{');
  });

  it('makes native mobile customer e-mail document-scroll instead of trapping it in an inner viewport',()=>{
    const css=read('src/app/admin/kommunikacio/communication-app-final.css');
    expect(css).toContain('@media(max-width:850px)');
    expect(css).toContain('.digitalOfficeWorkstation[data-mobile-view="conversation"] .digitalOfficeConversationPane');
    expect(css).toContain('height:auto!important');
    expect(css).toContain('.digitalOfficeConversationMessages{');
    expect(css).toContain('overflow:visible!important');
    expect(css).toContain('.digitalOfficeWorkstation[data-mobile-view="context"] .digitalOfficeContextPane');
  });

  it('keeps Team Chat composer reachable on native mobile and preserves list/chat/info screens',()=>{
    const css=read('src/app/admin/kommunikacio/communication-app-final.css');
    for(const state of['list','chat','info'])expect(css).toContain(`data-mobile-view=\"${state}\"`);
    expect(css).toContain('grid-template-rows:auto minmax(240px,1fr) auto!important');
    expect(css).toContain('height:clamp(540px,calc(100svh - 150px),760px)!important');
    expect(css).toContain('.teamChatDirectStarter{flex:0 0 auto!important}');
  });

  it('delegates touch-browser Desktop-site acceptance exclusively to the final compatibility file',()=>{
    const appCss=read('src/app/admin/kommunikacio/communication-app-final.css');
    const compatCss=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(appCss).not.toContain('.adminGrid[data-desktop-site-touch="true"]');
    expect(compatCss).toContain('.adminGrid[data-desktop-site-touch="true"]');
    expect(compatCss).toContain('height:calc(100dvh - 112px)!important');
    expect(compatCss).toContain('overflow-x:auto!important');
    expect(compatCss).not.toContain('height:760px!important');
    expect(compatCss).not.toContain('width:1280px!important');
    expect(compatCss).not.toContain('width:1440px!important');
  });

  it('does not remove existing communication functions or release deferred infrastructure',()=>{
    const office=read('src/app/admin/kommunikacio/iroda/page.tsx');
    const chat=read('src/app/admin/kommunikacio/chat/page.tsx');
    const css=read('src/app/admin/kommunikacio/communication-app-final.css').toLowerCase();
    for(const contract of['OfficeCustomerEmailForm','createTaskAction','updateThreadAction','DigitalOfficeChatDock'])expect(office).toContain(contract);
    for(const contract of['sendDirectMessageAction','createPrivateThreadAction','managePrivateParticipantAction','office_message_object_links'])expect(chat).toContain(contract);
    for(const forbidden of['resend receiving','dns/mx','team_chat_secure_attachments_released','openai'])expect(css).not.toContain(forbidden);
  });
});
