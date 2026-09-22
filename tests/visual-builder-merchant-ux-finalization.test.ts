import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read=(relative:string)=>fs.readFileSync(path.join(process.cwd(),relative),'utf8');

describe('Visual Builder merchant UX finalization',()=>{
  it('loads the route-scoped merchant polish layer',()=>{
    const layout=read('src/app/admin/tartalom/builder/layout.tsx');
    const css=read('src/app/admin/tartalom/builder/builder-merchant-polish.css');
    expect(layout).toContain("import './builder-merchant-polish.css'");
    expect(css).toContain('[data-storefront-global-styles-v1]');
    expect(css).toContain('[data-storefront-responsive-layout-depth-v1]');
    expect(css).toContain('nav[aria-label="Inspector navigáció"]');
    expect(css).toContain('@media(max-width:1100px)');
  });

  it('keeps Normal mode merchant-first and defers deep controls',()=>{
    const fidelity=read('src/components/admin/storefront-fidelity-settings.tsx');
    expect(fidelity).toContain('data-storefront-fidelity-settings-v2');
    expect(fidelity).toContain('data-fidelity-mode-cards');
    expect(fidelity).toContain('data-quality-summary');
    expect(fidelity).toContain("{advanced?<>");
    expect(fidelity).toContain('Haladó elrendezési vezérlés');
    expect(fidelity).not.toContain('Responsive / Layout Depth');
  });

  it('removes developer language from merchant template and preset surfaces',()=>{
    const templates=read('src/components/admin/storefront-page-templates-panel.tsx');
    const presets=read('src/components/admin/storefront-preset-library-panel.tsx');
    expect(templates).not.toContain('working copy');
    expect(templates).not.toContain('Page Preset');
    expect(templates).not.toContain('V1-ben');
    expect(presets).not.toContain('node ID');
    expect(presets).not.toContain('authority');
    expect(presets).not.toContain('bindingokat');
    expect(presets).toContain('Megjelenési presetek');
  });

  it('presents Global Styles as merchant language while keeping canonical authority',()=>{
    const globals=read('src/components/admin/storefront-global-styles-controls.tsx');
    expect(globals).toContain('setStorefrontGlobalStyleState');
    expect(globals).toContain('data-global-style-preview');
    expect(globals).toContain('Piszkozatverzió');
    expect(globals).not.toContain('Page Schema revision');
    expect(globals).not.toContain('stílus-authority');
  });
});
