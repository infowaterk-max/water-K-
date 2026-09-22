import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd();
const sql=()=>readFileSync(join(root,'supabase/migrations/20260901156000_campaign_conversion_security.sql'),'utf8').toLowerCase();

describe('campaign conversion security contracts',()=>{
  it('uses security-invoker semantics instead of owner-bypass view execution',()=>{
    const source=sql();
    expect(source).toContain('with (security_invoker=true)');
  });

  it('requires tenant equality across recipient, communication job and order',()=>{
    const source=sql();
    expect(source).toContain('j.instance_id=r.instance_id');
    expect(source).toContain('o.instance_id=s.instance_id');
    expect(source).toContain('partition by o.instance_id,o.id');
  });
});
