const isVercelDeploy = process.env.VERCEL === '1';
const environment = process.env.VERCEL_ENV;

if (!isVercelDeploy || !['preview', 'production'].includes(environment ?? '')) {
  process.exit(0);
}

const PRODUCTION_SUPABASE_REF = 'ewdederyvnwmghlydbno';
const STAGING_SUPABASE_REF = 'rfuvzgumbardvbvqjxdq';
const problems = [];

const RUNTIME_SCHEMA_PROBES = Object.freeze([
  {
    label: 'template demo catalog columns',
    table: 'products',
    columns: ['id','template_demo_namespace','template_demo_key','template_demo_state','template_demo_image_url','template_demo_installed_at'],
  },
  {
    label: 'template demo content columns',
    table: 'content_pages',
    columns: ['id','template_demo_namespace','template_demo_key','template_demo_state','template_demo_source_template_key','template_demo_source_template_version'],
  },
  {
    label: 'saved customer billing authority',
    table: 'customer_billing_profiles',
    columns: ['instance_id','user_id','billing_name'],
  },
  {
    label: 'B2B identity re-verification authority',
    table: 'b2b_account_identity_change_requests',
    columns: ['id','instance_id','account_id','status'],
  },
  {
    label: 'digital commerce asset authority',
    table: 'digital_assets',
    columns: ['id','instance_id'],
  },
  {
    label: 'order document vault authority',
    table: 'order_customer_documents',
    columns: ['id','instance_id'],
  },
  {
    label: 'product document authority',
    table: 'product_documents',
    columns: ['id','instance_id'],
  },
  {
    label: 'B2B RFQ authority',
    table: 'b2b_quote_requests',
    columns: ['id','instance_id'],
  },
]);

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

function deploymentServerKey() {
  if (environment === 'production') {
    return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
  }
  return process.env.SUPABASE_STAGING_SECRET_KEY
    ?? process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? null;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function probeRuntimeSchema(baseUrl, serverKey) {
  for (const probe of RUNTIME_SCHEMA_PROBES) {
    const url = new URL(`/rest/v1/${probe.table}`, baseUrl);
    url.searchParams.set('select', probe.columns.join(','));
    url.searchParams.set('limit', '0');

    let lastFailure = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const headers = {apikey: serverKey, accept: 'application/json'};
        if (serverKey.startsWith('eyJ')) headers.Authorization = `Bearer ${serverKey}`;
        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        });
        if (response.ok) {
          lastFailure = null;
          break;
        }

        const body = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 360);
        lastFailure = `${probe.label}: HTTP ${response.status}${body ? ` — ${body}` : ''}`;
        if (response.status < 500 || attempt === 3) break;
      } catch (error) {
        lastFailure = `${probe.label}: ${error instanceof Error ? error.message : 'network failure'}`;
      }
      if (attempt < 3) await sleep(attempt * 600);
    }

    if (lastFailure) {
      throw new Error(`DATABASE_SCHEMA_COMPATIBILITY_FAILED: ${lastFailure}`);
    }
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

if (process.env.NODE_ENV !== 'test') {
  const serverKey = deploymentServerKey();
  if (!serverKey) {
    console.error(`Vercel ${environment} deploy blocked: DATABASE_SCHEMA_COMPATIBILITY_FAILED: server credential unavailable`);
    process.exit(1);
  }

  try {
    await probeRuntimeSchema(process.env.NEXT_PUBLIC_SUPABASE_URL, serverKey);
    console.log(`Vercel ${environment} runtime schema compatibility preflight OK (${RUNTIME_SCHEMA_PROBES.length} probes).`);
  } catch (error) {
    console.error(
      `Vercel ${environment} deploy blocked: ${error instanceof Error ? error.message : 'DATABASE_SCHEMA_COMPATIBILITY_FAILED'}`,
    );
    process.exit(1);
  }
}

console.log(`Vercel ${environment} environment preflight OK.`);
