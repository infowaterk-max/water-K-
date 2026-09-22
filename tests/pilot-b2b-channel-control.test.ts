import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('pilot B2B channel acceptance control',()=>{
  it('exposes tenant-scoped merchant controls for the existing B2B channel model',()=>{
    const page=read('src/app/admin/termekek/page.tsx');
    const actions=read('src/app/admin/termekek/actions.ts');
    expect(page).toContain("from('webshop_sales_channels')");
    expect(page).toContain("from('product_channel_settings')");
    expect(page).toContain('setB2BChannelEnabledAction');
    expect(page).toContain('setB2BProductVisibilityAction');
    expect(actions).toContain("getAdminRequestUser('catalog.manage')");
    expect(actions).toContain("requireCurrentStoreContext('catalog.manage')");
    expect(actions).toContain("admin_mutate_sales_channel_v1");
    expect(actions).not.toContain("from('webshop_sales_channels').upsert");
    expect(actions).not.toContain("from('product_channel_settings').upsert");
  });

  it('fails closed to B2C unless the global B2B channel is explicitly enabled',()=>{
    const catalog=read('src/lib/catalog-server.ts');
    expect(catalog).toContain("from('webshop_sales_channels').select('enabled')");
    expect(catalog).toContain(".eq('channel_code','b2b')");
    expect(catalog).toContain("approvedReseller=!channelError&&channelState?.enabled===true");
    expect(catalog).toContain("if(channel==='b2b')return setting?.visible===true");
  });

  it('enforces the same B2B switch and explicit product visibility in quote and order authority',()=>{
    const sql=read('supabase/migrations/20260904095000_b2b_channel_acceptance_control.sql');
    expect(sql).toContain('admin_mutate_sales_channel_v1');
    expect(sql).toContain('public.can_manage_catalog(p_instance_id,p_actor)');
    expect(sql).toContain("sc.channel_code='b2b'");
    expect(sql).toContain("v_channel='b2b' and not v_has_channel");
    expect(sql).toContain('quote_tenant_checkout_v2');
    expect(sql).toContain('place_order_provider_v5_idempotent');
    expect(sql).toContain("'catalog.sales_channel_updated'");
    expect(sql).toContain("'catalog.product_channel_visibility_updated'");
    expect(sql).toContain('revoke all on function public.admin_mutate_sales_channel_v1');
    expect(sql).toContain('to service_role');
  });
});
