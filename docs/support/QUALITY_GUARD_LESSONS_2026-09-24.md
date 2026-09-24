# Quality Guard lessons — 2026-09-24

This record promotes two defects discovered while building Shoperation Incident Intelligence into reusable global Quality Knowledge.

## SKB-QG-001 — Marker-based schema proof can be false green

**Symptom:** the Incident Intelligence migration tests passed because the expected RPC names, grants and markers existed, while two PL/pgSQL functions still used an invalid single-dollar body delimiter.

**Root cause:** the test contract verified textual presence instead of the syntax-sensitive delimiter invariant.

**Verified resolution:** repair the affected functions to valid `$$ ... $$` bodies and add a shared migration guard that scans production and customer-baseline SQL for malformed single-dollar PL/pgSQL delimiters.

**Prevention:** database-schema work activates SQ-KF-023 / SQ-AUTH-019. Marker presence is evidence of structure, not proof of SQL validity.

## SKB-QG-002 — Short intent token caused scope explosion

**Symptom:** a database/incident plan unexpectedly activated shipping/payment/customer-account guards; later hibabejelentő UI planning incorrectly activated auth/customer-account guards, and the word `authority` also activated auth scope.

**Root cause:** intent matching used semantically over-broad tokens: bare `mpl` matched `implementation`, bare `bejelent` matched `hibabejelentő`, and bare `auth` matched the prefix of `authority`.

**Verified resolution:** bound MPL with lexical word boundaries, narrow Hungarian login intent to `bejelentkez`, constrain `auth` to a whole word while explicitly allowing `authentication`/`authorization`, and keep positive plus lexically similar negative regression examples.

**Prevention:** Quality Knowledge work activates SQ-KF-024 / SQ-AUTH-020. Short tokens and broad action stems must be lexically/semantically bounded; recurring scope-overreach now requires a shared root-cause fix.

## Intake dispositions

- `SQ-CAND-ED34726C2433` → matched `SQ-KF-013`; relevant guard scope was omitted from the plan and the Plan Before Code gate correctly stopped the change.
- `SQ-CAND-306873FDDFBA` → matched `SQ-KF-013`; newly activated incident scope changed the applicable guard set and the plan was regenerated.
- `SQ-CAND-3B0C3878E76D` → matched `SQ-KF-004`; the failing assertion was a harness defect, not a runtime contract defect.
