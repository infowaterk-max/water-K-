import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('loyalty tenant cron worker',()=>{
  test('daily run key is deterministic so same-day retries are idempotent per webshop',()=>{
    const route=read('src/app/api/cron/integrations/route.ts');
    expect(route).toContain("const loyaltyRunKey=`daily:${checkedAt.slice(0,10)}`");
    expect(route).toContain("admin.rpc('process_loyalty_lifecycle_v2'");
    expect(route).toContain('p_instance_id:instance.id');
    expect(route).toContain('p_run_key:loyaltyRunKey');
  });

  test('cron accepts loyalty success only with exact tenant and lifecycle evidence',()=>{
    const route=read('src/app/api/cron/integrations/route.ts');
    expect(route).toContain('row.instance_id!==instanceId');
    expect(route).toContain('row.run_key!==runKey');
    expect(route).toContain("typeof row.completed_at!=='string'");
    expect(route).toContain('!nonNegativeInteger(row.accrued_points_entries)');
    expect(route).toContain('!nonNegativeInteger(row.reversed_points_entries)');
    expect(route).toContain('!nonNegativeInteger(row.refreshed_profiles)');
    expect(route).toContain("(metadata as Record<string,unknown>).authority!=='instance_id'");
    expect(route).toContain("throw new Error('LOYALTY_LIFECYCLE_EVIDENCE_MISSING')");
  });

  test('one tenant loyalty failure makes the combined cron fail closed',()=>{
    const route=read('src/app/api/cron/integrations/route.ts');
    expect(route).toContain('const loyaltyOk=loyalty.every(result=>result.ok)');
    expect(route).toContain('const ok=inventorySnapshot.ok&&loyaltyOk&&journeyOk&&integrationResults.every(result=>result.ok)&&communication.ok');
    expect(route).toContain('loyalty:{tenants:loyalty.length,runKey:loyaltyRunKey,results:loyalty}');
    expect(route).toContain('{status:ok?200:503}');
  });

  test('loyalty reuses the existing daily Vercel cron instead of creating another schedule',()=>{
    const vercel=read('vercel.json');
    expect(vercel.match(/"path"\s*:\s*"\/api\/cron\/integrations"/g)?.length).toBe(1);
    expect(vercel.match(/"schedule"/g)?.length).toBe(1);
  });

  test('the database lifecycle contract is instance-idempotent',()=>{
    const sql=read('supabase/migrations/20260903211500_loyalty_tenant_lifecycle_engine_v2.sql');
    expect(sql).toContain('process_loyalty_lifecycle_v2');
    expect(sql).toContain('where instance_id=p_instance_id and run_key=trim(p_run_key)');
    expect(sql).toContain('insert into public.loyalty_processing_runs(instance_id,run_key)');
    expect(sql).toContain("'authority','instance_id'");
  });
});
