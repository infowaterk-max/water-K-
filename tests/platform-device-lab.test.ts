import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';
import{buildDeviceLabPreviewSrc,DEVICE_LAB_PRESETS,normalizeDeviceLabDevice,normalizeDeviceLabTarget}from'../src/lib/platform/device-lab';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Platform Device Lab',()=>{
  test('defines deterministic desktop, tablet and mobile viewport presets',()=>{
    expect(DEVICE_LAB_PRESETS.desktop).toEqual({label:'Asztali',width:1440,height:900});
    expect(DEVICE_LAB_PRESETS.tablet).toEqual({label:'Táblagép',width:768,height:1024});
    expect(DEVICE_LAB_PRESETS.mobile).toEqual({label:'Mobil',width:390,height:844});
    expect(normalizeDeviceLabDevice('tablet')).toBe('tablet');
    expect(normalizeDeviceLabDevice('mobile')).toBe('mobile');
    expect(normalizeDeviceLabDevice('unknown')).toBe('desktop');
  });

  test('keeps preview targets inside admin and blocks recursive or external framing',()=>{
    expect(normalizeDeviceLabTarget('/admin/rendelesek?status=open#top')).toBe('/admin/rendelesek?status=open#top');
    expect(normalizeDeviceLabTarget('https://example.com/admin')).toBe('/admin/platform');
    expect(normalizeDeviceLabTarget('//example.com/admin')).toBe('/admin/platform');
    expect(normalizeDeviceLabTarget('/admin/platform/device-lab?device=mobile')).toBe('/admin/platform');
    expect(normalizeDeviceLabTarget('/shop')).toBe('/admin/platform');
  });

  test('marks only the iframe request for the same-origin frame policy',()=>{
    expect(buildDeviceLabPreviewSrc('/admin/ugyfelek?tab=active')).toBe('/admin/ugyfelek?tab=active&__shoperation_device_preview=1');
    expect(normalizeDeviceLabTarget('/admin/ugyfelek?__shoperation_device_preview=1&tab=active')).toBe('/admin/ugyfelek?tab=active');
  });

  test('renders the launcher only for platform accounts and protects the Device Lab route',()=>{
    const layout=read('src/app/admin/layout.tsx'),page=read('src/app/admin/platform/device-lab/page.tsx');
    expect(layout).toContain("import { PlatformDeviceLabLauncher }");
    expect(layout).toContain('{isPlatform&&<PlatformDeviceLabLauncher/>}');
    expect(page).toContain('await requirePlatformOperator()');
  });

  test('preserves global anti-framing while allowing marked same-origin admin previews',()=>{
    const config=read('next.config.ts');
    expect(config).toContain("{key:'X-Frame-Options',value:'DENY'}");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("key:'__shoperation_device_preview',value:'1'");
    expect(config).toContain("{key:'X-Frame-Options',value:'SAMEORIGIN'}");
    expect(config).toContain("frame-ancestors 'self'");
  });

  test('uses a distinct wide tablet glyph rather than a stretched phone',()=>{
    const launcher=read('src/components/admin/platform-device-lab-launcher.tsx');
    expect(launcher).toContain('width="23" height="15.6"');
    expect(launcher).toContain('<circle cx="14" cy="6.5" r=".65"/>');
  });
});
