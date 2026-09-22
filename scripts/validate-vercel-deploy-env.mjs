const isVercelDeploy = process.env.VERCEL === '1';
const environment = process.env.VERCEL_ENV;

if (!isVercelDeploy || !['preview', 'production'].includes(environment ?? '')) {
  process.exit(0);
}

const PRODUCTION_SUPABASE_REF = 'ewdederyvnwmghlydbno';
const STAGING_SUPABASE_REF = 'rfuvzgumbardvbvqjxdq';
const problems = [];

function supabaseProjectRef(value) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  problems.push('NEXT_PUBLIC_SUPABASE_URL');
}

if (
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  problems.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const databaseProjectRef = supabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (process.env.NEXT_PUBLIC_SUPABASE_URL && !databaseProjectRef) {
  problems.push('NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL');
}

if (environment === 'production') {
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    problems.push('SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY');
  }

  if (databaseProjectRef && databaseProjectRef !== PRODUCTION_SUPABASE_REF) {
    problems.push(`production Supabase target must be ${PRODUCTION_SUPABASE_REF}; got ${databaseProjectRef}`);
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret.length < 16) {
    problems.push('CRON_SECRET must be at least 16 characters in production');
  }

  if (process.env.SUPABASE_STAGING_SECRET_KEY) {
    problems.push('SUPABASE_STAGING_SECRET_KEY must not be scoped to production');
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    problems.push('NEXT_PUBLIC_SITE_URL');
  } else {
    try {
      const parsed = new URL(siteUrl);
      const host = parsed.hostname.toLowerCase();
      if (parsed.protocol !== 'https:') problems.push('NEXT_PUBLIC_SITE_URL must use HTTPS in production');
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost')) {
        problems.push('NEXT_PUBLIC_SITE_URL must not use a loopback host in production');
      }
    } catch {
      problems.push('NEXT_PUBLIC_SITE_URL must be a valid absolute URL in production');
    }
  }
} else {
  if (
    !process.env.SUPABASE_STAGING_SECRET_KEY &&
    !process.env.SUPABASE_SECRET_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    problems.push('SUPABASE_STAGING_SECRET_KEY|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY');
  }

  if (databaseProjectRef && databaseProjectRef !== STAGING_SUPABASE_REF) {
    problems.push(`preview Supabase target must be ${STAGING_SUPABASE_REF}; got ${databaseProjectRef}`);
  }
}

if (databaseProjectRef) {
  const label = databaseProjectRef === PRODUCTION_SUPABASE_REF
    ? 'production'
    : databaseProjectRef === STAGING_SUPABASE_REF
      ? 'staging'
      : 'unknown';
  console.log(`Vercel ${environment} Supabase target: ${label} (${databaseProjectRef}).`);
}

if (problems.length > 0) {
  console.error(
    `Vercel ${environment} deploy blocked: invalid environment configuration: ${problems.join(', ')}`,
  );
  process.exit(1);
}

console.log(`Vercel ${environment} environment preflight OK.`);
