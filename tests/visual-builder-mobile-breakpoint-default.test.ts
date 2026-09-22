import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Visual Builder phone breakpoint default',()=>{
  it('selects Mobil once on phone-sized sessions without locking later manual changes',()=>{
    const source=read('src/app/admin/tartalom/builder/visual-builder-route-controller.tsx');
    expect(source).toContain("const PHONE_VIEWPORT='(max-width: 900px)'");
    expect(source).toContain("findViewportButton(root,'Mobil')");
    expect(source).toContain('mobileButton.click()');
    expect(source).toContain('phoneInitializedRef.current=true');
    expect(source).toContain('phoneInitializedRef.current=false');
  });

  it('keeps the mobile canvas at the canonical 390px frame on phone screens',()=>{
    const css=read('src/app/admin/tartalom/builder/builder-isolation.css');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('[data-viewport="mobile"]');
    expect(css).toContain('max-width:390px!important');
    expect(css).toContain('transform:scale(1)!important');
  });

  it('keeps tablet/narrow-desktop drawer behavior separate from phone presentation',()=>{
    const controller=read('src/app/admin/tartalom/builder/visual-builder-route-controller.tsx');
    const css=read('src/app/admin/tartalom/builder/builder-isolation.css');
    expect(controller).toContain("const SMALL_VIEWPORT='(max-width: 1100px)'");
    expect(css).toContain('@media(max-width:1100px)');
    expect(css).toContain('@media(max-width:900px)');
  });
});
