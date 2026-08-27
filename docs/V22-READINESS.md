# V22 Readiness – Security Hardening

## Implemented
- Browser security headers and payment-compatible CSP.
- Same-origin guard for mutating `/api/admin/*` requests integrated into the existing Supabase session middleware.
- Distributed PostgreSQL rate-limit buckets with advisory-lock serialization.
- Admin rate limiting behind `SECURITY_RATE_LIMIT_ENABLED=true`, so rollout can apply migration before enabling enforcement.
- Production dependency high-severity npm audit in CI.
- Security contract tests in the V20 quality gate.

## Audit finding fixed
The new CI security audit found a high-severity vulnerable transitive PostCSS version through Next.js. A safe npm override to patched PostCSS (`>=8.5.23`) removes the advisory without forcing an unplanned Next major-version migration. The security audit passes after the override.

## Compatibility hardening
The CSP keeps frame/object/base protections while allowing HTTPS form/connect/image destinations required by external payment and integration flows.

## Safety boundary
No production deployment or production database mutation is performed by V22. Rate limiting remains opt-in until migration rollout is complete.
