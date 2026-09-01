const baseUrl = (process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
if (!baseUrl) {
  console.error('SMOKE_BASE_URL vagy NEXT_PUBLIC_SITE_URL kötelező.');
  process.exit(1);
}

const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '';
const smokeHeaders = {
  'user-agent': 'shoperation-smoke/1.0',
  ...(bypassSecret
    ? {
        'x-vercel-protection-bypass': bypassSecret,
        'x-vercel-set-bypass-cookie': 'true',
      }
    : {}),
};

const checks = [
  { path: '/api/health', expectJson: true },
  { path: '/', expectText: true },
  { path: '/webaruhaz', expectText: true },
  { path: '/penztar', expectText: true },
  { path: '/bejelentkezes', expectText: true },
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (check.expectJson && !contentType.includes('application/json')) throw new Error(`nem JSON: ${contentType}`);
    if (check.expectText && !contentType.includes('text/html')) throw new Error(`nem HTML: ${contentType}`);
    console.log(`OK ${check.path} ${response.status} ${latency}ms`);
  } catch (error) {
    failures.push(`${check.path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error('Shoperation smoke gate: HIBA');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Shoperation smoke gate: OK');
