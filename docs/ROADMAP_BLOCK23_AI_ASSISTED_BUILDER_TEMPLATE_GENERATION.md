# Roadmap Block 23 – AI-Assisted Builder / Template Generation

Status: implementation in progress

## Canonical reconstruction

Block 23 is the previously accepted **AI-assisted Builder / template generation** stage, also described historically as the **AI webshop generator**. It follows Block 21 Page Schema / Templates and Block 22 Visual Builder, and precedes the separate Block 24 Commercial / Security / Maturity Gate.

The historical direction is intentionally narrower than “general AI”:

- the merchant supplies store/onboarding intent such as shop/business category, store description, style, target audience, language and available brand inputs (name/logo/colors);
- AI produces a first complete storefront composition rather than only a landing page;
- generated output is **configuration and structure, not Next.js/source code**;
- the shared Shoporation Page Schema powers predefined templates, the manual Visual Builder and AI generation alike;
- AI may compose only approved source-controlled templates/components and schema-supported configuration;
- generated output remains fully editable in the existing Visual Builder and is never an AI-only or locked document.

## Existing authority remains canonical

Block 23 must not create a second storefront, template, page, persistence, entitlement or publication authority.

- Page Schema/runtime stays canonical.
- The Block 21 source-controlled template catalog and component registry remain the allowlists.
- Block 22 server-side schema/manifest validation remains mandatory for generated documents.
- Tenant scope is derived server-side from the current store context; caller-supplied tenant identity is never authority.
- Capability checks continue through the existing Block 11 plan/feature authority and the selected template/component requirements.
- Generated output is materialized as ordinary immutable **draft** revisions through the existing storefront persistence/template-draft authority.
- Preview, publish and rollback remain explicit existing lifecycle operations. AI generation never publishes automatically.

## Canonical launch scope

1. Merchant-facing AI store generation input for business/category, description, style, target audience, language and brand context.
2. Generation of a multi-page first storefront composition using only concrete catalog templates and registered components.
3. Template/preset selection and schema-supported composition/customization from the existing allowlist; no fabricated template registration.
4. Safe generated merchant-facing copy/configuration for editable component fields only.
5. Server-side validation of every AI result against current template/component/Page Schema contracts before persistence.
6. Draft-only application through the existing optimistic-concurrency/idempotent template/page persistence authority.
7. Generated pages open directly in the existing Visual Builder and remain manually editable with the same Desktop/Tablet/Mobile, inspector, preview, publish and rollback workflow.
8. Model/Gateway failure is fail-closed: no malformed, partial or unvalidated draft is persisted.
9. AI requests are authenticated, tenant-scoped and rate-limited; model output never receives SQL/RPC/tool execution authority.
10. No business-state mutation of catalog, price, stock, order, customer, promotion, workflow or other commerce authorities.

## Explicitly already completed elsewhere

Block 23 does not redo:

- Block 18 AI-Assisted Decisioning & Merchandising Intelligence;
- Block 19 Predictive Optimization & Autonomous Commerce Guardrails;
- Block 21 Page Schema / Templates;
- Block 22 Visual Builder interactions, draft/preview/publish/rollback lifecycle or responsive editor.

Existing Product Copilot/decisioning AI surfaces are separate domain assistants and are not the storefront-generation authority.

## Explicit non-scope / later work

Block 23 does not decide Block 24 commercial packaging, paid AI quotas/credits, final monetization, broad maturity certification or launch-commercial policy.

It also does not add arbitrary source-code generation, raw HTML/JavaScript injection, autonomous publishing, direct commerce mutation, a second template registry, or a second page persistence model.

## Database / Fresh Install impact

The canonical implementation should require **no new database schema** because generated output is persisted through the existing Block 21/22 storefront draft authority and existing security rate-limit/audit infrastructure. If implementation uncovers a genuine schema requirement, work must stop and the customer-baseline/Fresh Install obligation must be re-evaluated before merge.

Absent such a requirement, ordered customer baseline `0001–0017`, `status=ready` and `freshInstallProofRequired=false` remain unchanged.

## Acceptance contract

Before merge, a dedicated non-Water-K staging tenant must prove:

- valid AI generation input and bounded model output;
- allowlisted template/component/Page Schema enforcement;
- complete draft-only multi-page generation;
- generated output is editable in the existing Visual Builder;
- no implicit publish;
- tenant isolation and caller-tenant spoof rejection;
- authorization and current capability/entitlement boundaries;
- idempotent/replay-safe persistence and stale-revision failure where relevant;
- AI/Gateway/malformed-response fail-closed behavior;
- no direct business-state mutation;
- full regression CI and READY preview;
- no new Block 23-caused Supabase security-advisor finding;
- unchanged Water-K business/storefront invariants.
