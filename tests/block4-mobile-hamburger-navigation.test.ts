import{readFileSync}from'node:fs';import{resolve}from'node:path';import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Roadmap Block 4 mobile hamburger navigation',()=>{
  it('uses a compact touch-first drawer without changing the desktop navigation contract',()=>{
    const mobile=read('src/components/navigation/admin-mobile-navigation.tsx');
    const desktop=read('src/components/navigation/admin-navigation.tsx');
    const css=read('src/app/admin/block4-mobile-navigation.css');
    const layout=read('src/app/admin/layout.tsx');
    expect(layout).toContain('<AdminMobileNavigation');
    expect(layout).toContain("import './block4-mobile-navigation.css'");
    expect(mobile).toContain('aria-label="Admin menü megnyitása"');
    expect(mobile).toContain('role="dialog" aria-modal="true"');
    expect(mobile).toContain("document.body.style.overflow='hidden'");
    expect(mobile).toContain("event.key==='Escape'");
    expect(mobile).toContain('setOpen(false)');
    expect(mobile).toContain('Shoperation Platform');
    expect(mobile).toContain('Gyakori feladatok');
    expect(css).toContain('@media(max-width:850px)');
    expect(css).toContain('.adminSide>.adminNavigationStack');
    expect(css).toContain('.adminMobileDrawer');
    expect(css).toContain('height:100dvh');
    expect(desktop).toContain('setTimeout(()=>openPreview(sectionId,target),300)');
    expect(desktop).toContain('onMouseDownCapture');
  });
});
