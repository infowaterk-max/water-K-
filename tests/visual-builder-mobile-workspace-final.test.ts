import {existsSync,readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Visual Builder mobile workspace final pass',()=>{
  it('uses one route-scoped compact workspace controller',()=>{
    const page=read('src/app/admin/tartalom/builder/page.tsx');
    const layout=read('src/app/admin/tartalom/builder/layout.tsx');
    expect(layout).toContain('VisualBuilderRouteController');
    expect(page).not.toContain('VisualBuilderMobileWorkspace');
    expect(page).not.toContain('VisualBuilderMobileViewport');
    expect(existsSync('src/components/admin/visual-builder-mobile-workspace.tsx')).toBe(false);
    expect(existsSync('src/components/admin/visual-builder-mobile-viewport.tsx')).toBe(false);
  });

  it('starts small screens canvas-first and keeps drawers mutually exclusive',()=>{
    const source=read('src/app/admin/tartalom/builder/visual-builder-route-controller.tsx');
    expect(source).toContain("const SMALL_VIEWPORT='(max-width: 1100px)'");
    expect(source).toContain("const PHONE_VIEWPORT='(max-width: 900px)'");
    expect(source).toContain("workspace.dataset.leftCollapsed==='false'");
    expect(source).toContain("workspace.dataset.inspectorOpen==='true'");
    expect(source).toContain('MutationObserver');
    expect(source).toContain("event.key==='Escape'");
    expect(source).toContain('visualBuilderDrawerScrim');
  });

  it('renders real phone bottom sheets over the persistent canvas',()=>{
    const css=read('src/app/admin/tartalom/builder/builder-isolation.css');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('position:fixed!important');
    expect(css).toContain('height:min(76dvh,760px)!important');
    expect(css).toContain('.visualBuilderDrawerScrim');
    expect(css).toContain('nav[aria-label="Visual Builder fő navigáció"]');
    expect(css).toContain('nav[aria-label="Inspector navigáció"]');
  });

  it('uses touch-sized phone controls and the canonical mobile frame',()=>{
    const css=read('src/app/admin/tartalom/builder/builder-isolation.css');
    expect(css).toContain('min-height:44px');
    expect(css).toContain('min-height:46px!important');
    expect(css).toContain('[data-viewport="mobile"]');
    expect(css).toContain('max-width:390px!important');
    expect(css).toContain('transform:scale(1)!important');
  });
});
