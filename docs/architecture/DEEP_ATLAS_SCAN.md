# Daily Deep Atlas Scan

A Daily Deep Atlas Scan az Atlas 2.0 és az Architecture Health fölé épülő, időzített megfigyelési réteg.

Nem új általános CI gate, és nem írja felül a Constitution, Domain Foundations, Release Risk Budget vagy Knowledge Guard authority-ját.

## Cél

Naponta egyszer teljes repository-szintű önismereti vizsgálatot készít:

- Atlas 2.0 validáció;
- Architecture Drift / Confidence riport;
- unresolved belső importok;
- duplikált route-ok;
- domain coverage hiányok;
- alacsony capability confidence;
- guard-registry állapot.

## Blocking vs warning

A scan csak két forrásból ad hard BLOCK-ot:

1. Atlas validation failure;
2. Architecture Health hard drift.

A többi jelzés warning. A warning nem válik automatikusan release blokkoló authority-vá.

## Ütemezés

A GitHub workflow naponta fut:

`37 3 * * *`

és kézzel is indítható.

Hard drift esetén egyetlen deduplikált GitHub issue frissül. Ha a következő scan helyreáll, az issue automatikusan bezáródik.

## Guard racionalizálás

A Daily Deep Atlas Scan a Guard Registry-ben **informational signal**. Nem kap külön blocking responsibility-t.

A CI Release Risk Budget kizárólag:
- pull requesten;
- illetve `main` pushon

fut. Feature-branch push/branch-creation eseményen nem futtatunk production release proofot, mert az nem Release Transaction, és csak zajos false positive-ot okozna.

## Evidence

Artifactok:

- `artifacts/shoperation-deep-atlas/deep-atlas-scan.json`
- `artifacts/shoperation-deep-atlas/deep-atlas-scan.md`
- Atlas és Architecture Health kísérő artifactok.
