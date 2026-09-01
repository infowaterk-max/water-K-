import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Shoperation fresh-install target preflight',()=>{
  it('requires a genuinely empty public schema and no historical migration state',()=>{
    const sql=read('supabase/customer-baseline/target-preflight.sql');
    expect(sql).toContain("n.nspname = 'public'");
    expect(sql).toContain("to_regclass('supabase_migrations.schema_migrations')");
    expect(sql).toContain('migration_rows <> 0');
    expect(sql).toContain("'target-preflight-ok'::text as status");
  });

  it('does not create or mutate database objects',()=>{
    const sql=read('supabase/customer-baseline/target-preflight.sql').toLowerCase();
    expect(sql).not.toMatch(/\bcreate\s+(table|function|view|schema|type|sequence)\b/);
    expect(sql).not.toMatch(/\balter\s+(table|function|view|schema|type|sequence)\b/);
    expect(sql).not.toMatch(/\bdrop\s+(table|function|view|schema|type|sequence)\b/);
    expect(sql).not.toMatch(/\binsert\s+into\b/);
    expect(sql).not.toMatch(/\bupdate\s+public\./);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
  });
});
