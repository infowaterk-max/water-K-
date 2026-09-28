# Atlas 2.0 Change Impact / Release Closure

Az Atlas 2.0 most már nem csak lekérdezhető System Self-Knowledge index, hanem a meglévő fejlesztési és release authority-k aktív bemenete.

## Egyetlen folyamat, nem új gate-réteg

A megoldás nem vezet be új, párhuzamos quality gate-et. Az Atlas 2.0 a központi **Shoperation Control Plane** contextjét és három meglévő specialistát erősít:

1. **Plan Before Code specialist** – a tervezett subsystem scope mellett domain- és authority-scope-ot is rögzít.
2. **Knowledge Before Build specialist** – minden változásra determinisztikus Change Impact artifactot készít.
3. **Release Risk Budget specialist** – csak exact-head Atlas Change Impact bizonyítékkal adhat PASS evidence-et.

A specialisták nem sibling döntéshozók. A futási/dependency sorrend canonical forrása a `quality/knowledge/guard-registry.v1.json`; a végső PASS/BLOCK kizárólag a Control Plane-é. Az external specialistákat is a Control Plane indítja registry-parancsból, topologikusan, majd ugyanabba a final reconciliationbe húzza vissza az eredményt.

## Change Impact contract

A `shoporation.change-impact.v1` artifact tartalmazza:

- a változott fájlokat;
- közvetlen domain-eket;
- közvetlen authority-kat;
- domain dependency closure-t;
- canonical truth key-ket;
- boundary rule-okat;
- evidence obligationöket;
- Known Failure-eket;
- regression authority-kat;
- reverse consumereket és felfedezett teszteket.

A fájl helye:

`artifacts/shoperation-quality/change-impact.json`

## Plan Before Code

A Development Plan két új explicit mezőt használ:

- `expectedDomains`
- `expectedAuthorities`

A Plan Before Code specialist BLOCK evidence-et ad, ha a tényleges diff Atlas 2.0 projekciója eltér a tervezett domain/authority scope-tól; a Control Plane ezt a közös dependency graph részeként értékeli. Ez azt jelenti, hogy egy váratlan architecture-határátlépés már implementáció/release előtt láthatóvá válik.

## Release Closure

A Release Risk Budget pontszámai és küszöbei nem változnak.

Viszont a release csak akkor érvényes, ha:

- Change Impact evidence létezik;
- contractja érvényes;
- döntése PASS;
- source SHA-ja egyezik az exact release HEAD-del;
- a benne bizonyított fájlkészlet egyezik a release diff-fel.

A Risk Budget riport a pontszám mellett eltárolja az Atlas closure domain-, authority-, truth-, evidence- és regression-projekcióját is.

## Határ

Az Atlas továbbra sem hoz üzleti döntést. A Constitution és Domain Foundations az authority; az Atlas ezek alapján számít impactot és closure-t. A Release Risk Budget a production release kockázati specialistája és policy-authorityja, de nem birtokolhatja a teljes rendszer végső döntését: azt a Control Plane reconciliálja a többi evidence-szel.

## A/B Change Plan — közvetlen módosítás + következménykötelezettség

Az Atlas Change Impact a tervezési fázisban két külön halmazt képez:

- **A — direct change set:** azok a fájlok/patternök, amelyeket a feladat közvetlenül módosít.
- **B — dependent change obligations:** azok a fogyasztók, regressziós tesztek, repository-leírások/dokumentumok, generált evidence-ek és lifecycle-védett artefaktok, amelyek az A változás miatt elavulhatnak vagy új bizonyítást igényelnek.

A B lista nem jelenti azt, hogy minden fájlt automatikusan át kell írni. Az obligation saját lifecycle-t kap: `review/update-if-stale`, `revalidate`, `regenerate-derived-evidence` vagy `deferred/approval-protected`.

Kiemelt példa a Template Factory golden baseline. Template/runtime vizuális változáskor az Atlas már a tervezéskor jelzi:

1. exact-head browser proofot újra kell generálni;
2. a golden eltérés önmagában nem runtime/type/build regresszió;
3. a `tests/visual-baselines/**` baseline módosítása **tilos**, amíg nincs explicit Product Owner vizuális elfogadás;
4. elfogadás után a golden promotion külön lifecycle-lépés.

Így a golden diff nem „utólag előkerülő meglepetés”, hanem előre ismert B-kötelezettség.


## Implementation Sync és B Closure

Az A/B terv végrehajtási szerződés is. A planning-only Control Plane futásban a pre-gate B még lehet `UNRESOLVED`; implementáció után viszont Plan Before Code nem enged Incremental Replayhez vagy külső quality specialistához, amíg minden pre-gate B nincs lezárva.

- `UPDATED`: a függő artefakt módosult, és az `evidenceFiles` a jelenlegi diff része.
- `REVALIDATED_NO_CHANGE`: felülvizsgáltuk, nem igényel módosítást, konkrét note-tal.
- `PENDING_SPECIALIST`: generált evidence; a registryben megnevezett specialist után `REGENERATED` vagy `BLOCKED` lesz.
- `AWAITING_PRODUCT_OWNER_ACCEPTANCE`: emberi authority-védett lifecycle, például golden promotion.
- `DEFERRED_WITH_APPROVAL`: csak explicit Product Owner approval evidence mellett zárt.

A végső Control Plane report `changeObligationClosure` mezője külön mutatja a `preGateReady` és `finalReady` állapotot.
