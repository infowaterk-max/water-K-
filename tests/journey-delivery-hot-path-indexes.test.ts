import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903221500_journey_delivery_hot_path_indexes_v1.sql';
const deliveryMigration='supabase/migrations/20260903220000_journey_delivery_outcome_authority_v4.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('journey delivery hot-path indexes',()=>{
  test('communication-job reconciliation has a covering lookup index',()=>{
    const sql=read(migration);
    expect(sql).toContain('customer_journey_steps_job_instance_idx');
    expect(sql).toContain('on public.customer_journey_steps(communication_job_id,instance_id)');
    expect(sql).toContain('where communication_job_id is not null');
  });

  test('tenant journey-state scans have a covering state index',()=>{
    const sql=read(migration);
    expect(sql).toContain('customer_journey_steps_instance_journey_status_idx');
    expect(sql).toContain('on public.customer_journey_steps(instance_id,journey_id,status)');
  });

  test('indexes cover the lookup shapes used by delivery reconciliation',()=>{
    const delivery=read(deliveryMigration);
    expect(delivery).toContain('js.instance_id=p_instance_id');
    expect(delivery).toContain('js.communication_job_id=p_job_id');
    expect(delivery).toContain('js.journey_id=v_journey_id');
    expect(delivery).toContain("js.status in('pending','queued')");
  });
});
