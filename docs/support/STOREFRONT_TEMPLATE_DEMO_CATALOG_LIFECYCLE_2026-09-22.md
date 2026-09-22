# Storefront Template Demo Catalog Lifecycle — 2026-09-22

Status: implemented foundation
Scope: shared Template Production System / launch safety
Applies to: every template that explicitly ships an installable demo product pack

## Product intent

A merchant may choose a template with or without a temporary demo catalog.

The choice is explicit and defaults to **off**.

When a prepared template offers demo products, the template-selection confirmation states in writing that:

- the demo products exist only for design, preview and pilot use;
- they remain separate from merchant-owned catalog data;
- every still-demo fixture is automatically removed when the webshop is opened;
- merchant-owned products are not affected.

The launch center repeats this information and shows the number of demo fixtures that will be removed.

## Authority model

Template installation itself remains presentation-first. Product mutation is allowed only through the separate explicit demo-product opt-in path.

Installable demo products must carry:

- `template_demo_namespace`
- `template_demo_key`
- `template_demo_state` = `fixture | adopted | retired`
- optional template-owned demo image URL
- installation timestamp

The system must never infer demo ownership from product name, slug, category, creation date or visual similarity.

### State meaning

- `fixture`: system-owned temporary demo item; eligible for automatic cleanup.
- `adopted`: explicitly retained as merchant content; automatic cleanup must never delete it.
- `retired`: lifecycle record is no longer active as a fixture.

Merely editing a fixture does not adopt it. A later “keep as real product” UX must perform an explicit state transition.

## Launch boundary

Demo fixtures **do not satisfy catalog launch readiness**.

A webshop can only open when at least one active non-fixture product with an active variant exists.

`admin_activate_webshop_v2` owns activation and cleanup in one database transaction:

1. verify store-manage authority and pilot state;
2. verify at least one real launchable product;
3. collect demo fixture evidence;
4. delete only `template_demo_state='fixture'` products;
5. append `storefront.demo_catalog_removed_on_activation` audit evidence;
6. activate pilot → active;
7. append `store.activated` evidence with removed fixture count.

Any failure rolls the whole transaction back.

## Media boundary

A template demo product may use a local template asset through `template_demo_image_url`.

Normal product media remains authoritative:

- uploaded `primary_media_id` wins when present;
- the template demo image is only a fallback;
- no fake upload/storage row is manufactured.

## Playroom v20 prepared pack

Playroom v20 ships a prepared 12-product fictional demo pack with local cover art, price, stock and short descriptions.

The preview catalog can show the same visual merchandising without product mutation. The real demo pack is created only after the merchant explicitly checks **“Bemutató termékekkel kérem”**.

## Regression invariants

**NO IMPLICIT PRODUCT MUTATION FROM TEMPLATE SELECTION.**

**NO DEMO INFERENCE FROM HUMAN-EDITABLE FIELDS.**

**ONLY `fixture` MAY BE AUTO-DELETED.**

**DEMO FIXTURES MUST NOT MAKE AN OTHERWISE EMPTY STORE LAUNCH-READY.**

**LAUNCH CLEANUP + STORE ACTIVATION + AUDIT EVIDENCE MUST REMAIN ONE DATABASE TRANSACTION.**
