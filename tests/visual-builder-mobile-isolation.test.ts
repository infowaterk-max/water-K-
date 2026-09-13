import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read=(relative:string)=>fs.readFileSync(path.join(process.cwd(),relative),'utf8');

describe('Visual Builder mobile workspace isolation',()=>{
  it('uses a dedicated nested Builder layout instead of rendering inside the Admin chrome',()=>{
    const layout=read('src/app/admin/tartalom/builder/layout.tsx');
    const controller=read('src/app/admin/tartalom/builder/visual-builder-route-controller.tsx');
    const css=read('src/app/admin/tartalom/builder/builder-isolation.css');
    expect(layout).toContain("import './builder-isolation.css'");
    expect(layout).toContain('VisualBuilderRouteController');
    expect(controller).toContain("html.classList.add('visual-builder-route-active')");
    expect(controller).toContain("html.classList.remove('visual-builder-route-active')");
    expect(css).toContain('.adminSide,html.visual-builder-route-active .adminRouteContext{display:none!important}');
    expect(css).toContain('.adminContentShell');
  });

  it('starts small viewports canvas-first and keeps Builder panels as on-demand drawers',()=>{
    const controller=read('src/app/admin/tartalom/builder/visual-builder-route-controller.tsx');
    const css=read('src/app/admin/tartalom/builder/builder-isolation.css');
    expect(controller).toContain("const SMALL_VIEWPORT='(max-width: 1100px)'");
    expect(controller).toContain("button[title=\"Bal panel\"]");
    expect(controller).toContain("button[title=\"Inspector\"]");
    expect(css).toContain('[data-left-collapsed][data-inspector-open]>aside');
    expect(css).toContain('[data-left-collapsed="true"][data-inspector-open]>aside:first-of-type{display:none!important}');
    expect(css).toContain('[data-left-collapsed][data-inspector-open="false"]>aside:last-of-type{display:none!important}');
  });

  it('keeps the compact toolbar and Inspector usable on phone widths',()=>{
    const css=read('src/app/admin/tartalom/builder/builder-isolation.css');
    expect(css).toContain('@media(max-width:620px)');
    expect(css).toContain('grid-template-areas:"brand page" "view view" "back actions"');
    expect(css).toContain('nav[aria-label="Inspector navigáció"]');
    expect(css).toContain('overflow-x:auto');
  });
});
