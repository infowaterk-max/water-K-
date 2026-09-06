import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');
const migration='supabase/migrations/20260906095000_loyalty_program_configuration.sql';

describe('merchant-configurable loyalty program',()=>{
  it('adds tenant settings with safe defaults and audited merchant mutation authority',()=>{
    const sql=read(migration);
    expect(sql).toContain('add column if not exists enabled boolean');
    expect(sql).toContain('add column if not exists accrual_enabled boolean');
    expect(sql).toContain('add column if not exists points_expire_days integer');
    expect(sql).toContain('alter column enabled set default false');
    expect(sql).toContain('alter column accrual_enabled set default false');
    expect(sql).toContain('merchant_update_loyalty_program_settings_v1');
    expect(sql).toContain('STORE_MANAGE_PERMISSION_REQUIRED');
    expect(sql).toContain("'loyalty.program_settings_updated'");
    expect(sql).toContain("'loyalty_program_settings'");
  });

  it('stops automatic earning when the program or accrual switch is off',()=>{
    const sql=read(migration);
    expect(sql).toMatch(/accrue_loyalty_points_from_paid_orders_v2[\s\S]*s\.enabled,s\.accrual_enabled[\s\S]*return 0/);
    expect(sql).toMatch(/apply_loyalty_tier_bonus_points_v2[\s\S]*s\.tier_bonus_cutover_at,s\.enabled,s\.accrual_enabled[\s\S]*return 0/);
    expect(sql).toContain('LOYALTY_PROGRAM_DISABLED');
  });

  it('expires remaining points FIFO and avoids double debt on later refunds',()=>{
    const sql=read(migration);
    expect(sql).toContain('expire_loyalty_points_v2');
    expect(sql).toContain("entry_type in('reversal','expire')");
    expect(sql).toContain('rows between unbounded preceding and 1 preceding');
    expect(sql).toContain("'expiry:'||r.id::text");
    expect(sql).toContain("'fifo_source_expiry'");
    expect(sql).toContain("'expired_points_before_reversal'");
    expect(sql).toContain("'expired_points_entries',v_expired");
  });

  it('exposes expired and reversed history without changing customer-value scoring',()=>{
    const sql=read(migration);
    expect(sql).toContain('lifetime_expired_points');
    expect(sql).toContain('lifetime_reversed_points');
    expect(sql).toContain('create or replace view public.customer_loyalty_summary');
    const page=read('src/app/admin/ugyfelertek/page.tsx');
    expect(page).toContain("new:'Új'");
    expect(page).toContain('Összes jóváírt');
    expect(page).toContain('Lejárt');
    expect(page).toContain('Visszavont');
  });

  it('provides a store-managed admin form and hides the customer loyalty entry point when disabled',()=>{
    const action=read('src/app/admin/ugyfelertek/actions.ts');
    const page=read('src/app/admin/ugyfelertek/page.tsx');
    const layout=read('src/app/fiokom/layout.tsx');
    const subnav=read('src/components/account/account-subnav.tsx');
    const customer=read('src/app/fiokom/huseg/page.tsx');
    expect(action).toContain("getAdminRequestUser('store.manage')");
    expect(action).toContain("rpc('merchant_update_loyalty_program_settings_v1'");
    expect(page).toContain('Hűségprogram beállításai');
    expect(page).toContain('0 = soha nem jár le');
    expect(layout).toContain("from('loyalty_program_settings')");
    expect(subnav).toContain('showLoyalty');
    expect(customer).toContain('A hűségprogram jelenleg nincs bekapcsolva.');
    expect(customer).toContain("expire:'Lejárat'");
  });

  it('keeps new loyalty audit events human-readable',()=>{
    const audit=read('src/app/admin/audit/page.tsx');
    expect(audit).toContain("'loyalty.program_settings_updated':'Hűségprogram beállításai módosítva'");
    expect(audit).toContain("loyalty_program_settings:'Hűségprogram beállításai'");
    expect(audit).toContain("pointsExpireDays:'Pontok lejárata'");
  });
});
