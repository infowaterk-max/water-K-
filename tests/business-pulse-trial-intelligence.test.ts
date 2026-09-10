import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const foundation=read('supabase/migrations/20260910090000_business_pulse_trial_intelligence_v1.sql');
const lifecycle=read('supabase/migrations/20260910090100_business_pulse_trial_lifecycle_v1.sql');
const merchantPage=read('src/app/admin/business-pulse/page.tsx');
const platformPage=read('src/app/admin/platform/business-pulse/page.tsx');
const platformActions=read('src/app/admin/platform/business-pulse/actions.ts');
const access=read('src/lib/business-pulse/access.ts');
const storefrontAccess=read('src/lib/storefront/access.ts');
const adminLayout=read('src/app/admin/layout.tsx');
const notifications=read('src/lib/business-pulse/notifications.ts');
const templates=read('src/lib/communication/templates.ts');
const provider=read('src/lib/communication/provider.ts');
const cron=read('src/app/api/cron/integrations/route.ts');
const vercel=JSON.parse(read('vercel.json')) as {crons?:Array<{path?:string;schedule?:string}>};

describe('Roadmap Block 10 Business Pulse / Trial Intelligence',()=>{
  it('uses an exact 30-day temporary full-Pro window without hidden plan mutation',()=>{
    expect(foundation).toContain("ends_at = starts_at + interval '30 days'");
    expect(lifecycle).toContain("v_end:=v_start+interval '30 days'");
    expect(lifecycle).toContain("'trial',true,v_start,v_end");
    expect(lifecycle).toContain("'planMutation',false");
    expect(lifecycle).toContain("v_instance.status<>'pilot'");
    expect(lifecycle).toContain("v_instance.subscription_plan<>'alap'");
    expect(lifecycle).not.toContain('update public.webshop_instances\n  set subscription_plan');
  });

  it('grants all released Pro-only capabilities but never dormant Secure Attachments or API Access',()=>{
    for(const feature of['advancedAnalytics','crm','advancedCampaigns','officeCommunicationAdvanced','automation','procurement','cashflow','executiveAnalytics','advancedIntegrations'])expect(lifecycle).toContain(`'${feature}'`);
    expect(lifecycle).not.toContain("'teamChatSecureAttachments'");
    expect(lifecycle).not.toContain("'apiAccess'");
  });

  it('separates observed facts, calculations and recommendations and never fabricates missing metrics',()=>{
    for(const column of['facts jsonb not null','calculations jsonb not null','recommendations jsonb not null'])expect(foundation).toContain(column);
    expect(foundation).toContain("'categoryDataAvailable',false");
    expect(foundation).toContain("'actualSpendAvailable',false");
    expect(foundation).toContain("'roasAvailable',false");
    expect(foundation).toContain("'configuredBudgetRevenueRatioIsRoas',false");
    expect(merchantPage).toContain('nem mérhető hitelesen');
    expect(merchantPage).toContain('valódi ROAS-t nem állítunk');
  });

  it('recommends Alap or Pro from capability evidence rather than revenue thresholds',()=>{
    expect(foundation).toContain("v_plan text:='alap'");
    expect(foundation).toContain("v_plan:='pro'");
    expect(foundation).toContain("'revenueThresholdUsed',false");
    expect(foundation).toContain('v_used_count>=2');
    expect(foundation).toContain('v_opportunity_count>=2');
    expect(merchantPage).toContain('nem aktivál automatikusan drágább csomagot');
  });

  it('implements the accepted 5d, 7d, 2d and day-30 lifecycle with 30-day preservation retention',()=>{
    for(const evidence of["interval '5 days'","interval '7 days'","interval '2 days'","'evaluation_ready'","retention_until=ends_at+interval '30 days'"])expect(lifecycle).toContain(evidence);
    expect(lifecycle).toContain("set status='paused'");
    expect(lifecycle).toContain("'dataPreserved',true");
    expect(lifecycle.toLowerCase()).not.toContain('delete from public.business_pulse');
    expect(platformPage).toContain('automatikus törlés nincs');
  });

  it('keeps full Pro navigation visible only while trial entitlement window is active',()=>{
    expect(access).toContain("eq('status','active')");
    expect(access).toContain("gt('ends_at',now)");
    expect(adminLayout).toContain("trialPro?'pro':plan");
    expect(adminLayout).toContain("plan==='alap'&&!trialPro");
  });

  it('pauses storefront access after non-activation without making admin/report inaccessible',()=>{
    expect(storefrontAccess).toContain('isBusinessPulseStorefrontPaused');
    expect(storefrontAccess).toContain("redirect('/admin/business-pulse')");
    expect(lifecycle).toContain("'instanceStatusMutated',false");
    expect(lifecycle).not.toContain("set status='suspended'");
    expect(merchantPage).toContain('storefront szünetel');
  });

  it('activates Alap or Pro explicitly through the existing audited platform plan/status authority',()=>{
    expect(lifecycle).toContain('platform_mutate_webshop_config_v3');
    expect(lifecycle).toContain("'plan_status'");
    expect(lifecycle).toContain("'status','active'");
    expect(platformActions).toContain('activateBusinessPulseTrialAction');
    expect(platformPage).toContain('Aktiválás Alapként');
    expect(platformPage).toContain('Aktiválás Próként');
  });

  it('uses tenant-bound platform-account notification events and the existing provider, not Office mailboxes',()=>{
    expect(lifecycle).toContain('BUSINESS_PULSE_EVENT_TENANT_MISMATCH');
    for(const key of['trial_inactivity_5d','trial_expiry_7d','trial_expiry_2d','trial_evaluation_ready'])expect(templates).toContain(key);
    expect(notifications).toContain('getPlatformCommunicationIdentity');
    expect(notifications).toContain('getCommunicationProvider');
    expect(provider).toContain("message.templateKey==='trial_evaluation_ready'");
    const combined=`${lifecycle}\n${notifications}`.toLowerCase();
    expect(combined).not.toContain('office_mailboxes');
    expect(combined).not.toContain('dns/mx');
  });

  it('keeps every lifecycle mutation service-role-only and RLS tenant scoped',()=>{
    expect(foundation).toContain('alter table public.business_pulse_trials enable row level security');
    expect(lifecycle).toContain('alter table public.business_pulse_trial_events enable row level security');
    expect(lifecycle).toContain('webshop_instance_members');
    for(const fn of['service_start_business_pulse_trial_v1','service_process_business_pulse_lifecycle_v1','service_activate_business_pulse_trial_v1','service_claim_business_pulse_notifications_v1']){
      expect(lifecycle).toContain(`grant execute on function public.${fn}`);
    }
    expect(lifecycle).toContain('from public,anon,authenticated');
    expect(lifecycle).toContain('BUSINESS_PULSE_PLATFORM_OPERATOR_REQUIRED');
  });

  it('reuses the single protected daily cron for lifecycle and notifications',()=>{
    expect(cron).toContain('CRON_SECRET');
    expect(cron).toContain('service_process_business_pulse_lifecycle_v1');
    expect(cron).toContain('runBusinessPulseNotificationWorker');
    expect(cron).toContain('BUSINESS_PULSE_LIFECYCLE_EVIDENCE_MISSING');
    expect(vercel.crons).toHaveLength(1);
    expect(vercel.crons?.[0]?.path).toBe('/api/cron/integrations');
  });

  it('does not touch Office activation, public attachment storage, K&H/vPOS, Visual Builder or Water-K status',()=>{
    const combined=`${foundation}\n${lifecycle}\n${platformActions}\n${notifications}`.toLowerCase();
    for(const forbidden of['insert into public.office_mailboxes','update public.office_mailboxes','storage.buckets','khpos','vpos','visual builder','56ffdbca-0614-4175-8c56-6255d38d7f53'])expect(combined).not.toContain(forbidden);
  });
});
