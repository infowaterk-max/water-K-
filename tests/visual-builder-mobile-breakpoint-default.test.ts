import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Visual Builder compact breakpoint default',()=>{
  it('wires the compact viewport controller into the Builder route',()=>{
    const page=read('src/app/admin/tartalom/builder/page.tsx');
    expect(page).toContain('VisualBuilderMobileViewport');
    expect(page).toContain('<VisualBuilderMobileViewport/>');
  });

  it('selects Mobil once for compact or coarse-pointer sessions without locking later manual changes',()=>{
    const source=read('src/components/admin/visual-builder-mobile-viewport.tsx');
    expect(source).toContain('(max-width: 1100px), (hover: none) and (pointer: coarse)');
    expect(source).toContain("findViewportButton(section,'Mobil')");
    expect(source).toContain('mobileButton.click()');
    expect(source).toContain('compactActivatedRef.current=true');
    expect(source).toContain('compactActivatedRef.current=false');
  });

  it('keeps the mobile canvas at the canonical 390px frame and exposes real overlay drawers',()=>{
    const source=read('src/components/admin/visual-builder-mobile-viewport.tsx');
    expect(source).toContain('[data-viewport="mobile"]');
    expect(source).toContain('max-width:390px!important');
    expect(source).toContain('transform:scale(1)!important');
    expect(source).toContain('aside[data-collapsed="false"]');
    expect(source).toContain('aside[data-open="true"]');
    expect(source).toContain('position:fixed!important');
    expect(source).toContain('vb-capability-scrim');
  });
});
