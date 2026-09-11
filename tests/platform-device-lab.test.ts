import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';
import{buildDeviceLabPreviewSrc,DEVICE_LAB_CHANGE_EVENT,DEVICE_LAB_PRESETS,DEVICE_LAB_STORAGE_KEY,normalizeDeviceLabDevice,normalizeDeviceLabTarget}from'../src/lib/platform/device-lab';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Platform persistent device view',()=>{
  test('defines deterministic desktop, tablet and mobile viewport presets',()=>{
    expect(DEVICE_LAB_PRESETS.desktop).toEqual({label:'Asztali',width:1440,height:900});
    expect(DEVICE_LAB_PRESETS.tablet).toEqual({label:'Táblagép',width:768,height:1024});
    expect(DEVICE_LAB_PRESETS.mobile).toEqual({label:'Mobil',width:390,height:844});
    expect(normalizeDeviceLabDevice('tablet')).toBe('tablet');
    expect(normalizeDeviceLabDevice('mobile')).toBe('mobile');
    expect(normalizeDeviceLabDevice('unknown')).toBe('desktop');
  });

  test('keeps preview targets inside admin and retires the old Device Lab route',()=>{
    expect(normalizeDeviceLabTarget('/admin/rendelesek?status=open#top')).toBe('/admin/rendelesek?status=open#top');
    expect(normalizeDeviceLabTarget('https://example.com/admin')).toBe('/admin/platform');
    expect(normalizeDeviceLabTarget('//example.com/admin')).toBe('/admin/platform');
    expect(normalizeDeviceLabTarget('/admin/platform/device-lab?device=mobile')).toBe('/admin/platform');
    expect(normalizeDeviceLabTarget('/shop')).toBe('/admin/platform');
    expect(fs.existsSync(path.join(root,'src/app/admin/platform/device-lab/page.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root,'src/components/admin/platform-device-lab.tsx'))).toBe(false);
  });

  test('marks iframe requests while leaving the visible admin route clean',()=>{
    expect(buildDeviceLabPreviewSrc('/admin/ugyfelek?tab=active')).toBe('/admin/ugyfelek?tab=active&__shoperation_device_preview=1');
    expect(normalizeDeviceLabTarget('/admin/ugyfelek?__shoperation_device_preview=1&tab=active')).toBe('/admin/ugyfelek?tab=active');
  });

  test('persists the selected view globally instead of navigating to a preview page',()=>{
    const launcher=read('src/components/admin/platform-device-lab-launcher.tsx');
    const viewport=read('src/components/admin/platform-responsive-viewport.tsx');
    const layout=read('src/app/admin/layout.tsx');
    expect(DEVICE_LAB_STORAGE_KEY).toBe('shoperation.platform.device-view');
    expect(DEVICE_LAB_CHANGE_EVENT).toBe('shoperation:device-view-change');
    expect(launcher).toContain('window.localStorage.setItem(DEVICE_LAB_STORAGE_KEY,device)');
    expect(launcher).not.toContain('router.push');
    expect(viewport).toContain("window.localStorage.getItem(DEVICE_LAB_STORAGE_KEY)");
    expect(viewport).toContain("window.history.replaceState(window.history.state,'',route)");
    expect(viewport).toContain('<iframe');
    expect(layout).toContain('PlatformResponsiveViewport');
    expect(layout).toContain('<PlatformResponsiveViewport enabled={isPlatform}>');
  });

  test('uses the current central Products page in desktop and mobile navigation',()=>{
    const desktopNav=read('src/components/navigation/admin-navigation.tsx');
    const mobileNav=read('src/components/navigation/admin-mobile-navigation.tsx');
    expect(desktopNav).toContain("'products':'/admin/termekek'");
    expect(desktopNav).not.toContain("'products':'/admin/termekek/feltoltes'");
    expect(mobileNav).toContain("'products':'/admin/termekek'");
    expect(mobileNav).toContain('const directHref=DIRECT_SECTION_HREFS[section.id]');
    expect(mobileNav).toContain('if(directHref)return');
  });

  test('keeps device controls desktop-host only and native touch devices on the real admin',()=>{
    const launcher=read('src/components/admin/platform-device-lab-launcher.tsx');
    const viewport=read('src/components/admin/platform-responsive-viewport.tsx');
    const deviceLib=read('src/lib/platform/device-lab.ts');
    expect(deviceLib).toContain("window.innerWidth>=1100");
    expect(deviceLib).toContain("'(hover: hover) and (pointer: fine)'");
    expect(launcher).toContain('canUsePlatformDevicePreview()');
    expect(viewport).toContain("const stored=available?normalizeDeviceLabDevice");
    expect(viewport).toContain("setDevice('desktop')");
    expect(viewport).toContain('!previewAvailable');
  });

  test('preserves global anti-framing while allowing only same-origin admin previews',()=>{
    const config=read('next.config.ts');
    expect(config).toContain("{key:'X-Frame-Options',value:'DENY'}");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("key:'__shoperation_device_preview',value:'1'");
    expect(config).toContain("{key:'X-Frame-Options',value:'SAMEORIGIN'}");
    expect(config).toContain("frame-ancestors 'self'");
  });

  test('uses the refined wide tablet glyph',()=>{
    const launcher=read('src/components/admin/platform-device-lab-launcher.tsx');
    expect(launcher).toContain('width="23" height="15.6"');
    expect(launcher).toContain('<circle cx="14" cy="6.5" r=".65"/>');
  });
});
