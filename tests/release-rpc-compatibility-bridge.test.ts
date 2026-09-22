import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const bridgePath='supabase/migrations/20260903222000_release_rpc_compatibility_bridge_v1.sql';
const lockdownPath='supabase/migrations/20260903222500_release_rpc_compatibility_lockdown_v1.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

const legacySignatures=[
  'public.admin_update_customer_store_role_v2(uuid,uuid,uuid,timestamptz,jsonb)',
  'public.admin_transition_commercial_opportunity_v3(uuid,uuid,uuid,text)',
  'public.admin_transition_commercial_offer_v3(uuid,uuid,uuid,text)'
];

describe('release RPC compatibility bridge',()=>{
  test('bridge temporarily grants only the exact legacy production-call signatures',()=>{
    const bridge=read(bridgePath);
    for(const signature of legacySignatures){
      expect(bridge).toContain(`grant execute on function ${signature}`);
    }
    expect((bridge.match(/grant execute on function/g)??[])).toHaveLength(3);
  });

  test('post-deploy lockdown retires every compatibility grant',()=>{
    const lockdown=read(lockdownPath);
    for(const signature of legacySignatures){
      expect(lockdown).toContain(`revoke execute on function ${signature}`);
      expect(lockdown).toContain('from service_role');
    }
    expect((lockdown.match(/revoke execute on function/g)??[])).toHaveLength(3);
  });

  test('current application callers already use the replacement v4 entrypoints',()=>{
    const customer=read('src/app/api/admin/customers/[id]/route.ts');
    const commercial=read('src/app/api/admin/commercial/actions/route.ts');
    expect(customer).toContain("rpc('admin_update_customer_store_role_v4'");
    expect(customer).not.toContain("rpc('admin_update_customer_store_role_v2'");
    expect(commercial).toContain("rpc('admin_transition_commercial_opportunity_v4'");
    expect(commercial).toContain("rpc('admin_transition_commercial_offer_v4'");
    expect(commercial).not.toContain("rpc('admin_transition_commercial_opportunity_v3'");
    expect(commercial).not.toContain("rpc('admin_transition_commercial_offer_v3'");
  });

  test('bridge migration sorts before final lockdown migration',()=>{
    expect(bridgePath.localeCompare(lockdownPath)).toBeLessThan(0);
  });
});
