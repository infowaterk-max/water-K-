# Capability Registry, Living Roadmap és Evidence Ledger

Ez a három registry együtt adja a Shoperation következő machine-readable foundation rétegét.

**Capability Registry**: megmondja, milyen stabil platformképességek léteznek, mely domain és authority birtokolja őket, milyen dependency-k és bizonyítékok tartoznak hozzájuk.

**Living Roadmap**: az elfogadott fejlesztési irány gépi authority-ja. Egy elem csak explicit evidence hivatkozással lehet `done`.

**Evidence Ledger**: bizonyítékokat tart nyilván, de nem válik runtime truth-tá. Minden verified evidence konkrét source SHA-hoz és állításokhoz kötött.

A három réteg célja:
`capability → roadmap intent → implementation → evidence → verified maturity`

A Constitution továbbra is magasabb authority. A Domain Foundations adja a truth ownershipot. A Capability Registry ezeket capability szintre vetíti. A Living Roadmap nem írhatja felül a runtime vagy domain truth-ot, az Evidence Ledger pedig csak bizonyít.

Ez lesz a következő drift/confidence réteg egyik bemenete: ha egy capability-ről azt állítjuk, hogy kész/operational, a rendszer össze tudja vetni a deklarációt az evidence állapotával.


## Living Roadmap v2 maturity semantics

The canonical roadmap is `quality/knowledge/living-roadmap.v2.json`.

The v2 backbone is maturity-based rather than feature-list ordering:

1. Shoperation Core Capability Complete
2. Core Operational / Adversarial Proof
3. Unified Shoperation Product Experience / Design & Operating System
4. 42-template Builder Capability Census
5. Builder Production Complete
6. Builder Adversarial Acceptance
7. Template Production System / Factory Revalidation & Improvement
8. 42 Distinct Launch-quality Template Production
9. Full Market Ready 1.0 Closure & Certification

A higher layer cannot prove a lower layer. Existing historical `done`, `operational`, `hardening` or implementation evidence remains historical truth, but it does not automatically satisfy a later maturity gate. Final Market Ready certification revalidates lower-layer proof; it does not create missing Core, Builder or Template capability for the first time.
