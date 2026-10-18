import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/customer-baseline/managed-forward/office31_fresh_last_member_remove_v1.sql';

describe('Office Team Chat last-member revocation forward fix', () => {
  const sql = readFileSync(join(process.cwd(), migrationPath), 'utf8');

  it('preserves minimum two participants when creating a new internal conversation', () => {
    expect(sql).toContain("if v_participant_count<2 or v_participant_count>25 then raise exception 'OFFICE_INTERNAL_PARTICIPANTS_INVALID'; end if;");
  });

  it('permits an owner-only private thread after removing the last member', () => {
    const mutation = sql.slice(sql.indexOf("if p_action='manage_participant' then"));
    expect(mutation).toContain("if v_participant_count<1 or v_participant_count>25 then raise exception 'OFFICE_INTERNAL_PARTICIPANTS_INVALID'; end if;");
    expect(mutation).toContain("v_conversation_type:=case when v_participant_count<=2 then 'internal_private' else 'internal_group' end;");
    expect(mutation).toContain("private.office_active_thread_owner_v1(p_instance_id,v_thread_id,p_actor)");
    expect(mutation).toContain("if v_target=p_actor then raise exception 'OFFICE_THREAD_OWNER_SELF_CHANGE_FORBIDDEN'; end if;");
  });

  it('keeps exact source pin and Supabase ledger guard for Fresh Install', () => {
    expect(sql).toContain("af3bc54456d09fab6c6056a559e9e435");
    expect(sql).toContain("office31_fresh_server_entitlement_select_v1");
    expect(sql).toContain("OFFICE31_PARTICIPANT_REMOVE_FORWARD_PRECONDITION_MISMATCH");
  });

  it('does not broaden RPC permissions or directly grant access to private thread data', () => {
    expect(sql).not.toMatch(/\bGRANT\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE)\b/i);
    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(sql).toContain("has_function_privilege('service_role'");
    expect(sql).toContain("has_function_privilege('authenticated'");
    expect(sql).toContain("has_function_privilege('anon'");
  });
});
