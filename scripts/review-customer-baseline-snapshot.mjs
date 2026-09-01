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
];

for(const objectName of requiredObjects){
  if(!normalizedIdentifiers.includes(objectName)) fail(`required schema object is missing: ${objectName}`);
}

if(!/create\s+schema(?:\s+if\s+not\s+exists)?\s+(?:"?private"?)/i.test(sql)) fail('required private schema is missing from the customer baseline');
if(!normalizedIdentifiers.includes('place_order_provider_v2_idempotent')) fail('provider-neutral checkout RPC is missing');
if(/\b(?:create|replace)\s+(?:or\s+replace\s+)?function\s+(?:"?public"?\.)?"?place_order"?\s*\(/i.test(sql)) fail('obsolete public.place_order checkout overload is present');

const alapDefaults=(sql.match(/subscription_plan[^;]*default[^;]*alap/gi)??[]).length;
if(alapDefaults<2) fail(`expected fail-closed Alap defaults for profile and webshop instance, found ${alapDefaults}`);

// pg_dump --schema-only legitimately preserves DML inside function bodies (for example
// private.handle_new_user inserts the newly authenticated user into public.profiles).
// Strip dollar-quoted routine bodies before looking for top-level COPY/INSERT statements,
// so executable schema logic is retained while actual dumped customer rows remain blocked.
const topLevelSql=sql.replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g,'$$ROUTINE_BODY$$');
if(/\b(copy|insert\s+into)\s+(?:"?public"?\.)"?(products|product_variants|webshop_instances|orders|profiles|webshop_instance_commerce_settings)"?\b/i.test(topLevelSql)){
  fail('schema snapshot contains top-level customer-facing data statements');
}

if(/\b"?supabase_migrations"?\."?schema_migrations"?\b/i.test(sql)) fail('historical Supabase migration state must not be part of the customer baseline');
if(!/enable\s+row\s+level\s+security/i.test(sql)) fail('snapshot does not enable row level security');
if(!/create\s+policy/i.test(sql)) fail('snapshot does not contain RLS policies');

const forbidden=[/Water-K/i,/water-k-native/i,/info\.waterk/i,/WK-(?:040|750|25K)/i];
for(const pattern of forbidden) if(pattern.test(sql)) fail(`forbidden customer-specific pattern: ${pattern}`);

console.log(`Customer baseline snapshot review OK: ${manifest.snapshotFile}`);
