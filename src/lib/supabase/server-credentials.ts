type EnvironmentMap = Readonly<Record<string, string | undefined>>;

function runtimeEnvironment(env:EnvironmentMap){
  const vercel=(env.VERCEL_ENV??'').trim().toLowerCase();
  if(vercel==='production'||vercel==='preview')return vercel;
  return (env.DEPLOY_ENVIRONMENT??vercel).trim().toLowerCase();
}

export function resolveSupabaseServerKey(env: EnvironmentMap = process.env) {
  const environment = runtimeEnvironment(env);
  const productionKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (environment === 'production') {
    return productionKey;
  }

  return env.SUPABASE_STAGING_SECRET_KEY ?? productionKey;
}
