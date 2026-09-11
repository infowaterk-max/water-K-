import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Block 19 compensation / rollback contract',()=>{
  test('uses one narrow tenant-safe compensation adapter over canonical Block 17 authorities',()=>{
    const server=read('src/lib/optimization/predictive-commerce.ts');
    const migration=read('supabase/migrations/20260911050100_block19_compensation_hardening.sql');
    expect(server).toContain("rpc('compensate_block19_runbook_v1'");
    expect(migration).toContain('transition_control_task_v2');
    expect(migration).toContain('transition_automation_instance_v2');
    expect(migration).toContain("sr.status='waiting'");
    expect(migration).toContain("set status='cancelled'");
    expect(migration).toContain("v_instance.status not in ('planned','active','paused')");
  });

  test('terminal runs are not offered as compensatable in the UI',()=>{
    const ui=read('src/components/admin/predictive-optimization-panel.tsx');
    expect(ui).toContain("run.status!=='completed'");
    expect(ui).toContain("run.status!=='dead_letter'");
    expect(ui).toContain("run.status!=='compensated'");
  });

  test('compensation remains tenant-scoped and never mutates commerce authorities',()=>{
    const server=read('src/lib/optimization/predictive-commerce.ts');
    const migration=read('supabase/migrations/20260911050100_block19_compensation_hardening.sql');
    expect(server).toContain("eq('instance_id',instanceId)");
    expect(migration).toContain('public.has_store_role');
    expect(`${server}\n${migration}`).not.toMatch(/update public\.(products|product_variants|orders|customers|commercial_offers)/i);
  });
});
