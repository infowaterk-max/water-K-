# Roadmap Block 4 — Information Architecture + Navigation + Reporting audit

## Scope

Block 4 simplifies the merchant admin into stable business workspaces without changing the underlying tenant, permission, B2C/B2B or Alap/Pro authority model.

Accepted merchant workspaces:

1. Vezetői áttekintés
2. Értékesítés
3. Termékek
4. Ügyfelek
5. Készlet & Logisztika
6. Marketing
7. Digitális Iroda
8. Tartalom & Megjelenés
9. Beállítások

The Shoperation platform operator navigation remains a separate context.

## Navigation contract

- Main merchant workspaces are collapsed by default.
- Desktop fine-pointer hover opens a delayed side preview.
- Click toggles one persistent inline accordion workspace.
- Touch uses the same click/tap accordion path; no hover dependency exists.
- Keyboard users can use native button activation plus Right/Left/Escape controls.
- Nested routes receive a shared breadcrumb and deterministic return link to their owning list/workspace route.
- Navigation is filtered before rendering by plan capability, store permission and audience. Pilot acceptance is visible only for pilot instances.

## Reporting contract

Reporting surfaces must distinguish:

- **Tényadat** — directly presented current-store source data.
- **Számított mutató** — derived result based on a formula, time window or attribution rule.
- **Ajánlás** — a rule/model-based suggested action; it is not a fact and not an automatic business decision.

The main analytics, inventory analytics, cash-flow, growth and executive analytics surfaces use this explicit evidence contract. Existing fail-closed load-error behavior remains authoritative.

## Builder compatibility

Block 4 does not implement Page Schema/Templates or Visual Builder. The new IA is manifest-driven and capability-aware so later builder/page-schema work can consume stable workspace and capability contracts without Water-K-specific hardcoding.

## Acceptance evidence

### TECHNICAL/BACKEND PASS

Requires green repository tests, TypeScript and production build on the Block 4 branch/PR. No database migration is part of this batch.

### MANUAL PASS

Requires real responsive acceptance of:

- collapsed merchant workspaces;
- delayed desktop hover preview;
- click/tap accordion behavior;
- keyboard open/close controls;
- merchant vs platform navigation isolation;
- breadcrumb and nested-route back link;
- Alap vs Pro menu visibility;
- role-limited menu visibility;
- pilot-only acceptance visibility;
- reporting evidence labels on representative reporting pages;
- empty/error/no-access states without false zero-value reporting.

Until those checks are completed, manual acceptance must not be marked PASS.
