import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Communication responsive desktop-site contract v6',()=>{
  it('detects touch browser desktop-site mode without JS resizing or counter-zoom',()=>{
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
  });

  it('loads desktop-site compat after the shared application shell so there is one final owner',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    expect(layout).toContain("import './communication-app-final.css';");
    expect(layout).toContain("import './mobile-desktop-compat.css';");
    expect(layout.indexOf("import './communication-app-final.css';")).toBeLessThan(layout.indexOf("import './mobile-desktop-compat.css';"));
  });

  it('keeps the browser viewport width and pans only the full desktop communication canvas',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('grid-template-columns:220px minmax(0,1fr)!important');
    expect(css).toContain('width:100%!important');
    expect(css).toContain('min-width:960px!important');
    expect(css).toContain('.adminContentShell{');
    expect(css).toContain('overflow-x:auto!important');
    expect(css).toContain('touch-action:pan-x pan-y pinch-zoom!important');
    expect(css).toContain('width:1050px!important');
    expect(css).not.toContain('width:1440px!important');
    expect(css).not.toContain('width:1280px!important');
    expect(css).not.toContain('zoom:');
  });

  it('hides the touch-only horizontal scrollbar without disabling horizontal pan',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('overflow-x:auto!important');
    expect(css).toContain('scrollbar-width:none!important');
    expect(css).toContain('-ms-overflow-style:none!important');
    expect(css).toContain('.adminContentShell::-webkit-scrollbar{');
    expect(css).toContain('height:0!important');
    expect(css).toContain('display:none!important');
    expect(css).toContain('touch-action:pan-x pan-y pinch-zoom!important');
  });

  it('fills the desktop-site viewport vertically without fixed 760px or ratio multiplication',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('min-height:100dvh!important');
    expect(css).toContain('height:calc(100dvh - 112px)!important');
    expect(css).toContain('height:100dvh!important');
    expect(css).not.toContain('height:760px!important');
    expect(css).not.toContain('1440 /');
    expect(css).not.toContain('devicePixelRatio');
    expect(css).not.toContain('visualViewport');
  });

  it('keeps customer e-mail three-pane and resets the former vertical rail into one compact filter row',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('grid-template-columns:280px 500px 270px!important');
    expect(css).toContain('.digitalOfficeLocalRail{');
    expect(css).toContain('grid-column:1/-1!important');
    expect(css).toContain('height:auto!important');
    expect(css).toContain('.digitalOfficeLocalRailTitle,');
    expect(css).toContain('.digitalOfficeLocalRailFooter{display:none!important}');
    expect(css).toContain('flex-direction:row!important');
    expect(css).not.toContain('grid-template-columns:176px 310px minmax(430px,1fr) 292px!important');
  });

  it('keeps full Team Chat three-pane desktop behavior while native mobile remains owned elsewhere',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('.teamChatWorkspace{');
    expect(css).toContain('grid-template-columns:280px 500px 270px!important');
    expect(css).toContain('.teamChatMobileBack{display:none!important}');
    expect(css).not.toContain('@media(max-width:850px)');
  });
});
