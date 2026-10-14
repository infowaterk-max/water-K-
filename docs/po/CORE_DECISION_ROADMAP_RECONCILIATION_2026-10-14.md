# Shoperation Core – PO decision → Living Roadmap reconciliation (2026-10-14)

**Status: PROPOSED / DRAFT BRANCH ONLY. NOT MERGED; DEVELOPMENT GUARD, PLAN BEFORE CODE, CI, TRUTH & LIFECYCLE NOT RUN OR PROVEN.** This is a decision-identity and implementation-handoff document, not a claim of completed Core behavior. Canonical source decisions remain in their accepted Product Owner issue(s); this document is an index, never a second policy engine.

## Authority and observed baseline

- Repository: `infowaterk-max/water-K-`; observed main at branch creation `220a83e39d17ae9c597e1b7499973db75e570860`, recheck before any implementation/merge.
- Machine-readable roadmap: `quality/knowledge/living-roadmap.v2.json`; PO instruction authority: `quality/knowledge/po-instructions.v1.json`.
- Accepted PO sources: [Core M1–M4 #1259](https://github.com/infowaterk-max/water-K-/issues/1259); [M5 #1261](https://github.com/infowaterk-max/water-K-/issues/1261); [M6 #1263](https://github.com/infowaterk-max/water-K-/issues/1263); [M7 #1267](https://github.com/infowaterk-max/water-K-/issues/1267) with **2026-10-14 7.10/A–C**; [M8 #1269](https://github.com/infowaterk-max/water-K-/issues/1269); [M9 #1271](https://github.com/infowaterk-max/water-K-/issues/1271) including **2026-10-14 business scope closure**.
- Business accepted ≠ code present ≠ merchant-operable ≠ exact-head verified. Track separately in [Core closure #1284](https://github.com/infowaterk-max/water-K-/issues/1284), the applicable module implementation issues and independent gates.
- Latest explicit, scoped PO decisions override older generic matrix entries; original written notes may remain for provenance but cannot remain current entitlement authority.

## Critical contradictory decisions to reconcile – phase 1

| Decision ID/source | New binding truth | Existing observed risk | Required later proof |
| --- | --- | --- | --- |
| M4.4/4.10 [#1259](https://github.com/infowaterk-max/water-K-/issues/1259) | Basic B2B company/partner RFQ in Alap and Pro; advanced governance Pro | Generic `RFQ/offer Pro` in plan narrative | Alap/Pro owner, API, data/auth and storefront end-to-end; advanced-only stays gated |
| M8.5 E7 [#1269](https://github.com/infowaterk-max/water-K-/issues/1269) | Full E7 Compare & Spec Alap=Pro | Old matrix lists E7 Pro-only/excluded in Alap | Authoring, API, publish, storefront and checkout reference in both plans |
| M8.9 [#1269](https://github.com/infowaterk-max/water-K-/issues/1269) | Full timed Drop/Release Alap+Pro; advanced financial/ROI report Pro | Old generic matrix lists Drop/Release Pro-only | Tenant plan, admin, scheduling, authoritative gates, cart/checkout and finance split |
| M7.10/A [#1267](https://github.com/infowaterk-max/water-K-/issues/1267) | Entire **supported built-in migration** Alap=Pro: basic/complex mapping, CSV/XLSX, supported API adapters, safe delta, reconciliation/diff, resumable apply | Roadmap only mentions generic `Migration Assistant` and imports, not full parity; older M7 matrix Pro paywall explicitly superseded | Both plans, tenant/RBAC, secrets, source coverage, idempotency, history/non-lossy boundary, negative cases |
| M7.10/B [#1267](https://github.com/infowaterk-max/water-K-/issues/1267) | Order of new connectors: WooCommerce → UNAS → Shoprenter → Shopify; preserve and integrate existing Shopware 6; later PrestaShop/OpenCart/Magento; CSV/XLSX fallback | No clear source adapter delivery order | Each source conformance/security/cutover proof; no unsupported connector shown as ready |
| M7.10/C [#1267](https://github.com/infowaterk-max/water-K-/issues/1267) | Existing 7-step Guided Launch offers new store vs migrate; migration opens nested 6-step assistant; shared readiness/publish gate | Two competing onboarding flows or auto-publish after import | Two route journeys, canonical checkpoints, historical-order side-effect prevention, merchant consent for final cutover |
| M9.1–9.6/B [#1271](https://github.com/infowaterk-max/water-K-/issues/1271) | Core 9 BUSINESS CLOSED; risk order security → correctness/quality → cost; measured pre-final TCO and safe central Core updates; no new human 9.7 engine | Old wording can present vendor baseline as final choice; previous 9.7 proposal might be falsely resurrected | Benchmark and invoice evidence, load/restore/monitoring, update preflight; costs and tech gates remain OPEN |

**Migration business boundary:** built-in, validated migration is not a Pro upgrade or separate fee. This is NOT a commitment to unlimited bespoke connectors, provider API bills, human services or universal source 1:1 support. Credentials/passwords/payment tokens do not migrate; historical orders must not fire live payment/shipping/refund/invoice/stock/marketing operations. Source stays available until merchant-approved cutover; no automatic publish, old-shop shutdown or legal/provider bypass. Unsupported/lossy fields are visible and fail closed.

## Preserved cross-module boundaries

1. Preserve the **Core-first** sequence and dependencies: Core capabilities → independent Core operational/adversarial audit → unified product experience → Builder → Template Production. Do not start new migration connector implementation merely because priority is documented.
2. Reuse one canonical migration engine/import authority, one Guided Launch/readiness and publish authority, one plan entitlement resolver; do not duplicate engines per source, plan or template.
3. Do not weaken Pro-only Digital Office/workforce, advanced B2B policy, E8 context profile, or legitimately Pro-only shopping engines when unblocking narrowly accepted Alap exceptions.
4. Do not infer implementation status from accepted business source, an issue comment, stale CI or source code presence; Shopify/UNAS/etc. require verified connectors before enabled UI.
5. No new paid providers, plan price, quota, addon charge, storage fee or mail tariff by this documentation synchronization. [M6 email tariffs #1264](https://github.com/infowaterk-max/water-K-/issues/1264), M1 storage expansion and provider TCO remain explicit open items.
6. No standalone M9.7 on-call authority; 9.4/9.5/A + existing Control Plane/Sentinel cover incident/alert requirements.

## Review method and proposed change set

1. **OBSERVE:** current exact main, issues, active PR, CI and known-failure source; protect ongoing U11/B/Core work. Confirm package and roadmap strings and explicit acceptance sources.
2. **DEFINE/MODEL/PLAN/CHALLENGE:** limit phase-1 planned files to `quality/knowledge/living-roadmap.v2.json`, `quality/knowledge/po-instructions.v1.json`, this review document and any required existing tests/active plan. Alternative A = extend existing registries; B = separate matrix/plan checker (**rejected**); C = issue-only reminder (**rejected**).
3. **Adversarial dissent:** roadmap text alone does not prove server-side plan parity; changing broad Alap text could accidentally grant true Pro features. Keep explicit narrow exceptions and require future exact-head plan/API/DB/E2E evidence. Another dissent: implementing all connectors before core dependency completion would break Core-first; reject.
4. **PROVE_PLAN before implementation:** comply with repository `AGENTS.md`: Development Guard generated and read, bounded `quality/development/active-plan.json` with assurance/PO scope and PO source, Plan Before Code PASS. If unavailable, leave proposal DRAFT, do not merge/call DONE.
5. **EXECUTE (after authorization):** update *existing* roadmap items and central PO rules, not an invented authority; align M4, M7, M8, M9. Preserve established dependency order and unchanged statuses.
6. **VERIFY/TRUTH/CLOSE:** machine-parse both JSONs, check old contradictions eliminated, source/claim/coverage tests and representative negative plan cases (M7 Alap parity, E7 Alap, Drop Alap, Pro E8 office retained, M9.7 blocked), canonical Edit-Time/Reference Sync, incremental replay, full exact-head CI, Completion Truth and Lifecycle; then recheck current main and merge only if approved gates pass.
7. **Exhaustive coverage after critical contradictions:** [#1284](https://github.com/infowaterk-max/water-K-/issues/1284) audits each M1–9 accepted sub-capability/source-versus-roadmap-versus-tenant-server-contract and opens bounded remaining gaps. No claim that phase-1 fixes all 108 historical coverage rows.

**No extra PO acceptance required for already accepted source truth.** Any newly invented pricing, feature, or scope is separate approval. This documentation patch is not itself permission for production changes.
