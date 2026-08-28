const requiredAny = [
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
];
const required = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL'];
const integrationGroups = [
  ['KH_MERCHANT_ID', 'KH_SECRET', 'KH_ENVIRONMENT'],
  ['RESEND_API_KEY', 'EMAIL_FROM'],
  ['GLS_USERNAME', 'GLS_PASSWORD'],
];

const deployEnvironment = (process.env.DEPLOY_ENVIRONMENT || process.env.VERCEL_ENV || '').trim().toLowerCase();
const strictEnvironment = deployEnvironment === 'staging' || deployEnvironment === 'production';
const missing = required.filter((key) => !process.env[key]?.trim());

for (const alternatives of requiredAny) {
  if (!alternatives.some((key) => process.env[key]?.trim())) missing.push(alternatives.join(' vagy '));
}
for (const group of integrationGroups) {
  const configured = group.filter((key) => process.env[key]?.trim());
  if (configured.length > 0 && configured.length !== group.length) missing.push(...group.filter((key) => !process.env[key]?.trim()));
}
if (strictEnvironment) {
  for (const key of ['KH_MERCHANT_ID', 'KH_SECRET', 'KH_ENVIRONMENT']) {
    if (!process.env[key]?.trim()) missing.push(key);
  }
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
if (siteUrl) {
  try {
    const parsed = new URL(siteUrl);
    if (strictEnvironment && parsed.protocol !== 'https:') missing.push('NEXT_PUBLIC_SITE_URL HTTPS kötelező staging/production környezetben');
    if (strictEnvironment && ['localhost', '127.0.0.1'].includes(parsed.hostname)) missing.push('NEXT_PUBLIC_SITE_URL nem lehet localhost staging/production környezetben');
  } catch {
    missing.push('NEXT_PUBLIC_SITE_URL érvényes abszolút URL legyen');
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
  console.warn('FIGYELMEZTETÉS: NEXT_PUBLIC_SUPABASE_URL nem tipikus Supabase projekt URL.');
}

const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (publicKey && secretKey && publicKey === secretKey) missing.push('Supabase szerveroldali kulcs nem lehet azonos a publikus kulccsal');

if (missing.length) {
  console.error(`V24 environment gate (${deployEnvironment || 'local'}): HIBA`);
  for (const key of [...new Set(missing)]) console.error(`- ${key}`);
  process.exit(1);
}
console.log(`V24 environment gate (${deployEnvironment || 'local'}): OK`);
