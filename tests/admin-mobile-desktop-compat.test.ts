import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Digital Office mobile desktop-site compatibility',()=>{
  it('detects touch desktop-site mode without relying on screen width reporting',()=>{
    const bridge=read('src/components/admin/admin-mobile-desktop-compat.tsx');
    expect(bridge).toContain("navigator.maxTouchPoints");
    expect(bridge).toContain("(pointer: coarse)");
    expect(bridge).toContain("(any-pointer: coarse)");
    expect(bridge).toContain("'ontouchstart'in window");
    expect(bridge).toContain('window.devicePixelRatio');
    expect(bridge).toContain('layoutWidth<=MAX_DESKTOP_SITE_LAYOUT_WIDTH');
    expect(bridge).not.toContain('layoutWidth/physicalWidth');
    expect(bridge).toContain("root.dataset.mobileDesktopCompat='true'");
  });

  it('derives a safe mobile-width counter scale for desktop-emulated touch viewports',()=>{
    const bridge=read('src/components/admin/admin-mobile-desktop-compat.tsx');
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(bridge).toContain('layoutWidth/dpr');
    expect(bridge).toContain('FALLBACK_MOBILE_WIDTH=430');
    expect(bridge).toContain('clamp(Math.round(estimated),360,480)');
    expect(css).toContain('.adminGrid[data-mobile-desktop-compat="true"]');
    expect(css).toContain('zoom:var(--admin-mobile-desktop-scale)');
    expect(css).toContain('.adminSide>.adminNavigationStack');
    expect(css).toContain('.adminMobileNavigation{display:block!important');
  });

  it('keeps Digital Office and Team Chat single-pane mobile contracts in desktop-site mode',()=>{
    const css=read('src/app/admin/kommunikacio/mobile-desktop-compat.css');
    expect(css).toContain('.digitalOfficeWorkstation[data-mobile-view="list"]');
    expect(css).toContain('.digitalOfficeWorkstation[data-mobile-view="conversation"]');
    expect(css).toContain('.digitalOfficeWorkstation[data-mobile-view="context"]');
    expect(css).toContain('.teamChatWorkspace[data-mobile-view="list"]');
    expect(css).toContain('.teamChatWorkspace[data-mobile-view="chat"]');
    expect(css).toContain('.teamChatWorkspace[data-mobile-view="info"]');
  });

  it('loads the compatibility bridge only inside the communication workspace',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    expect(layout).toContain("import './mobile-desktop-compat.css';");
    expect(layout).toContain("AdminMobileDesktopCompat");
    expect(layout).toContain('<AdminMobileDesktopCompat/>');
  });
});
