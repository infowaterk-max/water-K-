const isVercelDeploy = process.env.VERCEL === '1';
const environment = process.env.VERCEL_ENV;

if (!isVercelDeploy || !['preview', 'production'].includes(environment ?? '')) {
  process.exit(0);
}

const missing = [];

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  missing.push('NEXT_PUBLIC_SUPABASE_URL');
}

if (
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

if (
  !process.env.SUPABASE_STAGING_SECRET_KEY &&
  !process.env.SUPABASE_SECRET_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  missing.push('SUPABASE_STAGING_SECRET_KEY|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY');
}

if (missing.length > 0) {
  console.error(`Vercel ${environment} deploy blocked: missing required database environment configuration: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Vercel ${environment} database environment preflight OK.`);
