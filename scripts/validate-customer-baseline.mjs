import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'supabase/customer-baseline/manifest.json');
const forbidden = [/Water-K/i, /water-k-native/i, /info\.waterk/i, /WK-(?:040|750|25K)/i];
const releaseMarkers = [
  'public.customer_instance_roles',
  'public.coupon_redemptions',
  'public.recovery_objectives',
  'public.recovery_evidence',
  'public.recovery_drills',
  'public.recovery_findings',
  'public.recovery_events',
  'public.recovery_decisions',
  'public.recovery_runs',
  'detect_control_tower_alerts',
  'process_recovery_governance_cycle',
  'record_recovery_evidence',
  'plan_recovery_drill',
  'start_recovery_drill',
  'complete_recovery_drill',
  'acknowledge_recovery_finding',
  'record_recovery_decision',
  'quote_tenant_checkout_v2',
  'place_order_provider_v5_idempotent',
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
  'is_platform_operator',
  'can_read_store',
  'can_manage_catalog',
  'can_manage_orders',
  'can_manage_support',
];

function fail(message) {
  console.error(`Customer baseline guard failed: ${message}`);
  process.exit(1);
}

if (!existsSync(manifestPath)) fail('manifest.json is missing');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.legacyMigrationReplay !== false) fail('legacyMigrationReplay must remain false');
if (manifest.sourcePolicy !== 'schema-snapshot-only') fail('sourcePolicy must remain schema-snapshot-only');
if (manifest.defaultPlan !== 'alap') fail('fresh customer databases must fail closed to Alap');
if (!['snapshot-required', 'snapshot-reviewed', 'ready'].includes(manifest.status)) fail('invalid baseline status');

const seedPath = resolve(root, manifest.seedFile);
if (!existsSync(seedPath)) fail('customer seed is missing');
const seed = readFileSync(seedPath, 'utf8');
for (const pattern of forbidden) if (pattern.test(seed)) fail(`forbidden customer-specific seed pattern: ${pattern}`);
if (/insert\s+into\s+public\.(products|product_variants)/i.test(seed)) fail('default customer seed must not create catalog data');

const migrationDir = resolve(root, manifest.baselineMigrationDirectory);
const migrations = existsSync(migrationDir)
  ? readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()
  : [];

if (manifest.status === 'snapshot-required' && migrations.length > 0) {
  fail('baseline is marked snapshot-required but migration SQL already exists; review it and switch status explicitly');
}
if (manifest.status === 'snapshot-reviewed' && migrations.length !== 1) {
  fail(`snapshot-reviewed baseline must contain exactly one reviewed schema snapshot, found ${migrations.length}`);
}
if (manifest.status === 'snapshot-reviewed' && manifest.freshInstallProofRequired !== true) {
  fail('snapshot-reviewed baseline must still require Fresh Install proof');
}
if (manifest.status === 'ready' && migrations.length !== 1) {
  fail(`ready baseline must contain exactly one reviewed schema snapshot, found ${migrations.length}`);
}
if (manifest.status === 'ready' && manifest.freshInstallProofRequired !== false) {
  fail('ready baseline must record completed Fresh Install proof');
}

for (const name of migrations) {
  const sql = readFileSync(resolve(migrationDir, name), 'utf8');
  for (const pattern of forbidden) if (pattern.test(sql)) fail(`${name} contains forbidden customer-specific pattern ${pattern}`);
  if (/\bWK-/i.test(sql)) fail(`${name} contains a legacy SKU/order prefix assumption`);

  if (manifest.status === 'snapshot-reviewed' || manifest.status === 'ready') {
    const normalized = sql.toLowerCase().replace(/"/g, '');
    for (const marker of releaseMarkers) {
      if (!normalized.includes(marker)) fail(`${name} is stale or incomplete; missing release marker: ${marker}`);
    }
  }
}

console.log(`Customer baseline guard OK: status=${manifest.status}, migrations=${migrations.length}, legacy replay disabled.`);
