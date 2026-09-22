import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source=()=>readFileSync(join(process.cwd(),'supabase','migrations','20260901160000_legacy_rpc_lockdown.sql'),'utf8').toLowerCase();

describe('legacy global RPC lockdown',()=>{
  it('revokes direct execution of replaced global commerce RPCs',()=>{
    const sql=source();
    for(const name of ['place_order_provider_v2','create_purchase_order','transition_purchase_order','plan_commercial_opportunities','create_commercial_offer','approve_commercial_offer','transition_commercial_offer'])expect(sql).toContain(`'${name}'`);
    expect(sql).toContain('revoke execute on function %s from public, anon, authenticated, service_role');
  });

  it('keeps only tenant-aware replacements callable by trusted application service role',()=>{
    const sql=source();
    for(const name of ['place_order_provider_v3_idempotent','create_purchase_order_v2','plan_commercial_opportunities_v2','create_commercial_offer_v2','approve_commercial_offer_v2','transition_commercial_offer_v2'])expect(sql).toContain(`'${name}'`);
    expect(sql).toContain('grant execute on function %s to service_role');
  });

  it('documents single-runtime lookup as migration-only',()=>expect(source()).toContain('migration/backfill helper only'));
});
