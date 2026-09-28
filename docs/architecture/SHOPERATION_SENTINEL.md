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
