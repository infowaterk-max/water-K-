const isVercelDeploy = process.env.VERCEL === '1';
const environment = process.env.VERCEL_ENV;

if (!isVercelDeploy || !['preview', 'production'].includes(environment ?? '')) {
  process.exit(0);
}

const problems = [];

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  problems.push('NEXT_PUBLIC_SUPABASE_URL');
}

if (
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  problems.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

if (environment === 'production') {
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    problems.push('SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY');
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
} else if (
  !process.env.SUPABASE_STAGING_SECRET_KEY &&
  !process.env.SUPABASE_SECRET_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  problems.push('SUPABASE_STAGING_SECRET_KEY|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY');
}

if (problems.length > 0) {
  console.error(
    `Vercel ${environment} deploy blocked: invalid environment configuration: ${problems.join(', ')}`,
  );
  process.exit(1);
}

console.log(`Vercel ${environment} environment preflight OK.`);
