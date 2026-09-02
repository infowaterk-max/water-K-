import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { correlationId, logEvent } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

function databaseErrorCode(error: unknown) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return 'missing_supabase_url';
  if (
    !process.env.SUPABASE_STAGING_SECRET_KEY &&
    !process.env.SUPABASE_SECRET_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return 'missing_supabase_server_key';
  }
  if (error instanceof Error && error.message === 'Missing Supabase server credentials.') {
    return 'missing_supabase_credentials';
  }
  return 'supabase_query_failed';
}

export async function GET(req: Request) {
  const started = Date.now();
  const cid = correlationId(req.headers.get('x-correlation-id'));
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.NEXT_PUBLIC_APP_VERSION ??
    'local';
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown';

  try {
    const admin = createAdminClient();
    const { error } = await admin.from('products').select('id').limit(1);
    if (error) throw error;

    const latencyMs = Date.now() - started;
    logEvent('info', 'health.check', {
      correlationId: cid,
      durationMs: latencyMs,
      statusCode: 200,
      environment,
    });

    return NextResponse.json(
      {
        status: 'ok',
        database: 'ok',
        latencyMs,
        version,
        environment,
        timestamp: new Date().toISOString(),
        correlationId: cid,
      },
      { headers: { 'x-correlation-id': cid, 'cache-control': 'no-store' } },
    );
  } catch (error) {
    const latencyMs = Date.now() - started;
    const errorCode = databaseErrorCode(error);

    logEvent('error', 'health.check.failed', {
      correlationId: cid,
      durationMs: latencyMs,
      statusCode: 503,
      environment,
      errorType: error instanceof Error ? error.name : 'unknown',
      errorCode,
    });

    return NextResponse.json(
      {
        status: 'degraded',
        database: 'error',
        errorCode,
        latencyMs,
        version,
        environment,
        timestamp: new Date().toISOString(),
        correlationId: cid,
      },
      {
        status: 503,
        headers: { 'x-correlation-id': cid, 'cache-control': 'no-store' },
      },
    );
  }
}
