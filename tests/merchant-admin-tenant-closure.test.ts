import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('merchant admin tenant closure',()=>{
  test('merchant admin pages resolve an explicit store scope',()=>{
    const pages=[
      'src/app/admin/beallitasok/page.tsx',
      'src/app/admin/beallitasok/integraciok/[id]/page.tsx',
      'src/app/admin/integraciok/page.tsx',
      'src/app/admin/marketing/page.tsx',
      'src/app/admin/kampanyok/page.tsx',
      'src/app/admin/kampanyok/[id]/page.tsx',
      'src/app/admin/kuponok/page.tsx',
      'src/app/admin/rendelesek/[id]/page.tsx',
      'src/app/admin/visszaru/page.tsx',
      'src/app/admin/velemenyek/page.tsx',
      'src/app/admin/novekedes/page.tsx',
      'src/app/admin/vezetoi/page.tsx',
      'src/app/admin/ugyfelek/page.tsx',
      'src/app/admin/utanakovetes/page.tsx',
    ];
    for(const page of pages)expect(read(page)).toMatch(/requireCurrentStoreContext/);
  });

  test('high-risk detail and list reads include instance filters',()=>{
    const integration=read('src/app/admin/beallitasok/integraciok/[id]/page.tsx');
    expect(integration).toMatch(/integration_jobs[\s\S]*eq\('instance_id',scope\.instanceId\)/);
    expect(integration).toMatch(/orders[\s\S]*eq\('instance_id',scope\.instanceId\)/);

    const campaign=read('src/app/admin/kampanyok/[id]/page.tsx');
    expect(campaign).toMatch(/marketing_campaigns[\s\S]*eq\('instance_id',scope\.instanceId\)/);
    expect(campaign).toMatch(/marketing_campaign_recipients[\s\S]*eq\('instance_id',scope\.instanceId\)/);
    expect(campaign).toMatch(/marketing_campaign_events[\s\S]*eq\('instance_id',scope\.instanceId\)/);

    const order=read('src/app/admin/rendelesek/[id]/page.tsx');
    for(const table of ['orders','order_items','order_events','integration_jobs','payment_attempts']){
      expect(order).toMatch(new RegExp(table+"[\\s\\S]{0,260}eq\\('instance_id',scope\\.instanceId\\)"));
    }
  });

  test('coupon and review writes are tenant scoped and atomically audited',()=>{
    const coupons=read('src/app/api/admin/coupons/route.ts');
    const reviews=read('src/app/admin/velemenyek/actions.ts');
    const sql=read('supabase/migrations/20260903145000_admin_engagement_evidence_atomic_v2.sql');
    expect(coupons).toMatch(/requireCurrentStoreContext\('marketing\.manage'\)/);
    expect(coupons).toContain('admin_mutate_coupon_v2');
    expect(coupons).toContain('p_instance_id:ctx.scope.instanceId');
    expect(coupons).toMatch(/usage_count/);
    expect(coupons).not.toMatch(/used_count/);
    expect(coupons).not.toContain('recordAdminAudit');
    expect(reviews).toMatch(/requireCurrentStoreContext\('marketing\.manage'\)/);
    expect(reviews).toContain('admin_moderate_product_review_v2');
    expect(reviews).toContain('p_instance_id:scope.instanceId');
    expect(sql).toContain("where id=p_coupon_id and instance_id=p_instance_id");
    expect(sql).toContain("where id=p_review_id and instance_id=p_instance_id");
  });

  test('campaign, promotion and integration actions use tenant-aware RPCs',()=>{
    const campaign=read('src/app/api/admin/campaigns/manage/route.ts');
    expect(campaign).toMatch(/admin_manage_marketing_campaign_v3/);
    expect(campaign).toMatch(/p_instance_id:store\.instanceId/);

    const promo=read('src/app/api/admin/promotions/preview/route.ts');
    expect(promo).toMatch(/preview_promotion_margin_v2/);
    expect(promo).toMatch(/p_instance_id:scope\.instanceId/);

    const integration=read('src/app/api/admin/integrations/[id]/run/route.ts');
    expect(integration).toMatch(/claim_integration_job_v2/);
    expect(integration).toMatch(/processIntegrationJob\(scope\.instanceId,id,claim\.processing_token,\{manualActorId:actor\.id\}\)/);
    expect(integration).not.toContain('recordAdminAudit');
  });

  test('integration processor carries tenant through all persistence',()=>{
    const processor=read('src/lib/integrations/processor.ts');
    expect(processor).toMatch(/processIntegrationJob\(instanceId:string,jobId:string,claimToken:string,options\?:\{manualActorId\?:string\}\)/);
    expect(processor).toContain('admin_finalize_manual_integration_job_v2');
    expect(processor).toMatch(/getCommunicationIdentityForInstance\(instanceId\)/);
    expect(processor).toMatch(/integration_jobs[\s\S]*eq\('instance_id',instanceId\)/);
    expect(processor).toMatch(/orders[\s\S]*eq\('instance_id',instanceId\)/);
    expect(processor).toMatch(/order_items[\s\S]*eq\('instance_id',instanceId\)/);
    expect(processor).toMatch(/order_events'\)\.insert\(\{instance_id:instanceId/);
  });

  test('growth and executive analytics read tenant-aware views and RPCs',()=>{
    const growth=read('src/app/admin/novekedes/page.tsx');
    expect(growth).toMatch(/v9_growth_dashboard_v2/);
    expect(growth).toMatch(/reseller_growth_priorities[\s\S]*eq\('instance_id',scope\.instanceId\)/);

    const exec=read('src/app/admin/vezetoi/page.tsx');
    expect(exec).toMatch(/v9_channel_retention_summary_v2/);
    expect(exec).toMatch(/v9_monthly_customer_cohorts_v2/);
    expect(exec).toMatch(/v9_growth_dashboard_v2/);

    const route=read('src/app/api/admin/growth/run/route.ts');
    expect(route).toMatch(/admin_refresh_growth_workflows_v3/);
    expect(route).not.toMatch(/a\.rpc\('plan_customer_retention_journeys_v2'/);
    expect(route).not.toMatch(/a\.rpc\('dispatch_due_customer_journey_steps_v2'/);
  });

  test('customer profile access is derived from tenant-linked customers',()=>{
    const page=read('src/app/admin/ugyfelek/page.tsx');
    expect(page).toMatch(/customer_commercial_metrics[\s\S]*eq\('instance_id',scope\.instanceId\)/);
    expect(page).toMatch(/profiles[\s\S]*in\('id',ids\)/);

    const followup=read('src/app/admin/utanakovetes/page.tsx');
    expect(followup).toMatch(/orders[\s\S]*eq\('instance_id',scope\.instanceId\)/);
    expect(followup).toMatch(/profiles[\s\S]*in\('id',partnerIds\)/);

    const api=read('src/app/api/admin/customers/[id]/route.ts');
    const sql=read('supabase/migrations/20260903194500_customer_role_commercial_atomic_v3.sql');
    expect(api).toMatch(/customer_instance_roles[\s\S]*eq\('instance_id',scope\.instanceId\)[\s\S]*eq\('user_id',id\)/);
    expect(api).toContain('admin_update_customer_store_role_v4');
    expect(api).toContain('p_instance_id:scope.instanceId');
    expect(api).not.toContain('recordAdminAudit');
    expect(sql).toContain('admin_update_customer_store_role_v2');
    expect(sql).toContain('o.instance_id=p_instance_id');
    expect(sql).toContain('t.instance_id=p_instance_id');
  });

  test('database migration adds tenant analytics and v2 operational RPCs',()=>{
    const sql=read('supabase/migrations/20260901168000_merchant_admin_tenant_closure.sql');
    for(const name of [
      'v9_growth_dashboard_v2',
      'v9_channel_retention_summary_v2',
      'v9_monthly_customer_cohorts_v2',
      'claim_integration_job_v2',
      'preview_promotion_margin_v2',
      'admin_manage_marketing_campaign_v2',
      'create_customer_journey_v2',
      'plan_customer_retention_journeys_v2',
      'dispatch_due_customer_journey_steps_v2',
    ])expect(sql).toContain(name);
    expect(sql).toMatch(/revoke execute on function %s from public, anon, authenticated, service_role/);
  });
});
