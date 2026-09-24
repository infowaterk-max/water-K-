# Atlas 2.0 Change Impact / Release Closure

Az Atlas 2.0 most már nem csak lekérdezhető System Self-Knowledge index, hanem a meglévő fejlesztési és release authority-k aktív bemenete.

## Egyetlen folyamat, nem új gate-réteg

A megoldás nem vezet be új, párhuzamos quality gate-et. Az Atlas 2.0 három már létező authority-t erősít:

1. **Plan Before Code** – a tervezett subsystem scope mellett domain- és authority-scope-ot is rögzít.
2. **Knowledge Before Build** – minden változásra determinisztikus Change Impact artifactot készít.
3. **Release Risk Budget** – csak exact-head Atlas Change Impact bizonyítékkal fogad el release-t.

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

A gate blokkol, ha a tényleges diff Atlas 2.0 projekciója eltér a tervezett domain/authority scope-tól. Ez azt jelenti, hogy egy váratlan architecture-határátlépés már implementáció/release előtt láthatóvá válik.

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

Az Atlas továbbra sem hoz üzleti döntést. A Constitution és Domain Foundations az authority; az Atlas ezek alapján számít impactot és closure-t. A Release Risk Budget továbbra is a production release kockázati authority-ja.
