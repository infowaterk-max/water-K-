import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const manifestPath = resolve(root, 'supabase/customer-baseline/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const output = resolve(root, manifest.baselineMigrationDirectory, '0001_shoperation_v1_schema.sql');
const temp = `${output}.tmp`;
const dbUrl = process.env.SHOPERATION_BASELINE_DB_URL?.trim();
const force = process.argv.includes('--force');

function fail(message) {
  console.error(`Customer baseline snapshot failed: ${message}`);
  process.exit(1);
}

if (!dbUrl) fail('SHOPERATION_BASELINE_DB_URL is required');
if (manifest.legacyMigrationReplay !== false) fail('legacy migration replay must remain disabled');
if (manifest.sourcePolicy !== 'schema-snapshot-only') fail('manifest sourcePolicy must remain schema-snapshot-only');
if (manifest.status !== 'snapshot-required') fail('manifest must remain snapshot-required while generating a candidate snapshot');
if (existsSync(output) && !force) fail('candidate snapshot already exists; pass --force only after deliberate review');

mkdirSync(dirname(output), { recursive: true });
rmSync(temp, { force: true });

const dump = spawnSync(
  'npx',
  [
    '--yes',
    'supabase@latest',
    'db',
    'dump',
    '--db-url',
    dbUrl,
    '--schema',
    'public',
    '--file',
    temp,
  ],
  { cwd: root, stdio: 'inherit' },
);

if (dump.status !== 0 || !existsSync(temp)) {
  rmSync(temp, { force: true });
  fail('Supabase schema dump did not complete successfully');
}

renameSync(temp, output);

const review = spawnSync(process.execPath, ['scripts/review-customer-baseline-snapshot.mjs'], {
  cwd: root,
  stdio: 'inherit',
});

if (review.status !== 0) {
  fail('candidate snapshot failed structural review; keep manifest snapshot-required and inspect the generated SQL');
}

const guard = spawnSync(process.execPath, ['scripts/validate-customer-baseline.mjs'], {
  cwd: root,
  stdio: 'inherit',
});

if (guard.status === 0) {
  fail('candidate snapshot must not make a snapshot-required manifest pass; review and explicitly promote it to ready');
}

console.log(`Candidate schema snapshot written to ${output}`);
console.log('Structural review passed. Next: manually review SQL, remove environment-only assumptions, prove it on the empty disposable target, then set manifest.status to ready and run npm run db:customer:guard.');
