import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd();
const read=(p:string)=>readFileSync(join(root,p),'utf8').toLowerCase();

describe('loyalty tenant hardening',()=>{
  const sql=()=>read('supabase/migrations/20260901159100_loyalty_access_and_consistency.sql');

  it('keeps analyst access read-only',()=>{
    const s=sql();
    expect(s).toContain("array['owner','admin','marketing_manager','analyst']");
    expect(s).toContain("array['owner','admin','marketing_manager']");
    expect(s).toContain('for select to authenticated');
    expect(s).toContain('for insert to authenticated');
  });

  it('enforces tenant consistency on loyalty relationships',()=>{
    const s=sql();
    expect(s).toContain('enforce_loyalty_ledger_scope');
    expect(s).toContain('loyalty ledger order tenant mismatch');
    expect(s).toContain('enforce_loyalty_benefit_usage_scope');
    expect(s).toContain('loyalty benefit rule tenant mismatch');
  });

  it('initializes per-store loyalty settings',()=>{
    const s=sql();
    expect(s).toContain('ensure_loyalty_program_settings');
    expect(s).toContain('after insert on public.webshop_instances');
    expect(s).toContain('on conflict(instance_id) do nothing');
  });

  it('quarantines legacy global security definer rpc access',()=>{
    const s=sql();
    for(const fn of [
      'process_loyalty_lifecycle',
      'refresh_customer_value_profiles',
      'get_customer_loyalty_snapshot',
      'redeem_loyalty_points'
    ]) expect(s).toContain(`'${fn}'`);
    expect(s).toContain('revoke all on function');
    expect(s).toContain('from public,anon,authenticated');
  });
});
