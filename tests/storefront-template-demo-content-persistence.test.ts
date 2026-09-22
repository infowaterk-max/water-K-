import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');
const sql=read('supabase/migrations/20260921070000_storefront_template_demo_content_v1.sql').toLowerCase();
const persistence=read('src/lib/builder/storefront-template-persistence.ts');
const actions=read('src/app/admin/tartalom/builder/actions.ts');

describe('template demo content persistence safety',()=>{
  it('stores template-created CMS content as draft-only provenance-tracked fixtures',()=>{
    expect(sql).toContain("template_demo_state text");
    expect(sql).toContain("template_demo_state in ('fixture','adopted','retired')");
    expect(sql).toContain("'draft',null,p_namespace,v_key,'fixture'");
    expect(sql).not.toContain("'published',now()");
  });

  it('preserves merchant-owned and adopted content',()=>{
    expect(sql).toContain("if v_existing.template_demo_state='adopted'");
    expect(sql).toContain('a merchant-owned page with the same slug wins');
    expect(sql).toContain("where instance_id=p_instance_id and slug=v_slug");
    expect(sql).toContain("template_demo_state='retired'");
    expect(sql).toContain("and template_demo_state='fixture'");
  });

  it('auto-adopts only when merchant-facing content fields are edited',()=>{
    expect(sql).toContain('adopt_template_demo_content_on_merchant_edit_v1');
    expect(sql).toContain("old.template_demo_state='fixture'");
    expect(sql).toContain("new.template_demo_state:='adopted'");
    expect(sql).toContain("current_setting('shoporation.template_fixture_write',true)");
  });

  it('requires both storefront and marketing authority and remains service-role only',()=>{
    expect(sql).toContain('public.can_manage_storefront(p_instance_id,p_actor_user_id)');
    expect(sql).toContain('public.can_manage_marketing(p_instance_id,p_actor_user_id)');
    expect(sql).toContain('grant execute on function public.save_storefront_template_demo_content_v1');
    expect(sql).toContain('to service_role');
  });

  it('keeps the low-level page-draft API intact and uses a higher-level installation wrapper',()=>{
    expect(persistence).toContain('saveCurrentStorefrontTemplateDraftPlan');
    expect(persistence).toContain('saveCurrentStorefrontTemplateInstallationPlan');
    expect(persistence).toContain("installationMutationScope:'storefront_page_drafts_plus_template_demo_content_and_opt_in_products'");
    expect(persistence).toContain("installDemoProducts?:boolean");
    expect(persistence).toContain("record.entityType==='product'&&record.payload.installAsDemoProduct===true");
    expect(actions).toContain('saveCurrentStorefrontTemplateInstallationPlan');
  });
});