# Visual Builder production acceptance gate

Required before merge to `main`:

- exact-head quality tests PASS;
- TypeScript PASS;
- production build PASS;
- no authority replacement outside the Builder presentation/composition layer;
- production deployment reaches READY after merge;
- `/api/health` returns HTTP 200, `status=ok`, `database=ok` and the merged production version;
- production runtime error scan is clean.

The final deliverable is production, not a preview-only handoff.
