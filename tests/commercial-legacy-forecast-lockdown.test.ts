import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903204500_commercial_legacy_forecast_lockdown.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('commercial legacy forecast lockdown',()=>{
  test('all legacy global forecast views are unavailable to application runtime roles',()=>{
    const sql=read(migration);
    for(const view of[
      'commercial_pipeline_decision_support',
      'commercial_offer_forecast',
      'commercial_conversion_metrics',
      'commercial_executive_forecast',
    ]){
      expect(sql).toMatch(new RegExp(
        `revoke all on public\\.${view}[\\s\\S]{0,120}service_role`
      ));
    }
  });

  test('the retired forecast family is not consumed by current application code',()=>{
    const files=[
      'src/app/admin/ertekesites/page.tsx',
      'src/app/api/admin/commercial/actions/route.ts',
      'src/app/admin/vezetoi/page.tsx',
      'src/app/admin/novekedes/page.tsx',
    ];
    const forbidden=[
      "from('commercial_pipeline_decision_support')",
      "from('commercial_offer_forecast')",
      "from('commercial_conversion_metrics')",
      "from('commercial_executive_forecast')",
    ];
    for(const file of files){
      const source=read(file);
      for(const needle of forbidden)expect(source).not.toContain(needle);
    }
  });

  test('active commercial admin reads remain webshop scoped',()=>{
    const page=read('src/app/admin/ertekesites/page.tsx');
    expect(page).toContain("from('commercial_pipeline_summary')");
    expect(page).toContain(".eq('instance_id',scope.instanceId)");
    expect(page).toContain("from('commercial_opportunities')");
    expect(page).toContain("from('commercial_offers')");
    expect(page).toContain("from('sales_tasks')");
  });

  test('final pipeline summary definition contains instance authority',()=>{
    const tenantSql=read('supabase/migrations/20260901157100_commercial_tenant_views.sql');
    expect(tenantSql).toContain('create or replace view public.commercial_pipeline_summary');
    expect(tenantSql).toMatch(/commercial_pipeline_summary[\s\S]*instance_id from public\.commercial_opportunities group by instance_id,channel/);
  });
});
