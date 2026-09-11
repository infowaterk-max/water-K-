import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Block 19 compensation / rollback contract',()=>{
  test('only cancellable Block 17 runbook states are exposed to compensation',()=>{
    const server=read('src/lib/optimization/predictive-commerce.ts');
    const ui=read('src/components/admin/predictive-optimization-panel.tsx');
    expect(server).toContain("['planned','active','paused'].includes(String(runbook.status))");
    expect(server).toContain('AUTONOMY_RUN_NOT_COMPENSATABLE_TERMINAL');
    expect(server).toContain("p_target:'cancelled'");
    expect(server).toContain("transition_automation_instance_v2");
    expect(ui).toContain("run.status!=='completed'");
    expect(ui).toContain("run.status!=='dead_letter'");
  });

  test('compensation remains tenant-scoped and does not mutate commerce authorities',()=>{
    const server=read('src/lib/optimization/predictive-commerce.ts');
    expect(server).toContain("eq('instance_id',instanceId)");
    expect(server).not.toMatch(/from\('(products|product_variants|orders|customers|commercial_offers)'\)\.update/);
  });
});
