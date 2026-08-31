import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'supabase/customer-baseline/manifest.json');
const forbidden = [/Water-K/i, /water-k-native/i, /info\.waterk/i, /WK-(?:040|750|25K)/i];

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
}

console.log(`Customer baseline guard OK: status=${manifest.status}, migrations=${migrations.length}, legacy replay disabled.`);
