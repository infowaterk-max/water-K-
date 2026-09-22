const baseUrl = (process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
if (!baseUrl) {
  console.error('SMOKE_BASE_URL vagy NEXT_PUBLIC_SITE_URL kötelező.');
  process.exit(1);
}

const expectedSha = (process.env.SMOKE_EXPECTED_SHA || '').trim().toLowerCase();
const expectedVersion = expectedSha ? expectedSha.slice(0, 12) : '';
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '';
const smokeHeaders = {
  'user-agent': 'shoperation-smoke/1.0',
  ...(bypassSecret
    ? {
        'x-vercel-protection-bypass': bypassSecret,
      }
    : {}),
};

function formatError(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause;
  if (!cause || typeof cause !== 'object') {
    return error.message;
  }

  const causeCode = 'code' in cause && typeof cause.code === 'string' ? cause.code : '';
  const causeMessage = 'message' in cause && typeof cause.message === 'string' ? cause.message : '';

  return [
    error.message,
    causeCode ? `code=${causeCode}` : '',
    causeMessage ? `cause=${causeMessage}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

const checks = [
  { path: '/api/health', expectJson: true, verifyVersion: true },
  { path: '/', expectText: true },
  { path: '/webaruhaz', expectText: true },
  { path: '/penztar', expectText: true },
  { path: '/fiokom', expectText: true },
];

const failures = [];
for (const check of checks) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      redirect: 'follow',
      headers: smokeHeaders,
    });
    const latency = Date.now() - started;
    const contentType = response.headers.get('content-type') || '';
    let body = null;

    if (check.expectJson && contentType.includes('application/json')) {
      body = await response.json();
    }

    if (!response.ok) {
      const diagnostic =
        body && typeof body === 'object'
          ? ` errorCode=${body.errorCode || 'unknown'} version=${body.version || 'unknown'}`
          : '';
      throw new Error(`HTTP ${response.status}${diagnostic}`);
    }

    if (check.expectJson && !contentType.includes('application/json')) {
      throw new Error(`nem JSON: ${contentType}`);
    }
    if (check.expectText && !contentType.includes('text/html')) {
      throw new Error(`nem HTML: ${contentType}`);
    }

    if (check.verifyVersion && expectedVersion) {
      const actualVersion =
        body && typeof body === 'object' && typeof body.version === 'string'
          ? body.version.toLowerCase()
          : '';
      if (actualVersion !== expectedVersion) {
        throw new Error(`artifact SHA eltérés: expected=${expectedVersion} actual=${actualVersion || 'unknown'}`);
      }
    }

    console.log(`OK ${check.path} ${response.status} ${latency}ms`);
  } catch (error) {
    failures.push(`${check.path}: ${formatError(error)}`);
  }
}

if (failures.length) {
  console.error('Shoperation smoke gate: HIBA');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Shoperation smoke gate: OK');
