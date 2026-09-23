import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS,STOREFRONT_CANONICAL_VIEWPORT_WIDTH_PX} from '@/lib/builder/storefront-foundation';
import {getStorefrontTemplatePackage,STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {getStorefrontCookieConsentPreset} from '@/lib/builder/storefront-cookie-consent-presets';
import {
  PLAYROOM_V20_QUALITY_MANIFEST,
  STOREFRONT_TEMPLATE_QUALITY_GATE_VERSION,
  evaluateStorefrontTemplateQualityGate,
} from '@/lib/builder/storefront-template-quality-gate';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Template Factory Quality Gate v2',()=>{
  it('locks the strict Playroom acceptance matrix to all canonical pages and viewports',()=>{
    expect(PLAYROOM_V20_QUALITY_MANIFEST.gateVersion).toBe(STOREFRONT_TEMPLATE_QUALITY_GATE_VERSION);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.pageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.viewports).toEqual(STOREFRONT_VIEWPORTS);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.responsiveIsolation.explicitEffectiveStyles).toBe(true);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.sourcePrefixes).toContain('src/lib/builder/templates/playroom-');
    expect(PLAYROOM_V20_QUALITY_MANIFEST.status).toBe('accepted');
    expect(PLAYROOM_V20_QUALITY_MANIFEST.golden.required).toBe(true);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.golden.baselineDirectory).toBe('tests/visual-baselines/gaming.playroom/v20');
  });

  it('keeps Playroom v20 structurally clean before browser acceptance',()=>{
    const template=getStorefrontTemplatePackage('gaming.playroom',20);
    expect(template).toBeTruthy();
    const result=evaluateStorefrontTemplateQualityGate({template:template!,manifest:PLAYROOM_V20_QUALITY_MANIFEST});
    expect(result).toEqual({ok:true,issues:[]});
  });

  it('keeps Builder v3 and storefront preview on the same Runtime renderer and canonical viewport authority',()=>{
    const builder=read('src/components/admin/storefront-visual-builder-v3.tsx');
    const preview=read('src/app/storefront-template-preview/page.tsx');
    expect(builder).toContain('StorefrontRuntimeRenderer');
    expect(preview).toContain('StorefrontRuntimeRenderer');
    expect(builder).toContain("const viewportWidth=VIEWPORTS.find(item=>item.key===viewport)?.width??1200");
    expect(builder).toContain('page={document}');
    expect(preview).toContain('page={page}');
    expect(STOREFRONT_CANONICAL_VIEWPORT_WIDTH_PX).toEqual({desktop:1200,tablet:768,mobile:390});
  });

  it('requires accepted templates to promote a golden baseline instead of silently remaining candidate evidence',()=>{
    const template=getStorefrontTemplatePackage('gaming.playroom',20)!;
    const accepted={...PLAYROOM_V20_QUALITY_MANIFEST,status:'accepted' as const,golden:{...PLAYROOM_V20_QUALITY_MANIFEST.golden,required:false}};
    const result=evaluateStorefrontTemplateQualityGate({template,manifest:accepted});
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'QUALITY_ACCEPTED_GOLDEN_REQUIRED'})]));
  });

  it('keeps the browser runner and CI workflow mandatory rather than commit-message gated',()=>{
    const workflow=read('.github/workflows/template-factory-quality-gate.yml');
    const runner=read('scripts/template-factory-quality-gate.mjs');
    expect(workflow).not.toContain('head_commit.message');
    expect(workflow).toContain('Run Template Factory 14x3 browser matrix');
    expect(workflow).toContain('workflow_dispatch');
    expect(workflow).toContain('QUALITY_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(workflow).toContain('ref: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(runner).toContain('process.env.QUALITY_HEAD_SHA??process.env.GITHUB_SHA');
    expect(workflow).toContain("src/lib/auth/storefront-return-target.ts");
    expect(workflow).toContain("src/app/api/orders/claim/**");
    expect(workflow).toContain('tests/storefront-auth-return-target.test.ts');
    expect(workflow).toContain('tests/storefront-guest-order-claim.test.ts');
    expect(workflow).toContain('tests/storefront-shared-commerce-account-hardening.test.ts');
    expect(workflow).toContain("'src/components/cart/**'");
    expect(workflow).toContain("'src/lib/account/**'");
    expect(workflow).toContain('20260922053000_shared_customer_billing_b2b_identity_reverification.sql');
    expect(runner).toContain('TEMPLATE_FACTORY_QUALITY_MANIFEST_REQUIRED');
    expect(runner).toContain('LEGACY_TEMPLATE_REACCEPTANCE_PENDING');
    expect(runner).toContain("mode:'full',reason:'shared-runtime-changed'");
    expect(runner).toContain("'src/components/admin/storefront-visual-builder-v3.tsx'");
    expect(runner).toContain("'src/components/cart/'");
    expect(runner).toContain("'src/components/checkout/'");
    expect(runner).toContain("'src/components/account/'");
    expect(runner).toContain("'src/app/storefront-template-preview/'");
    expect(runner).toContain('MOBILE_DESKTOP_NAV_LEAK');
    expect(runner).toContain('SOCIAL_LINK_INTEGRITY');
    expect(runner).toContain('COOKIE_TEMPLATE_PRESET_REQUIRED');
    expect(runner).toContain('COOKIE_TEMPLATE_AUTHORITY');
    expect(runner).toContain('GOLDEN_BASELINE_MISSING');
    expect(runner).toContain('scrollIntoViewIfNeeded');
    expect(runner).toContain('[data-visual-fidelity-root="runtime"]:visible img');
    expect(runner).toContain('previousScroll');
  });
  it('requires a unique explicit cookie consent preset for every implemented template',()=>{
    const presetIds=new Set<string>();
    for(const entry of STOREFRONT_TEMPLATE_CATALOG){
      const preset=getStorefrontCookieConsentPreset(entry.templateKey);
      expect(preset,entry.templateKey).toBeTruthy();
      expect(preset?.templateKey).toBe(entry.templateKey);
      expect(preset?.presetId).toBeTruthy();
      expect(presetIds.has(preset!.presetId),entry.templateKey).toBe(false);
      presetIds.add(preset!.presetId);
    }
    expect(presetIds.size).toBe(STOREFRONT_TEMPLATE_CATALOG.length);
  });

});
