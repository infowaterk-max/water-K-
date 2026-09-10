import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Communication responsive contract v2',()=>{
  it('detects touch browser desktop-site mode without resizing or counter-zooming the app',()=>{
    const bridge=read('src/components/admin/admin-mobile-desktop-compat.tsx');
    expect(bridge).toContain('navigator.maxTouchPoints');
    expect(bridge).toContain("(pointer: coarse)");
    expect(bridge).toContain("(any-pointer: coarse)");
    expect(bridge).toContain("(hover: none)");
    expect(bridge).toContain('layoutWidth>MOBILE_BREAKPOINT');
    expect(bridge).toContain('layoutWidth<=MAX_TOUCH_DESKTOP_VIEWPORT');
    expect(bridge).toContain("root.dataset.desktopSiteTouch='true'");
    expect(bridge).not.toContain('devicePixelRatio');
    expect(bridge).not.toContain('visualViewport');
    expect(bridge).not.toContain('style.setProperty');
    expect(bridge).not.toContain('mobileDesktopCompat');
  });

  it('preserves the real desktop workspace in desktop-site mode',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('.adminGrid[data-desktop-site-touch="true"]');
    expect(css).toContain('width:1440px!important');
    expect(css).toContain('min-width:1440px!important');
    expect(css).toContain('grid-template-columns:286px minmax(0,1fr)!important');
    expect(css).toContain('touch-action:pan-x pan-y pinch-zoom');
    expect(css).toContain('.adminMobileNavigation{display:none!important}');
    expect(css).not.toContain('zoom:');
    expect(css).not.toContain('--admin-mobile-desktop');
  });

  it('restores full desktop Digital Office and Team Chat columns instead of forcing mobile panes',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('grid-template-columns:176px 310px minmax(430px,1fr) 292px!important');
    expect(css).toContain('grid-template-columns:310px minmax(430px,1fr) 300px!important');
    expect(css).toContain('.digitalOfficeMobileController{display:none!important}');
    expect(css).toContain('.teamChatMobileBack{display:none!important}');
    expect(css).not.toContain('[data-mobile-view="list"]');
    expect(css).not.toContain('[data-mobile-view="conversation"]');
    expect(css).not.toContain('[data-mobile-view="context"]');
    expect(css).not.toContain('[data-mobile-view="chat"]');
    expect(css).not.toContain('[data-mobile-view="info"]');
  });

  it('leaves normal mobile behaviour under the native <=850px contracts',()=>{
    const officeMobile=read('src/app/admin/digital-office-mobile-final.css');
    const teamChat=read('src/app/admin/team-chat-workspace.css');
    const routeCss=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(officeMobile).toContain('@media(max-width:850px)');
    expect(officeMobile).toContain('.digitalOfficeWorkstation[data-mobile-view="conversation"]');
    expect(teamChat).toContain('@media(max-width:850px)');
    expect(teamChat).toContain('.teamChatWorkspace[data-mobile-view="chat"]');
    expect(routeCss).toContain('@media(max-width:850px)');
  });

  it('loads the mode marker only inside the communication workspace',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    expect(layout).toContain("import './mobile-desktop-compat.css';");
    expect(layout).toContain('AdminMobileDesktopCompat');
    expect(layout).toContain('<AdminMobileDesktopCompat/>');
  });
});
