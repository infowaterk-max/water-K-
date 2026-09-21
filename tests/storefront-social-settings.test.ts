import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const instance=fs.readFileSync('src/lib/instances/access.ts','utf8');
const runtime=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const playroom=fs.readFileSync('src/lib/builder/templates/playroom-v20.ts','utf8');
const primitives=fs.readFileSync('src/components/builder/storefront-primitives.tsx','utf8');
const normalization=fs.readFileSync('src/lib/builder/storefront-template-runtime-normalization.ts','utf8');
const previewDemo=fs.readFileSync('src/lib/builder/storefront-template-preview-demo.ts','utf8');
const primitiveRegistry=fs.readFileSync('src/lib/builder/storefront-primitives.ts','utf8');
const page=fs.readFileSync('src/app/admin/beallitasok/megjelenes/page.tsx','utf8');
const actions=fs.readFileSync('src/app/admin/beallitasok/megjelenes/actions.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260921152000_storefront_social_links_settings.sql','utf8');
const hardening=fs.readFileSync('supabase/migrations/20260921161000_storefront_social_links_domain_hardening.sql','utf8');

describe('storefront social settings authority',()=>{
  it('stores social profiles as tenant storefront settings, not email brand-kit data',()=>{
    expect(instance).toMatch(/socialLinks\?:StorefrontSocialLinks/);
    expect(runtime).toMatch(/instance\.storefront\.socialLinks/);
    expect(runtime).not.toMatch(/email_brand_kits/);
    expect(runtime).not.toMatch(/resolveStorefrontSocialLinks\(instanceId\)/);
    expect(runtime).toMatch(/const composed=composeStorefrontDigitalCommerceCapabilities\(normalizeStorefrontTemplateRuntimeComposition\(materialized\)\)/);
  });

  it('gives merchants one store-managed settings surface with audited persistence',()=>{
    expect(page).toMatch(/requireCurrentStoreContext\('store\.manage'\)/);
    expect(page).toMatch(/Facebook URL/);
    expect(page).toMatch(/YouTube URL/);
    expect(page).toMatch(/Twitch URL/);
    expect(page).toMatch(/Pinterest URL/);
    expect(actions).toMatch(/getAdminRequestUser\('store\.manage'\)/);
    expect(actions).toMatch(/admin_mutate_storefront_social_links_v1/);
    expect(migration).toMatch(/can_manage_storefront\(p_instance_id,p_actor\)/);
    expect(migration).toMatch(/storefront\.social_links_updated/);
    expect(actions).toMatch(/parsed\.protocol!=='https:'/);
    expect(actions).toMatch(/providerHosts/);
    expect(hardening).toMatch(/'facebook','instagram','youtube','tiktok','x','twitch','linkedin','pinterest'/);
    expect(hardening).toMatch(/facebook\\\.com/);
    expect(hardening).toMatch(/twitch\\\.tv/);
  });

  it('keeps template preview social data functional instead of reusing generic hash demo items',()=>{
    expect(previewDemo).toMatch(/PREVIEW_SOCIAL_LINKS/);
    expect(previewDemo).toMatch(/key==='system\.social-links'/);
    expect(previewDemo).toMatch(/https:\/\/www\.youtube\.com\//);
    expect(previewDemo).toMatch(/https:\/\/www\.instagram\.com\//);
    expect(previewDemo).toMatch(/symbol:'YT'/);
    expect(previewDemo).toMatch(/symbol:'FB'/);
    expect(runtime).toMatch(/\['twitch','Twitch','TW'\]/);
    expect(previewDemo).not.toMatch(/key==='system\.social-links'\)return items/);
  });

  it('renders a shared self-hiding social primitive instead of template-local fake controls',()=>{
    expect(primitiveRegistry).toMatch(/componentKey:'system\.social-links'/);
    expect(primitives).toMatch(/function SocialLinksRenderer/);
    expect(primitives).toMatch(/if\(!items\.length\)return null/);
    expect(playroom).toMatch(/componentKey:'system\.social-links'/);
    expect(playroom).toMatch(/path:'brand\.socialLinks'/);
    expect(normalization).toMatch(/node\.id==='playroom-footer-social'/);
    expect(normalization).toMatch(/componentKey:'system\.social-links'/);
  });
});
