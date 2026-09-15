import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20260915160000_business_pulse_service_role_read_contract.sql');
const access=read('src/lib/business-pulse/access.ts');

describe('Business Pulse service-role read contract',()=>{
  it('keeps every server-read Business Pulse table explicitly readable by service_role',()=>{
    for(const table of['business_pulse_trials','business_pulse_reports','business_pulse_trial_events']){
      expect(migration).toContain(`grant select on table public.${table} to service_role;`);
    }
    expect(access).toContain("db.from('business_pulse_trials')");
  });
});
