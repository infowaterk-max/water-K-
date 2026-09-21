import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const instance=fs.readFileSync('src/lib/instances/access.ts','utf8');
const runtime=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const playroom=fs.readFileSync('src/lib/builder/templates/playroom-v20.ts','utf8');
const primitives=fs.readFileSync('src/components/builder/storefront-primitives.tsx','utf8');
const normalization=fs.readFileSync('src/lib/builder/storefront-template-runtime-normalization.ts','utf8');
const primitiveRegistry=fs.readFileSync('src/lib/builder/storefront-primitives.ts','utf8');
const page=fs.readFileSync('src/app/admin/beallitasok/megjelenes/page.tsx','utf8');
const actions=fs.readFileSync('src/app/admin/beallitasok/megjelenes/actions.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260921152000_storefront_social_links_settings.sql','utf8');

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
    expect(actions).toMatch(/getAdminRequestUser\('store\.manage'\)/);
    expect(actions).toMatch(/admin_mutate_storefront_social_links_v1/);
    expect(migration).toMatch(/can_manage_storefront\(p_instance_id,p_actor\)/);
    expect(migration).toMatch(/storefront\.social_links_updated/);
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
