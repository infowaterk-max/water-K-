import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('platform admin scope closure',()=>{
  test('global governance pages require a platform operator',()=>{
    const pages=[
      'src/app/admin/biztositekok/page.tsx',
      'src/app/admin/kiadasok/page.tsx',
      'src/app/admin/rollout/page.tsx',
      'src/app/admin/utoellenorzes/page.tsx',
      'src/app/admin/helyreallitas/page.tsx',
      'src/app/admin/megfigyeles/page.tsx',
      'src/app/admin/muveletek/page.tsx',
      'src/app/admin/naplo/page.tsx',
    ];
    for(const page of pages)expect(read(page)).toMatch(/requirePlatformOperator\(\)/);
    expect(read('src/app/admin/biztositekok/page.tsx')).not.toMatch(/requirePlanFeature/);
  });

  test('global governance write APIs require a platform request user',()=>{
    const routes=[
      'src/app/api/admin/assurance/finding/route.ts',
      'src/app/api/admin/assurance/run/route.ts',
      'src/app/api/admin/operations/run/route.ts',
      'src/app/api/admin/operations/transition/route.ts',
      'src/app/api/admin/post-release/route.ts',
      'src/app/api/admin/recovery/route.ts',
      'src/app/api/admin/releases/candidate/route.ts',
    ];
    for(const route of routes){
      const code=read(route);
      expect(code).toMatch(/getPlatformRequestUser\(\)/);
      expect(code).not.toMatch(/getAdminRequestUser\(\)/);
    }
  });

  test('merchant admin intelligence is explicitly tenant scoped',()=>{
    const code=read('src/app/admin/page.tsx');
    expect(code).toMatch(/getCurrentWebshopInstance/);
    expect(code).toMatch(/from\('orders'\)[\s\S]{0,220}eq\('instance_id',instance\.id\)/);
    expect(code).toMatch(/from\('order_items'\)[\s\S]{0,220}eq\('instance_id',instance\.id\)/);
    expect(code).toMatch(/from\('communication_jobs'\)[\s\S]{0,220}eq\('instance_id',instance\.id\)/);
    expect(code).toMatch(/from\('marketing_campaign_conversions'\)[\s\S]{0,220}eq\('instance_id',instance\.id\)/);
    expect(code).toMatch(/from\('marketing_campaign_recipients'\)[\s\S]{0,220}eq\('instance_id',instance\.id\)/);
  });

  test('control tower reads tenant-specific v2 views',()=>{
    const page=read('src/app/admin/iranyitokozpont/page.tsx');
    expect(page).toMatch(/requireCurrentStoreContext\('analytics\.read'\)/);
    expect(page).toMatch(/control_tower_queue_v2/);
    expect(page).toMatch(/control_tower_kpis_v2/);
    expect(page).toMatch(/control_system_health_v2/);
    expect(page).toMatch(/control_tower_category_summary_v2/);
    expect(page).toMatch(/eq\('instance_id',store\.instanceId\)/);
  });

  test('webhook attribution is tenant-aware only after trusted order resolution',()=>{
    const outbox=read('src/lib/integrations/outbox.ts');
    const payments=read('src/lib/integrations/payment-events.ts');
    expect(outbox).toMatch(/instanceId\?:string\|null/);
    expect(outbox).toMatch(/Cross-store webhook event collision/);
    expect(payments).toMatch(/instanceId:order\.instance_id/);
  });

  test('database contract provides tenant control-tower views',()=>{
    const sql=read('supabase/migrations/20260901166000_admin_scope_and_control_tower_tenant_closure.sql');
    expect(sql).toMatch(/webhook_events[\s\S]*instance_id uuid/);
    expect(sql).toMatch(/control_tower_queue_v2/);
    expect(sql).toMatch(/t\.instance_id=a\.instance_id/);
    expect(sql).toMatch(/control_tower_kpis_v2/);
    expect(sql).toMatch(/control_system_health_v2/);
    expect(sql).toMatch(/webhook_events e[\s\S]*e\.instance_id=w\.id/);
    expect(sql).toMatch(/drop policy if exists "admins can read webhook events"/);
  });
});
