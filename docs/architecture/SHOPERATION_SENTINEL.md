# Shoperation Sentinel

Shoperation Sentinel is the observation and improvement-intelligence layer above the existing Shoperation Control Plane.

It answers a different question from Atlas 2.0:

- Atlas: what exists, who owns it, and what depends on what?
- Control Plane: may this change or release proceed?
- Sentinel: what has been failing repeatedly, what trend is emerging, and which existing control may need strengthening?

## Authority boundary

Sentinel is **not** an authority and is **not** a blocking CI gate.

It may observe and correlate evidence produced by existing authorities, but it must not redefine their truth, relax their rules, or create a parallel release/quality system.

Its allowed lifecycle is:

`observe → correlate → diagnose → recommend`

Code-changing repair remains proposal-first and human-governed.

## Daily scan

The scheduled Sentinel Deep Scan runs once per day after the Daily Deep Atlas Scan.

It observes:

- workflow outcomes over 24 hours, 7 days and 30 days;
- unresolved Failure Intake fingerprints;
- open Daily Deep Atlas architecture-drift attention;
- repeated failures of the same workflow;
- short failure bursts and week-over-week direction.

### Failure Intake scope reconciliation

Sentinel reconciles open Failure Intake evidence against the workflow run that produced its source commit:

- **canonical** — main/scheduled evidence; this may contribute a Sentinel REVIEW;
- **development** — pull-request or non-main feature-branch push evidence; it remains durable Failure Intake evidence but does not masquerade as platform-health debt;
- **unknown** — the source commit cannot be bound to either scope from the available observation window; this remains visible as REVIEW rather than being silently discarded.

Feature-branch push failures and pull-request failures therefore share one development evidence class. Sentinel does not delete or mutate their intake issues; it only prevents development iteration from being counted as canonical system instability.

The scan emits:

- `HEALTHY` — no evidence-backed intervention is indicated;
- `REVIEW` — a pattern deserves review;
- `ACTION_REQUIRED` — repeated or authoritative evidence requires human-governed action.

A healthy scan stays silent. REVIEW and ACTION_REQUIRED are persisted through one deduplicated Sentinel attention issue so a later Shoperation System Health surface can display the state without making GitHub the operator UI.

## Safety

Sentinel must never:

- modify application code;
- merge or deploy;
- weaken a gate;
- change roadmap order by itself;
- create a second Failure Intake, Atlas or Incident authority;
- treat one isolated failure as proof of a systemic problem.

Its recommendations are evidence-backed proposals only.


## Periodic Failure Intake maintenance

Sentinel remains observation-only. Durable Failure Intake cleanup belongs to the existing weekly Knowledge Full Replay, not to Sentinel and not to a new blocking gate.

The full replay collects each open intake issue together with its originating workflow evidence and runs the deterministic `shoporation.failure-intake-reconciliation.v1` contract. An issue may be closed only with an explicit machine-readable disposition when one of these conditions is proven:

- the fingerprint is a duplicate and one authoritative open issue is retained;
- the current failure-signature authority now maps the code to a Known Failure;
- the same workflow/branch has a later successful run, proving recovery of the originating development or canonical workflow evidence.

Unknown-scope and still-active evidence remains open. Reconciliation never deletes issue history, never weakens Known Failure or Failure Intake authority, and every closure records the disposition and exact reconciliation commit.
