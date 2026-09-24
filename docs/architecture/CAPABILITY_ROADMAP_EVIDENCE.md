# Capability Registry, Living Roadmap és Evidence Ledger

Ez a három registry együtt adja a Shoperation következő machine-readable foundation rétegét.

**Capability Registry**: megmondja, milyen stabil platformképességek léteznek, mely domain és authority birtokolja őket, milyen dependency-k és bizonyítékok tartoznak hozzájuk.

**Living Roadmap**: az elfogadott fejlesztési irány gépi authority-ja. Egy elem csak explicit evidence hivatkozással lehet `done`.

**Evidence Ledger**: bizonyítékokat tart nyilván, de nem válik runtime truth-tá. Minden verified evidence konkrét source SHA-hoz és állításokhoz kötött.

A három réteg célja:
`capability → roadmap intent → implementation → evidence → verified maturity`

A Constitution továbbra is magasabb authority. A Domain Foundations adja a truth ownershipot. A Capability Registry ezeket capability szintre vetíti. A Living Roadmap nem írhatja felül a runtime vagy domain truth-ot, az Evidence Ledger pedig csak bizonyít.

Ez lesz a következő drift/confidence réteg egyik bemenete: ha egy capability-ről azt állítjuk, hogy kész/operational, a rendszer össze tudja vetni a deklarációt az evidence állapotával.
