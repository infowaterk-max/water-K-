import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const cookie=fs.readFileSync('src/components/analytics/cookie-consent.tsx','utf8');
const systemTheme=fs.readFileSync('src/components/storefront/storefront-system-surface-theme.ts','utf8');
const v6=fs.readFileSync('src/app/v6.css','utf8');
const finalUx=fs.readFileSync('src/app/final-ux-audit.css','utf8');
const responsive=fs.readFileSync('src/app/responsive-final.css','utf8');
const runtime=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const cookiePresets=fs.readFileSync('src/lib/builder/storefront-cookie-consent-presets.ts','utf8');
const primitives=fs.readFileSync('src/components/builder/storefront-primitives.tsx','utf8');
const runtimeRenderer=fs.readFileSync('src/components/builder/storefront-runtime-renderer.tsx','utf8');

const findPlayroomNode=(id:string):StorefrontComponentNode=>{
  const home=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home')!;
  const visit=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|null=>{
    for(const node of nodes){
      if(node.id===id)return node;
      const child=visit(node.children??[]);
      if(child)return child;
    }
    return null;
  };
  const result=visit(home.sections);
  if(!result)throw new Error(`PLAYROOM_SYSTEM_TEST_NODE_MISSING:${id}`);
  return result;
};

describe('customer-facing system surfaces',()=>{
  it('keeps cookie consent inside the mobile viewport and resolves an explicit template-owned preset',()=>{
    expect(cookie).toMatch(/data-template-aware-cookie="true"/);
    expect(cookie).toMatch(/data-cookie-template-key/);
    expect(cookie).toMatch(/data-cookie-preset/);
    expect(cookie).toMatch(/getStorefrontCookieConsentPreset/);
    expect(cookie).toMatch(/useStorefrontSystemSurfaceTheme/);
    expect(systemTheme).toMatch(/querySelectorAll<HTMLElement>\('\[data-storefront-template\],\[data-template-key\]'\)/);
    expect(systemTheme).toMatch(/new MutationObserver/);
    expect(cookiePresets).toMatch(/'gaming\.playroom':p\('gaming\.playroom','playroom-v20-cookie'/);
    expect(runtimeRenderer).toMatch(/data-storefront-template=\{runtimePage\.templateKey\}/);
    expect(runtimeRenderer).toMatch(/data-storefront-template-version=\{runtimePage\.templateVersion\}/);
    expect(v6).toMatch(/data-cookie-template-key="gaming\.playroom"/);
    expect(finalUx).toMatch(/var\(--shoporation-color-border/);
    expect(responsive).toMatch(/transform:none!important/);
  });

  it('does not ship decorative fake social glyphs as the Playroom footer control',()=>{
    const social=findPlayroomNode('playroom-footer-social');
    expect(social.componentKey).toBe('system.social-links');
    expect(social.bindings?.items?.path).toBe('brand.socialLinks');
    expect(JSON.stringify(PLAYROOM_V20_TEMPLATE_PACKAGE)).not.toContain('▶  ◎  ♪  f  ◉');
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
