# Shoperation Support Knowledge

Status: **living, versioned knowledge base**

This directory is the long-term knowledge source for Shoperation Support, Support Intelligence, diagnostic playbooks and future AI-assisted support.

It is intentionally **not immutable**. Entries may be extended, corrected, superseded, deprecated or split as the product evolves. Git history preserves provenance.

## 1. Purpose

Capture support-relevant knowledge from development, acceptance, production operations and real merchant incidents in a reusable structure:

**symptom → context → diagnosis → root cause → resolution → verification → safety boundary**

The goal is that a future support agent — human or AI — should not re-audit an entire subsystem when a verified previous resolution is relevant.

This is not a dump of chat transcripts. Raw discussion is condensed into reusable operational knowledge.

## 2. Required knowledge categories

Every Shoperation development/release stream should identify support-relevant material in these categories when applicable:

- Known Issue
- Root Cause
- Resolution
- Diagnostic Method
- Failed Attempt / Negative Evidence
- Acceptance Finding
- Safety Rule
- Architecture Decision
- Integration / Provider Constraint
- Recurring Pattern
- Auto-fix Candidate
- Verification / Evidence

## 3. Entry status

Each material record should be distinguishable as one of:

- `implemented` — verified in the current product/code path.
- `historical_verified` — verified in an earlier release/acceptance/production incident; must be version-checked before reuse.
- `design_decision` — approved architecture/product rule, not necessarily implemented yet.
- `pending_validation` — useful hypothesis or incomplete acceptance finding; never execute automatically.
- `superseded` — replaced by a newer rule or resolution.
- `deprecated` — intentionally retired and should not be recommended.

## 4. Evidence levels

Prefer the strongest available evidence:

1. `production_verified`
2. `acceptance_verified`
3. `code_and_test_verified`
4. `documented_contract`
5. `design_decision`
6. `hypothesis`

Never upgrade evidence merely because a prior incident looked similar.

## 5. Automation classes

Support knowledge must explicitly state whether a resolution is eligible for automation.

### `AUTO_FIX`

Only deterministic, reversible or low-risk actions with a known success condition. The Action Engine — not the language model — performs the mutation.

### `CONFIRM_FIX`

The diagnosis may be deterministic, but the change affects merchant behavior or requires merchant intent. Show the proposed before/after change and require confirmation.

### `HUMAN_REQUIRED`

Use for sensitive, ambiguous or high-impact operations, including credentials/secrets, payment lifecycle changes, refunds/financial movement, authorization changes, destructive data operations, cross-tenant concerns or anything without a deterministic verification path.

### `DIAGNOSE_ONLY`

The system may inspect and explain but must not change state.

## 6. AI retrieval policy

Future Support AI should retrieve in this order:

1. current ticket and current tenant context;
2. previous verified resolutions for the same webshop;
3. current component/provider/version-compatible Shoperation knowledge;
4. anonymized cross-tenant verified patterns;
5. broader documentation/playbooks.

A historical match is a **diagnostic shortcut, not permission to replay a fix blindly**.

Before reusing an old resolution, verify at minimum:

- current tenant and webshop scope;
- current subsystem/provider;
- relevant component/config version;
- current observed state;
- required authorization/support grant;
- whether the old fix is still active and non-deprecated.

## 7. Safety and tenant isolation

Support memory must never become a cross-tenant data leak.

- Tenant-specific business data stays tenant-scoped.
- Cross-tenant learning must use anonymized/generalized resolution patterns.
- Never store API secrets, passwords, card data or private credentials in Support Knowledge.
- The support agent must never ask for or reuse the merchant's own admin password.
- Privileged support actions require explicit scoped Support Access and must be auditable.
- AI must not receive arbitrary SQL/admin execution authority.
- All state changes must pass through typed, authorized Shoperation Action Engine operations.

## 8. Audit correlation

A future support action should be correlatable across:

- `ticket_id`
- `support_session_id`
- `support_grant_id`
- tenant / webshop instance
- actor (`customer`, `support_agent`, `support_ai`, `system`)
- diagnostic/playbook id
- action id
- before state
- after state
- verification result
- timestamps

The ticket timeline and the system audit are separate views of the same operational event chain.

## 9. Resolution Record template

Use this structure when promoting a real incident into reusable knowledge:

```yaml
id: SKB-XXX
status: implemented | historical_verified | design_decision | pending_validation | superseded | deprecated
evidence: production_verified | acceptance_verified | code_and_test_verified | documented_contract | design_decision | hypothesis
scope: global | tenant-specific
area: checkout/payment/shipping/email/etc
provider: optional
versions: optional
symptom: "What the merchant/customer observed"
context: "Relevant state"
diagnostic:
  - "Targeted check 1"
root_cause: "Verified cause, or unknown"
resolution:
  - "Successful change"
verification:
  - "How success was proven"
failed_attempts:
  - "Known ineffective path, if any"
automation: AUTO_FIX | CONFIRM_FIX | HUMAN_REQUIRED | DIAGNOSE_ONLY
risk: low | medium | high | critical
notes: "Constraints, supersession or follow-up"
```

## 10. Continuous-update rule

From this baseline forward, every substantial Shoperation development/acceptance/release task should ask:

> Did this work reveal anything that would help Support diagnose, explain, resolve, prevent or safely automate a future merchant problem?

If yes, update Support Knowledge in the same development cycle or create a follow-up knowledge entry.

Record successful fixes **and failed diagnostic paths** when the negative evidence is reusable.

## 11. Initial baseline

The first consolidated knowledge set is maintained in:

- `SUPPORT_KNOWLEDGE_BASELINE_V1.md`

Future playbooks and machine-readable records may be split into additional files or database/vector indexes without invalidating this governance contract.

## 12. Incident and anti-pattern records

Detailed incident files supplement the compact baseline. They preserve failed hypotheses and do-not-repeat rules that would create too much noise in the baseline itself.

- `DIGITAL_OFFICE_RESPONSIVE_INCIDENT_2026-09-10.md` — Digital Office / Team Chat responsive history, rejected approaches, later proven nested-height and duplicate-CSS-owner root causes.
- `RECENT_ENGINEERING_INCIDENTS_2026-09-10_11.md` — recent cross-cutting failures and repairs covering Product Intake navigation/skin, platform responsive preview, Digital Office layout/performance, Fresh Install, Storefront contract drift, Vercel preview evidence, concurrent-main reconciliation, canonical Product Intake authority and Support-in-Digital-Office integration.

When a detailed incident record contains newer, stronger evidence than an older baseline/hypothesis, the newer evidence governs. The old record must remain available as failed-attempt/history evidence rather than being silently erased.

## 13. Engineering anti-pattern policy

Support Knowledge is also a prevention system. A verified failed approach may be more valuable than a successful patch if it prevents the same mistake from recurring.

Before a fix is implemented, search incident knowledge for:

- the same symptom on the same route/module;
- a previous rejected root-cause hypothesis;
- duplicate authority/owner problems;
- a previously accepted route/IA decision;
- a shared-contract boundary that must not be widened;
- a prior Fresh Install/release/deployment evidence rule.

If a proposed fix matches an explicit **do-not-repeat** rule, new evidence is required before reusing that approach.
