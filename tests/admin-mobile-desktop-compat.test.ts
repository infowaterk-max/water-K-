import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Communication responsive contract v3',()=>{
  it('detects touch browser desktop-site mode without counter-zooming the app',()=>{
    const bridge=read('src/components/admin/admin-mobile-desktop-compat.tsx');
    expect(bridge).toContain('navigator.maxTouchPoints');
    expect(bridge).toContain("(pointer: coarse)");
    expect(bridge).toContain("(any-pointer: coarse)");
    expect(bridge).toContain("(hover: none)");
    expect(bridge).toContain('layoutWidth>MOBILE_BREAKPOINT');
    expect(bridge).toContain('layoutWidth<=MAX_TOUCH_DESKTOP_VIEWPORT');
    expect(bridge).toContain("root.dataset.desktopSiteTouch='true'");
    expect(bridge).not.toContain('devicePixelRatio');
    expect(bridge).not.toContain('zoom:');
    expect(bridge).not.toContain('mobileDesktopCompat');
  });

  it('compensates desktop-site height by the same ratio used to fit the 1440px canvas',()=>{
    const bridge=read('src/components/admin/admin-mobile-desktop-compat.tsx');
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(bridge).toContain('DESKTOP_CANVAS_WIDTH=1440');
    expect(bridge).toContain('DESKTOP_CANVAS_WIDTH/layoutWidth');
    expect(bridge).toContain('window.innerHeight*widthCompensation');
    expect(bridge).toContain("root.style.setProperty('--admin-desktop-site-height'");
    expect(bridge).toContain("root.style.removeProperty('--admin-desktop-site-height')");
    expect(css).toContain('min-height:var(--admin-desktop-site-height,100vh)!important');
    expect(css).toContain('min-height:max(680px,calc(var(--admin-desktop-site-height,100vh) - 118px))!important');
    expect(css).toContain('height:auto!important');
  });

  it('preserves the real desktop workspace in desktop-site mode',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('.adminGrid[data-desktop-site-touch="true"]');
    expect(css).toContain('width:1440px!important');
    expect(css).toContain('min-width:1440px!important');
    expect(css).toContain('grid-template-columns:286px minmax(0,1fr)!important');
    expect(css).toContain('touch-action:pan-x pan-y pinch-zoom');
    expect(css).toContain('.adminMobileNavigation{display:none!important}');
    expect(css).not.toContain('zoom:var(');
    expect(css).not.toContain('--admin-mobile-desktop');
  });

  it('restores full desktop Digital Office and Team Chat columns instead of forcing mobile panes',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('grid-template-columns:176px 310px minmax(430px,1fr) 292px!important');
    expect(css).toContain('grid-template-columns:310px minmax(430px,1fr) 300px!important');
    expect(css).toContain('.digitalOfficeMobileController{display:none!important}');
    expect(css).toContain('.teamChatMobileBack{display:none!important}');
  });

  it('allows normal mobile chat scrollers to chain the gesture back to the page',()=>{
    const teamChat=read('src/app/admin/team-chat-workspace.css');
    const routeCss=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(teamChat).toContain('@media(max-width:850px)');
    expect(teamChat).toContain('.teamChatWorkspace[data-mobile-view="chat"]');
    expect(teamChat).toContain('overscroll-behavior:contain');
    expect(routeCss).toContain('@media(max-width:850px)');
    expect(routeCss).toContain('.teamChatPeopleScroll,');
    expect(routeCss).toContain('.teamChatMessages,');
    expect(routeCss).toContain('.teamChatInfoPane{overscroll-behavior-y:auto!important}');
    expect(routeCss).toContain('.teamChatMessages{touch-action:pan-y!important}');
  });

  it('loads the mode marker only inside the communication workspace',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    expect(layout).toContain("import './mobile-desktop-compat.css';");
    expect(layout).toContain('AdminMobileDesktopCompat');
    expect(layout).toContain('<AdminMobileDesktopCompat/>');
  });
});
