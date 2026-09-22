# V21 Readiness – Observability & Monitoring

## Implemented
- PII-redacted structured server logger.
- Correlation IDs and build/environment identity on `/api/health` while preserving the existing database health check.
- Service-role-only observability event RPC, KPI and issue queue views, and bounded retention purge.
- Admin `/admin/megfigyeles` dashboard.
- V20 quality-gate contracts for PII redaction, write boundary and health correlation semantics.

## Safety / privacy
- Known PII and secret keys are stripped before observability persistence.
- Anonymous/authenticated clients cannot write observability events.
- Health responses are `no-store` and carry a correlation ID.
- No production deployment or production data mutation is performed by V21.
