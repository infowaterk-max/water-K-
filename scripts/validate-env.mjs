const requiredAny = [
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
];
const required = ['NEXT_PUBLIC_SUPABASE_URL'];
const integrationGroups = [
  ['KH_MERCHANT_ID', 'KH_SECRET'],
  ['RESEND_API_KEY', 'EMAIL_FROM'],
  ['GLS_USERNAME', 'GLS_PASSWORD'],
];

const missing = required.filter((key) => !process.env[key]?.trim());
for (const alternatives of requiredAny) {
  if (!alternatives.some((key) => process.env[key]?.trim())) missing.push(alternatives.join(' vagy '));
}
for (const group of integrationGroups) {
  const configured = group.filter((key) => process.env[key]?.trim());
  if (configured.length > 0 && configured.length !== group.length) missing.push(...group.filter((key) => !process.env[key]?.trim()));
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
  console.warn('FIGYELMEZTETÉS: NEXT_PUBLIC_SUPABASE_URL nem tipikus Supabase projekt URL.');
}

const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (publicKey && secretKey && publicKey === secretKey) missing.push('Supabase szerveroldali kulcs nem lehet azonos a publikus kulccsal');

if (missing.length) {
  console.error('V24 environment gate: HIBA');
  for (const key of [...new Set(missing)]) console.error(`- ${key}`);
  process.exit(1);
}
console.log('V24 environment gate: OK');
