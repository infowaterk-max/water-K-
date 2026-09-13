import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Visual Builder final mobile polish',()=>{
  it('keeps advanced node controls fully hidden in Normal mode',()=>{
    const source=read('src/components/admin/storefront-fidelity-node-controls.tsx');
    expect(source).toContain('if(!advanced)return null;');
    expect(source).not.toContain('A responsive tipográfia, képfókusz és részletes vizuális beállítások a Haladó vagy Expert szerkesztési módban érhetők el.');
  });

  it('provides an explicit close affordance for mobile sheets',()=>{
    const controller=read('src/app/admin/tartalom/builder/visual-builder-route-controller.tsx');
    const css=read('src/app/admin/tartalom/builder/builder-isolation.css');
    expect(controller).toContain('visualBuilderDrawerClose');
    expect(controller).toContain('aria-label="Szerkesztőpanel bezárása"');
    expect(css).toContain('.visualBuilderDrawerClose');
    expect(css).toContain('>aside::before');
  });

  it('keeps the phone toolbar compact without changing the canonical 390px frame',()=>{
    const css=read('src/app/admin/tartalom/builder/builder-isolation.css');
    expect(css).toContain('padding:4px 6px!important');
    expect(css).toContain('[data-viewport="mobile"] div[class*="nodeToolbar"]');
    expect(css).toContain('width:30px!important');
    expect(css).toContain('max-width:390px!important');
  });
});
