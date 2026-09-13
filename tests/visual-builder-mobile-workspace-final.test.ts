import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Visual Builder mobile workspace final pass',()=>{
  it('activates the route-scoped mobile workspace controller',()=>{
    const page=read('src/app/admin/tartalom/builder/page.tsx');
    expect(page).toContain("VisualBuilderMobileWorkspace");
    expect(page).toContain('<VisualBuilderMobileWorkspace/>');
  });

  it('starts compact screens canvas-first and keeps drawers mutually exclusive',()=>{
    const source=read('src/components/admin/visual-builder-mobile-workspace.tsx');
    expect(source).toContain("(max-width: 820px)");
    expect(source).toContain("workspace.dataset.leftCollapsed==='false'");
    expect(source).toContain("workspace.dataset.inspectorOpen==='true'");
    expect(source).toContain("leftToggle.click()");
    expect(source).toContain("inspectorToggle.click()");
    expect(source).toContain("MutationObserver");
    expect(source).toContain("event.key==='Escape'");
  });

  it('renders real overlay drawers instead of stacking panels above the canvas',()=>{
    const source=read('src/components/admin/visual-builder-mobile-workspace.tsx');
    expect(source).toContain('position:fixed!important');
    expect(source).toContain('height:min(74dvh,760px)!important');
    expect(source).toContain('vb-mobile-workspace-scrim');
    expect(source).toContain('nav[aria-label="Visual Builder fő navigáció"]{display:flex!important');
    expect(source).toContain('nav[aria-label="Inspector navigáció"]{display:flex!important');
  });

  it('uses touch-sized merchant controls on phones',()=>{
    const source=read('src/components/admin/visual-builder-mobile-workspace.tsx');
    expect(source).toContain('height:44px!important');
    expect(source).toContain('min-height:46px!important');
    expect(source).toContain('font-size:13px!important');
    expect(source).toContain('grid-template-columns:1fr!important');
  });
});
