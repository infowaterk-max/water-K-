import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd();
const read=(p:string)=>readFileSync(join(root,p),'utf8').toLowerCase();
describe('loyalty tenant contracts',()=>{
 it('scopes every loyalty root table by instance',()=>{const s=read('supabase/migrations/20260901159000_loyalty_tenant_scope.sql');for(const t of ['customer_value_profiles','loyalty_benefit_rules','loyalty_benefit_usage','loyalty_ledger','loyalty_processing_runs','loyalty_program_settings'])expect(s).toContain(`alter table public.${t} add column if not exists instance_id`);});
 it('keeps loyalty views tenant-aware',()=>{const s=read('supabase/migrations/20260901159000_loyalty_tenant_scope.sql');expect(s).toContain('b.instance_id=p.instance_id');expect(s).toContain('x.instance_id=p.instance_id');expect(s).toContain('m.instance_id=p_instance_id');});
 it('scopes the admin customer value page',()=>{const s=read('src/app/admin/ugyfelertek/page.tsx');expect(s).toContain("requirecurrentstorecontext('analytics.read')");expect(s).toContain(".eq('instance_id',scope.instanceid)");});
});
