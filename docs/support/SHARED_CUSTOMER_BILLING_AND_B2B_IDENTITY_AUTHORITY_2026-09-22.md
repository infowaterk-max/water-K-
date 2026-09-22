# Shared Customer Billing & B2B Identity Authority — 2026-09-22

Status: **implemented / code_and_test_verified / fresh_install_proven / pending final human acceptance**

## Scope

Global Shoperation platform capability. It is **not template-owned**. All current and future templates inherit the same customer billing, B2B identity, reseller approval and re-verification rules. Templates may style the surfaces but may not fork, override or bypass the business authority.

## Canonical invariants

1. **ONE COMMERCE RULE → ONE SHARED IMPLEMENTATION → ALL TEMPLATES INHERIT IT.**
2. Saved billing defaults are tenant-scoped by `instance_id + user_id`; they are not global cross-merchant profile data.
3. Shipping addresses are not implicitly persisted as billing defaults.
4. Checkout may prefill saved billing defaults for an authenticated customer, but a customer must explicitly opt in before changed billing data is saved.
5. A billing profile is persisted only after the order has passed local checkout finalization; invalid or abandoned checkout must not update it.
6. B2B company name and tax number are verified legal identity after merchant approval. They are not ordinary editable profile fields.
7. **B2B IDENTITY IS VERIFIED STATE — LEGAL COMPANY NAME AND TAX NUMBER MUST NEVER BE DIRECTLY MUTABLE AFTER APPROVAL.**
8. Any B2B legal identity change creates a pending re-verification request, records before/proposed state, and requires merchant approval.
9. An approved B2B account requesting an identity change loses active B2B authority while re-verification is pending; approval or rejection restores a coherent account state.
10. Registration intent never grants B2B authority. Company name and Hungarian tax number are captured and validated up front for company/reseller signup, while merchant approval remains mandatory.
11. Reseller registration intent, account request/status, membership, identity-change request/review/cancel and resulting before/after state are auditable.
12. Account capability navigation has one runtime authority: the platform IA left rail. Template-local account capability navigation is stripped from runtime composition.
13. Cart and checkout Preview acceptance must resolve the current tenant draft by explicit instance ID. Store-context/admin-context helpers must not be used as hidden storefront prerequisites.
14. Add-to-cart acknowledgement is shared behavior and template-aware presentation, with an accessible live status plus Kosár megnyitása / Tovább vásárolok actions.

## Root causes found in human acceptance

- Account capability navigation was represented both by Page Schema composition and the platform account rail, causing duplicate horizontal account navigation around the canonical left rail.
- `/kosar` rendered the generic CartView without resolving the tenant cart Page Schema at all.
- Checkout Preview attempted to read the draft through a current-store admin context and swallowed failure, then fell back to a missing published revision.
- Product add-to-cart updated cart state without any customer-visible acknowledgement.
- `profiles` had no tenant-scoped billing address model, so repeat checkout could not safely prefill billing data.
- B2B company/tax fields existed as ordinary profile inputs even though the organization model already had a stronger approval authority.

## Resolution

- Strip template-local `account.capability-navigation` and keep the canonical `AccountSubnav` platform rail.
- Add shared cart runtime source + `StorefrontCartShell`; use the same explicit preview-draft authority for cart and checkout.
- Add shared `AddToCartConfirmation` to runtime and legacy purchase controls.
- Add `customer_billing_profiles` keyed by tenant + user, shared server API/form, checkout prefill and explicit save checkbox.
- Add B2B identity change request table, direct-mutation DB guard, owner request/cancel RPCs, merchant review RPC and full audit events.
- Lock B2B company/tax fields in the ordinary profile and expose legal identity changes only through the B2B organization workflow.
- Extend Template Factory Quality Gate shared-runtime triggers to cart, checkout and account surfaces.

## Safety / prevention

Never fix these defects with template-local CSS, a second checkout state store, a second billing authority, direct B2B table updates, or per-template business logic. Any future change touching cart/account/checkout shared surfaces must run the full cross-template Quality Gate.

## Fresh Install evidence

- GitHub Actions run: `35684339297`
- Fresh Install job: `106610375774`
- Proven source commit: `68188e5283e07c55aaf074f8956da3fa07204576`
- Empty-target preflight: **PASS** — all public/private object counts, migration rows and auth users were `0`.
- Ordered customer baseline + Auth bootstrap + neutral seed: **PASS**, applied atomically.
- Postflight: **PASS** — `175` public tables, `342` public functions, `126` public policies, `0` customer seed rows.
- Proof contract SHA256: `388a7fef90f728258d1ab1b1b4b66cd305aa4439792d0f090fefed85fac3542d`.
- Environment rotation closed cleanly: dedicated Fresh Install target paused again; `waterk-staging` restored to `ACTIVE_HEALTHY`; production untouched.
