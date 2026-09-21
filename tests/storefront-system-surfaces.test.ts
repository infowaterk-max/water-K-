import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const cookie=fs.readFileSync('src/components/analytics/cookie-consent.tsx','utf8');
const v6=fs.readFileSync('src/app/v6.css','utf8');
const finalUx=fs.readFileSync('src/app/final-ux-audit.css','utf8');
const responsive=fs.readFileSync('src/app/responsive-final.css','utf8');
const playroom=fs.readFileSync('src/lib/builder/templates/playroom-v20.ts','utf8');
const runtime=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const cookiePresets=fs.readFileSync('src/lib/builder/storefront-cookie-consent-presets.ts','utf8');
const primitives=fs.readFileSync('src/components/builder/storefront-primitives.tsx','utf8');

describe('customer-facing system surfaces',()=>{
  it('keeps cookie consent inside the mobile viewport and resolves an explicit template-owned preset',()=>{
    expect(cookie).toMatch(/data-template-aware-cookie="true"/);
    expect(cookie).toMatch(/data-cookie-template-key/);
    expect(cookie).toMatch(/data-cookie-preset/);
    expect(cookie).toMatch(/getStorefrontCookieConsentPreset/);
    expect(cookie).toMatch(/querySelectorAll<HTMLElement>\('\[data-storefront-template\],\[data-template-key\]'\)/);
    expect(cookie).toMatch(/new MutationObserver/);
    expect(cookiePresets).toMatch(/'gaming\.playroom':p\('gaming\.playroom','playroom-v20-cookie'/);
    expect(v6).toMatch(/data-cookie-template-key="gaming\.playroom"/);
    expect(finalUx).toMatch(/var\(--shoporation-color-border/);
    expect(responsive).toMatch(/transform:none!important/);
  });

  it('does not ship decorative fake social glyphs as the Playroom footer control',()=>{
    expect(playroom).toMatch(/patchPlayroomSocialLinks/);
    expect(playroom).toMatch(/componentKey:'system\.social-links'/);
    expect(playroom).toMatch(/path:'brand\.socialLinks'/);
    expect(runtime).toMatch(/resolveStorefrontSocialLinks/);
    expect(runtime).toMatch(/socialLinks:resolveStorefrontSocialLinks\(instance\.storefront\.socialLinks\)/);
    expect(runtime).toMatch(/systemSurfaceComposition:'template-source'/);
    expect(runtime).toMatch(/footerIndex=sections\.findIndex\(section=>\/footer\/i\.test\(section\.id\)\)/);
  });

  it('renders configured social symbols as accessible links and hides the whole block when empty',()=>{
    expect(primitives).toMatch(/function SocialLinksRenderer/);
    expect(primitives).toMatch(/if\(!items\.length\)return null/);
    expect(primitives).toMatch(/target="_blank" rel="noopener noreferrer"/);
    expect(primitives).toMatch(/aria-label=\{item\.ariaLabel\|\|item\.label\}/);
  });
});
