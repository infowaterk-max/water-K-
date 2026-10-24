# Storefront 42 — Portfolio Recovery Gate

Status: planning / recovery gate

Base: current `main` at `9e474d6092937a1acd4a3ebc15f6af6ce586b6c2`

## Why this gate exists

The accepted Storefront launch target is **42 concrete template packages**. The current source-controlled catalog contains **24** concrete packages, therefore **18 concrete packages are still missing**.

Repeated re-acceptance / Builder-hardening waves do not increase portfolio completeness when they only add evidence, acceptance metadata or tests around an already-existing canonical template. Those waves can still be valuable for proven runtime drift, but they must not be counted as progress toward the 42-template launch target.

From this gate forward:

1. portfolio progress is measured only by concrete source-controlled template packages registered in `STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES`;
2. a new scale-out wave must add a genuinely missing canonical package and decrease `remaining` by exactly one, unless the wave is explicitly classified as a regression/hardening repair;
3. regression/hardening repair work requires a proven current-contract defect and must not be used as a substitute for missing-template implementation;
4. no successor may be inferred merely by replaying an older wave-number chain;
5. before any missing template is implemented, its accepted name, category, exact `templateKey`, visual/commerce contract and family position must be reconstructed from accepted project evidence;
6. missing template keys must not be invented just to reach 42;
7. no `main` merge or production deployment is authorized by this planning gate.

## Current repository truth — 24 implemented packages

The current catalog contains these 24 concrete package identities:

1. `outdoor.alpine-lodge`
2. `beauty.beauty-lab`
3. `tech.creator-station`
4. `beauty.derma-studio`
5. `fashion.editorial-atelier`
6. `home.gallery-edit`
7. `jewelry.heritage-atelier`
8. `gaming.loot-vault`
9. `food.market-pantry`
10. `jewelry.modern-luxe`
11. `fashion.monarche`
12. `pet.my-pack`
13. `sport.performance-lab`
14. `gaming.playroom`
15. `gaming.rig-forge`
16. `beauty.ritual-house`
17. `tech.spec-lab`
18. `sport.sport-hub`
19. `jewelry.statement-lab`
20. `fashion.street-drop`
21. `food.table-gift`
22. `tech.tech-deck`
23. `industrial.tool-depot`
24. `sport.trail-expedition`

Launch target: **42**  
Implemented: **24**  
Remaining: **18**

## Recovered accepted missing-template backlog

The following accepted planning names are not present as concrete packages in the current catalog. Their exact canonical `templateKey` must be recovered/locked before implementation; this document deliberately does not fabricate keys.

### Otthon & Lakberendezés
- **Warm Minimal**

### Élelmiszer & Ital
- **Bistro Menu**

### Autó & Mobilitás
- **Garage ID**
- **Velocity Works**
- **Detail Lab**

### Baba, Gyerek & Játék
- **Tiny Nest**
- **Play & Learn**
- **Little Adventure**

### Kisállat
- **Pet Pantry**
- **Paw District**

### Kert & Mezőgazdaság
- **Garden Seasons**
- **Garden Life**
- **Grow Lab**

### Szerszám, Ipar & Szakkereskedelem
- **Jobsite Flow**
- **Spec Industrial**

### Ajándék, Kreatív & Lifestyle
- **Gift Compass**
- **Maker House**
- **Creative Desk**

Total recovered missing planning names: **18**.

## Wave 75 / Wave 76 boundary

Wave 75 (`tech.spec-lab`) may remain as historical re-acceptance evidence; it does not add a new package to the 42-template portfolio.

**Wave 76 must not begin as another replay/re-acceptance successor.** The next Storefront scale-out implementation must be selected from the missing 18 only after its exact canonical key and accepted contract are recovered.

## Mandatory new-wave acceptance delta

For each new missing-template implementation:

- `STOREFRONT_TEMPLATE_CATALOG.length` increases by exactly 1;
- `STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.implemented` increases by exactly 1;
- `STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.remaining` decreases by exactly 1;
- the new package is source-controlled and registered explicitly;
- all required Page Schema presets, responsive contracts, shared authority boundaries and draft-only installation rules pass;
- no fabricated catalog placeholder is allowed;
- no unrelated existing template is reworked unless current-head evidence proves a defect.

Target progression from this recovery baseline:

`24/42 → 25/42 → 26/42 → … → 42/42`

That progression, not the wave number, is the canonical measure of template-scale-out completion.
