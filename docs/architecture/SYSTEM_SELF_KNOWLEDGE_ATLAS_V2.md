# Shoperation Atlas 2.0 / System Self-Knowledge

Az Atlas 2.0 a Shoperation első gépileg lekérdezhető **System Self-Knowledge** rétege.

Az Atlas 1.x főleg a repository fizikai szerkezetét ismerte:

`file → import → route → surface → subsystem → Known Failure`

Az Atlas 2.0 ezt összeköti a Constitution és a Domain Foundations authority-rétegeivel:

`file → surface → domain → authority → truth ownership → domain closure → boundary rule → evidence obligation → Known Failure → regression authority`

## Mire használható?

### Change Impact

Egy fájl vagy glob pattern alapján az Atlas megadja:

- közvetlenül érintett fájlokat;
- reverse import consumereket;
- route-okat és kapcsolódó teszteket;
- érintett domain-eket és domain dependency closure-t;
- canonical authority owneröket;
- potenciálisan érintett truth kulcsokat;
- domain boundary rule-okat;
- kötelező evidence obligationöket;
- releváns Known Failure-eket.

### Release Closure input

A `--closure-file` query nem automatikus production-engedély. Egy determinisztikus closure-javaslatot ad a Release Transaction assembler számára:

- matched files;
- reverse consumers;
- érintett domain-ek;
- authority-k;
- truth kulcsok;
- evidence obligationök;
- Known Failure-ek;
- regression authority-k;
- felfedezett tesztek.

Ez lesz a későbbi Release Closure / Change Impact prevention alapja.

### Truth lookup

A `--lookup` már nemcsak symbol/literal keresés. Domain ID, authority ID vagy truth key is lekérdezhető.

Példa:

`node scripts/shoperation-codebase-atlas.mjs --lookup commerce.order`

A válasz megadja a canonical truth ownert és a hozzá kötődő fájlokat.

## Authority

Az Atlas nem hoz létre új üzleti igazságot.

- Constitution: legfelső architecture authority.
- Domain Foundations: domain/truth/owner authority.
- Atlas 2.0: ezek **indexe és impact projectionje**.
- Implementation: az authority-k megvalósítása.
- Evidence: az implementáció bizonyítása.

Ha az Atlas és egy canonical authority eltér, az Atlas hibás vagy elavult, nem az authority íródik felül.

## Clean replacement

Az Atlas 2.0 a korábbi Atlas policy v1 helyére lép. A runtime kizárólag a v2 policy-t olvassa; párhuzamos v1/v2 policy authority nem marad.
