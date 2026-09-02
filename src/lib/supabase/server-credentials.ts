type EnvironmentMap = Readonly<Record<string, string | undefined>>;

export function resolveSupabaseServerKey(env: EnvironmentMap = process.env) {
  const environment = (env.DEPLOY_ENVIRONMENT ?? env.VERCEL_ENV ?? '')
    .trim()
    .toLowerCase();

  const productionKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (environment === 'production') {
    return productionKey;
  }

  return env.SUPABASE_STAGING_SECRET_KEY ?? productionKey;
}
