import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8').toLowerCase();

describe('tamper evident admin audit contracts',()=>{
  it('chains every audit entry with a sha-256 predecessor hash',()=>{
    const sql=read('supabase/migrations/20260901155000_audit_chain_hardening.sql');
    expect(sql).toContain('compute_admin_audit_hash');
    expect(sql).toContain('prev_hash');
    expect(sql).toContain('entry_hash');
    expect(sql).toContain('extensions.digest');
    expect(sql).toContain('pg_advisory_xact_lock');
  });

  it('makes audit history append-only even for service-role application code',()=>{
    const sql=read('supabase/migrations/20260901155000_audit_chain_hardening.sql');
    expect(sql).toContain('prevent_admin_audit_mutation');
    expect(sql).toContain("raise exception 'admin audit log is append-only.'");
    expect(sql).toContain('revoke update,delete on public.admin_audit_log from anon,authenticated,service_role');
  });

  it('validates organization/store consistency before hashing',()=>{
    const sql=read('supabase/migrations/20260901155000_audit_chain_hardening.sql');
    expect(sql).toContain('audit organization/store mismatch');
    expect(sql).toContain("new.audit_scope:='store:'||new.instance_id::text");
    expect(sql).toContain("new.audit_scope:='org:'||new.organization_id::text");
  });

  it('snapshots the actor roles used at mutation time',()=>{
    const sql=read('supabase/migrations/20260901155000_audit_chain_hardening.sql');
    expect(sql).toContain("'platform:'||po.role::text");
    expect(sql).toContain("'store:'||rb.role_code");
    expect(sql).toContain("'organization:'||om.role");
  });

  it('provides an RLS-aware chain verifier',()=>{
    const sql=read('supabase/migrations/20260901155000_audit_chain_hardening.sql');
    expect(sql).toContain('verify_admin_audit_chain');
    expect(sql).toContain('security invoker');
    expect(sql).toContain('invalid_links');
    expect(sql).toContain('invalid_hashes');
  });

  it('application audit writes return their chain identity',()=>{
    const source=read('src/lib/admin/audit.ts');
    expect(source).toContain("select('id,audit_scope,chain_seq,entry_hash')");
    expect(source).toContain("audit_source:'admin_app'");
  });
});
