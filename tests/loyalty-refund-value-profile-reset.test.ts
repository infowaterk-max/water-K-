import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260905103000_loyalty_refund_value_profile_reset.sql';

describe('loyalty refund customer-value reset',()=>{
  test('refresh keeps refund-adjusted commercial metrics as the authority',()=>{
    const sql=read(migration);
    expect(sql).toContain('from public.customer_commercial_metrics m');
    expect(sql).toContain('m.instance_id=p_instance_id');
    expect(sql).toContain('on conflict(instance_id,customer_id) do update');
  });

  test('customers with no recognized order are reset instead of keeping stale revenue',()=>{
    const sql=read(migration);
    expect(sql).toContain('update public.customer_value_profiles p');
    expect(sql).toContain('paid_orders=0');
    expect(sql).toContain('revenue_gross_huf=0');
    expect(sql).toContain('value_score=0');
    expect(sql).toContain("lifecycle_segment='new'");
    expect(sql).toContain("value_tier='standard'");
    expect(sql).toMatch(/not exists\([\s\S]{0,260}public\.customer_commercial_metrics m[\s\S]{0,220}m\.customer_id=p\.customer_id/);
  });

  test('stale reset is tenant-scoped and does not delete loyalty history',()=>{
    const sql=read(migration);
    expect(sql).toContain('where p.instance_id=p_instance_id');
    expect(sql).not.toContain('delete from public.customer_value_profiles');
    expect(sql).not.toContain('delete from public.loyalty_ledger');
    expect(sql).toMatch(/grant execute on function public\.refresh_customer_value_profiles_v2\(uuid\)[\s\S]{0,120}to service_role/);
  });
});
