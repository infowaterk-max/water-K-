import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const sqlFile='supabase/migrations/20260903181500_campaign_lifecycle_evidence_atomic_v3.sql';

describe('campaign lifecycle evidence atomicity',()=>{
  test('manage route requires tenant permission and concrete lifecycle evidence',()=>{
    const route=read('src/app/api/admin/campaigns/manage/route.ts');
    expect(route).toContain("getAdminRequestUser('marketing.manage')");
    expect(route).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(route).toContain('admin_manage_marketing_campaign_v3');
    expect(route).toContain('evidence.campaignId!==body.campaignId');
    expect(route).toContain('evidence.status!==targetStatus[body.action]');
    expect(route).toContain('!evidence.eventId');
    expect(route).toContain('!evidence.auditId');
  });

  test('queue failures cannot be swallowed into a queued campaign state',()=>{
    const sql=read(sqlFile);
    expect(sql).not.toContain('exception when others');
    expect(sql).toContain('CAMPAIGN_JOB_EVIDENCE_MISSING');
    expect(sql).toContain('CAMPAIGN_RECIPIENT_LINK_EVIDENCE_MISSING');
    expect(sql).toContain('CAMPAIGN_QUEUE_EVIDENCE_MISSING');
    expect(sql).toMatch(/eligible=true[\s\S]*communication_job_id is null/);
    expect(sql).toContain("set status='queued'");
  });

  test('consent and suppression are rechecked at queue time',()=>{
    const sql=read(sqlFile);
    expect(sql).toContain("public.has_marketing_consent_v2(p_instance_id,r.email,'email')");
    expect(sql).toContain('not public.is_communication_suppressed_v2(p_instance_id,r.email)');
    expect(sql).toContain("exclusion_reason='ELIGIBILITY_CHANGED_BEFORE_QUEUE'");
  });

  test('campaign state, lifecycle event and admin audit commit in one RPC',()=>{
    const sql=read(sqlFile);
    expect(sql).toContain('insert into public.marketing_campaign_events');
    expect(sql).toContain('insert into public.admin_audit_log');
    expect(sql).toContain('CAMPAIGN_EVENT_EVIDENCE_MISSING');
    expect(sql).toContain('CAMPAIGN_AUDIT_EVIDENCE_MISSING');
    expect(sql).toContain("'audit_source','database_rpc'");
    expect(sql).toContain("'rpc','admin_manage_marketing_campaign_v3'");
  });

  test('v3 is service-runtime only and v2 is retired',()=>{
    const sql=read(sqlFile);
    expect(sql).toContain('revoke all on function public.admin_manage_marketing_campaign_v3');
    expect(sql).toMatch(/grant execute on function public\.admin_manage_marketing_campaign_v3[\s\S]{0,220}to service_role/);
    expect(sql).toMatch(/revoke all on function public\.admin_manage_marketing_campaign_v2[\s\S]{0,220}service_role/);
  });
});
