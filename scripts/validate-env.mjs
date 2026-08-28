const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const conditional = [
  ['KH_API_URL', 'KH_MERCHANT_ID', 'KH_SECRET_KEY'],
  ['RESEND_API_KEY', 'EMAIL_FROM'],
  ['FOXPOST_API_URL', 'FOXPOST_API_KEY'],
  ['GLS_API_URL', 'GLS_API_KEY'],
  ['SZAMLAZZ_API_URL', 'SZAMLAZZ_API_KEY'],
];

const missing = required.filter((key) => !process.env[key]?.trim());
const warnings = [];

for (const group of conditional) {
  const configured = group.filter((key) => process.env[key]?.trim());
  if (configured.length > 0 && configured.length !== group.length) {
    missing.push(...group.filter((key) => !process.env[key]?.trim()));
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
  warnings.push('NEXT_PUBLIC_SUPABASE_URL nem tipikus Supabase projekt URL.');
}

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
if (serviceKey && anonKey && serviceKey === anonKey) {
  missing.push('SUPABASE_SERVICE_ROLE_KEY (nem lehet azonos a publikus anon kulccsal)');
}

if (missing.length) {
  console.error('V24 environment gate: HIBA');
  for (const key of [...new Set(missing)]) console.error(`- ${key}`);
  process.exit(1);
}

console.log('V24 environment gate: OK');
for (const warning of warnings) console.warn(`FIGYELMEZTETÉS: ${warning}`);
