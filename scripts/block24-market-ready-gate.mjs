import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const read=(path)=>readFileSync(resolve(root,path),'utf8');
const fail=(message)=>{throw new Error(`Block 24 market-ready gate failed: ${message}`)};
const policy=JSON.parse(read('src/lib/plans/commercial-policy.json'));
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const productionMigration=read('supabase/migrations/20260911125000_block24_security_maturity_hardening.sql');
const customerMigration=read('supabase/customer-baseline/migrations/0018_block24_security_maturity_hardening.sql');
const aiServer=read('src/lib/builder/storefront-ai-generator-server.ts');
const packagePage=read('src/app/admin/csomag/page.tsx');
const migrations=readdirSync(resolve(root,'supabase/customer-baseline/migrations')).filter(name=>name.endsWith('.sql')).sort();

if(policy.schemaVersion!==1||policy.currency!=='HUF'||policy.vatMode!=='net-plus-vat')fail('commercial policy identity changed without a reviewed version bump');
if(policy.plans?.alap?.monthlyNetHuf!==17990||policy.plans?.pro?.monthlyNetHuf!==39990)fail('accepted launch list pricing is not preserved');
if(policy.plans?.alap?.foundingMonthlyNetHuf!==14990||policy.plans?.pro?.foundingMonthlyNetHuf!==34990)fail('accepted Founding pricing is not preserved');
if(policy.founding?.discountGuaranteeMonths!==12)fail('Founding discount guarantee must remain 12 months');
if(policy.trial?.durationDays!==30||policy.trial?.mutatesPersistedPlan!==false)fail('trial contract must remain 30 days and must not mutate persisted plan authority');
const aiPolicy=policy.addons?.['ai-assistant'];
if(aiPolicy?.billingMode!=='usage'||aiPolicy?.variableCostRequired!==true)fail('AI commercial policy must be usage-based only where a real variable cost exists');
if(aiPolicy.fixedMonthlyNetHuf!==null||aiPolicy.includedCredits!==null||aiPolicy.overageNetHuf!==null)fail('unaccepted AI price/credit values must not be invented');
if(policy.providerContractOwner!=='merchant')fail('merchant provider-contract ownership changed');
if(policy.commercialAuthority!=='informational-only-entitlements-remain-authoritative')fail('commercial policy must never become security authority');

if(productionMigration!==customerMigration)fail('production and customer Block 24 hardening migrations must be byte-identical');
for(const fn of ['storefront_revisions_immutable','storefront_events_immutable','storefront_preview_session_guard']){
  if(!productionMigration.includes(`revoke all on function public.${fn}() from public, anon, authenticated, service_role;`))fail(`missing direct EXECUTE lockdown for ${fn}`);
}
if(!migrations.includes('0018_block24_security_maturity_hardening.sql'))fail('customer forward migration 0018 is missing');
if(!['snapshot-reviewed','ready'].includes(manifest.status))fail('customer baseline lifecycle is not release-reviewable');
if(manifest.status==='snapshot-reviewed'&&(manifest.freshInstallProofRequired!==true||manifest.proofContractSha256!==null))fail('snapshot-reviewed baseline must require a new Fresh Install proof');
if(manifest.status==='ready'&&(manifest.freshInstallProofRequired!==false||!/^[a-f0-9]{64}$/.test(manifest.proofContractSha256??'')))fail('ready baseline must contain a current proof contract hash');

if(!aiServer.includes("hasAddon('ai-assistant')")||!aiServer.includes("throw new Error('STOREFRONT_AI_ADDON_REQUIRED')"))fail('AI generator is not fail-closed behind the canonical AI Add-on entitlement');
if(!packagePage.includes('CommercialPackageSummary')||!packagePage.includes('commercialAddonLabel'))fail('commercial package policy is not surfaced in the canonical package UI');

const report={
  gate:'roadmap-block-24-market-ready-contract',
  status:'pass',
  commercialPolicyVersion:policy.schemaVersion,
  customerBaseline:{status:manifest.status,migrations:migrations.length,freshInstallProofRequired:manifest.freshInstallProofRequired},
  security:{triggerGuardDirectExecute:'revoked',productionCustomerMigrationParity:true},
  aiCommercialGate:'addon:ai-assistant',
  liveEvidenceRequired:true,
  liveAuthorities:['continuous-assurance','release-change-governance','rollout-go-no-go'],
};
mkdirSync(resolve(root,'artifacts'),{recursive:true});
writeFileSync(resolve(root,'artifacts/block24-market-ready-contract.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(JSON.stringify(report));
