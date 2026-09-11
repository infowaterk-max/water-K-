import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const root=process.cwd();
const read=(path)=>readFileSync(resolve(root,path),'utf8');
const fail=(message)=>{throw new Error(`Block 24 market-ready gate failed: ${message}`)};
const sha256=(value)=>createHash('sha256').update(value).digest('hex');

const policy=read('src/lib/commercial/block24-policy.ts');
const aiServer=read('src/lib/builder/storefront-ai-generator-server.ts');
const doc=read('docs/ROADMAP_BLOCK24_COMMERCIAL_SECURITY_MATURITY_GATE.md');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const productionMigration=read('supabase/migrations/20260911103500_block24_storefront_trigger_privilege_lockdown.sql');
const customerMigration=read('supabase/customer-baseline/migrations/0018_block24_storefront_trigger_privilege_lockdown.sql');
const customerMigrations=readdirSync(resolve(root,'supabase/customer-baseline/migrations')).filter(name=>name.endsWith('.sql')).sort();

if(!policy.includes("STOREFRONT_AI_COMMERCIAL_CAPABILITY=addonCapabilityCode('ai-assistant')"))fail('AI must remain the canonical separately entitled ai-assistant Add-on');
if(!policy.includes("STOREFRONT_AI_CREDIT_LIMIT_ENV='SHOPERATION_AI_STOREFRONT_CREDITS_PER_30D'"))fail('AI commercial allowance must remain server-configured');
if(!policy.includes("reason:'addon-required'|'credit-policy-not-configured'"))fail('AI commercial policy must fail closed');
if(/monthlyNetHuf|foundingMonthlyNetHuf|overageNetHuf|trial\.durationDays/.test(policy))fail('unapproved numeric pricing/trial policy must not become code authority');

for(const marker of[
  'getFeatureEntitlementDecision(scope.instanceId,STOREFRONT_AI_COMMERCIAL_CAPABILITY)',
  'process.env[STOREFRONT_AI_CREDIT_LIMIT_ENV]',
  'commercial:storefront-ai-generator:${BLOCK24_COMMERCIAL_POLICY_VERSION}:${scope.instanceId}',
  'STOREFRONT_AI_ADDON_REQUIRED',
  'STOREFRONT_AI_COMMERCIAL_POLICY_NOT_CONFIGURED',
  'STOREFRONT_AI_CREDITS_EXHAUSTED',
])if(!aiServer.includes(marker))fail(`missing AI commercial authority marker: ${marker}`);
if(aiServer.includes('input.instanceId')||aiServer.includes('rawInput.entitlement'))fail('caller-controlled tenant or entitlement authority detected');
if(aiServer.indexOf('getFeatureEntitlementDecision')>aiServer.indexOf("fetch('https://ai-gateway.vercel.sh"))fail('entitlement gate must execute before provider invocation');

if(productionMigration!==customerMigration)fail('production/customer Block 24 hardening migrations are not byte-identical');
for(const fn of['storefront_revisions_immutable','storefront_events_immutable','storefront_preview_session_guard']){
  if(!productionMigration.includes(`revoke all on function public.${fn}() from public,anon,authenticated,service_role;`))fail(`missing trigger-only EXECUTE lockdown for ${fn}`);
}
if(!customerMigrations.includes('0018_block24_storefront_trigger_privilege_lockdown.sql'))fail('customer forward migration 0018 is missing');

if(!['snapshot-reviewed','ready'].includes(manifest.status))fail('customer baseline lifecycle is neither proof-pending nor ready');
if(manifest.status==='snapshot-reviewed'){
  if(manifest.freshInstallProofRequired!==true||manifest.proofContractSha256!==null)fail('proof-pending baseline must require Fresh Install proof and have no proof hash');
}else{
  if(manifest.freshInstallProofRequired!==false||!/^[a-f0-9]{64}$/.test(manifest.proofContractSha256??''))fail('ready baseline must carry a current proof contract hash');
}
if(!String(manifest.notes??'').includes('0001-0018'))fail('baseline notes do not identify ordered 0001-0018');

for(const marker of[
  'existing V24 rollout evidence and GO/NO-GO authority',
  'must not create another release-governance authority',
  'leaked-password protection is a launch-blocking gate',
  'does not:\n\n- create a third package tier',
])if(!doc.includes(marker))fail(`maturity contract marker missing: ${marker}`);

const report={
  schemaVersion:1,
  block:'Roadmap Block 24 – Commercial / Security / Maturity Gate',
  commercial:{
    packageAuthority:'Block 11 Alap/Pro/Add-on',
    aiCapability:'addon:ai-assistant',
    numericPriceAuthority:'not-finalized-not-invented',
    creditAllowanceAuthority:'server-environment',
    failClosed:true,
  },
  security:{
    migrationSha256:sha256(productionMigration),
    triggerOnlyFunctionsLocked:3,
    leakedPasswordGate:'external-launch-blocking-while-password-auth-enabled',
  },
  customerBaseline:{
    status:manifest.status,
    orderedMigrations:customerMigrations.length,
    latest:customerMigrations.at(-1),
    freshInstallProofRequired:manifest.freshInstallProofRequired,
    proofContractSha256:manifest.proofContractSha256,
  },
  maturity:{
    liveAuthorities:['continuous-assurance','release-change-governance','rollout-go-no-go'],
    createsParallelReleaseAuthority:false,
  },
};
mkdirSync(resolve(root,'artifacts'),{recursive:true});
writeFileSync(resolve(root,'artifacts/block24-market-ready-contract.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(JSON.stringify(report));
