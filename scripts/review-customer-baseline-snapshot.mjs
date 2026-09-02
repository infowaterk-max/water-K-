import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=process.cwd();
const manifestPath=resolve(root,'supabase/customer-baseline/manifest.json');
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
const snapshotPath=resolve(root,manifest.snapshotFile);

function fail(message){
  console.error(`Customer baseline snapshot review failed: ${message}`);
  process.exit(1);
}

if(!existsSync(snapshotPath)) fail(`snapshot is missing: ${manifest.snapshotFile}`);
const sql=readFileSync(snapshotPath,'utf8');
const lower=sql.toLowerCase();
const normalizedIdentifiers=lower.replace(/"/g,'');

const requiredObjects=[
  'public.webshop_instances',
  'public.profiles',
  'public.products',
  'public.product_variants',
  'public.orders',
  'public.commerce_provider_catalog',
  'public.webshop_instance_commerce_settings',
  'public.customer_instance_roles',
  'public.coupon_redemptions',
  'public.recovery_objectives',
  'public.recovery_evidence',
  'public.recovery_drills',
  'public.recovery_findings',
  'public.recovery_events',
  'public.recovery_decisions',
  'public.recovery_runs',
];

const requiredRoutines=[
  'place_order_provider_v5_idempotent',
  'quote_tenant_checkout_v2',
  'is_platform_operator',
  'has_store_role',
  'has_feature_entitlement',
  'can_read_store',
  'can_manage_catalog',
  'can_manage_orders',
  'can_manage_marketing',
  'can_manage_support',
  'can_manage_procurement',
  'can_manage_sales',
  'can_read_loyalty',
  'can_manage_loyalty',
  'detect_control_tower_alerts',
  'process_recovery_governance_cycle',
  'record_recovery_evidence',
  'plan_recovery_drill',
  'start_recovery_drill',
  'complete_recovery_drill',
  'acknowledge_recovery_finding',
  'record_recovery_decision',
];

const forbiddenServerOnlyPolicies=[
  'inventory_snapshots_store_read',
  'purchase_order_items_store_all',
  'purchase_orders_store_all',
  'suppliers_store_all',
];

const requiredPolicies=[
  'return_cases_store_all',
  'return_case_items_store_all',
  'support_tickets_store_all',
  'support_ticket_messages_store_all',
  'office_threads_store_all',
  'office_messages_store_all',
  'office_tasks_store_all',
  'content_store_read',
  'products_store_read',
  'variants_store_read',
  'orders_customer_or_store_read',
  'order_items_customer_or_store_read',
  'customer_instance_roles_self_select',
];

for(const objectName of requiredObjects){
  if(!normalizedIdentifiers.includes(objectName)) fail(`required schema object is missing: ${objectName}`);
}
for(const routineName of requiredRoutines){
  if(!normalizedIdentifiers.includes(routineName)) fail(`required release routine is missing: ${routineName}`);
}
for(const policyName of requiredPolicies){
  if(!normalizedIdentifiers.includes(`create policy ${policyName}`)) fail(`required tenant RLS policy is missing: ${policyName}`);
}
for(const policyName of forbiddenServerOnlyPolicies){
  if(normalizedIdentifiers.includes(`create policy ${policyName}`)) fail(`server-only table must not expose browser policy: ${policyName}`);
}

if(!/create\s+schema(?:\s+if\s+not\s+exists)?\s+(?:"?private"?)/i.test(sql)) fail('required private schema is missing from the customer baseline');
if(!normalizedIdentifiers.includes('place_order_provider_v5_idempotent')) fail('current provider-neutral atomic checkout RPC is missing');
if(!normalizedIdentifiers.includes('quote_tenant_checkout_v2')) fail('current tenant-aware checkout quote RPC is missing');
if(/\b(?:create|replace)\s+(?:or\s+replace\s+)?function\s+(?:"?public"?\.)?"?place_order"?\s*\(/i.test(sql)) fail('obsolete public.place_order checkout overload is present');

for(const helper of requiredRoutines.slice(2)){
  const escaped=helper.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const block=new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${escaped}\\b[\\s\\S]*?alter\\s+function\\s+public\\.${escaped}\\b`,'i').exec(normalizedIdentifiers)?.[0] ?? '';
  if(!block) fail(`permission helper definition is missing: ${helper}`);
  if(/security\s+definer/i.test(block)) fail(`permission helper must remain SECURITY INVOKER: ${helper}`);
}

const alapDefaults=(sql.match(/subscription_plan[^;]*default[^;]*alap/gi)??[]).length;
if(alapDefaults<2) fail(`expected fail-closed Alap defaults for profile and webshop instance, found ${alapDefaults}`);

const topLevelSql=sql.replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g,'$$ROUTINE_BODY$$');
if(/\b(copy|insert\s+into)\s+(?:"?public"?\.)"?(products|product_variants|webshop_instances|orders|profiles|webshop_instance_commerce_settings|customer_instance_roles)"?\b/i.test(topLevelSql)){
  fail('schema snapshot contains top-level customer-facing data statements');
}

if(/\b"?supabase_migrations"?\."?schema_migrations"?\b/i.test(sql)) fail('historical Supabase migration state must not be part of the customer baseline');
if(!/enable\s+row\s+level\s+security/i.test(sql)) fail('snapshot does not enable row level security');
if(!/create\s+policy/i.test(sql)) fail('snapshot does not contain RLS policies');

const forbidden=[/Water-K/i,/water-k-native/i,/info\.waterk/i,/WK-(?:040|750|25K)/i];
for(const pattern of forbidden) if(pattern.test(sql)) fail(`forbidden customer-specific pattern: ${pattern}`);

console.log(`Customer baseline snapshot review OK: ${manifest.snapshotFile}`);
