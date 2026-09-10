import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20260910090000_business_pulse_trial_intelligence_v1.sql');
const merchantPage=read('src/app/admin/business-pulse/page.tsx');
const platformActions=read('src/app/admin/platform/business-pulse/actions.ts');
const cron=read('src/app/api/cron/integrations/route.ts');
const vercel=JSON.parse(read('vercel.json')) as {crons?:Array<{path?:string;schedule?:string}>};

describe('Roadmap Block 10 Business Pulse / Trial Intelligence',()=>{
  it('uses exact 30-day temporary trial entitlements without mutating plan or instance status',()=>{
    expect(migration).toContain("ends_at = starts_at + interval '30 days'");
    expect(migration).toContain("v_end:=v_start+interval '30 days'");
    expect(migration).toContain("'trial',true,v_start,v_end");
    expect(migration).toContain("'planMutation',false");
    expect(migration).not.toContain("update public.webshop_instances set subscription_plan");
    expect(migration).not.toContain("update public.webshop_instances set status");
  });

  it('grants only released Pro capabilities and keeps launch-gated features dormant',()=>{
    for(const feature of['advancedAnalytics','crm','advancedCampaigns','officeCommunicationAdvanced','automation','procurement','cashflow','executiveAnalytics','advancedIntegrations'])expect(migration).toContain(`'${feature}'`);
    expect(migration).not.toContain("'teamChatSecureAttachments'");
    expect(migration).not.toContain("'apiAccess'");
  });

  it('separates facts, calculations and recommendations in the persisted report contract',()=>{
    for(const column of['facts jsonb not null','calculations jsonb not null','recommendations jsonb not null'])expect(migration).toContain(column);
    expect(merchantPage).toContain('Tények');
    expect(merchantPage).toContain('Számítás');
    expect(merchantPage).toContain('Csomagajánlás · külön következtetési réteg');
  });

  it('never fabricates category performance or campaign ROAS when source data is absent',()=>{
    expect(migration).toContain("'categoryDataAvailable',false");
    expect(migration).toContain("'actualSpendAvailable',false");
    expect(migration).toContain("'roasAvailable',false");
    expect(migration).toContain("'configuredBudgetRevenueRatioIsRoas',false");
    expect(merchantPage).toContain('A rendszer nem gyárt helyette becsült kategóriákat');
    expect(merchantPage).toContain('valódi ROAS-t nem állítunk');
  });

  it('recommends Alap or Pro from capability evidence rather than revenue thresholds',()=>{
    expect(migration).toContain("v_plan text:='alap'");
    expect(migration).toContain("v_plan:='pro'");
    expect(migration).toContain("'revenueThresholdUsed',false");
    expect(migration).toContain('v_used_count>=2');
    expect(migration).toContain('v_opportunity_count>=2');
  });

  it('enforces tenant integrity, RLS and service-role-only mutations',()=>{
    expect(migration).toContain('BUSINESS_PULSE_TENANT_MISMATCH');
    expect(migration).toContain('alter table public.business_pulse_trials enable row level security');
    expect(migration).toContain('alter table public.business_pulse_reports enable row level security');
    expect(migration).toContain('webshop_instance_members');
    for(const fn of['service_start_business_pulse_trial_v1','service_generate_business_pulse_report_v1','service_generate_due_business_pulse_reports_v1'])expect(migration).toContain(`grant execute on function public.${fn}`);
    expect(migration).toContain('from public,anon,authenticated');
  });

  it('starts trials only through a platform operator and reuses the existing protected daily cron',()=>{
    expect(platformActions).toContain('requirePlatformOperator()');
    expect(platformActions).toContain('service_start_business_pulse_trial_v1');
    expect(cron).toContain('CRON_SECRET');
    expect(cron).toContain('service_generate_due_business_pulse_reports_v1');
    expect(cron).toContain('BUSINESS_PULSE_DUE_RUN_EVIDENCE_MISSING');
    expect(vercel.crons).toHaveLength(1);
    expect(vercel.crons?.[0]?.path).toBe('/api/cron/integrations');
  });

  it('does not activate Office infrastructure, public attachments, K&H/vPOS or storefront changes',()=>{
    const combined=`${migration}\n${platformActions}\n${cron}`.toLowerCase();
    for(const forbidden of['insert into public.office_mailboxes','update public.office_mailboxes','storage.buckets','khpos','vpos','storefront_pages'])expect(combined).not.toContain(forbidden);
  });
});
