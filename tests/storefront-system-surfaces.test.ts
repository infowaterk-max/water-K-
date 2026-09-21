import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const cookie=fs.readFileSync('src/components/analytics/cookie-consent.tsx','utf8');
const v6=fs.readFileSync('src/app/v6.css','utf8');
const finalUx=fs.readFileSync('src/app/final-ux-audit.css','utf8');
const responsive=fs.readFileSync('src/app/responsive-final.css','utf8');
const playroom=fs.readFileSync('src/lib/builder/templates/playroom-v20.ts','utf8');
const runtime=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const primitives=fs.readFileSync('src/components/builder/storefront-primitives.tsx','utf8');

describe('customer-facing system surfaces',()=>{
  it('keeps cookie consent inside the mobile viewport and inherits template tokens',()=>{
    expect(cookie).toMatch(/data-template-aware-cookie="true"/);
    expect(cookie).toMatch(/--shoporation-color-surface/);
    expect(v6).toMatch(/background:color-mix\(in srgb,var\(--shoporation-color-surface/);
    expect(finalUx).toMatch(/var\(--shoporation-color-border/);
    expect(responsive).toMatch(/transform:none!important/);
  });

  it('does not ship decorative fake social glyphs as the Playroom footer control',()=>{
    expect(playroom).toMatch(/patchPlayroomSocialLinks/);
    expect(playroom).toMatch(/componentKey:'system\.navigation'/);
    expect(playroom).toMatch(/path:'brand\.socialLinks'/);
    expect(runtime).toMatch(/resolveStorefrontSocialLinks/);
    expect(runtime).toMatch(/brand:\{socialLinks\}/);
  });

  it('renders configured social symbols as accessible links',()=>{
    expect(primitives).toMatch(/symbol\?:string;ariaLabel\?:string/);
    expect(primitives).toMatch(/aria-label=\{item\.ariaLabel\|\|\(item\.symbol\?item\.label:undefined\)\}/);
    expect(primitives).toMatch(/item\.symbol\?<span aria-hidden="true">/);
  });
});
